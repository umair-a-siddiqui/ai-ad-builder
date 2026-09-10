import {
  SignInButton,
  SignUpButton,
  Show,
  UserButton,
} from "@clerk/react";
import {
  ArrowLeft,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

export default function Auth({ onBack }) {
  return (
    <div className="min-h-screen bg-[#050509] text-white relative overflow-hidden">
      {/* Background */}
      <div className="absolute -top-40 -left-40 w-[520px] h-[520px] bg-purple-700/20 blur-[160px] rounded-full" />
      <div className="absolute -bottom-40 -right-40 w-[520px] h-[520px] bg-blue-700/20 blur-[160px] rounded-full" />

      {/* Back */}
      <nav className="relative z-10 px-8 py-6">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition"
        >
          <ArrowLeft size={18} />
          Back to Studio
        </button>
      </nav>

      <main className="relative z-10 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-lg">

          <Show when="signed-out">
            <div className="text-center">
              <div className="mx-auto mb-6 w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-400/20 flex items-center justify-center">
                <Sparkles size={28} className="text-purple-300" />
              </div>

              <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
                Create with AI.
              </h1>

              <p className="text-gray-400 mt-4 mb-10">
                Sign in or create your AI Ad Builder account.
              </p>

              <div className="border border-white/10 bg-white/[0.035] backdrop-blur-xl rounded-3xl p-8 shadow-2xl">
                <div className="flex items-center justify-center gap-2 text-sm text-gray-400 mb-7">
                  <ShieldCheck size={17} className="text-green-400" />
                  Secure authentication powered by Clerk
                </div>

                <div className="space-y-4">
                  <SignInButton mode="modal">
                    <button
                      type="button"
                      className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 font-medium hover:opacity-90 transition"
                    >
                      Sign In
                    </button>
                  </SignInButton>

                  <SignUpButton mode="modal">
                    <button
                      type="button"
                      className="w-full py-3.5 rounded-xl border border-white/10 bg-white/[0.04] font-medium hover:bg-white/[0.08] transition"
                    >
                      Create Account
                    </button>
                  </SignUpButton>
                </div>

                <p className="text-xs text-gray-600 mt-6">
                  Continue with Google, GitHub, or email.
                </p>
              </div>
            </div>
          </Show>

          <Show when="signed-in">
            <div className="text-center border border-white/10 bg-white/[0.035] rounded-3xl p-8">
              <div className="flex justify-center mb-5">
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: "w-14 h-14",
                    },
                  }}
                />
              </div>

              <h1 className="text-3xl font-semibold">
                You're signed in.
              </h1>

              <p className="text-gray-400 mt-3 mb-7">
                Your AI Ad Builder account is ready.
              </p>

              <button
                type="button"
                onClick={onBack}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 font-medium hover:opacity-90 transition"
              >
                Continue to Studio
              </button>
            </div>
          </Show>

        </div>
      </main>
    </div>
  );
}
