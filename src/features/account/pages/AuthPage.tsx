import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Lock, Mail, User, Phone } from "lucide-react";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/$/, "");

type AuthResponse = {
  success: boolean;
  message?: string;
  user?: { id: string; fullName: string; email: string; role: string };
};

export default function AuthPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const isSignup = location.pathname.includes("signup");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const from = (location.state as { from?: string } | null)?.from || "/account";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`${API_BASE_URL}/auth/${isSignup ? "register" : "login"}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isSignup
          ? { fullName: fullName.trim(), email: email.trim(), password, phone: phone.trim() || undefined }
          : { email: email.trim(), password }),
      });
      const result = await response.json() as AuthResponse;
      if (!response.ok || !result.success) throw new Error(result.message || "Unable to authenticate.");
      if (!result.user || result.user.role !== "customer") throw new Error("Please use a customer account to access the storefront.");
      setMessage(result.message || "Welcome to MUSEHRA.");
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-wrap auth-page">
      <motion.section className="auth-editorial" initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }}>
        <p className="eyebrow">THE MUSEHRAEXPERIENCE</p>
        <h1>{isSignup ? <>A world of<br /><em>considered style.</em></> : <>Welcome to<br /><em>your private edit.</em></>}</h1>
        <p>{isSignup ? "Create your MUSEHRAaccount to discover new collections, save your favourite pieces and follow every order." : "Your personal space for considered pieces, thoughtful service and every detail of your MUSEHRAorders."}</p>
        <div className="auth-editorial-note">MAISON DE MODE <span>✦</span> EST. 2026</div>
      </motion.section>

      <motion.section className="auth-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="auth-tabs">
          <Link className={!isSignup ? "active" : ""} to="/login" state={location.state}>SIGN IN</Link>
          <Link className={isSignup ? "active" : ""} to="/signup" state={location.state}>CREATE ACCOUNT</Link>
        </div>
        <p className="eyebrow">{isSignup ? "JOIN THE ATELIER" : "YOUR PRIVATE SALON"}</p>
        <h2>{isSignup ? "Create an account" : "Sign in to MUSEHRA"}</h2>
        <p className="auth-sub">{isSignup ? "A more personal way to experience the collection." : "Enter your details to continue to your account."}</p>

        <form className="auth-form" onSubmit={submit}>
          {isSignup && <label><span>FULL NAME</span><div><User size={16} /><input value={fullName} onChange={e => setFullName(e.target.value)} minLength={2} maxLength={100} autoComplete="name" placeholder="Your full name" required /></div></label>}
          {isSignup && <label><span>PHONE (OPTIONAL)</span><div><Phone size={16} /><input value={phone} onChange={e => setPhone(e.target.value)} maxLength={30} autoComplete="tel" placeholder="Your phone number" /></div></label>}
          <label><span>EMAIL ADDRESS</span><div><Mail size={16} /><input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" required /></div></label>
          <label><span>PASSWORD</span><div><Lock size={16} /><input type="password" value={password} onChange={e => setPassword(e.target.value)} minLength={isSignup ? 8 : 1} maxLength={72} autoComplete={isSignup ? "new-password" : "current-password"} placeholder="Enter your password" required /></div></label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          {message && <p className="auth-message" role="status">{message}</p>}
          <button className="btn btn-dark auth-submit" disabled={busy}>{busy ? "PLEASE WAIT…" : isSignup ? "CREATE ACCOUNT" : "SIGN IN"}<ArrowRight size={15} /></button>
        </form>
        <p className="auth-legal">By continuing, you agree to our <Link to="/privacy">Privacy, Delivery & Returns Policy</Link>.</p>
      </motion.section>
    </div>
  );
}
