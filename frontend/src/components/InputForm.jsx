import { useState, useRef } from "react";

const fields = [
    { key: "username", label: "Instagram Username", type: "text", placeholder: "@yourhandle" },
    { key: "followers", label: "Total Followers", type: "number", placeholder: "e.g. 12400" },
    { key: "avg_likes", label: "Average Likes per Post", type: "number", placeholder: "e.g. 340" },
    { key: "avg_comments", label: "Average Comments per Post", type: "number", placeholder: "e.g. 28" },
    { key: "posting_frequency", label: "Posts per Week", type: "number", placeholder: "e.g. 4" },
    {
        key: "content_type", label: "Content Type", type: "select",
        options: ["Reels", "Carousels", "Static Posts", "Mix of All"]
    },
    {
        key: "brand_tone", label: "Brand Tone", type: "select",
        options: ["Educational", "Inspirational", "Entertaining", "Professional", "Conversational"]
    },
    {
        key: "goal", label: "Primary Goal", type: "select",
        options: ["Grow Followers", "Increase Engagement", "Drive Website Traffic", "Build Brand Authority", "Monetize Audience"]
    },
    { key: "target_followers", label: "Target Followers in 30 Days", type: "number", placeholder: "e.g. 20000" },
];

export default function InputForm({ onSubmit }) {
    const [values, setValues] = useState({
        username: "", followers: "", avg_likes: "", avg_comments: "",
        posting_frequency: "", content_type: "Reels", brand_tone: "Educational",
        goal: "Grow Followers", target_followers: "",
        competitor_username: "",
    });
    const [errors, setErrors] = useState({});
    const [autoFillStatus, setAutoFillStatus] = useState(null); // null | "loading" | "success" | "private" | "failed"

    const validate = () => {
        const newErrors = {};
        fields.forEach(f => {
            if (!values[f.key] && values[f.key] !== 0) {
                newErrors[f.key] = "This field is required";
            }
        });
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (key, value) => {
        setValues(prev => ({ ...prev, [key]: value }));
        if (errors[key]) setErrors(prev => ({ ...prev, [key]: null }));
    };

    const handleUsernameBlur = async () => {
        const raw = values.username.replace("@", "").trim();
        if (!raw || raw.length < 2) return;
        setAutoFillStatus("loading");
        try {
            const res = await fetch(`/api/instagram-profile?username=${encodeURIComponent(raw)}`);
            if (res.ok) {
                const data = await res.json();
                setValues(prev => ({
                    ...prev,
                    followers: data.followers ?? prev.followers,
                    avg_likes: data.avg_likes ?? prev.avg_likes,
                    avg_comments: data.avg_comments ?? prev.avg_comments,
                }));
                setAutoFillStatus("success");
            } else if (res.status === 403) {
                setAutoFillStatus("private");
            } else {
                setAutoFillStatus("failed");
            }
        } catch {
            setAutoFillStatus("failed");
        }
        setTimeout(() => setAutoFillStatus(null), 4000);
    };

    const handleSubmit = () => {
        if (!validate()) return;
        onSubmit({
            username: values.username.replace("@", ""),
            followers: parseInt(values.followers),
            avg_likes: parseInt(values.avg_likes),
            avg_comments: parseInt(values.avg_comments),
            posting_frequency: String(values.posting_frequency),
            content_type: values.content_type,
            brand_tone: values.brand_tone,
            goal: values.goal,
            target_followers: parseInt(values.target_followers),
            competitor_username: values.competitor_username.replace("@", "").trim(),
        });
    };

    return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "64px 24px" }}>
            <div style={{ width: "100%", maxWidth: "560px" }} className="fade-in">

                {/* Header */}
                <div style={{ marginBottom: "40px" }}>
                    <div className="badge" style={{ marginBottom: "20px" }}>✦ Growth Studio</div>
                    <h1 style={{ fontSize: "2.8rem", lineHeight: 1.1, marginBottom: "14px", fontWeight: 800 }}>
                        Grow smarter.<br />
                        <span className="gradient-text">Not harder.</span>
                    </h1>
                    <p style={{ color: "var(--text-secondary)", fontSize: "16px", lineHeight: 1.6, maxWidth: "420px" }}>
                        Answer 9 quick questions. Get a complete AI-powered weekly growth plan in under 30 seconds.
                    </p>
                </div>

                {/* Form Card */}
                <div className="card" style={{ padding: "32px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
                        {fields.map((field) => (
                            <div key={field.key}>
                                <div className="section-label" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                    <span>{field.label}</span>
                                    {field.key === "username" && autoFillStatus && (
                                        <span style={{
                                            fontSize: 11, fontWeight: 600,
                                            color: autoFillStatus === "success" ? "#7eff90" : autoFillStatus === "loading" ? "#6c63ff" : "#ffd166",
                                        }}>
                                            {autoFillStatus === "loading" && "⏳ Fetching profile..."}
                                            {autoFillStatus === "success" && "✓ Auto-filled from Instagram"}
                                            {autoFillStatus === "private" && "🔒 Private account — fill manually"}
                                            {autoFillStatus === "failed" && "Could not fetch — fill manually"}
                                        </span>
                                    )}
                                </div>
                                {field.type === "select" ? (
                                    <div style={{ position: "relative" }}>
                                        <select
                                            className={`input-field ${errors[field.key] ? "error" : ""}`}
                                            value={values[field.key]}
                                            onChange={e => handleChange(field.key, e.target.value)}
                                            style={{ cursor: "pointer", paddingRight: "40px" }}
                                        >
                                            {field.options.map(opt => (
                                                <option key={opt} value={opt} style={{ background: "var(--bg-elevated)" }}>{opt}</option>
                                            ))}
                                        </select>
                                        <span style={{
                                            position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)",
                                            color: "var(--text-secondary)", pointerEvents: "none", fontSize: "12px"
                                        }}>▼</span>
                                    </div>
                                ) : (
                                    <input
                                        className={`input-field ${errors[field.key] ? "error" : ""}`}
                                        type={field.type}
                                        placeholder={field.placeholder}
                                        value={values[field.key]}
                                        onChange={e => handleChange(field.key, e.target.value)}
                                        onBlur={field.key === "username" ? handleUsernameBlur : undefined}
                                    />
                                )}
                                {errors[field.key] && (
                                    <div className="input-error-msg">{errors[field.key]}</div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Divider */}
                    <div style={{ height: "1px", background: "var(--border)", margin: "28px 0" }} />

                    {/* Competitor Username (Optional) */}
                    <div>
                        <div className="section-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            🕵️ Competitor Username <span style={{ fontWeight: 400, textTransform: "none", fontSize: 11, color: "var(--text-secondary)" }}>(optional)</span>
                        </div>
                        <input
                            className="input-field"
                            type="text"
                            placeholder="@theirhandle (leave blank to skip)"
                            value={values.competitor_username}
                            onChange={e => handleChange("competitor_username", e.target.value)}
                        />
                        <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 6 }}>AI will analyze their account and build a strategy to outgrow them.</p>
                    </div>

                    <div style={{ height: "1px", background: "var(--border)", margin: "8px 0 20px" }} />

                    <button className="btn-primary" style={{ width: "100%", fontSize: "16px", padding: "16px" }} onClick={handleSubmit}>
                        Generate My Growth Plan →
                    </button>
                    <p style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: "12px", marginTop: "14px" }}>
                        Powered by CrewAI + Groq — Free & Fast
                    </p>
                </div>
            </div>
        </div>
    );
}
