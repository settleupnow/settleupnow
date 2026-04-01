import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Link, useNavigate } from "react-router-dom";
import { Loading3Line } from "@mingcute/react";
import { toast } from "sonner";
import settleupLogo from "@/assets/settleup-logo.svg";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  const navigate = useNavigate();

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!email) { toast.error("Please enter your email."); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Check your email for a reset link.");
      setIsForgot(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to send reset link.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) { toast.error("Please fill in all fields."); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Logged in!");
      navigate("/app", { replace: true });
    } catch (err: any) {
      toast.error(err.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  if (isForgot) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#1a1a1a" }}>
        <div
          className="w-full max-w-md p-8 rounded-2xl space-y-6"
          style={{
            backgroundColor: "#242424",
            border: "1px solid rgba(26, 107, 60, 0.3)",
            boxShadow: "0 0 40px rgba(26, 107, 60, 0.08)",
          }}
        >
          <div className="text-center space-y-1">
            <img src={settleupLogo} alt="SettleUp" className="h-10 mx-auto mb-4" style={{ filter: "brightness(0) invert(1)" }} />
            <h1 className="font-sans font-bold text-2xl text-white">reset password.</h1>
            <p className="font-sans text-sm" style={{ color: "#888" }}>enter your email and we'll send a link.</p>
          </div>
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder:text-gray-500 outline-none focus:ring-2 focus:ring-[#1A6B3C] transition-all"
              style={{ backgroundColor: "#1a1a1a", border: "1px solid #333" }}
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full font-sans text-sm font-semibold px-8 py-3.5 rounded-xl text-white transition-transform hover:scale-[1.02] active:scale-[0.97] disabled:opacity-50"
              style={{ backgroundColor: "#1A6B3C" }}
            >
              {loading ? <span className="flex items-center justify-center gap-2"><Loading3Line className="h-4 w-4 animate-spin" /> sending...</span> : "send reset link"}
            </button>
          </form>
          <p className="text-center text-sm" style={{ color: "#888" }}>
            <button type="button" onClick={() => setIsForgot(false)} className="hover:underline" style={{ color: "#1A6B3C" }}>
              ← back to sign in
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#1a1a1a" }}>
      <div
        className="w-full max-w-md p-8 rounded-2xl space-y-6"
        style={{
          backgroundColor: "#242424",
          border: "1px solid rgba(26, 107, 60, 0.3)",
          boxShadow: "0 0 40px rgba(26, 107, 60, 0.08)",
        }}
      >
        <div className="text-center space-y-1">
          <img src={settleupLogo} alt="SettleUp" className="h-10 mx-auto mb-4" style={{ filter: "brightness(0) invert(1)" }} />
          <h1 className="font-sans font-bold text-[28px] leading-tight text-white">welcome back.</h1>
          <p className="font-sans text-sm" style={{ color: "#888" }}>your invoices are waiting.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="font-sans text-xs font-medium text-gray-400">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder:text-gray-500 outline-none focus:ring-2 focus:ring-[#1A6B3C] transition-all"
              style={{ backgroundColor: "#1a1a1a", border: "1px solid #333" }}
            />
          </div>
          <div className="space-y-1.5">
            <label className="font-sans text-xs font-medium text-gray-400">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder:text-gray-500 outline-none focus:ring-2 focus:ring-[#1A6B3C] transition-all"
              style={{ backgroundColor: "#1a1a1a", border: "1px solid #333" }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full font-sans text-sm font-semibold px-8 py-3.5 rounded-xl text-white transition-transform hover:scale-[1.02] active:scale-[0.97] disabled:opacity-50"
            style={{ backgroundColor: "#1A6B3C" }}
          >
            {loading ? <span className="flex items-center justify-center gap-2"><Loading3Line className="h-4 w-4 animate-spin" /> signing in...</span> : "sign in"}
          </button>
        </form>

        <div className="text-center">
          <button type="button" onClick={() => setIsForgot(true)} className="font-sans text-xs hover:underline" style={{ color: "#666" }}>
            forgot password?
          </button>
        </div>

        <p className="text-center font-sans text-sm" style={{ color: "#888" }}>
          don't have an account?{" "}
          <Link to="/sign-up" className="font-semibold hover:underline" style={{ color: "#1A6B3C" }}>
            sign up →
          </Link>
        </p>
      </div>
    </div>
  );
}
