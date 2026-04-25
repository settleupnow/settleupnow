import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import settleupLogo from "@/assets/settleup-logo.svg";

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

function Check() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
      <path d="M3 8L6.5 11.5L13 5" stroke="#1A6B3C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const goToSignup = (plan?: "basic" | "pro") => {
    if (plan) localStorage.setItem("selected_plan", plan);
    else localStorage.removeItem("selected_plan");
    navigate("/sign-up");
  };

  return (
    <div className="font-sans">
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
            <button
              onClick={() => goToSignup()}
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
            onClick={() => goToSignup()}
            className="inline-block font-sans text-sm font-semibold px-8 py-4 rounded-full text-white transition-transform hover:scale-[1.02] active:scale-[0.97]"
            style={{ backgroundColor: "#1A6B3C" }}
          >
            get started — it's free to try
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

      {/* The Pain */}
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

      {/* How It Works */}
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

      {/* Pricing */}
      <section className="py-24 px-6" style={{ backgroundColor: "#1a1a1a" }}>
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <h2 className="font-sans font-bold text-3xl md:text-4xl text-white text-center mb-3 tracking-[-0.02em]">
              simple pricing. no surprises.
            </h2>
            <p className="font-sans text-sm text-center mb-14" style={{ color: "#888" }}>
              pick what fits. cancel anytime.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl mx-auto">
            {/* Basic */}
            <Reveal delay={100}>
              <div
                className="rounded-xl p-7 h-full flex flex-col"
                style={{ backgroundColor: "#242424", border: "1px solid #333" }}
              >
                <span
                  className="font-mono text-[10px] font-medium tracking-[0.18em] uppercase px-2.5 py-1 rounded-sm self-start"
                  style={{ backgroundColor: "rgba(255,255,255,0.05)", color: "#ccc" }}
                >
                  BASIC
                </span>
                <p className="font-sans font-bold text-4xl text-white mt-5 mb-6">
                  ₦2,500<span className="font-sans font-normal text-lg" style={{ color: "#6B6560" }}>/mo</span>
                </p>
                <ul className="space-y-3 mb-8 flex-1">
                  {[
                    "Unlimited invoices",
                    "Automatic email reminders",
                    "Invoice PDF generation",
                    "Cancel anytime",
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-3">
                      <Check />
                      <span className="font-sans text-sm text-white">{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => goToSignup("basic")}
                  className="w-full font-sans text-sm font-semibold px-8 py-3.5 rounded-full transition-transform hover:scale-[1.02] active:scale-[0.97]"
                  style={{ border: "1px solid #1A6B3C", color: "#fff", backgroundColor: "transparent" }}
                >
                  Get started
                </button>
              </div>
            </Reveal>

            {/* Pro */}
            <Reveal delay={200}>
              <div className="relative h-full">
                <span
                  className="absolute -top-3 left-1/2 -translate-x-1/2 font-mono text-[9px] font-bold tracking-[0.18em] uppercase px-3 py-1 rounded-sm whitespace-nowrap z-10"
                  style={{ backgroundColor: "#1A6B3C", color: "#fff" }}
                >
                  MOST POPULAR
                </span>
                <div
                  className="rounded-xl p-7 h-full flex flex-col"
                  style={{
                    backgroundColor: "#242424",
                    border: "1px solid #1A6B3C",
                    boxShadow: "0 0 30px rgba(26,107,60,0.15)",
                  }}
                >
                  <span
                    className="font-mono text-[10px] font-medium tracking-[0.18em] uppercase px-2.5 py-1 rounded-sm self-start"
                    style={{ backgroundColor: "rgba(26,107,60,0.18)", color: "#1A6B3C" }}
                  >
                    PRO
                  </span>
                  <p className="font-sans font-bold text-4xl text-white mt-5 mb-6">
                    ₦3,500<span className="font-sans font-normal text-lg" style={{ color: "#6B6560" }}>/mo</span>
                  </p>
                  <ul className="space-y-3 mb-8 flex-1">
                    {[
                      "Everything in Basic",
                      "WhatsApp reminders",
                      "Priority support",
                    ].map((f) => (
                      <li key={f} className="flex items-center gap-3">
                        <Check />
                        <span className="font-sans text-sm text-white">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => goToSignup("pro")}
                    className="w-full font-sans text-sm font-semibold px-8 py-3.5 rounded-full text-white transition-transform hover:scale-[1.02] active:scale-[0.97]"
                    style={{ backgroundColor: "#1A6B3C" }}
                  >
                    Get Pro
                  </button>
                </div>
              </div>
            </Reveal>
          </div>
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
