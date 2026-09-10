import os
import io
import time
import math
import base64
import random
import requests
import shutil
import subprocess
import tempfile
from concurrent.futures import ThreadPoolExecutor

from dotenv import load_dotenv
from PIL import (
    Image,
    ImageDraw,
    ImageFont,
    ImageFilter,
    ImageEnhance,
)
from rembg import remove, new_session


load_dotenv()


# ============================================================
# CINEMATIC VIDEO V5 FAST / STABLE
# One Cloudflare environment + local cinematic scene variations.
# Keeps the original product identity and creates small -> large
# hero progression without crossfade ghosting.
# ============================================================

_REMBG_SESSION = None
_VIGNETTE_CACHE = {}


def _video_log(label, started_at):
    elapsed = time.perf_counter() - started_at
    print(f"[VIDEO] {label}: {elapsed:.2f}s")


def _find_ffmpeg():
    direct = shutil.which("ffmpeg")
    if direct:
        return direct

    candidates = [
        r"C:\ffmpeg\bin\ffmpeg.exe",
        r"C:\Program Files\ffmpeg\bin\ffmpeg.exe",
    ]

    local_app_data = os.getenv("LOCALAPPDATA")
    if local_app_data:
        winget_root = os.path.join(
            local_app_data,
            "Microsoft",
            "WinGet",
            "Packages",
        )
        if os.path.isdir(winget_root):
            for root, _, files in os.walk(winget_root):
                if "ffmpeg.exe" in files:
                    candidates.append(os.path.join(root, "ffmpeg.exe"))

    for candidate in candidates:
        if candidate and os.path.exists(candidate):
            return candidate

    return None


def _video_dimensions(prompt):
    text = (prompt or "").lower()
    if "youtube" in text or "landscape" in text or "16:9" in text:
        return 1280, 720
    return 720, 1280


def _video_style(prompt):
    text = (prompt or "").lower()

    if "neon" in text or "cyber" in text:
        return "Neon"
    if "studio" in text or "minimal" in text:
        return "Studio"
    return "Luxury"


def _build_video_environment_prompt(prompt):
    text = (prompt or "").strip()
    if not text:
        text = "premium cinematic commercial atmosphere"

    return f"""
Create ONE photorealistic cinematic commercial advertising ENVIRONMENT ONLY.

The real customer product will be composited later.

Creative direction:
{text}

SCENE DESIGN:
- premium cinematic advertising set
- elegant abstract architecture
- dramatic depth and professional directional lighting
- ONE empty hero platform or clean floor area
- strong separation between foreground, hero zone and background
- realistic volumetric haze
- tasteful reflections and shadows
- expensive commercial campaign look
- clean negative space around the future product
- environment must support multiple camera crops from the same image

CRITICAL HERO-ZONE RULES:
- keep the central hero area EMPTY
- no vertical props directly behind the hero area
- no object shaped like a bottle, jar, tube, can, box, package,
  shoe, watch, phone, cosmetic item, container, or product silhouette
- no fake labels, packaging edges, product-like highlights,
  display stands shaped like products, or duplicate hero objects
- use abstract stone, glass, light, haze, walls, arches, floor and shadows

DO NOT GENERATE:
people,
hands,
bottles,
jars,
tubes,
cans,
boxes,
packages,
shoes,
watches,
phones,
electronics,
cosmetics,
consumer goods,
logos,
brands,
labels,
letters,
words,
typography,
signage,
poster text,
watermarks,
duplicate objects.

Environment only. Keep the hero product zone empty and unobstructed.
""".strip()


def _generate_video_environment(prompt):
    account_id = os.getenv("CLOUDFLARE_ACCOUNT_ID")
    token = os.getenv("CLOUDFLARE_API_TOKEN")

    if not account_id or not token:
        print("[VIDEO] Cloudflare credentials missing; using local fallback.")
        return None

    model = "@cf/black-forest-labs/flux-1-schnell"
    url = (
        "https://api.cloudflare.com/client/v4/accounts/"
        f"{account_id}/ai/run/{model}"
    )

    try:
        response = requests.post(
            url,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            json={
                "prompt": _build_video_environment_prompt(prompt),
                "steps": 6,
            },
            timeout=90,
        )

        if response.status_code != 200:
            print(
                "[VIDEO] Cloudflare failed:",
                response.status_code,
                response.text[:500],
            )
            return None

        payload = response.json()
        encoded = payload.get("result", {}).get("image")

        if not encoded:
            print("[VIDEO] Cloudflare returned no image.")
            return None

        return Image.open(
            io.BytesIO(base64.b64decode(encoded))
        ).convert("RGBA")

    except Exception as error:
        print("[VIDEO] Cloudflare error:", error)
        return None


def _video_fallback_background(width, height):
    top = (58, 37, 26)
    bottom = (8, 8, 12)

    image = Image.new("RGBA", (width, height), (0, 0, 0, 255))
    draw = ImageDraw.Draw(image)

    for y in range(height):
        ratio = y / max(1, height - 1)
        color = (
            int(top[0] * (1 - ratio) + bottom[0] * ratio),
            int(top[1] * (1 - ratio) + bottom[1] * ratio),
            int(top[2] * (1 - ratio) + bottom[2] * ratio),
            255,
        )
        draw.line((0, y, width, y), fill=color)

    glow = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    cx, cy = width // 2, int(height * 0.58)
    gd.ellipse(
        (
            cx - int(width * 0.35),
            cy - int(height * 0.22),
            cx + int(width * 0.35),
            cy + int(height * 0.22),
        ),
        fill=(255, 165, 92, 75),
    )
    glow = glow.filter(ImageFilter.GaussianBlur(max(25, width // 14)))
    image.alpha_composite(glow)
    return image


def _make_background_variant(base, index):
    width, height = base.size

    zooms = (1.00, 1.07, 1.14, 1.04)
    offset_x = (0.00, -0.035, 0.045, 0.015)
    offset_y = (0.00, 0.015, -0.025, 0.00)

    zoom = zooms[index]
    resized = base.resize(
        (
            max(width, int(width * zoom)),
            max(height, int(height * zoom)),
        ),
        Image.Resampling.LANCZOS,
    )

    rw, rh = resized.size
    max_left = max(0, rw - width)
    max_top = max(0, rh - height)

    left = int(max_left // 2 + offset_x[index] * width)
    top = int(max_top // 2 + offset_y[index] * height)

    left = max(0, min(max_left, left))
    top = max(0, min(max_top, top))

    reframed = resized.crop((left, top, left + width, top + height))
    rgb = reframed.convert("RGB")

    contrast_values = (1.03, 1.10, 1.08, 1.12)
    color_values = (1.01, 1.07, 0.98, 1.04)
    brightness_values = (0.94, 1.00, 0.90, 0.96)

    rgb = ImageEnhance.Contrast(rgb).enhance(contrast_values[index])
    rgb = ImageEnhance.Color(rgb).enhance(color_values[index])
    rgb = ImageEnhance.Brightness(rgb).enhance(brightness_values[index])

    if index == 2:
        rgb = rgb.filter(ImageFilter.GaussianBlur(0.35))

    return rgb.convert("RGBA")


def _resize_video_product(
    product,
    width,
    height,
    scale_fraction,
    max_height_fraction,
):
    pw, ph = product.size

    max_w = int(width * scale_fraction)
    max_h = int(height * max_height_fraction)

    scale = min(
        max_w / max(1, pw),
        max_h / max(1, ph),
    )

    nw = max(1, int(pw * scale))
    nh = max(1, int(ph * scale))

    return product.resize(
        (nw, nh),
        Image.Resampling.LANCZOS,
    )


def _add_video_floor(canvas, product, x, y):
    pw, ph = product.size
    layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)

    center_x = x + pw // 2
    platform_y = y + ph + max(5, int(canvas.height * 0.006))

    platform_w = int(pw * 1.50)
    platform_h = max(22, int(canvas.height * 0.026))

    draw.ellipse(
        (
            center_x - platform_w // 2,
            platform_y - platform_h,
            center_x + platform_w // 2,
            platform_y + platform_h,
        ),
        fill=(16, 14, 14, 155),
    )

    layer = layer.filter(
        ImageFilter.GaussianBlur(max(8, int(platform_h * 0.55)))
    )
    canvas.alpha_composite(layer)


def _add_scene_spotlight(canvas, product, x, y, scene_index, config):
    pw, ph = product.size
    layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)

    light = config["light"]
    intensity = (38, 62, 76, 70)[scene_index]
    radius_scale = (1.05, 0.92, 0.78, 0.88)[scene_index]

    cx = x + pw // 2
    cy = y + int(ph * (0.45 if scene_index != 2 else 0.38))

    rx = max(30, int(pw * radius_scale))
    ry = max(45, int(ph * radius_scale * 0.72))

    draw.ellipse(
        (cx - rx, cy - ry, cx + rx, cy + ry),
        fill=(light[0], light[1], light[2], intensity),
    )

    layer = layer.filter(
        ImageFilter.GaussianBlur(
            max(22, int(max(pw, ph) * 0.11))
        )
    )
    canvas.alpha_composite(layer)


def _compose_video_scene(base, product, width, height, scene_index, prompt):
    canvas = _make_background_variant(base, scene_index)
    portrait = height > width

    if portrait:
        scale_fractions = (0.30, 0.40, 0.54, 0.47)
        max_height_fractions = (0.28, 0.38, 0.50, 0.44)
        centers = (0.46, 0.54, 0.48, 0.53)
        bottoms = (0.77, 0.79, 0.84, 0.80)
    else:
        scale_fractions = (0.24, 0.32, 0.42, 0.36)
        max_height_fractions = (0.52, 0.62, 0.74, 0.67)
        centers = (0.60, 0.66, 0.73, 0.70)
        bottoms = (0.84, 0.85, 0.88, 0.86)

    product_scene = _resize_video_product(
        product,
        width,
        height,
        scale_fractions[scene_index],
        max_height_fractions[scene_index],
    )

    pw, ph = product_scene.size
    center_x = int(width * centers[scene_index])
    bottom_y = int(height * bottoms[scene_index])

    x = max(8, min(width - pw - 8, center_x - pw // 2))
    y = max(8, min(height - ph - 8, bottom_y - ph))

    style = _video_style(prompt)
    config = get_style_config(style, prompt)

    _add_scene_spotlight(canvas, product_scene, x, y, scene_index, config)
    add_product_backlight(canvas, product_scene, x, y, config)

    if scene_index in (0, 2, 3):
        add_atmosphere(canvas, style, prompt, config)

    _add_video_floor(canvas, product_scene, x, y)
    add_product_shadow(canvas, product_scene, x, y)
    add_contact_shadow(canvas, product_scene, x, y)

    canvas.alpha_composite(product_scene, (x, y))

    if scene_index == 0:
        add_particles(canvas, style, prompt, config)
    elif scene_index == 2:
        add_particles(
            canvas,
            style,
            prompt + " premium cinematic glow",
            config,
        )
    elif scene_index == 3:
        add_particles(canvas, style, prompt, config)

    add_vignette(
        canvas,
        strength=(52, 60, 70, 66)[scene_index],
    )

    if scene_index == 3:
        draw = ImageDraw.Draw(canvas)
        headline = config["heading"]
        subtitle = config["tagline"]

        headline_font = load_font(
            46 if portrait else 42,
            bold=True,
        )
        subtitle_font = load_font(
            22 if portrait else 20,
            bold=False,
        )

        if portrait:
            tx = int(width * 0.07)
            ty = int(height * 0.095)
            max_text_width = int(width * 0.82)
        else:
            tx = int(width * 0.055)
            ty = int(height * 0.12)
            max_text_width = int(width * 0.43)

        y_text = draw_wrapped_text(
            draw,
            headline,
            (tx, ty),
            headline_font,
            (250, 242, 225, 255),
            max_text_width,
            spacing=2,
        )

        draw_wrapped_text(
            draw,
            subtitle,
            (tx, y_text + 14),
            subtitle_font,
            (235, 225, 210, 235),
            max_text_width,
            spacing=4,
        )

    return canvas.convert("RGB")


def _encode_video_with_ffmpeg(ffmpeg, scene_paths, output_path, width, height):
    scene_duration = 2.5
    fps = 24

    command = [ffmpeg, "-y"]

    for path in scene_paths:
        command.extend(
            [
                "-loop",
                "1",
                "-framerate",
                str(fps),
                "-t",
                str(scene_duration),
                "-i",
                path,
            ]
        )

    filters = []
    zoom_speeds = (0.00040, 0.00068, 0.00082, 0.00052)
    pan_x = (
        "iw/2-(iw/zoom/2)",
        "iw/2-(iw/zoom/2)+6",
        "iw/2-(iw/zoom/2)-8",
        "iw/2-(iw/zoom/2)",
    )
    pan_y = (
        "ih/2-(ih/zoom/2)+6",
        "ih/2-(ih/zoom/2)",
        "ih/2-(ih/zoom/2)-8",
        "ih/2-(ih/zoom/2)",
    )

    zoom_width = max(2, (int(width * 0.75) // 2) * 2)
    zoom_height = max(2, (int(height * 0.75) // 2) * 2)

    for i in range(4):
        filters.append(
            f"[{i}:v]"
            f"scale={width}:{height}:force_original_aspect_ratio=increase,"
            f"crop={width}:{height},"
            # Shrink before zoompan so it has far fewer pixels to process
            # per frame (zoompan is a slow, frame-by-frame CPU filter).
            f"scale={zoom_width}:{zoom_height},"
            f"zoompan="
            f"z='min(zoom+{zoom_speeds[i]},1.045)':"
            f"x='{pan_x[i]}':"
            f"y='{pan_y[i]}':"
            f"d=1:"
            f"s={zoom_width}x{zoom_height}:"
            f"fps={fps},"
            # Scale back up to the real output size once, after zoompan.
            f"scale={width}:{height},"
            f"trim=duration={scene_duration},"
            f"setpts=PTS-STARTPTS[v{i}]"
        )

    filters.append(
        "[v0][v1][v2][v3]"
        "concat=n=4:v=1:a=0[outv]"
    )

    command.extend(
        [
            "-filter_complex",
            ";".join(filters),
            "-map",
            "[outv]",
            "-t",
            "10",
            "-r",
            str(fps),
            "-c:v",
            "libx264",
            "-preset",
            "ultrafast",
            "-crf",
            "20",
            "-threads",
            "0",
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "+faststart",
            output_path,
        ]
    )

    result = subprocess.run(
        command,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
        timeout=180,
    )

    if result.returncode != 0:
        raise RuntimeError(
            "FFmpeg render failed: "
            + result.stderr[-1600:]
        )


def _encode_static_video_fallback(ffmpeg, scene_paths, output_path, width, height):
    concat_file = os.path.join(os.path.dirname(output_path), "fallback_concat.txt")

    with open(concat_file, "w", encoding="utf-8") as handle:
        for path in scene_paths:
            normalized = path.replace("\\", "/")
            handle.write(f"file '{normalized}'\n")
            handle.write("duration 2.5\n")
        normalized = scene_paths[-1].replace("\\", "/")
        handle.write(f"file '{normalized}'\n")

    command = [
        ffmpeg,
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        concat_file,
        "-vf",
        f"scale={width}:{height},fps=24,format=yuv420p",
        "-t",
        "10",
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-crf",
        "21",
        "-threads",
        "0",
        "-movflags",
        "+faststart",
        output_path,
    ]

    result = subprocess.run(
        command,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
        timeout=180,
    )

    if result.returncode != 0:
        raise RuntimeError(
            "FFmpeg fallback failed: "
            + result.stderr[-1600:]
        )


def generate_video_job(prompt, image_data_uri):
    started = time.perf_counter()

    print("")
    print("======================================")
    print("AI AD BUILDER - CINEMATIC V5 FAST")
    print("Prompt:", prompt)
    print("======================================")

    temp_dir = None

    try:
        width, height = _video_dimensions(prompt)

        ffmpeg = _find_ffmpeg()
        if not ffmpeg:
            raise RuntimeError(
                "FFmpeg was not found. Install FFmpeg or add ffmpeg.exe to PATH."
            )

        def _prepare_product():
            prepared = decode_product_image(image_data_uri)
            prepared = remove_product_background(prepared)
            prepared = enhance_product(prepared)
            return prepared

        def _prepare_environment():
            env = _generate_video_environment(prompt)
            if env is None:
                return _video_fallback_background(width, height)
            return cover_image(env, width, height)

        # These two steps don't depend on each other (one processes your
        # product photo, the other calls Cloudflare for a background), so
        # running them at the same time instead of one-after-another saves
        # whichever one is faster from being pure wasted wait time.
        stage = time.perf_counter()
        with ThreadPoolExecutor(max_workers=2) as pool:
            product_future = pool.submit(_prepare_product)
            environment_future = pool.submit(_prepare_environment)

            product = product_future.result()
            base = environment_future.result()

        _video_log("Product preparation + Environment (parallel)", stage)

        if product.width < 5 or product.height < 5:
            raise RuntimeError("Product extraction produced an empty image.")

        stage = time.perf_counter()

        # The 4 scenes don't depend on each other either, so build them
        # at the same time instead of one after another.
        with ThreadPoolExecutor(max_workers=4) as pool:
            scenes = list(
                pool.map(
                    lambda index: _compose_video_scene(
                        base,
                        product,
                        width,
                        height,
                        index,
                        prompt,
                    ),
                    range(4),
                )
            )

        _video_log("Scene composition (parallel)", stage)

        temp_dir = tempfile.mkdtemp(prefix="ai_ad_builder_video_")
        scene_paths = []

        for index, scene in enumerate(scenes):
            path = os.path.join(temp_dir, f"scene_{index + 1}.jpg")
            scene.save(path, "JPEG", quality=91, optimize=False)
            scene_paths.append(path)

        output_path = os.path.join(temp_dir, "cinematic_ad.mp4")

        stage = time.perf_counter()
        try:
            _encode_video_with_ffmpeg(
                ffmpeg,
                scene_paths,
                output_path,
                width,
                height,
            )
        except Exception as first_error:
            print("[VIDEO] Primary FFmpeg render failed:", first_error)
            print("[VIDEO] Trying safe fallback render...")
            _encode_static_video_fallback(
                ffmpeg,
                scene_paths,
                output_path,
                width,
                height,
            )

        _video_log("FFmpeg render", stage)

        if not os.path.exists(output_path):
            raise RuntimeError("Video output file was not created.")

        file_size = os.path.getsize(output_path)
        if file_size < 20_000:
            raise RuntimeError(
                f"Video output is unexpectedly small ({file_size} bytes)."
            )

        with open(output_path, "rb") as handle:
            encoded = base64.b64encode(handle.read()).decode("utf-8")

        total = time.perf_counter() - started
        print(f"[VIDEO] TOTAL: {total:.2f}s")
        print("[VIDEO] Cinematic video generated successfully.")

        return {
            "success": True,
            "video_url": "data:video/mp4;base64," + encoded,
            "message": (
                f"Cinematic advertisement generated successfully in "
                f"{total:.1f}s."
            ),
        }

    except Exception as error:
        print("[VIDEO] ERROR:", error)

        return {
            "success": False,
            "video_url": None,
            "message": str(error),
        }

    finally:
        if temp_dir:
            try:
                shutil.rmtree(temp_dir, ignore_errors=True)
            except Exception:
                pass


# ============================================================
# FONT
# ============================================================

def load_font(size, bold=False):
    if bold:
        candidates = [
            "C:/Windows/Fonts/arialbd.ttf",
            "C:/Windows/Fonts/calibrib.ttf",
            "C:/Windows/Fonts/segoeuib.ttf",
        ]
    else:
        candidates = [
            "C:/Windows/Fonts/arial.ttf",
            "C:/Windows/Fonts/calibri.ttf",
            "C:/Windows/Fonts/segoeui.ttf",
        ]

    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                pass

    return ImageFont.load_default()


# ============================================================
# FORMAT
# ============================================================

def get_format_dimensions(format_name):
    name = (format_name or "").lower()

    if "story" in name:
        return 1080, 1920

    if "landscape" in name:
        return 1200, 675

    return 1080, 1080


# ============================================================
# PRODUCT CATEGORY
# Simple prompt-based classification.
# ============================================================

def detect_product_category(prompt):
    text = (prompt or "").lower()

    if any(
        word in text
        for word in [
            "perfume",
            "fragrance",
            "cologne",
            "scent",
        ]
    ):
        return "perfume"

    if any(
        word in text
        for word in [
            "cream",
            "lotion",
            "skincare",
            "serum",
            "moisturizer",
            "cosmetic",
        ]
    ):
        return "skincare"

    if any(
        word in text
        for word in [
            "shoe",
            "sneaker",
            "footwear",
        ]
    ):
        return "fashion"

    if any(
        word in text
        for word in [
            "watch",
            "jewelry",
            "jewellery",
            "ring",
            "bracelet",
        ]
    ):
        return "luxury"

    if any(
        word in text
        for word in [
            "coffee",
            "drink",
            "beverage",
            "juice",
            "bottle",
            "can",
        ]
    ):
        return "beverage"

    if any(
        word in text
        for word in [
            "phone",
            "laptop",
            "headphone",
            "earbud",
            "technology",
            "tech",
        ]
    ):
        return "technology"

    return "general"


# ============================================================
# STYLE / COPY
# ============================================================

def get_style_config(style, prompt):
    style_name = (style or "Luxury").lower()
    category = detect_product_category(prompt)

    category_copy = {
        "perfume": {
            "heading": "LEAVE AN IMPRESSION",
            "tagline": "A signature presence made to be remembered.",
        },
        "skincare": {
            "heading": "RADIANCE, REFINED",
            "tagline": "Elevated care for every beautiful moment.",
        },
        "fashion": {
            "heading": "MOVE DIFFERENT",
            "tagline": "Designed to stand out from every angle.",
        },
        "luxury": {
            "heading": "TIMELESS PRESENCE",
            "tagline": "Detail, character and refined distinction.",
        },
        "beverage": {
            "heading": "REFRESH THE MOMENT",
            "tagline": "Made to turn everyday moments into something more.",
        },
        "technology": {
            "heading": "DESIGNED AHEAD",
            "tagline": "Modern performance with unmistakable presence.",
        },
        "general": {
            "heading": "MAKE IT MEMORABLE",
            "tagline": "A bold product deserves a bold presentation.",
        },
    }

    copy = category_copy[category]

    if style_name == "minimal":
        return {
            "heading": copy["heading"],
            "tagline": copy["tagline"],
            "cta": "DISCOVER MORE",
            "text": (45, 45, 45),
            "accent": (179, 150, 110),
            "light": (255, 242, 213),
            "fallback_top": (244, 240, 233),
            "fallback_bottom": (205, 194, 179),
        }

    if style_name == "neon":
        return {
            "heading": copy["heading"],
            "tagline": copy["tagline"],
            "cta": "EXPLORE NOW",
            "text": (250, 245, 255),
            "accent": (199, 122, 255),
            "light": (205, 125, 255),
            "fallback_top": (42, 20, 62),
            "fallback_bottom": (10, 8, 22),
        }

    if style_name == "studio":
        return {
            "heading": copy["heading"],
            "tagline": copy["tagline"],
            "cta": "DISCOVER MORE",
            "text": (245, 245, 245),
            "accent": (205, 205, 205),
            "light": (255, 255, 255),
            "fallback_top": (65, 65, 65),
            "fallback_bottom": (10, 10, 10),
        }

    return {
        "heading": copy["heading"],
        "tagline": copy["tagline"],
        "cta": "DISCOVER MORE",
        "text": (250, 241, 222),
        "accent": (221, 181, 105),
        "light": (255, 218, 157),
        "fallback_top": (104, 74, 44),
        "fallback_bottom": (24, 17, 14),
    }


# ============================================================
# AI ENVIRONMENT PROMPT
# ============================================================

def build_environment_prompt(style, user_prompt):
    style_name = (style or "Luxury").lower()

    descriptions = {
        "luxury": (
            "high-end luxury commercial product advertising set, "
            "editorial architecture, elegant stone materials, "
            "premium warm directional lighting, cinematic shadows, "
            "rich depth and expensive visual styling"
        ),
        "minimal": (
            "clean premium minimalist advertising set, "
            "soft sculptural architecture, neutral stone, "
            "beautiful natural studio light, subtle shadows"
        ),
        "neon": (
            "premium futuristic commercial advertising set, "
            "dark glossy environment, subtle neon illumination, "
            "cinematic haze, reflected light and dramatic depth"
        ),
        "studio": (
            "professional luxury commercial photography studio, "
            "dramatic controlled spotlight, premium pedestal, "
            "realistic shadows, subtle reflections and strong depth"
        ),
    }

    style_description = descriptions.get(
        style_name,
        descriptions["luxury"],
    )

    creative_direction = (
        user_prompt.strip()
        if user_prompt and user_prompt.strip()
        else "premium decorative atmosphere"
    )

    return f"""
Create a photorealistic premium commercial ADVERTISING ENVIRONMENT.

The actual customer product will be composited into the scene later.
DO NOT generate the product itself.

Visual style:
{style_description}

Creative direction:
{creative_direction}

COMPOSITION:

- Create a beautiful hero advertising composition.
- Include one elegant EMPTY podium or product surface.
- Keep the podium around the center-right area.
- Keep the podium completely empty.
- Leave a clean hero-product zone above the podium.
- Keep the left side sufficiently calm for professional typography.
- Add tasteful foreground and background decorative elements.
- Use depth, cinematic lighting and realistic shadows.
- Decorative elements should frame the future product, not block it.
- Add elegant environmental details based on the creative direction.
- The composition must look like a premium campaign photograph.
- Use realistic depth of field.
- Use subtle atmospheric depth.
- Use plain unmarked architectural surfaces.

DO NOT GENERATE:

bottles,
perfume bottles,
cosmetic bottles,
containers,
jars,
boxes,
packages,
consumer products,
electronics,
shoes,
watches,
real products,
logos,
brands,
labels,
letters,
words,
typography,
signage,
wall writing,
poster text,
watermarks.

The podium must remain EMPTY.
The product area must remain unobstructed.

Environment only.
""".strip()


# ============================================================
# CLOUDFLARE
# ============================================================

def generate_ai_environment(style, user_prompt):
    account_id = os.getenv("CLOUDFLARE_ACCOUNT_ID")
    token = os.getenv("CLOUDFLARE_API_TOKEN")

    if not account_id or not token:
        print("Cloudflare credentials missing.")
        return None

    model = "@cf/black-forest-labs/flux-1-schnell"

    url = (
        "https://api.cloudflare.com/client/v4/accounts/"
        f"{account_id}/ai/run/{model}"
    )

    try:
        print("Generating V5 AI advertising environment...")

        response = requests.post(
            url,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            json={
                "prompt": build_environment_prompt(
                    style,
                    user_prompt,
                ),
                "steps": 8,
            },
            timeout=120,
        )

        if response.status_code != 200:
            print(
                "Cloudflare failed:",
                response.status_code,
                response.text[:500],
            )
            return None

        data = response.json()

        encoded = data.get(
            "result",
            {},
        ).get("image")

        if not encoded:
            print("No image returned.")
            return None

        image_bytes = base64.b64decode(encoded)

        return Image.open(
            io.BytesIO(image_bytes)
        ).convert("RGBA")

    except Exception as error:
        print("Cloudflare error:", error)
        return None


# ============================================================
# BACKGROUND COVER
# ============================================================

def cover_image(image, target_width, target_height):
    image = image.convert("RGBA")

    sw, sh = image.size

    scale = max(
        target_width / sw,
        target_height / sh,
    )

    nw = int(sw * scale)
    nh = int(sh * scale)

    image = image.resize(
        (nw, nh),
        Image.Resampling.LANCZOS,
    )

    left = (nw - target_width) // 2
    top = (nh - target_height) // 2

    return image.crop(
        (
            left,
            top,
            left + target_width,
            top + target_height,
        )
    )


# ============================================================
# FAST FALLBACK GRADIENT
# ============================================================

def create_fallback_background(width, height, config):
    image = Image.new(
        "RGBA",
        (width, height),
        (0, 0, 0, 255),
    )

    draw = ImageDraw.Draw(image)

    top = config["fallback_top"]
    bottom = config["fallback_bottom"]

    for y in range(height):
        ratio = y / max(1, height - 1)

        color = (
            int(top[0] * (1 - ratio) + bottom[0] * ratio),
            int(top[1] * (1 - ratio) + bottom[1] * ratio),
            int(top[2] * (1 - ratio) + bottom[2] * ratio),
            255,
        )

        draw.line(
            (0, y, width, y),
            fill=color,
        )

    return image


# ============================================================
# DECODE PRODUCT
# ============================================================

def decode_product_image(image_data_uri):
    if not image_data_uri:
        raise ValueError("Product image is missing.")

    encoded = (
        image_data_uri.split(",", 1)[1]
        if "," in image_data_uri
        else image_data_uri
    )

    image_bytes = base64.b64decode(encoded)

    return Image.open(
        io.BytesIO(image_bytes)
    ).convert("RGBA")


# ============================================================
# TRANSPARENCY CHECK
# ============================================================

def has_meaningful_transparency(image):
    """
    Return True only when transparency looks like a genuine product cutout.
    """
    if image.mode != "RGBA":
        return False

    alpha = image.getchannel("A")
    histogram = alpha.histogram()
    total = max(1, image.width * image.height)

    transparent_pixels = sum(histogram[:240])
    transparent_ratio = transparent_pixels / total

    if transparent_ratio < 0.02:
        return False

    border = max(2, int(min(image.width, image.height) * 0.03))
    border_regions = [
        alpha.crop((0, 0, image.width, border)),
        alpha.crop((0, image.height - border, image.width, image.height)),
        alpha.crop((0, border, border, image.height - border)),
        alpha.crop((image.width - border, border, image.width, image.height - border)),
    ]

    border_total = 0
    border_transparent = 0

    for region in border_regions:
        hist = region.histogram()
        border_total += max(1, region.width * region.height)
        border_transparent += sum(hist[:240])

    border_transparent_ratio = border_transparent / max(1, border_total)

    if border_transparent_ratio < 0.08 and transparent_ratio < 0.08:
        return False

    solid_mask = alpha.point(lambda value: 255 if value >= 20 else 0)
    bbox = solid_mask.getbbox()

    if not bbox:
        return False

    left, top, right, bottom = bbox
    full_area = image.width * image.height
    bbox_area = max(1, (right - left) * (bottom - top))

    if bbox_area >= full_area * 0.995 and transparent_ratio < 0.08:
        return False

    return True


# ============================================================
# SIMPLE FALLBACK REMOVAL
# ============================================================

def simple_light_background_removal(image):
    image = image.convert("RGBA")
    pixels = image.load()

    for y in range(image.height):
        for x in range(image.width):
            r, g, b, a = pixels[x, y]

            minimum = min(r, g, b)
            maximum = max(r, g, b)

            if minimum > 247:
                pixels[x, y] = (r, g, b, 0)

            elif (
                minimum > 218
                and maximum - minimum < 28
            ):
                alpha = int(
                    max(
                        0,
                        min(
                            255,
                            (247 - minimum) * 9,
                        ),
                    )
                )

                pixels[x, y] = (
                    r,
                    g,
                    b,
                    min(a, alpha),
                )

    return image


# ============================================================
# AUTOMATIC PRODUCT SEGMENTATION
# ============================================================

def _get_rembg_session():
    global _REMBG_SESSION

    if _REMBG_SESSION is None:
        print("Loading lightweight rembg model...")
        started = time.perf_counter()
        _REMBG_SESSION = new_session("u2netp")
        print(
            "rembg model loaded in "
            f"{time.perf_counter() - started:.2f}s"
        )

    return _REMBG_SESSION


def remove_product_background(image):
    image = image.convert("RGBA")

    if has_meaningful_transparency(image):
        print("Meaningful product transparency detected.")
        cleaned = image

    else:
        try:
            print("Running cached rembg segmentation...")

            original_size = image.size
            segmentation_image = image

            max_dimension = max(image.size)
            if max_dimension > 512:
                scale = 512 / max_dimension
                segmentation_image = image.resize(
                    (
                        max(1, int(image.width * scale)),
                        max(1, int(image.height * scale)),
                    ),
                    Image.Resampling.LANCZOS,
                )

            session = _get_rembg_session()

            cleaned = remove(
                segmentation_image,
                session=session,
            )

            if isinstance(cleaned, bytes):
                cleaned = Image.open(
                    io.BytesIO(cleaned)
                ).convert("RGBA")
            else:
                cleaned = cleaned.convert("RGBA")

            # If segmentation was downsized, scale the alpha mask back
            # and apply it to the original-resolution product.
            if cleaned.size != original_size:
                alpha = cleaned.getchannel("A").resize(
                    original_size,
                    Image.Resampling.LANCZOS,
                )
                cleaned = image.copy()
                cleaned.putalpha(alpha)

            # Validate the cutout so an opaque white rectangle is not accepted.
            if not has_meaningful_transparency(cleaned):
                print("Cutout validation failed; trying light-background fallback...")
                fallback = simple_light_background_removal(image)

                if has_meaningful_transparency(fallback):
                    cleaned = fallback
                    print("Light-background fallback accepted.")
                else:
                    print("Fallback did not improve the cutout; keeping rembg result.")

            print("Background removal complete.")

        except Exception as error:
            print("rembg failed:", error)
            cleaned = simple_light_background_removal(image)

    alpha = cleaned.getchannel("A")
    bbox = alpha.getbbox()

    if bbox:
        cleaned = cleaned.crop(bbox)

    return cleaned



# ============================================================
# PRODUCT ENHANCEMENT
# Slightly improves visual integration without changing identity.
# ============================================================

def enhance_product(product):
    rgb = product.convert("RGB")

    rgb = ImageEnhance.Contrast(
        rgb
    ).enhance(1.04)

    rgb = ImageEnhance.Sharpness(
        rgb
    ).enhance(1.08)

    enhanced = rgb.convert("RGBA")
    enhanced.putalpha(product.getchannel("A"))

    return enhanced


# ============================================================
# RESIZE PRODUCT
# ============================================================

def resize_product(product, cw, ch, format_name):
    name = (format_name or "").lower()

    pw, ph = product.size

    if "story" in name:
        max_w = int(cw * 0.48)
        max_h = int(ch * 0.40)

    elif "landscape" in name:
        max_w = int(cw * 0.30)
        max_h = int(ch * 0.62)

    else:
        max_w = int(cw * 0.33)
        max_h = int(ch * 0.51)

    scale = min(
        max_w / pw,
        max_h / ph,
    )

    nw = max(1, int(pw * scale))
    nh = max(1, int(ph * scale))

    return product.resize(
        (nw, nh),
        Image.Resampling.LANCZOS,
    )


# ============================================================
# PRODUCT POSITION
# ============================================================

def get_product_position(product, cw, ch, format_name):
    name = (format_name or "").lower()

    pw, ph = product.size

    if "story" in name:
        center_x = int(cw * 0.55)
        bottom_y = int(ch * 0.71)

    elif "landscape" in name:
        center_x = int(cw * 0.72)
        bottom_y = int(ch * 0.83)

    else:
        center_x = int(cw * 0.67)
        bottom_y = int(ch * 0.76)

    x = int(center_x - pw / 2)
    y = int(bottom_y - ph)

    x = max(
        20,
        min(
            x,
            cw - pw - 20,
        ),
    )

    y = max(
        20,
        min(
            y,
            ch - ph - 20,
        ),
    )

    return x, y


# ============================================================
# CINEMATIC LIGHT BEHIND PRODUCT
# ============================================================

def add_product_backlight(
    canvas,
    product,
    x,
    y,
    config,
):
    pw, ph = product.size

    layer = Image.new(
        "RGBA",
        canvas.size,
        (0, 0, 0, 0),
    )

    draw = ImageDraw.Draw(layer)

    light = config["light"]

    cx = x + pw // 2
    cy = y + int(ph * 0.45)

    radius_x = int(pw * 0.95)
    radius_y = int(ph * 0.65)

    draw.ellipse(
        (
            cx - radius_x,
            cy - radius_y,
            cx + radius_x,
            cy + radius_y,
        ),
        fill=(
            light[0],
            light[1],
            light[2],
            75,
        ),
    )

    layer = layer.filter(
        ImageFilter.GaussianBlur(
            max(30, int(pw * 0.18))
        )
    )

    canvas.alpha_composite(layer)


# ============================================================
# SOFT PRODUCT SHADOW
# ============================================================

def add_product_shadow(
    canvas,
    product,
    x,
    y,
):
    alpha = product.getchannel("A")

    blurred = alpha.filter(
        ImageFilter.GaussianBlur(20)
    )

    shadow = Image.new(
        "RGBA",
        product.size,
        (0, 0, 0, 0),
    )

    shadow.putalpha(
        blurred.point(
            lambda value: int(value * 0.42)
        )
    )

    dark = Image.new(
        "RGBA",
        product.size,
        (0, 0, 0, 120),
    )

    dark.putalpha(shadow.getchannel("A"))

    canvas.alpha_composite(
        dark,
        (
            x + 18,
            y + 24,
        ),
    )


# ============================================================
# CONTACT SHADOW
# ============================================================

def add_contact_shadow(
    canvas,
    product,
    x,
    y,
):
    pw, ph = product.size

    layer = Image.new(
        "RGBA",
        canvas.size,
        (0, 0, 0, 0),
    )

    draw = ImageDraw.Draw(layer)

    width = int(pw * 0.72)
    height = max(14, int(ph * 0.035))

    cx = x + pw // 2
    cy = y + ph - 2

    draw.ellipse(
        (
            cx - width // 2,
            cy - height,
            cx + width // 2,
            cy + height,
        ),
        fill=(0, 0, 0, 145),
    )

    layer = layer.filter(
        ImageFilter.GaussianBlur(
            max(9, height),
        )
    )

    canvas.alpha_composite(layer)


# ============================================================
# SUBTLE FLOOR REFLECTION
# ============================================================

def add_product_reflection(
    canvas,
    product,
    x,
    y,
):
    pw, ph = product.size

    reflection_height = int(ph * 0.20)

    if reflection_height < 10:
        return

    bottom_crop = product.crop(
        (
            0,
            ph - reflection_height,
            pw,
            ph,
        )
    )

    reflection = bottom_crop.transpose(
        Image.Transpose.FLIP_TOP_BOTTOM
    )

    alpha = reflection.getchannel("A")

    fade = Image.new(
        "L",
        reflection.size,
        0,
    )

    fade_draw = ImageDraw.Draw(fade)

    for row in range(reflection.height):
        opacity = int(
            65 * (
                1 - row / max(
                    1,
                    reflection.height,
                )
            )
        )

        fade_draw.line(
            (
                0,
                row,
                reflection.width,
                row,
            ),
            fill=opacity,
        )

    final_alpha = Image.new(
        "L",
        reflection.size,
        0,
    )

    a_pixels = alpha.load()
    f_pixels = fade.load()
    o_pixels = final_alpha.load()

    for yy in range(reflection.height):
        for xx in range(reflection.width):
            o_pixels[xx, yy] = int(
                a_pixels[xx, yy]
                * f_pixels[xx, yy]
                / 255
            )

    reflection.putalpha(final_alpha)

    reflection = reflection.filter(
        ImageFilter.GaussianBlur(1.2)
    )

    canvas.alpha_composite(
        reflection,
        (
            x,
            y + ph + 2,
        ),
    )


# ============================================================
# ATMOSPHERIC HAZE / SMOKE
# ============================================================

def add_atmosphere(
    canvas,
    style,
    prompt,
    config,
):
    width, height = canvas.size

    text = (
        (style or "")
        + " "
        + (prompt or "")
    ).lower()

    should_smoke = any(
        word in text
        for word in [
            "smoke",
            "mist",
            "fog",
            "cinematic",
            "luxury",
            "perfume",
            "dramatic",
        ]
    )

    if not should_smoke:
        return

    seed = sum(
        ord(char)
        for char in text
    )

    rng = random.Random(seed)

    layer = Image.new(
        "RGBA",
        canvas.size,
        (0, 0, 0, 0),
    )

    draw = ImageDraw.Draw(layer)

    light = config["light"]

    for _ in range(10):
        cx = rng.randint(
            int(width * 0.15),
            int(width * 0.95),
        )

        cy = rng.randint(
            int(height * 0.45),
            int(height * 0.95),
        )

        rx = rng.randint(
            int(width * 0.08),
            int(width * 0.22),
        )

        ry = rng.randint(
            int(height * 0.025),
            int(height * 0.07),
        )

        draw.ellipse(
            (
                cx - rx,
                cy - ry,
                cx + rx,
                cy + ry,
            ),
            fill=(
                light[0],
                light[1],
                light[2],
                rng.randint(10, 25),
            ),
        )

    layer = layer.filter(
        ImageFilter.GaussianBlur(
            int(width * 0.055)
        )
    )

    canvas.alpha_composite(layer)


# ============================================================
# PARTICLES / SPARKLES
# ============================================================

def add_particles(
    canvas,
    style,
    prompt,
    config,
):
    width, height = canvas.size

    text = (
        (style or "")
        + " "
        + (prompt or "")
    ).lower()

    use_particles = any(
        word in text
        for word in [
            "luxury",
            "gold",
            "golden",
            "sparkle",
            "glow",
            "perfume",
            "neon",
            "cinematic",
            "premium",
        ]
    )

    if not use_particles:
        return

    seed = sum(
        ord(char) * 7
        for char in text
    )

    rng = random.Random(seed)

    layer = Image.new(
        "RGBA",
        canvas.size,
        (0, 0, 0, 0),
    )

    draw = ImageDraw.Draw(layer)

    accent = config["accent"]

    count = 45

    for _ in range(count):
        x = rng.randint(
            int(width * 0.05),
            int(width * 0.95),
        )

        y = rng.randint(
            int(height * 0.12),
            int(height * 0.92),
        )

        radius = rng.choice(
            [1, 1, 2, 2, 3]
        )

        alpha = rng.randint(
            35,
            110,
        )

        draw.ellipse(
            (
                x - radius,
                y - radius,
                x + radius,
                y + radius,
            ),
            fill=(
                accent[0],
                accent[1],
                accent[2],
                alpha,
            ),
        )

    glow = layer.filter(
        ImageFilter.GaussianBlur(3)
    )

    canvas.alpha_composite(glow)
    canvas.alpha_composite(layer)


# ============================================================
# VIGNETTE
# Fast cached Pillow implementation.
# ============================================================

def add_vignette(canvas, strength=95):
    width, height = canvas.size
    strength = max(0, min(255, int(strength)))

    cache_key = (width, height, strength)
    alpha_mask = _VIGNETTE_CACHE.get(cache_key)

    if alpha_mask is None:
        radial = Image.radial_gradient("L").resize(
            (width, height),
            Image.Resampling.BILINEAR,
        )
        alpha_mask = radial.point(
            lambda value: int(value * strength / 255)
        )
        _VIGNETTE_CACHE[cache_key] = alpha_mask

    overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 255))
    overlay.putalpha(alpha_mask)
    canvas.alpha_composite(overlay)


# ============================================================
# TEXT WRAP
# ============================================================

def draw_wrapped_text(
    draw,
    text,
    position,
    font,
    fill,
    max_width,
    spacing=8,
):
    words = text.split()

    lines = []
    current = ""

    for word in words:
        test = (
            current + " " + word
        ).strip()

        bbox = draw.textbbox(
            (0, 0),
            test,
            font=font,
        )

        width = bbox[2] - bbox[0]

        if width <= max_width:
            current = test

        else:
            if current:
                lines.append(current)

            current = word

    if current:
        lines.append(current)

    x, y = position

    for line in lines:
        draw.text(
            (x, y),
            line,
            font=font,
            fill=fill,
        )

        bbox = draw.textbbox(
            (x, y),
            line,
            font=font,
        )

        y += (
            bbox[3]
            - bbox[1]
            + spacing
        )

    return y


# ============================================================
# PREMIUM TYPOGRAPHY
# ============================================================

def add_advertising_text(
    canvas,
    config,
    format_name,
):
    width, height = canvas.size

    name = (format_name or "").lower()

    if "story" in name:
        headline_size = 74
        tagline_size = 33
        cta_size = 26

        text_x = int(width * 0.075)
        text_y = int(height * 0.105)

        max_width = int(width * 0.72)

    elif "landscape" in name:
        headline_size = 52
        tagline_size = 24
        cta_size = 19

        text_x = int(width * 0.07)
        text_y = int(height * 0.18)

        max_width = int(width * 0.41)

    else:
        headline_size = 61
        tagline_size = 27
        cta_size = 22

        text_x = int(width * 0.075)
        text_y = int(height * 0.14)

        max_width = int(width * 0.43)

    headline_font = load_font(
        headline_size,
        bold=True,
    )

    tagline_font = load_font(
        tagline_size,
    )

    cta_font = load_font(
        cta_size,
        bold=True,
    )

    draw = ImageDraw.Draw(canvas)

    text = (
        *config["text"],
        255,
    )

    accent = (
        *config["accent"],
        235,
    )

    y = draw_wrapped_text(
        draw,
        config["heading"],
        (
            text_x,
            text_y,
        ),
        headline_font,
        text,
        max_width,
        spacing=2,
    )

    y += int(height * 0.022)

    y = draw_wrapped_text(
        draw,
        config["tagline"],
        (
            text_x,
            y,
        ),
        tagline_font,
        text,
        max_width,
        spacing=5,
    )

    y += int(height * 0.035)

    cta = config["cta"]

    bbox = draw.textbbox(
        (0, 0),
        cta,
        font=cta_font,
    )

    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]

    px = 22
    py = 12

    box = (
        text_x,
        y,
        text_x + tw + px * 2,
        y + th + py * 2,
    )

    draw.rounded_rectangle(
        box,
        radius=16,
        fill=accent,
    )

    draw.text(
        (
            text_x + px,
            y + py - 2,
        ),
        cta,
        font=cta_font,
        fill=(20, 20, 20, 255),
    )


# ============================================================
# FINAL V5 POSTER
# ============================================================

def generate_poster_job(
    poster_style,
    format,
    prompt,
    image_data_uri,
):
    print("")
    print("======================================")
    print("AI AD BUILDER - PREMIUM POSTER V5")
    print("Style:", poster_style)
    print("Format:", format)
    print("Prompt:", prompt)
    print("======================================")

    try:
        width, height = get_format_dimensions(
            format
        )

        config = get_style_config(
            poster_style,
            prompt,
        )

        # ----------------------------------------------------
        # 1. AI environment
        # ----------------------------------------------------

        background = generate_ai_environment(
            poster_style,
            prompt,
        )

        if background is None:
            print("Using fallback background.")

            canvas = create_fallback_background(
                width,
                height,
                config,
            )

        else:
            canvas = cover_image(
                background,
                width,
                height,
            )

        canvas = canvas.convert("RGBA")

        # ----------------------------------------------------
        # 2. Slightly improve environment
        # ----------------------------------------------------

        rgb_background = canvas.convert("RGB")

        rgb_background = ImageEnhance.Contrast(
            rgb_background
        ).enhance(1.05)

        rgb_background = ImageEnhance.Color(
            rgb_background
        ).enhance(1.04)

        canvas = rgb_background.convert("RGBA")

        # ----------------------------------------------------
        # 3. Real customer product
        # ----------------------------------------------------

        product = decode_product_image(
            image_data_uri
        )

        product = remove_product_background(
            product
        )

        product = enhance_product(
            product
        )

        product = resize_product(
            product,
            width,
            height,
            format,
        )

        x, y = get_product_position(
            product,
            width,
            height,
            format,
        )

        # ----------------------------------------------------
        # 4. Backlight
        # ----------------------------------------------------

        add_product_backlight(
            canvas,
            product,
            x,
            y,
            config,
        )

        # ----------------------------------------------------
        # 5. Environmental atmosphere behind product
        # ----------------------------------------------------

        add_atmosphere(
            canvas,
            poster_style,
            prompt,
            config,
        )

        # ----------------------------------------------------
        # 6. Product shadows / reflection
        # ----------------------------------------------------

        add_product_shadow(
            canvas,
            product,
            x,
            y,
        )

        add_contact_shadow(
            canvas,
            product,
            x,
            y,
        )

        add_product_reflection(
            canvas,
            product,
            x,
            y,
        )

        # ----------------------------------------------------
        # 7. Place ORIGINAL product
        # ----------------------------------------------------

        canvas.alpha_composite(
            product,
            (
                x,
                y,
            ),
        )

        # ----------------------------------------------------
        # 8. Foreground advertising particles
        # ----------------------------------------------------

        add_particles(
            canvas,
            poster_style,
            prompt,
            config,
        )

        # ----------------------------------------------------
        # 9. Cinematic vignette
        # ----------------------------------------------------

        add_vignette(
            canvas,
            strength=78,
        )

        # ----------------------------------------------------
        # 10. Professional typography
        # ----------------------------------------------------

        add_advertising_text(
            canvas,
            config,
            format,
        )

        # ----------------------------------------------------
        # 11. Export
        # ----------------------------------------------------

        final_image = canvas.convert("RGB")

        output = io.BytesIO()

        final_image.save(
            output,
            format="JPEG",
            quality=95,
            optimize=True,
        )

        output.seek(0)

        encoded = base64.b64encode(
            output.getvalue()
        ).decode("utf-8")

        poster_url = (
            "data:image/jpeg;base64,"
            + encoded
        )

        print("V5 poster generated successfully.")

        return {
            "success": True,
            "poster_url": poster_url,
            "message": (
                f"{poster_style} AI advertisement "
                "generated successfully!"
            ),
        }

    except Exception as error:
        print("V5 POSTER ERROR:", error)

        return {
            "success": False,
            "poster_url": None,
            "message": str(error),
        }