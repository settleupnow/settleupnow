import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import settleupLogo from "@/assets/settleup-logo.svg";
import { supabase } from "@/lib/supabase";
import { CheckboxCircleLine, CloseLine } from "@mingcute/react";

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

function Reveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, visible } = useScrollReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.6s ease-out ${delay}ms, transform 0.6s ease-out ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

function WaitlistModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !email.includes("@")) {
      setError("please enter a valid email.");
      return;
    }
    setLoading(true);
    try {
      const { error: dbError } = await supabase.from("waitlist").insert({ email: email.trim().toLowerCase() });
      if (dbError) {
        if (dbError.code === "23505") {
          setSuccess(true);
        } else {
          setError("something went wrong. try again.");
        }
      } else {
        setSuccess(true);
      }
    } catch {
      setError("something went wrong. try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm rounded-xl p-6"
        style={{ backgroundColor: "#242424", border: "1px solid #1A6B3C" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-white transition-colors"
        >
          <CloseLine className="w-5 h-5" />
        </button>

        {success ? (
          <div className="text-center py-4">
            <CheckboxCircleLine className="w-10 h-10 mx-auto mb-4" style={{ color: "#1A6B3C" }} />
            <p className="font-sans font-bold text-lg text-white mb-2">you're on the list.</p>
            <p className="font-sans text-sm" style={{ color: "#999" }}>we'll be in touch.</p>
            <button
              onClick={onClose}
              className="mt-6 font-mono text-xs tracking-wide hover:text-white transition-colors"
              style={{ color: "#6B6560" }}
            >
              close
            </button>
          </div>
        ) : (
          <>
            <h3 className="font-sans font-bold text-xl text-white mb-2">save your spot.</h3>
            <p className="font-sans text-sm mb-6" style={{ color: "#999" }}>
              we're onboarding founding members soon. drop your email and we'll reach out.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-full text-sm text-white placeholder:text-gray-500 outline-none focus:ring-2"
                style={{
                  backgroundColor: "#1a1a1a",
                  border: "1px solid #333",
                  focusRingColor: "#1A6B3C",
                }}
                autoFocus
              />
              {error && (
                <p className="font-mono text-xs" style={{ color: "#C4623A" }}>{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full font-sans text-sm font-semibold px-8 py-3.5 rounded-full text-white transition-transform hover:scale-[1.02] active:scale-[0.97] disabled:opacity-50"
                style={{ backgroundColor: "#1A6B3C" }}
              >
                {loading ? "joining..." : "join the waitlist"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [waitlistOpen, setWaitlistOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="font-sans">
      <WaitlistModal open={waitlistOpen} onClose={() => setWaitlistOpen(false)} />

      {/* Nav */}
      <nav
        className="fixed top-0 inset-x-0 z-50 transition-colors duration-300"
        style={{ backgroundColor: scrolled ? "#1a1a1a" : "#F5F0E8" }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-16">
          <Link to="/">
            <img
              src={settleupLogo}
              alt="SettleUp"
              className="h-8 transition-all duration-300"
              style={{ filter: scrolled ? "brightness(0) invert(1)" : "none" }}
            />
          </Link>
          <div className="flex items-center gap-5">
            <Link
              to="/app"
              className="font-sans text-sm font-medium transition-colors duration-300"
              style={{ color: scrolled ? "#ffffff" : "#1a1a1a" }}
            >
              sign in
            </Link>
            <button
              onClick={() => setWaitlistOpen(true)}
              className="font-sans text-sm font-semibold px-5 py-2.5 rounded-full text-white transition-colors"
              style={{ backgroundColor: "#1A6B3C" }}
            >
              get early access
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6" style={{ backgroundColor: "#F5F0E8" }}>
        <div className="max-w-3xl mx-auto text-center">
          <p className="font-mono text-xs tracking-[0.18em] uppercase mb-6" style={{ color: "#1A6B3C" }}>
            invoice follow-up, automated
          </p>
          <h1
            className="font-sans font-bold leading-[1.0] tracking-[-0.03em] mb-6"
            style={{ fontSize: "clamp(48px, 8vw, 80px)", color: "#1a1a1a" }}
          >
            your invoice.
            <br />
            their move.
          </h1>
          <p className="font-sans text-lg mb-10 max-w-lg mx-auto" style={{ color: "#555555", lineHeight: 1.7 }}>
            you did the work. getting paid shouldn't be another job.
          </p>
          <button
            onClick={() => setWaitlistOpen(true)}
            className="inline-block font-sans text-sm font-semibold px-8 py-4 rounded-full text-white transition-transform hover:scale-[1.02] active:scale-[0.97]"
            style={{ backgroundColor: "#1A6B3C" }}
          >
            get early access — it's free
          </button>
          <p className="font-mono text-xs mt-5 tracking-wide" style={{ color: "#6B6560" }}>
            join freelancers already using SettleUp
          </p>

          {/* Mock UI */}
          <div className="mt-14 max-w-md mx-auto rounded-2xl p-5" style={{ backgroundColor: "#1a1a1a" }}>
            <div className="flex items-center justify-between">
              <div className="text-left">
                <p className="font-sans font-semibold text-white text-sm">Adewale & Partners</p>
                <p className="font-mono text-xs mt-0.5" style={{ color: "#6B6560" }}>
                  due 15 mar 2026
                </p>
              </div>
              <div className="text-right flex items-center gap-3">
                <span className="font-mono font-medium text-white text-sm">₦450,000</span>
                <span
                  className="font-mono text-[10px] font-medium tracking-[0.12em] uppercase px-2 py-1 rounded-sm"
                  style={{ backgroundColor: "rgba(196, 98, 58, 0.15)", color: "#C4623A" }}
                >
                  overdue
                </span>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#1A6B3C" }} />
              <span className="font-mono text-[11px]" style={{ color: "#2A8F52" }}>
                reminder sent · 2 days ago
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2 — The Pain */}
      <section className="py-24 px-6" style={{ backgroundColor: "#1a1a1a" }}>
        <div className="max-w-2xl mx-auto text-center space-y-3">
          {[
            "you sent the invoice.",
            "they said they'd pay soon.",
            "you followed up once… awkwardly.",
            "then again… more awkwardly.",
            "then you just… waited.",
          ].map((line, i) => (
            <Reveal key={i} delay={i * 120}>
              <p className="font-sans text-xl" style={{ color: "#999999", lineHeight: 2 }}>
                {line}
              </p>
            </Reveal>
          ))}
          <Reveal delay={700}>
            <p className="font-sans font-bold text-2xl text-white pt-8">
              there's a better way.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Section 3 — How It Works */}
      <section className="py-24 px-6" style={{ backgroundColor: "#1a1a1a" }}>
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <h2 className="font-sans font-bold text-3xl md:text-4xl text-white text-center mb-16 tracking-[-0.02em]">
              set it. forget it. get paid.
            </h2>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              { num: "01", title: "add your invoice", sub: "client name, amount, due date. done." },
              { num: "02", title: "we follow up for you", sub: "automatic reminders by email and WhatsApp, on your schedule." },
              { num: "03", title: "you get paid", sub: "mark it settled. we stop. simple." },
            ].map((step, i) => (
              <Reveal key={i} delay={i * 150}>
                <div className="text-center md:text-left">
                  <p className="font-mono text-sm font-medium mb-3" style={{ color: "#1A6B3C" }}>
                    {step.num}
                  </p>
                  <h3 className="font-sans font-bold text-xl text-white mb-2">{step.title}</h3>
                  <p className="font-sans text-sm" style={{ color: "#999999", lineHeight: 1.7 }}>
                    {step.sub}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Section 4 — Pricing */}
      <section className="py-24 px-6" style={{ backgroundColor: "#1a1a1a" }}>
        <div className="max-w-lg mx-auto text-center">
          <Reveal>
            <h2 className="font-sans font-bold text-3xl md:text-4xl text-white mb-14 tracking-[-0.02em]">
              simple pricing. no surprises.
            </h2>
          </Reveal>
          <Reveal delay={150}>
            <div
              className="rounded-xl p-8 text-left"
              style={{ backgroundColor: "#242424", border: "1px solid #1A6B3C" }}
            >
              <span
                className="font-mono text-[10px] font-medium tracking-[0.18em] uppercase px-3 py-1 rounded-sm"
                style={{ backgroundColor: "rgba(26, 107, 60, 0.15)", color: "#1A6B3C" }}
              >
                founding member
              </span>
              <p className="font-sans font-bold text-4xl text-white mt-5 mb-6">
                ₦3,500<span className="font-sans font-normal text-lg" style={{ color: "#6B6560" }}>/mo</span>
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  "unlimited invoices",
                  "automatic email reminders",
                  "WhatsApp follow-ups",
                  "invoice PDF generation",
                  "cancel anytime",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-3">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8L6.5 11.5L13 5" stroke="#1A6B3C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="font-sans text-sm text-white">{f}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => setWaitlistOpen(true)}
                className="block w-full text-center font-sans text-sm font-semibold px-8 py-4 rounded-full text-white transition-transform hover:scale-[1.02] active:scale-[0.97]"
                style={{ backgroundColor: "#1A6B3C" }}
              >
                claim your spot
              </button>
            </div>
          </Reveal>
          <Reveal delay={300}>
            <p className="font-mono text-xs mt-6 tracking-wide" style={{ color: "#6B6560" }}>
              first 50 members only. lock in this rate forever.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 border-t" style={{ backgroundColor: "#1a1a1a", borderColor: "#333" }}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <img
            src={settleupLogo}
            alt="SettleUp"
            className="h-6"
            style={{ filter: "brightness(0) invert(1)" }}
          />
          <div className="flex items-center gap-6">
            <a href="#" className="font-mono text-xs" style={{ color: "#6B6560" }}>Privacy</a>
            <a href="#" className="font-mono text-xs" style={{ color: "#6B6560" }}>Terms</a>
            <a href="mailto:hello@settleup.ng" className="font-mono text-xs" style={{ color: "#6B6560" }}>hello@settleup.ng</a>
          </div>
        </div>
        <p className="text-center font-mono text-xs mt-6" style={{ color: "#444" }}>
          © 2026 SettleUp. your money, your move.
        </p>
      </footer>
    </div>
  );
}
