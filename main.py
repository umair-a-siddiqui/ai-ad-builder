from fastapi import FastAPI, UploadFile, File, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from jobs import generate_poster_job
from dotenv import load_dotenv
import os, base64, uuid, uvicorn

load_dotenv()
app = FastAPI(title="AI Ad Builder API", version="1.1.0")

job_store = {}

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://ai-ad-builder-eight.vercel.app",
        "http://localhost:5173",
        "http://localhost:3000",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def run_poster_task_in_background(
    job_id: str, 
    poster_style: str, 
    format: str, 
    prompt: str, 
    image_data_uri: str,
    headline: str = None,
    tagline: str = None,
    cta_text: str = None
):
    try:
        job_store[job_id] = {"status": "started", "result": None}
        result = generate_poster_job(
            poster_style, 
            format, 
            prompt, 
            image_data_uri,
            headline=headline,
            tagline=tagline,
            cta_text=cta_text
        )
        job_store[job_id] = {"status": "finished", "result": result}
    except Exception as error:
        job_store[job_id] = {"status": "failed", "error": str(error)}

@app.get("/")
def home():
    return {"success": True, "message": "AI Ad Builder API is running!"}

@app.get("/health")
def health():
    return {"success": True, "mode": "Direct Async (No Redis)"}

@app.get("/job-status/{job_id}")
def job_status(job_id: str):
    job = job_store.get(job_id)
    if not job:
        return {"success": False, "status": "not_found", "error": "Job ID not found or server restarted."}

    status = job.get("status")
    if status == "finished":
        return {"success": True, "job_id": job_id, "status": "finished", "result": job.get("result")}
    if status == "failed":
        return {"success": False, "job_id": job_id, "status": "failed", "error": job.get("error", "Generation failed.")}

    return {"success": True, "job_id": job_id, "status": status}

@app.post("/generate-premium-poster")
async def generate_premium_poster(
    background_tasks: BackgroundTasks,
    poster_style: str = Form(...),
    format: str = Form(...),
    prompt: str = Form(...),
    product_image: UploadFile = File(...),
    headline: str = Form(None),
    tagline: str = Form(None),
    cta_text: str = Form(None),
):
    try:
        image_bytes = await product_image.read()
        if not image_bytes:
            return {"success": False, "error": "Product image is required."}

        image_base64 = base64.b64encode(image_bytes).decode("utf-8")
        content_type = product_image.content_type or "image/jpeg"
        image_data_uri = f"data:{content_type};base64,{image_base64}"

        job_id = str(uuid.uuid4())
        job_store[job_id] = {"status": "queued", "result": None}

        background_tasks.add_task(
            run_poster_task_in_background,
            job_id,
            poster_style,
            format,
            prompt,
            image_data_uri,
            headline=headline,
            tagline=tagline,
            cta_text=cta_text
        )

        return {"success": True, "message": "Premium poster generation job started!", "job_id": job_id}

    except Exception as error:
        return {"success": False, "error": str(error)}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)