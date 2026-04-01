import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Link, useNavigate } from "react-router-dom";
import { Loading3Line } from "@mingcute/react";
import { toast } from "sonner";
import settleupLogo from "@/assets/settleup-logo.svg";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) { toast.error("Please fill in all fields."); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      toast.success("Account created! Check your email to confirm.");
    } catch (err: any) {
      toast.error(err.message || "Signup failed.");
    } finally {
      setLoading(false);
    }
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
          <h1 className="font-sans font-bold text-[28px] leading-tight text-white">let's get you paid.</h1>
          <p className="font-sans text-sm" style={{ color: "#888" }}>set up your account. it takes 30 seconds.</p>
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
              autoComplete="new-password"
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
            {loading ? <span className="flex items-center justify-center gap-2"><Loading3Line className="h-4 w-4 animate-spin" /> creating account...</span> : "create account"}
          </button>
        </form>

        <p className="text-center font-sans text-sm" style={{ color: "#888" }}>
          already have an account?{" "}
          <Link to="/sign-in" className="font-semibold hover:underline" style={{ color: "#1A6B3C" }}>
            sign in →
          </Link>
        </p>
      </div>
    </div>
  );
}
