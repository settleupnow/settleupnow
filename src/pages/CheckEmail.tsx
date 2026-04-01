import { Link, useLocation, Navigate } from "react-router-dom";
import checkEmailGif from "@/assets/check-email.gif";

export default function CheckEmail() {
  const location = useLocation();
  const email = location.state?.email;

  if (!email) return <Navigate to="/sign-up" replace />;

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#1a1a1a" }}>
      <div className="text-center space-y-6 max-w-md w-full">
        <img src={checkEmailGif} alt="Check email" className="h-20 mx-auto" />

        <div className="space-y-2">
          <h1 className="font-sans font-bold text-[28px] leading-tight text-white">check your email.</h1>
          <p className="font-sans text-sm" style={{ color: "#888888" }}>
            we sent a confirmation link to your email address. click it to activate your account.
          </p>
        </div>

        <div
          className="mx-auto inline-block px-5 py-3 rounded-xl"
          style={{ backgroundColor: "#242424", border: "1px solid #333" }}
        >
          <span className="font-mono text-sm" style={{ color: "#1A6B3C" }}>{email}</span>
        </div>

        <p className="font-sans text-xs" style={{ color: "#888888" }}>
          didn't get it? check your spam folder.
        </p>

        <Link to="/sign-in" className="inline-block font-sans text-sm font-semibold hover:underline" style={{ color: "#1A6B3C" }}>
          back to sign in →
        </Link>
      </div>
    </div>
  );
}
