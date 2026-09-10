from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware

from redis_queue import video_queue, redis_connection
from jobs import generate_video_job, generate_poster_job

from rq.job import Job
from dotenv import load_dotenv
from google import genai
from groq import Groq

import httpx
import os
import base64


# ==================================================
# ENVIRONMENT VARIABLES
# ==================================================

load_dotenv()

gemini_api_key = os.getenv("GEMINI_API_KEY")
groq_api_key = os.getenv("GROQ_API_KEY")
openrouter_api_key = os.getenv("OPENROUTER_API_KEY")

# Optional URL used only as an OpenRouter header.
frontend_url = os.getenv(
    "FRONTEND_URL",
    "https://adnova-ai-liard.vercel.app",
)


# ==================================================
# AI CLIENTS
# ==================================================
# Do not crash the entire API if one description provider
# is unavailable. Poster/Cinematic should still stay online.

gemini_client = (
    genai.Client(api_key=gemini_api_key)
    if gemini_api_key
    else None
)

groq_client = (
    Groq(api_key=groq_api_key)
    if groq_api_key
    else None
)


# ==================================================
# FASTAPI APP
# ==================================================

app = FastAPI(
    title="AI Ad Builder API",
    version="1.1.0",
)


# ==================================================
# CORS
# ==================================================
# Local Vite development + all Vercel preview/production URLs.

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_origin_regex=r"^https://([a-zA-Z0-9-]+\.)*vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================================================
# HOME / HEALTH
# ==================================================

@app.get("/")
def home():
    return {
        "success": True,
        "message": "AI Ad Builder API is running!",
    }


@app.get("/health")
def health():
    return {
        "success": True,
        "redis_configured": bool(os.getenv("REDIS_URL")),
        "gemini_configured": bool(gemini_api_key),
        "groq_configured": bool(groq_api_key),
        "openrouter_configured": bool(openrouter_api_key),
    }


# ==================================================
# JOB STATUS
# ==================================================

@app.get("/job-status/{job_id}")
def job_status(job_id: str):
    try:
        job = Job.fetch(
            job_id,
            connection=redis_connection,
        )

        status = job.get_status(refresh=True)

        # If the RQ job finished normally but the job function itself
        # returned {"success": False}, expose that as a real failure.
        if job.is_finished:
            result = job.result

            if (
                isinstance(result, dict)
                and result.get("success") is False
            ):
                error_message = (
                    result.get("message")
                    or result.get("error")
                    or "Generation failed."
                )

                return {
                    "success": False,
                    "job_id": job.id,
                    "status": "failed",
                    "error": error_message,
                    "result": result,
                }

            return {
                "success": True,
                "job_id": job.id,
                "status": "finished",
                "result": result,
            }

        if job.is_failed:
            error_message = "Generation failed."

            try:
                if job.exc_info:
                    # Keep response short while still making Railway/frontend
                    # debugging useful.
                    error_message = job.exc_info.strip().splitlines()[-1]
            except Exception:
                pass

            return {
                "success": False,
                "job_id": job.id,
                "status": "failed",
                "error": error_message,
            }

        return {
            "success": True,
            "job_id": job.id,
            "status": status,
        }

    except Exception as error:
        return {
            "success": False,
            "status": "failed",
            "error": str(error),
        }


# ==================================================
# CINEMATIC AD
# ==================================================

@app.post("/generate-cinematic-smoke")
async def generate_cinematic_smoke(
    smoke_style: str = Form(...),
    format: str = Form(...),
    prompt: str = Form(...),
    product_image: UploadFile = File(...),
):
    try:
        image_bytes = await product_image.read()

        if not image_bytes:
            return {
                "success": False,
                "error": "Product image is required.",
            }

        image_base64 = base64.b64encode(
            image_bytes
        ).decode("utf-8")

        content_type = (
            product_image.content_type
            or "image/jpeg"
        )

        image_data_uri = (
            f"data:{content_type};base64,{image_base64}"
        )

        full_prompt = f"""
Create a premium cinematic product advertisement.

Visual style:
{smoke_style}

Use dramatic smoke, fog, studio lighting,
smooth camera movement, premium product
presentation, and cinematic atmosphere.

Product:
Use the uploaded product image accurately.

Keep the branding, packaging, colors,
logo, shape, and overall appearance consistent.

Video format:
{format}

Creative direction:
{prompt}
"""

        job = video_queue.enqueue(
            generate_video_job,
            full_prompt,
            image_data_uri,
            job_timeout=900,
        )

        return {
            "success": True,
            "message": "Cinematic video generation job queued!",
            "job_id": job.id,
        }

    except Exception as error:
        print(
            "Cinematic generation error:",
            str(error),
        )

        return {
            "success": False,
            "error": str(error),
        }


# ==================================================
# PREMIUM POSTER
# ==================================================

@app.post("/generate-premium-poster")
async def generate_premium_poster(
    poster_style: str = Form(...),
    format: str = Form(...),
    prompt: str = Form(...),
    product_image: UploadFile = File(...),
):
    try:
        image_bytes = await product_image.read()

        if not image_bytes:
            return {
                "success": False,
                "error": "Product image is required.",
            }

        image_base64 = base64.b64encode(
            image_bytes
        ).decode("utf-8")

        content_type = (
            product_image.content_type
            or "image/jpeg"
        )

        image_data_uri = (
            f"data:{content_type};base64,{image_base64}"
        )

        job = video_queue.enqueue(
            generate_poster_job,
            poster_style,
            format,
            prompt,
            image_data_uri,
            job_timeout=900,
        )

        return {
            "success": True,
            "message": "Premium poster generation job queued!",
            "job_id": job.id,
        }

    except Exception as error:
        print(
            "Poster generation error:",
            str(error),
        )

        return {
            "success": False,
            "error": str(error),
        }


# ==================================================
# PRODUCT DESCRIPTION
# ==================================================

@app.post("/generate-description")
async def generate_description(
    product_name: str = Form(""),
    details: str = Form(""),
    tone: str = Form("Professional"),
    product_image: UploadFile = File(...),
):
    image_bytes = await product_image.read()

    if not image_bytes:
        return {
            "success": False,
            "provider": None,
            "description": "",
            "error": "Product image is required.",
        }

    mime_type = (
        product_image.content_type
        or "image/jpeg"
    )

    prompt = f"""
You are a professional ecommerce copywriter
and product marketing expert.

Analyze the uploaded product image carefully.

Create a polished marketing description
for the product.

Product name provided by user:
{product_name if product_name else "Not provided - identify the product from the image if possible"}

Additional information provided by user:
{details if details else "No additional details provided"}

Writing style:
{tone}

Requirements:

- Accurately understand the visible product.
- Write natural and professional marketing copy.
- Highlight visible or user-provided features.
- Explain realistic customer benefits.
- Match the requested writing style.
- Make the description useful for ecommerce,
  websites, advertising, and social media.
- Do not invent ingredients.
- Do not invent specifications.
- Do not invent certifications.
- Do not invent medical claims.
- Do not invent dimensions.
- Do not invent materials or product features
  that are not visible or user-provided.
- Do not mention that you are an AI.
- Do not explain your analysis.
- Return only the finished product description.
"""

    errors: list[str] = []

    # ==================================================
    # PROVIDER 1: GEMINI
    # ==================================================

    if gemini_client:
        try:
            image_part = {
                "inline_data": {
                    "mime_type": mime_type,
                    "data": image_bytes,
                }
            }

            response = (
                gemini_client
                .models
                .generate_content(
                    model="gemini-3-flash-preview",
                    contents=[
                        image_part,
                        prompt,
                    ],
                )
            )

            description = (
                response.text
                if response
                else ""
            )

            if not description:
                raise RuntimeError(
                    "Gemini returned an empty description."
                )

            return {
                "success": True,
                "provider": "gemini",
                "description": description.strip(),
            }

        except Exception as gemini_error:
            errors.append(
                f"Gemini: {gemini_error}"
            )

            print(
                "Gemini description error:",
                str(gemini_error),
            )

            print("Trying Groq fallback...")

    else:
        errors.append(
            "Gemini: GEMINI_API_KEY is not configured."
        )

    # ==================================================
    # PROVIDER 2: GROQ
    # ==================================================

    if groq_client:
        try:
            encoded_image = base64.b64encode(
                image_bytes
            ).decode("utf-8")

            image_data_url = (
                f"data:{mime_type};base64,{encoded_image}"
            )

            groq_response = (
                groq_client
                .chat
                .completions
                .create(
                    model="qwen/qwen3.6-27b",
                    messages=[
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "text",
                                    "text": prompt,
                                },
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": image_data_url,
                                    },
                                },
                            ],
                        }
                    ],
                    temperature=0.7,
                    max_completion_tokens=800,
                )
            )

            description = (
                groq_response
                .choices[0]
                .message
                .content
            )

            if not description:
                raise RuntimeError(
                    "Groq returned an empty description."
                )

            return {
                "success": True,
                "provider": "groq",
                "description": description.strip(),
            }

        except Exception as groq_error:
            errors.append(
                f"Groq: {groq_error}"
            )

            print(
                "Groq description error:",
                str(groq_error),
            )

            print("Trying OpenRouter fallback...")

    else:
        errors.append(
            "Groq: GROQ_API_KEY is not configured."
        )

    # ==================================================
    # PROVIDER 3: OPENROUTER
    # ==================================================

    if openrouter_api_key:
        openrouter_prompt = f"""
You are a professional ecommerce copywriter.

Create a polished product description using
ONLY the information supplied below.

Product name:
{product_name if product_name else "Not provided"}

Product details:
{details if details else "No additional details provided"}

Writing style:
{tone}

Requirements:

- Write professional ecommerce marketing copy.
- Do not invent facts.
- Do not invent product specifications.
- Do not claim to have analyzed an image.
- Use only information provided by the user.
- If information is limited, keep the description
  general rather than making unsupported claims.
- Do not mention that you are an AI.
- Return only the finished product description.
"""

        try:
            async with httpx.AsyncClient(
                timeout=60.0
            ) as client:
                for attempt in range(1, 4):
                    print(
                        f"OpenRouter attempt {attempt}/3..."
                    )

                    openrouter_response = await client.post(
                        "https://openrouter.ai/api/v1/chat/completions",
                        headers={
                            "Authorization": (
                                f"Bearer {openrouter_api_key}"
                            ),
                            "Content-Type": "application/json",
                            "HTTP-Referer": frontend_url,
                            "X-Title": "AdNova AI",
                        },
                        json={
                            "model": "openrouter/free",
                            "messages": [
                                {
                                    "role": "user",
                                    "content": openrouter_prompt,
                                }
                            ],
                            "max_tokens": 700,
                            "reasoning": {
                                "exclude": True
                            },
                        },
                    )

                    openrouter_response.raise_for_status()

                    data = openrouter_response.json()
                    choices = data.get("choices", [])

                    if not choices:
                        print(
                            "OpenRouter returned no choices."
                        )
                        continue

                    message = (
                        choices[0]
                        .get("message", {})
                    )

                    description = (
                        message.get("content")
                        or ""
                    ).strip()

                    if description:
                        return {
                            "success": True,
                            "provider": "openrouter",
                            "description": description,
                        }

                    print(
                        "OpenRouter returned empty "
                        f"content on attempt {attempt}."
                    )

            raise RuntimeError(
                "OpenRouter returned empty content "
                "after 3 attempts."
            )

        except Exception as openrouter_error:
            errors.append(
                f"OpenRouter: {openrouter_error}"
            )

            print(
                "OpenRouter description error:",
                str(openrouter_error),
            )

    else:
        errors.append(
            "OpenRouter: OPENROUTER_API_KEY is not configured."
        )

    # ==================================================
    # ALL DESCRIPTION PROVIDERS FAILED
    # ==================================================

    return {
        "success": False,
        "provider": None,
        "description": "",
        "error": (
            "All product-description providers failed. "
            + " | ".join(errors)
        ),
    }
