import {
  ArrowRight,
  Sparkles,
  Image,
  Film,
  FileText,
  Zap,
  WandSparkles,
  LogOut,
} from "lucide-react";

import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth, useClerk } from "@clerk/react";

import Auth from "./pages/Auth";
import CinematicSmoke from "./pages/CinematicSmoke";
import PremiumPoster from "./pages/PremiumPoster";
import ProductDescription from "./pages/ProductDescription";

function App() {
  const [page, setPage] = useState("home");

  const { isLoaded, isSignedIn } = useAuth();
  const { signOut } = useClerk();

  // Wait until Clerk checks the current session
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#050509] text-white flex items-center justify-center">
        <div className="text-center">
          <Sparkles
            size={30}
            className="mx-auto mb-4 text-purple-300 animate-pulse"
          />
          <p className="text-sm text-white/40">
            Loading AI Ad Builder...
          </p>
        </div>
      </div>
    );
  }

  // Authentication page
  if (page === "auth") {
    return <Auth onBack={() => setPage("home")} />;
  }

  // Protected pages
  if (page === "smoke") {
    if (!isSignedIn) {
      return <Auth onBack={() => setPage("home")} />;
    }

    return (
      <CinematicSmoke
        onBack={() => setPage("home")}
      />
    );
  }

  if (page === "poster") {
    if (!isSignedIn) {
      return <Auth onBack={() => setPage("home")} />;
    }

    return (
      <PremiumPoster
        onBack={() => setPage("home")}
      />
    );
  }

  if (page === "description") {
    if (!isSignedIn) {
      return <Auth onBack={() => setPage("home")} />;
    }

    return (
      <ProductDescription
        onBack={() => setPage("home")}
      />
    );
  }

  // Navigation
  const scrollToTools = () => {
    document
      .getElementById("ai-tools")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToFeatures = () => {
    document
      .getElementById("features")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToAbout = () => {
    document
      .getElementById("about")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  // Protect every AI tool
  const openProtectedPage = (targetPage) => {
    if (!isSignedIn) {
      setPage("auth");
      return;
    }

    setPage(targetPage);
  };

  const handleLogout = async () => {
    await signOut();
    setPage("home");
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050509] text-white">

      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-180px] top-[80px] h-[500px] w-[500px] rounded-full bg-purple-700/20 blur-[150px]" />
        <div className="absolute right-[-160px] top-[280px] h-[500px] w-[500px] rounded-full bg-blue-700/15 blur-[160px]" />
        <div className="absolute bottom-[100px] left-[40%] h-[400px] w-[400px] rounded-full bg-pink-700/10 blur-[160px]" />
      </div>

      {/* Navbar */}
      <nav className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-8">

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-purple-400/20 bg-purple-500/10 shadow-lg shadow-purple-500/10">
            <Sparkles
              size={20}
              className="text-purple-300"
            />
          </div>

          <div>
            <div className="font-semibold tracking-tight">
              AI Ad Builder
            </div>

            <div className="text-[10px] uppercase tracking-[0.25em] text-white/30">
              Creative Intelligence
            </div>
          </div>
        </div>

        <div className="hidden items-center gap-8 text-sm text-white/50 md:flex">

          <button
            onClick={scrollToTools}
            className="transition hover:text-white"
          >
            Create
          </button>

          <button
            onClick={scrollToFeatures}
            className="transition hover:text-white"
          >
            Features
          </button>

          <button
            onClick={scrollToAbout}
            className="transition hover:text-white"
          >
            About
          </button>

        </div>

        {/* AUTH BUTTON */}
        {!isSignedIn ? (
          <button
            onClick={() => setPage("auth")}
            className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm text-white/80 backdrop-blur-xl transition hover:border-purple-400/30 hover:bg-white/[0.08]"
          >
            Sign In
          </button>
        ) : (
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-full border border-red-400/20 bg-red-500/[0.06] px-5 py-2.5 text-sm text-red-200 backdrop-blur-xl transition hover:border-red-400/40 hover:bg-red-500/[0.12]"
          >
            <LogOut size={15} />
            Logout
          </button>
        )}

      </nav>

      {/* Main */}
      <main className="relative z-10">

        {/* Hero */}
        <section className="mx-auto grid min-h-[760px] max-w-7xl items-center gap-12 px-6 pb-24 pt-16 lg:grid-cols-2 lg:px-8">

          {/* Hero text */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >

            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-purple-400/20 bg-purple-500/[0.07] px-4 py-2 text-xs text-purple-200 backdrop-blur-xl">
              <Zap size={14} />
              AI-powered advertising studio
            </div>

            <h1 className="max-w-3xl text-5xl font-bold leading-[1.05] tracking-[-0.04em] md:text-6xl lg:text-7xl">
              Your product.

              <span className="block bg-gradient-to-r from-purple-300 via-fuchsia-300 to-blue-300 bg-clip-text text-transparent">
                Reimagined by AI.
              </span>
            </h1>

            <p className="mt-7 max-w-xl text-base leading-8 text-white/45 md:text-lg">
              Transform a single product image into cinematic advertisements,
              premium marketing posters, and compelling product copy —
              powered by artificial intelligence.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4">

              <button
                onClick={scrollToTools}
                className="group flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-black transition hover:scale-[1.03]"
              >
                Start Creating

                <ArrowRight
                  size={17}
                  className="transition group-hover:translate-x-1"
                />
              </button>

              <div className="flex items-center gap-2 text-xs text-white/35">
                <Sparkles size={14} />
                Upload. Generate. Publish.
              </div>

            </div>

          </motion.div>

          {/* Futuristic visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="relative mx-auto flex h-[480px] w-full max-w-[520px] items-center justify-center"
          >

            <div className="absolute h-[330px] w-[330px] rounded-full bg-purple-600/20 blur-[100px]" />

            <motion.div
              animate={{ rotate: 360 }}
              transition={{
                duration: 30,
                repeat: Infinity,
                ease: "linear",
              }}
              className="absolute h-[390px] w-[390px] rounded-full border border-dashed border-purple-300/15"
            />

            <motion.div
              animate={{ rotate: -360 }}
              transition={{
                duration: 22,
                repeat: Infinity,
                ease: "linear",
              }}
              className="absolute h-[310px] w-[310px] rounded-full border border-white/10"
            />

            <motion.div
              animate={{
                y: [0, -12, 0],
                rotateX: [0, 3, 0],
                rotateY: [0, -3, 0],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="relative z-10 w-[250px] rounded-[32px] border border-white/15 bg-gradient-to-b from-white/[0.12] to-white/[0.03] p-5 shadow-2xl shadow-purple-950/50 backdrop-blur-2xl"
            >

              <div className="flex h-[260px] items-center justify-center rounded-[24px] border border-white/[0.07] bg-black/30">

                <div className="text-center">

                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-purple-400/20 bg-purple-500/10 shadow-xl shadow-purple-600/20">
                    <WandSparkles
                      size={35}
                      className="text-purple-200"
                    />
                  </div>

                  <p className="mt-5 text-sm font-medium">
                    Your Product
                  </p>

                  <p className="mt-1 text-xs text-white/30">
                    AI transforms it here
                  </p>

                </div>

              </div>

              <div className="mt-4 flex items-center justify-between">

                <div>
                  <p className="text-xs text-white/30">
                    Generation
                  </p>

                  <p className="mt-1 text-sm font-medium">
                    AI Creative
                  </p>
                </div>

                <div className="h-2 w-2 rounded-full bg-purple-300 shadow-[0_0_15px_rgba(216,180,254,0.8)]" />

              </div>

            </motion.div>

            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{
                duration: 4,
                repeat: Infinity,
              }}
              className="absolute left-0 top-[110px] rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-xs shadow-xl backdrop-blur-xl"
            >
              <Film
                size={16}
                className="mb-2 text-purple-300"
              />
              Cinematic AI
            </motion.div>

            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{
                duration: 4.5,
                repeat: Infinity,
              }}
              className="absolute bottom-[100px] right-0 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-xs shadow-xl backdrop-blur-xl"
            >
              <Image
                size={16}
                className="mb-2 text-blue-300"
              />
              Visual Studio
            </motion.div>

          </motion.div>

        </section>

        {/* AI Tools */}
        <section
          id="ai-tools"
          className="mx-auto max-w-7xl px-6 pb-32 pt-12 lg:px-8"
        >

          <div className="mb-12">

            <div className="mb-3 text-xs font-medium uppercase tracking-[0.25em] text-purple-300/70">
              Creative Suite
            </div>

            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
              One product. Three possibilities.
            </h2>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/40">
              Choose what you want to create and let the AI handle the
              production process.
            </p>

            {!isSignedIn && (
              <p className="mt-3 text-sm text-purple-300/70">
                Sign in or create an account to use the AI tools.
              </p>
            )}

          </div>

          <div className="grid gap-6 md:grid-cols-3">

            <ToolCard
              number="01"
              icon={<Film size={25} />}
              title="Cinematic Ad"
              description="Transform your product into a cinematic AI advertisement with motion, atmosphere and premium visual direction."
              label="AI VIDEO"
              onClick={() =>
                openProtectedPage("smoke")
              }
            />

            <ToolCard
              number="02"
              icon={<Image size={25} />}
              title="Premium Poster"
              description="Generate polished campaign visuals and high-impact promotional posters designed around your product."
              label="AI IMAGE"
              onClick={() =>
                openProtectedPage("poster")
              }
            />

            <ToolCard
              number="03"
              icon={<FileText size={25} />}
              title="Product Description"
              description="Turn your product image and details into persuasive, professional marketing copy in seconds."
              label="AI COPY"
              onClick={() =>
                openProtectedPage("description")
              }
            />

          </div>

        </section>

        {/* Features */}
        <section
          id="features"
          className="mx-auto max-w-7xl px-6 pb-32 pt-12 lg:px-8"
        >

          <div className="mb-12">

            <div className="mb-3 text-xs font-medium uppercase tracking-[0.25em] text-purple-300/70">
              Powerful Features
            </div>

            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Everything you need to create smarter.
            </h2>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/40">
              AI Ad Builder combines intelligent creative tools in one
              streamlined workspace, helping you transform a single product
              into professional marketing content faster.
            </p>

          </div>

          <div className="grid gap-6 md:grid-cols-3">

            <FeatureCard
              icon={<Film size={25} />}
              title="AI-Powered Creation"
              description="Transform product images into cinematic advertisements, premium promotional visuals, and professional marketing content using artificial intelligence."
            />

            <FeatureCard
              icon={<Zap size={25} />}
              title="Fast Creative Workflow"
              description="Move from product upload to finished creative content through a streamlined workflow designed to reduce production time and complexity."
            />

            <FeatureCard
              icon={<WandSparkles size={25} />}
              title="Built for Marketing"
              description="Create content for product campaigns, social media, online stores, brand promotions, and digital advertising from one creative platform."
            />

          </div>

        </section>

        {/* About */}
        <section
          id="about"
          className="mx-auto max-w-7xl px-6 pb-32 lg:px-8"
        >

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative overflow-hidden rounded-[32px] border border-white/[0.08] bg-white/[0.025] p-8 backdrop-blur-xl md:p-12"
          >

            <div className="absolute right-[-100px] top-[-100px] h-[300px] w-[300px] rounded-full bg-purple-700/10 blur-[100px]" />

            <div className="relative z-10">

              <div className="mb-3 text-xs font-medium uppercase tracking-[0.25em] text-purple-300/70">
                About AI Ad Builder
              </div>

              <h2 className="max-w-3xl text-3xl font-semibold tracking-tight md:text-4xl">
                From product image to marketing content — powered by AI.
              </h2>

              <p className="mt-6 max-w-3xl text-sm leading-7 text-white/40 md:text-base">
                AI Ad Builder is an intelligent creative platform designed to
                simplify product advertising. Upload your product and use
                specialized AI tools to create cinematic advertisements,
                premium promotional posters, and compelling product
                descriptions from one place.
              </p>

              <p className="mt-4 max-w-3xl text-sm leading-7 text-white/40 md:text-base">
                Our goal is simple: make professional advertising content
                faster and easier to create. AI Ad Builder gives businesses,
                creators, and marketers a streamlined way to transform product
                ideas into ready-to-use creative assets without managing
                multiple creative tools.
              </p>

              <div className="mt-8 flex items-center gap-2 text-sm text-purple-200">
                <Sparkles size={16} />
                Create smarter. Launch faster.
              </div>

            </div>

          </motion.div>

        </section>

      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.06]">

        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 px-6 py-8 text-xs text-white/25 md:flex-row lg:px-8">

          <p>AI Ad Builder</p>

          <p>
            Create smarter. Launch faster.
          </p>

        </div>

      </footer>

    </div>
  );
}

function ToolCard({
  number,
  icon,
  title,
  description,
  label,
  onClick,
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -8 }}
      transition={{ duration: 0.25 }}
      className="group relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-white/[0.025] p-7 text-left backdrop-blur-xl transition hover:border-purple-400/25 hover:bg-white/[0.05]"
    >

      <div className="absolute right-5 top-4 text-5xl font-bold text-white/[0.025]">
        {number}
      </div>

      <div className="flex items-center justify-between">

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-purple-200 transition group-hover:border-purple-400/30 group-hover:bg-purple-500/10">
          {icon}
        </div>

        <span className="text-[10px] tracking-[0.2em] text-white/25">
          {label}
        </span>

      </div>

      <h3 className="mt-8 text-xl font-semibold">
        {title}
      </h3>

      <p className="mt-3 min-h-[96px] text-sm leading-6 text-white/40">
        {description}
      </p>

      <div className="mt-6 flex items-center gap-2 text-sm font-medium text-white/65 transition group-hover:text-purple-200">
        Create

        <ArrowRight
          size={15}
          className="transition group-hover:translate-x-1"
        />
      </div>

      <div className="absolute bottom-0 left-0 h-px w-0 bg-gradient-to-r from-purple-400/0 via-purple-300 to-purple-400/0 transition-all duration-500 group-hover:w-full" />

    </motion.button>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}) {
  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ duration: 0.25 }}
      className="group rounded-[28px] border border-white/[0.08] bg-white/[0.025] p-7 backdrop-blur-xl transition hover:border-purple-400/25 hover:bg-white/[0.05]"
    >

      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-purple-200 transition group-hover:border-purple-400/30 group-hover:bg-purple-500/10">
        {icon}
      </div>

      <h3 className="mt-6 text-lg font-semibold">
        {title}
      </h3>

      <p className="mt-3 text-sm leading-6 text-white/40">
        {description}
      </p>

    </motion.div>
  );
}

export default App;