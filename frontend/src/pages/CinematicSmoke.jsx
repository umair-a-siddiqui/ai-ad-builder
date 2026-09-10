import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Film,
  Sparkles,
  Upload,
  Play,
  Download,
  ExternalLink,
  RotateCcw,
  LoaderCircle,
  CheckCircle2,
  XCircle,
  WandSparkles,
  MonitorPlay,
  Image as ImageIcon,
} from "lucide-react";

function CinematicSmoke({ onBack }) {
  const [productImage, setProductImage] = useState(null);
  const [smokeStyle, setSmokeStyle] = useState("Dark Smoke");
  const [format, setFormat] = useState("Instagram Reel");
  const [prompt, setPrompt] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [jobStatus, setJobStatus] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  const smokeStyles = [
    "Dark Smoke",
    "Luxury Mist",
    "Neon Fog",
    "Fire & Smoke",
  ];

  const formats = ["Instagram Reel", "TikTok", "YouTube"];

  const imagePreview = useMemo(() => {
    if (!productImage) return "";

    return URL.createObjectURL(productImage);
  }, [productImage]);

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function checkJobStatus(jobId) {
    while (true) {
      await sleep(2000);

      const response = await fetch(
        `https://ai-ad-builder-production.up.railway.app/job-status/${jobId}`
      );

      if (!response.ok) {
        throw new Error("Could not check video status.");
      }

      const data = await response.json();

      console.log("Cinematic job status:", data);

      if (data.status === "queued") {
        setJobStatus("queued");
        setMessage("Your cinematic video is waiting in the queue...");
      }

      if (data.status === "started") {
        setJobStatus("started");
        setMessage("Creating your cinematic advertisement...");
      }

      if (data.status === "finished") {
        if (data.result?.success && data.result?.video_url) {
          setJobStatus("finished");
          setMessage("Your cinematic advertisement is ready!");
          setVideoUrl(data.result.video_url);
        } else {
          setJobStatus("failed");
          setMessage(
            data.result?.message ||
            "Video generation failed. No video was returned."
          );
        }

        return;
  }
      if (data.status === "failed") {
        setJobStatus("failed");
        setMessage(data.error || "Cinematic video generation failed.");
        return;
      }

      if (data.success === false) {
        throw new Error(data.error || "Could not get job status.");
      }
    }
  }

  async function generateCinematicVideo() {
    if (!productImage) {
      setJobStatus("failed");
      setMessage("Please upload your product image first.");
      return;
    }

    setLoading(true);
    setMessage("Sending your cinematic request...");
    setJobStatus("queued");
    setVideoUrl("");

    try {
      const formData = new FormData();

      formData.append("smoke_style", smokeStyle);
      formData.append("format", format);
      formData.append("prompt", prompt);
      formData.append("product_image", productImage);

      const response = await fetch(
        "https://ai-ad-builder-production.up.railway.app/generate-cinematic-smoke",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error("Backend request failed.");
      }

      const data = await response.json();

      console.log("Cinematic backend response:", data);

      if (!data.job_id) {
        throw new Error("Backend did not return a job ID.");
      }

      setJobStatus("queued");
      setMessage("Cinematic video job queued.");

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
    <div className="relative min-h-screen overflow-hidden bg-[#050509] text-white">

      {/* Background */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -left-40 top-20 h-[500px] w-[500px] rounded-full bg-purple-700/15 blur-[150px]" />

        <div className="absolute right-[-180px] top-[250px] h-[550px] w-[550px] rounded-full bg-blue-700/10 blur-[170px]" />

        <div className="absolute bottom-[-200px] left-[35%] h-[500px] w-[500px] rounded-full bg-fuchsia-700/10 blur-[170px]" />
      </div>

      {/* Navigation */}
      <nav className="relative z-20 border-b border-white/[0.06] bg-black/10 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-8">

          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-white/45 transition hover:text-white"
          >
            <ArrowLeft size={17} />
            Back to Studio
          </button>

          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-purple-400/20 bg-purple-500/10">
              <Film size={17} className="text-purple-300" />
            </div>

            <div>
              <p className="text-sm font-semibold">
                Cinematic Studio
              </p>

              <p className="text-[9px] uppercase tracking-[0.22em] text-white/25">
                AI Video Generation
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-2 text-xs text-white/30 sm:flex">
            <div className="h-2 w-2 rounded-full bg-green-400" />
            Studio Online
          </div>
        </div>
      </nav>

      <main className="relative z-10 mx-auto max-w-7xl px-6 pb-24 pt-12 lg:px-8">

        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.25em] text-purple-300/70">
            <Sparkles size={14} />
            Cinematic AI
          </div>

          <h1 className="max-w-3xl text-4xl font-bold tracking-[-0.035em] md:text-5xl">
            Turn your product into a
            <span className="bg-gradient-to-r from-purple-300 via-fuchsia-300 to-blue-300 bg-clip-text text-transparent">
              {" "}cinematic experience.
            </span>
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/40">
            Upload your product, choose the atmosphere and let AI build
            a premium cinematic advertisement around it.
          </p>
        </motion.div>

        {/* Studio */}
        <div className="grid gap-6 xl:grid-cols-[430px_1fr]">

          {/* LEFT CONTROL PANEL */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-5"
          >

            {/* Upload */}
            <StudioPanel
              number="01"
              title="Product"
              subtitle="Upload your source image"
            >
              <input
                id="smoke-product-upload"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];

                  if (file) {
                    setProductImage(file);
                    setMessage("");
                    setJobStatus("");
                    setVideoUrl("");
                  }
                }}
              />

              <label
                htmlFor="smoke-product-upload"
                className="group mt-5 flex min-h-[210px] cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 transition hover:border-purple-400/40 hover:bg-purple-500/[0.03]"
              >
                {productImage ? (
                  <div className="w-full text-center">

                    <img
                      src={imagePreview}
                      alt="Uploaded product"
                      className="mx-auto max-h-[170px] max-w-full rounded-xl object-contain"
                    />

                    <p className="mt-3 text-xs text-white/30">
                      Click to replace image
                    </p>

                  </div>
                ) : (
                  <div className="text-center">

                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] transition group-hover:border-purple-400/30 group-hover:bg-purple-500/10">
                      <Upload
                        size={22}
                        className="text-purple-200"
                      />
                    </div>

                    <p className="mt-4 text-sm font-medium">
                      Drop your product here
                    </p>

                    <p className="mt-1 text-xs text-white/30">
                      PNG, JPG or WEBP
                    </p>

                  </div>
                )}
              </label>
            </StudioPanel>

            {/* Style */}
            <StudioPanel
              number="02"
              title="Atmosphere"
              subtitle="Choose your visual direction"
            >
              <div className="mt-5 grid grid-cols-2 gap-2.5">
                {smokeStyles.map((item) => (
                  <button
                    key={item}
                    onClick={() => setSmokeStyle(item)}
                    className={`rounded-xl border px-3 py-3 text-xs font-medium transition ${
                      smokeStyle === item
                        ? "border-purple-400/40 bg-purple-500/10 text-purple-200"
                        : "border-white/[0.07] bg-white/[0.025] text-white/45 hover:bg-white/[0.05] hover:text-white/70"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </StudioPanel>

            {/* Format */}
            <StudioPanel
              number="03"
              title="Output"
              subtitle="Select your publishing format"
            >
              <div className="mt-5 grid grid-cols-3 gap-2">
                {formats.map((item) => (
                  <button
                    key={item}
                    onClick={() => setFormat(item)}
                    className={`rounded-xl border px-2 py-3 text-[11px] font-medium transition ${
                      format === item
                        ? "border-purple-400/40 bg-purple-500/10 text-purple-200"
                        : "border-white/[0.07] bg-white/[0.025] text-white/40 hover:bg-white/[0.05]"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </StudioPanel>

          </motion.div>

          {/* RIGHT WORKSPACE */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-[30px] border border-white/[0.08] bg-white/[0.025] p-5 backdrop-blur-xl md:p-7"
          >

            {/* Workspace header */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.06] pb-5">

              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-200">
                  <MonitorPlay size={19} />
                </div>

                <div>
                  <h2 className="text-sm font-semibold">
                    Generation Workspace
                  </h2>

                  <p className="mt-0.5 text-xs text-white/30">
                    Preview & creative direction
                  </p>
                </div>
              </div>

              <div className="rounded-full border border-white/[0.07] bg-black/20 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-white/30">
                {format}
              </div>

            </div>

            {/* Preview */}
            <div className="relative mt-6 flex min-h-[440px] items-center justify-center overflow-hidden rounded-[24px] border border-white/[0.07] bg-black/30">

              <div className="absolute inset-0 bg-gradient-to-b from-purple-500/[0.03] to-transparent" />

              {videoUrl ? (
                <video
                  src={videoUrl}
                  controls
                  className="relative z-10 max-h-[560px] w-full object-contain"
                />
              ) : productImage ? (
                <div className="relative z-10 flex h-full w-full items-center justify-center p-10">

                  <div className="absolute h-[280px] w-[280px] rounded-full bg-purple-600/15 blur-[100px]" />

                  <motion.img
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    src={imagePreview}
                    alt="Product preview"
                    className="relative z-10 max-h-[350px] max-w-[75%] rounded-2xl object-contain shadow-2xl"
                  />

                </div>
              ) : (
                <div className="relative z-10 max-w-xs text-center">

                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[24px] border border-purple-400/15 bg-purple-500/[0.06]">
                    <ImageIcon
                      size={30}
                      className="text-purple-200/60"
                    />
                  </div>

                  <h3 className="mt-5 text-sm font-medium text-white/70">
                    Your product preview
                  </h3>

                  <p className="mt-2 text-xs leading-5 text-white/25">
                    Upload a product image and it will appear here before
                    cinematic generation.
                  </p>

                </div>
              )}

              {/* Preview corner decoration */}
              <div className="absolute left-5 top-5 flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] text-white/20">
                <div className="h-1.5 w-1.5 rounded-full bg-purple-300" />
                AI Preview
              </div>

            </div>

            {/* Prompt */}
            <div className="mt-6">

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium">
                    Creative Direction
                  </h3>

                  <p className="mt-1 text-xs text-white/30">
                    Tell AI how the scene should look and move.
                  </p>
                </div>

                <WandSparkles
                  size={18}
                  className="text-purple-300/60"
                />
              </div>

              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Example: Product slowly rotates on a glossy black platform while soft smoke moves around it. Dramatic rim lighting, luxury commercial style, slow camera push-in..."
                className="mt-4 min-h-[125px] w-full resize-none rounded-2xl border border-white/[0.08] bg-black/25 p-4 text-sm leading-6 text-white outline-none transition placeholder:text-white/20 focus:border-purple-400/40"
              />

            </div>

            {/* Generate */}
            <button
              onClick={generateCinematicVideo}
              disabled={loading}
              className="group mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-500 via-fuchsia-500 to-purple-500 px-5 py-4 text-sm font-semibold shadow-lg shadow-purple-950/20 transition hover:scale-[1.01] hover:shadow-purple-900/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <LoaderCircle
                  size={18}
                  className="animate-spin"
                />
              ) : (
                <Play size={17} />
              )}

              {loading
                ? "Creating Cinematic Experience..."
                : "Generate Cinematic Ad"}

              {!loading && (
                <Sparkles
                  size={15}
                  className="ml-1 opacity-60"
                />
              )}
            </button>

            {/* Status */}
            {message && (
              <div
                className={`mt-4 flex items-center gap-3 rounded-2xl border p-4 text-xs ${
                  jobStatus === "failed"
                    ? "border-red-400/15 bg-red-500/[0.05] text-red-200"
                    : jobStatus === "finished"
                    ? "border-green-400/15 bg-green-500/[0.05] text-green-200"
                    : "border-purple-400/15 bg-purple-500/[0.05] text-purple-100"
                }`}
              >
                {(jobStatus === "queued" ||
                  jobStatus === "started") && (
                  <LoaderCircle
                    size={17}
                    className="shrink-0 animate-spin"
                  />
                )}

                {jobStatus === "finished" && (
                  <CheckCircle2
                    size={17}
                    className="shrink-0"
                  />
                )}

                {jobStatus === "failed" && (
                  <XCircle
                    size={17}
                    className="shrink-0"
                  />
                )}

                {message}
              </div>
            )}

            {/* Video controls */}
            {videoUrl && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-5"
              >

                <div className="mb-4 flex items-center gap-2 text-xs text-green-300">
                  <CheckCircle2 size={16} />
                  Cinematic advertisement ready
                </div>

                <div className="grid gap-3 sm:grid-cols-2">

                  <a
                    href={videoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white/70 transition hover:bg-white/[0.07] hover:text-white"
                  >
                    <ExternalLink size={16} />
                    Open Video
                  </a>

                  <a
                    href={videoUrl}
                    download="cinematic-product-ad.mp4"
                    className="flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:scale-[1.01]"
                  >
                    <Download size={16} />
                    Download
                  </a>

                </div>

                <button
                  onClick={resetForm}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.07] px-4 py-3 text-xs text-white/40 transition hover:bg-white/[0.04] hover:text-white/70"
                >
                  <RotateCcw size={15} />
                  Create Another Video
                </button>

              </motion.div>
            )}

          </motion.div>
        </div>

      </main>
    </div>
  );
}


function StudioPanel({ number, title, subtitle, children }) {
  return (
    <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.025] p-5 backdrop-blur-xl">

      <div className="flex items-start justify-between">

        <div>
          <h2 className="text-sm font-semibold">
            {title}
          </h2>

          <p className="mt-1 text-xs text-white/30">
            {subtitle}
          </p>
        </div>

        <span className="text-[10px] font-medium tracking-[0.18em] text-purple-300/40">
          {number}
        </span>

      </div>

      {children}

    </div>
  );
}

export default CinematicSmoke;


