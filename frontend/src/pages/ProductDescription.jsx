import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Copy,
  FileText,
  Sparkles,
  Upload,
  WandSparkles,
  Check,
  Image as ImageIcon,
  PenLine,
} from "lucide-react";

function ProductDescription({ onBack }) {
  const [productImage, setProductImage] = useState(null);
  const [productName, setProductName] = useState("");
  const [details, setDetails] = useState("");
  const [tone, setTone] = useState("Professional");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const tones = [
    "Professional",
    "Luxury",
    "Friendly",
    "Persuasive",
    "SEO",
  ];

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

  const handleGenerate = async () => {
    if (!productImage) {
      alert("Please upload a product image.");
      return;
    }

    setLoading(true);
    setDescription("");
    setCopied(false);

    try {
      const formData = new FormData();

      formData.append("product_image", productImage);
      formData.append("product_name", productName);
      formData.append("details", details);
      formData.append("tone", tone);

      const response = await fetch(
        "https://ai-ad-builder-production.up.railway.app/generate-description",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to generate description."
        );
      }

      setDescription(data.description);
    } catch (error) {
      console.error(error);
      setDescription("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const copyDescription = async () => {
    if (!description) return;

    await navigator.clipboard.writeText(description);

    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050509] text-white">

      {/* Background */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -left-40 top-20 h-[500px] w-[500px] rounded-full bg-blue-700/10 blur-[160px]" />

        <div className="absolute right-[-160px] top-[240px] h-[520px] w-[520px] rounded-full bg-purple-700/12 blur-[170px]" />

        <div className="absolute bottom-[-200px] left-[40%] h-[500px] w-[500px] rounded-full bg-indigo-700/10 blur-[170px]" />
      </div>

      {/* Navbar */}
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

            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-500/10">
              <FileText
                size={17}
                className="text-blue-200"
              />
            </div>

            <div>
              <p className="text-sm font-semibold">
                Copy Studio
              </p>

              <p className="text-[9px] uppercase tracking-[0.22em] text-white/25">
                AI Product Writing
              </p>
            </div>

          </div>

          <div className="hidden items-center gap-2 text-xs text-white/30 sm:flex">
            <div className="h-2 w-2 rounded-full bg-green-400" />
            AI Writer Online
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

          <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.25em] text-blue-300/70">
            <Sparkles size={14} />
            AI Product Writer
          </div>

          <h1 className="max-w-3xl text-4xl font-bold tracking-[-0.035em] md:text-5xl">
            Turn your product into
            <span className="bg-gradient-to-r from-blue-300 via-purple-300 to-fuchsia-300 bg-clip-text text-transparent">
              {" "}powerful marketing copy.
            </span>
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/40">
            Upload your product, provide a few details and let AI create
            polished copy for your store, campaign or social media.
          </p>

        </motion.div>

        {/* Studio */}
        <div className="grid gap-6 xl:grid-cols-[430px_1fr]">

          {/* LEFT */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-5"
          >

            {/* Product */}
            <StudioPanel
              number="01"
              title="Product"
              subtitle="Give AI your product image"
            >

              <label className="group mt-5 flex min-h-[210px] cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 transition hover:border-blue-400/40 hover:bg-blue-500/[0.03]">

                {productImage ? (
                  <div className="w-full text-center">

                    <img
                      src={imagePreview}
                      alt="Product preview"
                      className="mx-auto max-h-[170px] max-w-full rounded-xl object-contain"
                    />

                    <p className="mt-3 text-xs text-white/30">
                      Click to replace image
                    </p>

                  </div>
                ) : (
                  <div className="text-center">

                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] transition group-hover:border-blue-400/30 group-hover:bg-blue-500/10">
                      <Upload
                        size={22}
                        className="text-blue-200"
                      />
                    </div>

                    <p className="mt-4 text-sm font-medium">
                      Upload your product
                    </p>

                    <p className="mt-1 text-xs text-white/30">
                      PNG, JPG or WEBP
                    </p>

                  </div>
                )}

                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];

                    if (file) {
                      setProductImage(file);
                      setDescription("");
                    }
                  }}
                />

              </label>

            </StudioPanel>

            {/* Product Name */}
            <StudioPanel
              number="02"
              title="Product Identity"
              subtitle="Tell AI what you're selling"
            >

              <input
                type="text"
                value={productName}
                onChange={(event) =>
                  setProductName(event.target.value)
                }
                placeholder="Example: Aura Luxury Face Serum"
                className="mt-5 w-full rounded-xl border border-white/[0.08] bg-black/25 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-blue-400/40"
              />

            </StudioPanel>

            {/* Tone */}
            <StudioPanel
              number="03"
              title="Writing Style"
              subtitle="Choose the voice of your brand"
            >

              <div className="mt-5 grid grid-cols-2 gap-2.5">

                {tones.map((item) => (
                  <button
                    key={item}
                    onClick={() => setTone(item)}
                    className={`rounded-xl border px-3 py-3 text-xs font-medium transition ${
                      tone === item
                        ? "border-blue-400/40 bg-blue-500/10 text-blue-200"
                        : "border-white/[0.07] bg-white/[0.025] text-white/45 hover:bg-white/[0.05] hover:text-white/70"
                    }`}
                  >
                    {item}
                  </button>
                ))}

              </div>

            </StudioPanel>

          </motion.div>

          {/* RIGHT */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-[30px] border border-white/[0.08] bg-white/[0.025] p-5 backdrop-blur-xl md:p-7"
          >

            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.06] pb-5">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-200">
                  <PenLine size={19} />
                </div>

                <div>
                  <h2 className="text-sm font-semibold">
                    Writing Workspace
                  </h2>

                  <p className="mt-0.5 text-xs text-white/30">
                    Product context & generated copy
                  </p>
                </div>

              </div>

              <div className="rounded-full border border-white/[0.07] bg-black/20 px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] text-white/30">
                {tone}
              </div>

            </div>

            {/* Details */}
            <div className="mt-6">

              <div className="flex items-center justify-between">

                <div>
                  <h3 className="text-sm font-medium">
                    Product Details
                  </h3>

                  <p className="mt-1 text-xs text-white/30">
                    Add features, benefits, ingredients or target audience.
                  </p>
                </div>

                <WandSparkles
                  size={18}
                  className="text-blue-300/60"
                />

              </div>

              <textarea
                value={details}
                onChange={(event) =>
                  setDetails(event.target.value)
                }
                placeholder="Example: Lightweight facial serum with vitamin C, designed for daily skincare. Target audience is adults looking for brighter and healthier-looking skin..."
                className="mt-4 min-h-[135px] w-full resize-none rounded-2xl border border-white/[0.08] bg-black/25 p-4 text-sm leading-6 text-white outline-none transition placeholder:text-white/20 focus:border-blue-400/40"
              />

            </div>

            {/* Generate */}
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 via-purple-500 to-fuchsia-500 px-5 py-4 text-sm font-semibold shadow-lg shadow-purple-950/20 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
            >

              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Writing Description...
                </>
              ) : (
                <>
                  <Sparkles size={17} />
                  Generate Product Description
                </>
              )}

            </button>

            {/* Output */}
            <div className="mt-6">

              <div className="mb-3 flex items-center justify-between">

                <div className="flex items-center gap-2">
                  <FileText
                    size={16}
                    className="text-blue-300"
                  />

                  <h3 className="text-sm font-medium">
                    Generated Copy
                  </h3>
                </div>

                {description && (
                  <button
                    onClick={copyDescription}
                    className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-white/50 transition hover:bg-white/[0.07] hover:text-white"
                  >

                    {copied ? (
                      <>
                        <Check
                          size={13}
                          className="text-green-300"
                        />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy size={13} />
                        Copy
                      </>
                    )}

                  </button>
                )}

              </div>

              <div className="relative min-h-[330px] rounded-[22px] border border-white/[0.07] bg-black/25 p-5">

                {description ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <p className="whitespace-pre-wrap text-sm leading-7 text-white/75">
                      {description}
                    </p>
                  </motion.div>
                ) : (
                  <div className="flex min-h-[285px] items-center justify-center">

                    <div className="max-w-xs text-center">

                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-400/10 bg-blue-500/[0.05]">
                        <ImageIcon
                          size={25}
                          className="text-blue-200/40"
                        />
                      </div>

                      <p className="mt-4 text-sm text-white/35">
                        Your AI-generated copy will appear here.
                      </p>

                      <p className="mt-2 text-xs leading-5 text-white/20">
                        Upload your product and generate professional
                        marketing content in seconds.
                      </p>

                    </div>

                  </div>
                )}

              </div>

            </div>

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

        <span className="text-[10px] font-medium tracking-[0.18em] text-blue-300/40">
          {number}
        </span>

      </div>

      {children}

    </div>
  );
}

export default ProductDescription;
