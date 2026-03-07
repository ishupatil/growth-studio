import { useState, useCallback } from "react";
import InputForm from "./components/InputForm";
import ProcessingView from "./components/ProcessingView";
import ResultsDashboard from "./components/ResultsDashboard";
import ProgressDashboard from "./components/ProgressDashboard";
import AuthScreen from "./components/AuthScreen";
import { useAuth } from "./hooks/useAuth";
import { supabase } from "./lib/supabase";

export default function App() {
  const { user, loading, signOut } = useAuth();
  const [screen, setScreen] = useState("form"); // "form" | "processing" | "results" | "progress"
  const [formData, setFormData] = useState(null);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  // Get JWT from current session to send to backend
  const getAuthHeaders = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return { "Content-Type": "application/json" };
    return {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`,
    };
  }, []);

  const handleSubmit = async (data) => {
    setFormData(data);
    setScreen("processing");
    setError(null);

    try {
      const headers = await getAuthHeaders();

      // 3 minute timeout — Render free tier cold starts can take 90s+ for CrewAI
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180000);

      const response = await fetch("/api/generate", {
        method: "POST",
        headers,
        body: JSON.stringify(data),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      // Read as text first — Render sometimes returns plain-text errors (not JSON)
      const text = await response.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        // Render timed out or crashed — give a clear message
        throw new Error(
          "The server took too long to respond. This happens on first load when the server is waking up. Please click Try Again."
        );
      }

      if (!response.ok || !json.success) {
        let errDetail = json.detail || "Something went wrong";
        if (typeof errDetail === "object") errDetail = JSON.stringify(errDetail);
        throw new Error(errDetail);
      }

      setResults(json.data);
      setTimeout(() => setScreen("results"), 600);
    } catch (err) {
      if (err.name === "AbortError") {
        setError("Request timed out after 3 minutes. Please try again — the server should be warmed up now.");
      } else {
        setError(err.message);
      }
      setScreen("processing");
    }
  };

  const handleReset = () => {
    setScreen("form");
    setFormData(null);
    setResults(null);
    setError(null);
  };

  // Loading spinner while checking auth state
  if (loading) return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>✦</div>
        <p style={{ color: "var(--text-secondary)" }}>Loading Growth Studio...</p>
      </div>
    </div>
  );

  // Not authenticated → show auth screen
  if (!user) return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse 70% 50% at 10% 0%, rgba(108,99,255,0.07) 0%, transparent 70%)" }} />
      <AuthScreen />
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      {/* Ambient background glow */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse 70% 50% at 10% 0%, rgba(108,99,255,0.07) 0%, transparent 70%)" }} />

      {/* User info bar — only visible on form screen */}
      {screen === "form" && (
        <div style={{ position: "fixed", top: 0, right: 0, padding: "16px 24px", display: "flex", alignItems: "center", gap: 12, zIndex: 100 }}>
          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{user.email}</span>
          <button onClick={signOut} style={{ fontSize: 12, color: "var(--text-secondary)", background: "transparent", border: "1px solid var(--border)", borderRadius: 20, padding: "5px 14px", cursor: "pointer", transition: "all 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--text-primary)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--text-secondary)"}
          >Sign Out</button>
        </div>
      )}

      {screen === "form" && <InputForm onSubmit={handleSubmit} user={user} />}

      {screen === "processing" && (
        <ProcessingView
          done={!!results}
          error={error}
          onRetry={() => handleSubmit(formData)}
          onReset={handleReset}
        />
      )}

      {screen === "results" && (
        <ResultsDashboard
          results={results}
          formData={formData}
          onReset={handleReset}
          onProgress={() => setScreen("progress")}
          user={user}
        />
      )}

      {screen === "progress" && formData && (
        <ProgressDashboard
          username={formData.username}
          onBack={() => setScreen("results")}
        />
      )}
    </div>
  );
}
