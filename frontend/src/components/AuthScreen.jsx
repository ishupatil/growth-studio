import { useState } from "react";
import { useAuth } from "../hooks/useAuth";

export default function AuthScreen() {
    const [tab, setTab] = useState("signin"); // "signin" | "signup"
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const { signIn, signUp, signInWithGoogle } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setLoading(true);

        try {
            if (tab === "signup") {
                if (password !== confirmPassword) throw new Error("Passwords don't match");
                if (password.length < 6) throw new Error("Password must be at least 6 characters");
                await signUp(email, password);
                setSuccess("Account created! Check your email to confirm, then sign in.");
                setTab("signin");
            } else {
                await signIn(email, password);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogle = async () => {
        setError(null);
        try {
            await signInWithGoogle();
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            position: "relative",
        }}>
            {/* Background glows */}
            <div style={{
                position: "fixed", inset: 0, pointerEvents: "none",
                background: "radial-gradient(ellipse 60% 60% at 20% 20%, rgba(108,99,255,0.12) 0%, transparent 70%), radial-gradient(ellipse 50% 40% at 80% 80%, rgba(255,107,157,0.08) 0%, transparent 70%)"
            }} />

            <div style={{ width: "100%", maxWidth: 440, position: "relative" }} className="fade-in">

                {/* Logo area */}
                <div style={{ textAlign: "center", marginBottom: 40 }}>
                    <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 60, height: 60, borderRadius: 18, background: "linear-gradient(135deg,#6c63ff,#ff6b9d)", marginBottom: 20, boxShadow: "0 8px 32px rgba(108,99,255,0.35)" }}>
                        <span style={{ fontSize: 28 }}>✦</span>
                    </div>
                    <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: 8 }}>
                        <span className="gradient-text">Growth Studio</span>
                    </h1>
                    <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>AI-powered Instagram growth intelligence</p>
                </div>

                {/* Card */}
                <div className="card" style={{ padding: "32px" }}>

                    {/* Tab Toggle */}
                    <div style={{ display: "flex", background: "var(--bg-elevated)", borderRadius: 12, padding: 4, marginBottom: 28, border: "1px solid var(--border)" }}>
                        {[["signin", "Sign In"], ["signup", "Create Account"]].map(([t, label]) => (
                            <button key={t} onClick={() => { setTab(t); setError(null); setSuccess(null); }} style={{
                                flex: 1, padding: "10px 16px", borderRadius: 10, border: "none", cursor: "pointer",
                                fontSize: 13, fontWeight: 600, transition: "all 0.2s",
                                background: tab === t ? "rgba(108,99,255,0.2)" : "transparent",
                                color: tab === t ? "#6c63ff" : "var(--text-secondary)",
                                boxShadow: tab === t ? "inset 0 0 0 1px rgba(108,99,255,0.4)" : "none",
                            }}>{label}</button>
                        ))}
                    </div>

                    {/* Success message */}
                    {success && (
                        <div style={{ background: "rgba(127,255,144,0.1)", border: "1px solid rgba(127,255,144,0.3)", borderRadius: 10, padding: "12px 16px", marginBottom: 20 }}>
                            <p style={{ color: "#7eff90", fontSize: 13, margin: 0 }}>✓ {success}</p>
                        </div>
                    )}

                    {/* Error message */}
                    {error && (
                        <div style={{ background: "rgba(255,107,157,0.1)", border: "1px solid rgba(255,107,157,0.3)", borderRadius: 10, padding: "12px 16px", marginBottom: 20 }}>
                            <p style={{ color: "#ff6b9d", fontSize: 13, margin: 0 }}>⚠️ {error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                            <div>
                                <div className="section-label">Email</div>
                                <input
                                    className="input-field"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    required
                                    autoComplete="email"
                                />
                            </div>

                            <div>
                                <div className="section-label">Password</div>
                                <input
                                    className="input-field"
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    autoComplete={tab === "signup" ? "new-password" : "current-password"}
                                />
                            </div>

                            {tab === "signup" && (
                                <div>
                                    <div className="section-label">Confirm Password</div>
                                    <input
                                        className="input-field"
                                        type="password"
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        required
                                        autoComplete="new-password"
                                    />
                                </div>
                            )}

                            <button
                                type="submit"
                                className="btn-primary"
                                style={{ width: "100%", padding: "14px", fontSize: 15, marginTop: 4, opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}
                                disabled={loading}
                            >
                                {loading ? "⏳ Please wait..." : tab === "signup" ? "Create Account →" : "Sign In →"}
                            </button>
                        </div>
                    </form>

                    {/* Divider */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "24px 0" }}>
                        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                        <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>or</span>
                        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                    </div>

                    {/* Google Sign In */}
                    <button onClick={handleGoogle} style={{
                        width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                        background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", borderRadius: 50,
                        padding: "13px 20px", cursor: "pointer", transition: "all 0.2s", color: "var(--text-primary)", fontSize: 14, fontWeight: 600,
                    }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(108,99,255,0.5)"}
                        onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Continue with Google
                    </button>
                </div>

                <p style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: 12, marginTop: 20 }}>
                    By continuing, you agree to our Terms of Service & Privacy Policy
                </p>
            </div>
        </div>
    );
}
