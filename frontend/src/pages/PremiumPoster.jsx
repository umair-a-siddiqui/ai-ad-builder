import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Image,
  Sparkles,
  Upload,
  WandSparkles,
  LoaderCircle,
  Layers3,
  ImagePlus,
  Type,
} from "lucide-react";

// Local FastAPI Backend Endpoint
const API_BASE_URL = "https://ai-ad-builder.onrender.com";

function PremiumPoster({ onBack }) {
  const [productImage, setProductImage] = useState(null);
  const [posterStyle, setPosterStyle] = useState("Luxury");
  const [format, setFormat] = useState("Instagram Post");
  const [prompt, setPrompt] = useState("");

  // New Custom Ad Text State Variables
  const [headlineText, setHeadlineText] = useState("LEAVE AN IMPRESSION");
  const [taglineText, setTaglineText] = useState("A signature presence made to be remembered.");
  const [ctaText, setCtaText] = useState("DISCOVER MORE");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [jobStatus, setJobStatus] = useState("");
  const [posterUrl, setPosterUrl] = useState("");

  const posterStyles = ["Luxury", "Minimal", "Neon", "Studio"];
  const formats = ["Instagram Post", "Instagram Story", "Square", "Landscape"];

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
      await sleep(1500);

      const response = await fetch(`${API_BASE_URL}/job-status/${jobId}`);

      if (!response.ok) {
        throw new Error("Could not check poster status.");
      }

      const data = await response.json();
      console.log("Poster job status:", data);

      if (data.status === "queued") {
        setJobStatus("queued");
        setMessage("Your poster is waiting in queue...");
      }

      if (data.status === "started") {
        setJobStatus("started");
        setMessage("Creating your premium poster with local engine...");
      }

      if (data.status === "finished") {
        setJobStatus("finished");
        setMessage("Your premium poster is ready!");

        if (data.result?.poster_url) {
          setPosterUrl(data.result.poster_url);
        }
        return;
      }

      if (data.status === "failed") {
        setJobStatus("failed");
        setMessage(data.error || "Poster generation failed.");
        return;
      }
    }
  }

  async function generatePoster() {
    if (!productImage) {
      setJobStatus("failed");
      setMessage("Please upload your product image first.");
      return;
    }

    setLoading(true);
    setMessage("Sending request to local Python backend...");
    setJobStatus("queued");
    setPosterUrl("");

    try {
      const formData = new FormData();
      formData.append("poster_style", posterStyle);
      formData.append("format", format);
      formData.append("prompt", prompt);
      formData.append("product_image", productImage);

      // Append Custom Text Fields to Backend Body
      formData.append("headline", headlineText);
      formData.append("tagline", taglineText);
      formData.append("cta_text", ctaText);

      const response = await fetch(`${API_BASE_URL}/generate-premium-poster`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Backend request failed.");
      }

      const data = await response.json();
      console.log("Poster backend response:", data);

      if (!data.job_id) {
        throw new Error("Backend did not return a job ID.");
      }

      setJobStatus("queued");
      setMessage("Processing poster task...");

      await checkJobStatus(data.job_id);
    } catch (error) {
      console.error(error);
      setJobStatus("failed");
      setMessage(
        error.message || "Cannot reach FastAPI backend at " + API_BASE_URL
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050509] text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -left-40 top-24 h-[500px] w-[500px] rounded-full bg-fuchsia-700/12 blur-[160px]" />
        <div className="absolute right-[-150px] top-[250px] h-[520px] w-[520px] rounded-full bg-purple-700/12 blur-[170px]" />
        <div className="absolute bottom-[-220px] left-[35%] h-[500px] w-[500px] rounded-full bg-blue-700/10 blur-[170px]" />
      </div>

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
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-fuchsia-400/20 bg-fuchsia-500/10">
              <Image size={17} className="text-fuchsia-200" />
            </div>
            <div>
              <p className="text-sm font-semibold">Poster Studio</p>
              <p className="text-[9px] uppercase tracking-[0.22em] text-white/25">
                AI Image Generation
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-2 text-xs text-white/30 sm:flex">
            <div className="h-2 w-2 rounded-full bg-green-400" />
            Local Studio Connected
          </div>
        </div>
      </nav>

      <main className="relative z-10 mx-auto max-w-7xl px-6 pb-24 pt-12 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.25em] text-fuchsia-300/70">
            <Sparkles size={14} />
            Visual Campaign AI
          </div>
          <h1 className="max-w-3xl text-4xl font-bold tracking-[-0.035em] md:text-5xl">
            Build a poster that makes your
            <span className="bg-gradient-to-r from-fuchsia-300 via-purple-300 to-blue-300 bg-clip-text text-transparent">
              {" "}product stand out.
            </span>
          </h1>
        </motion.div>

        <div className="grid gap-6 xl:grid-cols-[430px_1fr]">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
            <StudioPanel number="01" title="Product" subtitle="Upload source image">
              <input
                id="poster-product-upload"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    setProductImage(file);
                    setMessage("");
                    setJobStatus("");
                    setPosterUrl("");
                  }
                }}
              />
              <label
                htmlFor="poster-product-upload"
                className="group mt-5 flex min-h-[210px] cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 transition hover:border-fuchsia-400/40"
              >
                {productImage ? (
                  <div className="w-full text-center">
                    <img src={imagePreview} alt="Uploaded product" className="mx-auto max-h-[170px] max-w-full rounded-xl object-contain" />
                    <p className="mt-3 text-xs text-white/30">Click to replace image</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                      <Upload size={22} className="text-fuchsia-200" />
                    </div>
                    <p className="mt-4 text-sm font-medium">Drop your product here</p>
                  </div>
                )}
              </label>
            </StudioPanel>

            {/* NEW PANEL: Custom Poster Copy */}
            <StudioPanel number="02" title="Ad Copy & Text" subtitle="Customize poster overlay text">
              <div className="mt-4 space-y-3">
                <div>
                  <label className="text-[11px] font-medium text-white/50">Headline</label>
                  <input
                    type="text"
                    value={headlineText}
                    onChange={(e) => setHeadlineText(e.target.value)}
                    placeholder="e.g., LEAVE AN IMPRESSION"
                    className="mt-1 w-full rounded-xl border border-white/[0.08] bg-black/25 px-3 py-2 text-xs text-white outline-none focus:border-fuchsia-400/40"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-white/50">Tagline</label>
                  <input
                    type="text"
                    value={taglineText}
                    onChange={(e) => setTaglineText(e.target.value)}
                    placeholder="e.g., A signature presence..."
                    className="mt-1 w-full rounded-xl border border-white/[0.08] bg-black/25 px-3 py-2 text-xs text-white outline-none focus:border-fuchsia-400/40"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-white/50">Call to Action (CTA)</label>
                  <input
                    type="text"
                    value={ctaText}
                    onChange={(e) => setCtaText(e.target.value)}
                    placeholder="e.g., DISCOVER MORE"
                    className="mt-1 w-full rounded-xl border border-white/[0.08] bg-black/25 px-3 py-2 text-xs text-white outline-none focus:border-fuchsia-400/40"
                  />
                </div>
              </div>
            </StudioPanel>

            <StudioPanel number="03" title="Visual Style" subtitle="Campaign direction">
              <div className="mt-5 grid grid-cols-2 gap-2.5">
                {posterStyles.map((item) => (
                  <button
                    key={item}
                    onClick={() => setPosterStyle(item)}
                    className={`rounded-xl border px-3 py-3 text-xs font-medium transition ${
                      posterStyle === item
                        ? "border-fuchsia-400/40 bg-fuchsia-500/10 text-fuchsia-200"
                        : "border-white/[0.07] bg-white/[0.025] text-white/45"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </StudioPanel>

            <StudioPanel number="04" title="Canvas" subtitle="Poster format">
              <div className="mt-5 grid grid-cols-2 gap-2.5">
                {formats.map((item) => (
                  <button
                    key={item}
                    onClick={() => setFormat(item)}
                    className={`rounded-xl border px-3 py-3 text-[11px] font-medium transition ${
                      format === item
                        ? "border-fuchsia-400/40 bg-fuchsia-500/10 text-fuchsia-200"
                        : "border-white/[0.07] bg-white/[0.025] text-white/40"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </StudioPanel>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="rounded-[30px] border border-white/[0.08] bg-white/[0.025] p-5 md:p-7">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.06] pb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-fuchsia-500/10 text-fuchsia-200">
                  <Layers3 size={19} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold">Poster Workspace</h2>
                  <p className="mt-0.5 text-xs text-white/30">Campaign preview & creative direction</p>
                </div>
              </div>
              <div className="rounded-full border border-white/[0.07] bg-black/20 px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] text-white/30">
                {format}
              </div>
            </div>

            <div className="relative mt-6 flex min-h-[440px] items-center justify-center overflow-hidden rounded-[24px] border border-white/[0.07] bg-black/30">
              {posterUrl ? (
                <img src={posterUrl} alt="Generated premium poster" className="relative z-10 max-h-[560px] max-w-full object-contain" />
              ) : productImage ? (
                <div className="relative z-10 flex h-full w-full items-center justify-center p-10">
                  <img src={imagePreview} alt="Product preview" className="relative z-10 max-h-[350px] max-w-[75%] rounded-2xl object-contain shadow-2xl" />
                </div>
              ) : (
                <div className="relative z-10 max-w-xs text-center">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[24px] border border-fuchsia-400/15 bg-fuchsia-500/[0.06]">
                    <ImagePlus size={30} className="text-fuchsia-200/60" />
                  </div>
                  <h3 className="mt-5 text-sm font-medium text-white/70">Your campaign canvas</h3>
                </div>
              )}
            </div>

            <div className="mt-6">
              <label className="text-xs text-white/50 font-medium">Background Prompt / Theme Details</label>
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Example: Luxury skincare campaign with warm studio lighting..."
                className="mt-2 min-h-[100px] w-full resize-none rounded-2xl border border-white/[0.08] bg-black/25 p-4 text-sm text-white outline-none focus:border-fuchsia-400/40"
              />
            </div>

            <button
              onClick={generatePoster}
              disabled={loading}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-purple-500 px-5 py-4 text-sm font-semibold hover:scale-[1.01]"
            >
              {loading ? <LoaderCircle size={18} className="animate-spin" /> : <WandSparkles size={17} />}
              {loading ? "Designing Your Poster..." : "Generate Premium Poster"}
            </button>

            {message && (
              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-fuchsia-400/15 bg-fuchsia-500/[0.05] p-4 text-xs">
                {message}
              </div>
            )}

            {posterUrl && (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <a href={posterUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center rounded-xl border border-white/[0.08] py-3 text-sm">Open Poster</a>
                <a href={posterUrl} download="premium-poster.jpg" className="flex items-center justify-center rounded-xl bg-white py-3 text-sm font-semibold text-black">Download</a>
              </div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
}

function StudioPanel({ number, title, subtitle, children }) {
  return (
    <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.025] p-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="mt-1 text-xs text-white/30">{subtitle}</p>
        </div>
        <span className="text-[10px] font-medium text-fuchsia-300/40">{number}</span>
      </div>
      {children}
    </div>
  );
}

export default PremiumPoster;