import os
import io
import base64
import requests
import random
import urllib.parse

from dotenv import load_dotenv
from PIL import Image, ImageDraw, ImageFont, ImageFilter

load_dotenv()

def load_font(size, bold=False):
    candidates = [
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/calibrib.ttf" if bold else "C:/Windows/Fonts/calibri.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for path in candidates:
        if os.path.exists(path):
            try: return ImageFont.truetype(path, size)
            except Exception: pass
    return ImageFont.load_default()

def get_format_dimensions(format_name):
    name = (format_name or "").lower()
    if "story" in name: return 1080, 1920
    if "landscape" in name: return 1200, 675
    return 1080, 1080

def build_environment_prompt(style, user_prompt):
    raw_prompt = user_prompt.lower() if user_prompt else ""
    for word in ["perfume", "bottle", "shoes", "shoe", "sneakers", "product", "item", "can"]:
        raw_prompt = raw_prompt.replace(word, "")
    
    style_desc = style if style else "modern studio"
    base_description = raw_prompt.strip() if raw_prompt.strip() else f"{style_desc} style product stage"
    
    return f"""
{base_description}, empty display stage, perfectly centered circular pedestal platform in lower center, 
soft rim lighting, realistic studio shadows and reflections, high-end commercial aesthetic. 
NO PRODUCTS, NO BOTTLES, NO CONTAINERS, NO SHOES, NO TEXT, NO LOGOS.
""".strip()

def generate_ai_environment(style, user_prompt):
    prompt_text = build_environment_prompt(style, user_prompt)
    seed = random.randint(1, 999999)
    print(f"Generating Background with Seed [{seed}]: {prompt_text}")

    # --- PROVIDER 1: Cloudflare Workers AI (SDXL Lightning) ---
    account_id = os.getenv("CLOUDFLARE_ACCOUNT_ID")
    token = os.getenv("CLOUDFLARE_API_TOKEN")
    if account_id and token:
        try:
            cf_url = f"https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run/@cf/bytedance/stable-diffusion-xl-lightning"
            res = requests.post(
                cf_url,
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                json={"prompt": prompt_text, "num_steps": 4},
                timeout=20,
            )
            if res.status_code == 200:
                data = res.json()
                encoded = data.get("result", {}).get("image")
                if encoded:
                    print("Successfully generated background via Cloudflare SDXL-Lightning.")
                    return Image.open(io.BytesIO(base64.b64decode(encoded))).convert("RGBA")
            print(f"Cloudflare AI Error ({res.status_code}): {res.text}")
        except Exception as e:
            print(f"Cloudflare Exception: {e}")

    # --- PROVIDER 2: Hugging Face (SD 2.1) ---
    hf_token = os.getenv("HF_TOKEN")
    if hf_token:
        try:
            hf_url = "https://router.huggingface.co/hf-inference/models/stabilityai/stable-diffusion-2-1"
            res = requests.post(
                hf_url,
                headers={"Authorization": f"Bearer {hf_token}", "Content-Type": "application/json"},
                json={"inputs": prompt_text},
                timeout=25,
            )
            if res.status_code == 200 and res.content:
                print("Successfully generated background via Hugging Face SD 2.1.")
                return Image.open(io.BytesIO(res.content)).convert("RGBA")
            print(f"HuggingFace Error ({res.status_code}): {res.text}")
        except Exception as e:
            print(f"HuggingFace Exception: {e}")

    # --- PROVIDER 3: Pollinations AI (Reliable Free Fallback) ---
    print("Using Pollinations AI Fallback...")
    try:
        encoded_prompt = urllib.parse.quote(prompt_text)
        pollinations_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=1080&height=1080&seed={seed}&nologo=true&model=flux"
        res = requests.get(pollinations_url, timeout=30)
        if res.status_code == 200:
            print("Successfully generated background via Pollinations AI.")
            return Image.open(io.BytesIO(res.content)).convert("RGBA")
    except Exception as e:
        print(f"Pollinations Exception: {e}")

    return None

def cover_image(image, target_width, target_height):
    image = image.convert("RGBA")
    sw, sh = image.size
    scale = max(target_width / sw, target_height / sh)
    nw, nh = int(sw * scale), int(sh * scale)
    image = image.resize((nw, nh), Image.Resampling.LANCZOS)
    left, top = (nw - target_width) // 2, (nh - target_height) // 2
    return image.crop((left, top, left + target_width, top + target_height))

def decode_product_image(image_data_uri):
    encoded = image_data_uri.split(",", 1)[1] if "," in image_data_uri else image_data_uri
    return Image.open(io.BytesIO(base64.b64decode(encoded))).convert("RGBA")

def remove_product_background(image):
    image = image.convert("RGBA")
    data = image.getdata()
    bg_r, bg_g, bg_b = image.getpixel((0, 0))[:3]
    
    new_data = []
    for item in data:
        r, g, b, a = item if len(item) == 4 else (*item, 255)
        if (r > 235 and g > 235 and b > 235) or (abs(r - bg_r) < 22 and abs(g - bg_g) < 22 and abs(b - bg_b) < 22):
            new_data.append((r, g, b, 0))
        else:
            new_data.append((r, g, b, a))
            
    image.putdata(new_data)
    return image

def add_contact_shadow(canvas, product, x, y):
    pw, ph = product.size
    layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    width = int(pw * 0.88)
    height = max(12, int(ph * 0.07))
    cx = x + pw // 2
    cy = y + ph - 2
    draw.ellipse((cx - width // 2, cy - height, cx + width // 2, cy + height), fill=(0, 0, 0, 220))
    layer = layer.filter(ImageFilter.GaussianBlur(10))
    canvas.alpha_composite(layer)

def add_advertising_text(canvas, headline=None, tagline=None, cta_text=None):
    width, height = canvas.size
    draw = ImageDraw.Draw(canvas)
    
    headline = (headline or "LEAVE AN IMPRESSION").upper()
    tagline = tagline or "A signature presence made to be remembered."
    cta_text = (cta_text or "DISCOVER MORE").upper()

    headline_font = load_font(68, bold=True)
    tagline_font = load_font(28)
    cta_font = load_font(24, bold=True)

    text_x = int(width * 0.08)
    text_y = int(height * 0.08)

    draw.text((text_x + 3, text_y + 3), headline, font=headline_font, fill=(0, 0, 0, 230))
    draw.text((text_x, text_y), headline, font=headline_font, fill=(255, 255, 255, 255))
    
    tag_y = text_y + 85
    draw.text((text_x + 2, tag_y + 2), tagline, font=tagline_font, fill=(0, 0, 0, 200))
    draw.text((text_x, tag_y), tagline, font=tagline_font, fill=(240, 240, 240, 255))

    cta_y = tag_y + 55
    
    bbox = cta_font.getbbox(cta_text)
    text_width = bbox[2] - bbox[0]
    btn_width = max(220, text_width + 48)

    draw.rounded_rectangle((text_x, cta_y, text_x + btn_width, cta_y + 52), radius=12, fill=(225, 185, 105, 255))
    draw.text((text_x + 24, cta_y + 12), cta_text, font=cta_font, fill=(15, 15, 15, 255))

def generate_poster_job(poster_style, format, prompt, image_data_uri, headline=None, tagline=None, cta_text=None):
    try:
        width, height = get_format_dimensions(format)
        
        background = generate_ai_environment(poster_style, prompt)
        if background is None:
            canvas = Image.new("RGBA", (width, height), (25, 25, 25, 255))
        else:
            canvas = cover_image(background, width, height)
            
        canvas = canvas.convert("RGBA")

        product = decode_product_image(image_data_uri)
        product = remove_product_background(product)
        
        pw, ph = product.size
        max_w, max_h = int(width * 0.48), int(height * 0.52)
        scale = min(max_w / max(1, pw), max_h / max(1, ph))
        product = product.resize((int(pw * scale), int(ph * scale)), Image.Resampling.LANCZOS)
        pw, ph = product.size

        x = int((width - pw) / 2)
        y = int(height * 0.40)

        add_contact_shadow(canvas, product, x, y)
        canvas.alpha_composite(product, (x, y))
        
        add_advertising_text(canvas, headline=headline, tagline=tagline, cta_text=cta_text)

        final_image = canvas.convert("RGB")
        output = io.BytesIO()
        final_image.save(output, format="JPEG", quality=95, optimize=True)
        output.seek(0)

        encoded = base64.b64encode(output.getvalue()).decode("utf-8")
        return {"success": True, "poster_url": f"data:image/jpeg;base64,{encoded}", "message": "Success"}

    except Exception as error:
        return {"success": False, "poster_url": None, "message": str(error)}