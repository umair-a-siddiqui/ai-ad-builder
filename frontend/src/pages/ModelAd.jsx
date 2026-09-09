import { useState } from "react";
import {
  ArrowLeft,
  Sparkles,
  Upload,
  Play,
  Download,
  ExternalLink,
  RotateCcw,
  LoaderCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";

function ModelAd({ onBack }) {
  const [model, setModel] = useState("female");
  const [productImage, setProductImage] = useState(null);
  const [style, setStyle] = useState("Luxury");
  const [format, setFormat] = useState("Instagram Reel");
  const [prompt, setPrompt] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [jobStatus, setJobStatus] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  const styles = ["Luxury", "Modern", "Cinematic", "Minimal"];
  const formats = ["Instagram Reel", "TikTok", "YouTube"];

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function checkJobStatus(jobId) {
    while (true) {
      await sleep(2000);

      const response = await fetch(
        `http://127.0.0.1:8000/job-status/${jobId}`
      );

      if (!response.ok) {
        throw new Error("Could not check video status.");
      }

      const data = await response.json();

      console.log("Job status:", data);

      if (data.status === "queued") {
        setJobStatus("queued");
        setMessage("Your video is waiting in the queue...");
      }

      if (data.status === "started") {
        setJobStatus("started");
        setMessage("AI is creating your advertisement...");
      }

      if (data.status === "finished") {
        setJobStatus("finished");
        setMessage("Your advertisement is ready.");

        if (data.result?.video_url) {
          setVideoUrl(data.result.video_url);
        }

        return;
      }

      if (data.status === "failed") {
        setJobStatus("failed");
        setMessage(data.error || "Video generation failed.");
        return;
      }

      if (data.success === false) {
        throw new Error(data.error || "Could not get job status.");
      }
    }
  }

  async function generateModelAd() {
    if (!productImage) {
      setJobStatus("failed");
      setMessage("Please upload your product image first.");
      return;
    }

    setLoading(true);
    setMessage("Sending your request...");
    setJobStatus("queued");
    setVideoUrl("");

    try {
      const formData = new FormData();

      formData.append("model", model);
      formData.append("style", style);
      formData.append("format", format);
      formData.append("prompt", prompt);
      formData.append("product_image", productImage);

      const response = await fetch(
        "http://127.0.0.1:8000/generate-model-ad",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error("Backend request failed.");
      }

      const data = await response.json();

      console.log("Backend response:", data);

      if (!data.job_id) {
        throw new Error("Backend did not return a job ID.");
      }

      setJobStatus("queued");
      setMessage("Video generation job queued.");

      await checkJobStatus(data.job_id);
    } catch (error) {
      console.error(error);
      setJobStatus("failed");
      setMessage(
        error.message ||
          "Could not connect to the backend. Make sure FastAPI is running."
      );
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setProductImage(null);
    setPrompt("");
    setMessage("");
    setJobStatus("");
    setVideoUrl("");
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[#08090d] text-white">
      <nav className="flex items-center justify-between border-b border-white/10 px-8 py-5">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-white/60 transition hover:text-white"
        >
          <ArrowLeft size={18} />
          Back
        </button>

        <div className="flex items-center gap-2 font-semibold">
          <Sparkles size={19} className="text-purple-400" />
          Model Ad
        </div>

        <div />
      </nav>

      <main className="mx-auto max-w-5xl px-6 py-14">
        <div className="mb-10">
          <p className="text-sm font-medium tracking-wider text-purple-400">
            AI VIDEO CREATOR
          </p>

          <h1 className="mt-3 text-4xl font-bold md:text-5xl">
            Create your product video
          </h1>

          <p className="mt-4 max-w-2xl leading-7 text-white/50">
            Upload your product, choose your advertising style, and create a
            professional AI-powered video advertisement.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-7">
            <h2 className="text-xl font-semibold">Choose your model</h2>

            <p className="mt-2 text-sm text-white/40">
              Select the person who will appear in your advertisement.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <button
                onClick={() => setModel("female")}
                className={`rounded-2xl p-7 text-center transition ${
                  model === "female"
                    ? "border border-purple-400/50 bg-purple-500/10"
                    : "border border-white/10 bg-white/5 hover:bg-white/10"
                }`}
              >
                <div className="text-5xl">👩</div>
                <p className="mt-4 font-medium">Female</p>

                {model === "female" && (
                  <p className="mt-2 text-xs text-purple-300">Selected</p>
                )}
              </button>

              <button
                onClick={() => setModel("male")}
                className={`rounded-2xl p-7 text-center transition ${
                  model === "male"
                    ? "border border-purple-400/50 bg-purple-500/10"
                    : "border border-white/10 bg-white/5 hover:bg-white/10"
                }`}
              >
                <div className="text-5xl">👨</div>
                <p className="mt-4 font-medium">Male</p>

                {model === "male" && (
                  <p className="mt-2 text-xs text-purple-300">Selected</p>
                )}
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-7">
            <h2 className="text-xl font-semibold">Your product</h2>

            <p className="mt-2 text-sm text-white/40">
              Upload a clear image of your product.
            </p>

            <div className="mt-6">
              <input
                id="product-upload"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];

                  if (file) {
                    setProductImage(file);
                    setVideoUrl("");
                    setMessage("");
                    setJobStatus("");
                  }
                }}
              />

              <label
                htmlFor="product-upload"
                className="flex min-h-48 cursor-pointer items-center justify-center rounded-2xl border border-dashed border-white/15 bg-black/20 p-4 transition hover:border-purple-400/50 hover:bg-white/5"
              >
                {productImage ? (
                  <div className="text-center">
                    <img
                      src={URL.createObjectURL(productImage)}
                      alt="Uploaded product"
                      className="mx-auto max-h-40 max-w-full rounded-xl object-contain"
                    />

                    <p className="mt-3 text-xs text-white/40">
                      Click to change image
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload size={30} className="mx-auto text-white/40" />

                    <p className="mt-4 text-white/60">
                      Upload your product
                    </p>

                    <p className="mt-2 text-sm text-white/30">
                      PNG, JPG or WEBP
                    </p>

                    <span className="mt-5 inline-block rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black">
                      Choose Product
                    </span>
                  </div>
                )}
              </label>
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-7">
          <h2 className="text-xl font-semibold">Ad style</h2>

          <p className="mt-2 text-sm text-white/40">
            Choose the visual direction for your advertisement.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            {styles.map((item) => (
              <button
                key={item}
                onClick={() => setStyle(item)}
                className={`rounded-2xl px-4 py-4 text-sm font-medium transition ${
                  style === item
                    ? "border border-purple-400/50 bg-purple-500/10 text-purple-200"
                    : "border border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-7">
          <h2 className="text-xl font-semibold">Video format</h2>

          <p className="mt-2 text-sm text-white/40">
            Select where you plan to publish the advertisement.
          </p>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {formats.map((item) => (
              <button
                key={item}
                onClick={() => setFormat(item)}
                className={`rounded-2xl px-4 py-4 text-sm font-medium transition ${
                  format === item
                    ? "border border-purple-400/50 bg-purple-500/10 text-purple-200"
                    : "border border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-7">
          <h2 className="text-xl font-semibold">
            Describe your advertisement
          </h2>

          <p className="mt-2 text-sm text-white/40">
            Tell the AI how you want your product advertisement to look.
          </p>

          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Example: Create a luxury lotion advertisement with dramatic lighting, slow camera movement, elegant atmosphere, and premium cinematic visuals."
            className="mt-6 min-h-32 w-full resize-none rounded-2xl border border-white/10 bg-black/20 p-5 text-sm leading-6 text-white outline-none placeholder:text-white/25 focus:border-purple-400/50"
          />
        </section>

        <button
          onClick={generateModelAd}
          disabled={loading}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 py-4 font-semibold transition hover:scale-[1.01] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <LoaderCircle size={18} className="animate-spin" />
          ) : (
            <Play size={18} />
          )}

          {loading ? "Creating your video..." : "Generate AI Video"}
        </button>

        {message && (
          <div className="mt-5 flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center text-sm text-white/70">
            {(jobStatus === "queued" || jobStatus === "started") && (
              <LoaderCircle
                size={18}
                className="animate-spin text-purple-300"
              />
            )}

            {jobStatus === "finished" && (
              <CheckCircle2 size={18} className="text-green-400" />
            )}

            {jobStatus === "failed" && (
              <XCircle size={18} className="text-red-400" />
            )}

            {message}
          </div>
        )}

        {videoUrl && (
          <section className="mt-8 rounded-3xl border border-purple-400/20 bg-white/[0.04] p-7">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium tracking-wider text-purple-400">
                  VIDEO READY
                </p>

                <h2 className="mt-2 text-2xl font-semibold">
                  Your advertisement
                </h2>

                <p className="mt-2 text-sm text-white/40">
                  Preview your generated video below.
                </p>
              </div>

              <CheckCircle2
                size={28}
                className="shrink-0 text-green-400"
              />
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
              <video
                src={videoUrl}
                controls
                className="w-full"
              />
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <a
                href={videoUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3.5 font-medium transition hover:bg-white/10"
              >
                <ExternalLink size={18} />
                Open Video
              </a>

              <a
                href={videoUrl}
                download="ai-product-ad.mp4"
                className="flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3.5 font-semibold text-black transition hover:bg-white/90"
              >
                <Download size={18} />
                Download Video
              </a>
            </div>

            <button
              onClick={resetForm}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 px-5 py-3.5 text-sm font-medium text-white/70 transition hover:bg-white/5 hover:text-white"
            >
              <RotateCcw size={17} />
              Create Another Video
            </button>
          </section>
        )}
      </main>
    </div>
  );
}

export default ModelAd;