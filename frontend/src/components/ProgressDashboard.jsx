import { useState, useEffect } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function ProgressDashboard({ username, onBack }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch(`/api/progress?username=${encodeURIComponent(username)}`);
                if (!res.ok) throw new Error("Could not load progress data");
                const json = await res.json();
                setData(json);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [username]);

    const formatDate = (iso) => {
        if (!iso) return "";
        const d = new Date(iso);
        return `${d.getMonth() + 1}/${d.getDate()}`;
    };

    if (loading) return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>📊</div>
                <p style={{ color: "var(--text-secondary)" }}>Loading your progress...</p>
            </div>
        </div>
    );

    if (error) return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center" }}>
                <p style={{ color: "#ff6b9d" }}>Error: {error}</p>
                <button className="btn-ghost" style={{ marginTop: 16 }} onClick={onBack}>← Back</button>
            </div>
        </div>
    );

    const plans = data?.weekly_plans || [];
    const feedbacks = data?.feedbacks || [];

    // Build chart data by merging plans + feedbacks by index
    const chartData = plans.map((plan, i) => ({
        week: `Week ${i + 1}`,
        date: formatDate(plan.created_at),
        engagement_rate: plan.engagement_rate ?? 0,
        followers_gained: feedbacks[i]?.followers_gained ?? null,
    }));

    // Caption performance
    const captionStats = feedbacks.reduce((acc, f) => {
        if (f.caption_style_used && f.caption_result) {
            const key = f.caption_style_used;
            if (!acc[key]) acc[key] = { worked: 0, flopped: 0 };
            if (f.caption_result === "worked") acc[key].worked++;
            else acc[key].flopped++;
        }
        return acc;
    }, {});

    return (
        <div style={{ minHeight: "100vh", paddingBottom: 80 }}>
            {/* Header */}
            <div style={{ background: "rgba(10,10,15,0.85)", backdropFilter: "blur(20px)", borderBottom: "1px solid var(--border)", padding: "24px 32px", position: "sticky", top: 0, zIndex: 50 }}>
                <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                        <div className="badge" style={{ marginBottom: 6 }}>📊 Progress Tracker</div>
                        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, margin: 0 }}>
                            <span className="gradient-text">@{username}</span>
                            <span style={{ color: "var(--text-secondary)", fontWeight: 400, fontSize: "1rem", marginLeft: 10 }}>
                                {plans.length} week{plans.length !== 1 ? "s" : ""} of data
                            </span>
                        </h1>
                    </div>
                    <button className="btn-ghost" onClick={onBack}>← Back to Plan</button>
                </div>
            </div>

            <div style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 24px" }}>
                {plans.length < 1 ? (
                    <div style={{ textAlign: "center", padding: "80px 0" }}>
                        <div style={{ fontSize: 50, marginBottom: 16 }}>🌱</div>
                        <h2 style={{ color: "var(--text-primary)", marginBottom: 8 }}>No data yet</h2>
                        <p style={{ color: "var(--text-secondary)" }}>Generate your first growth plan to start tracking progress!</p>
                        <button className="btn-primary" style={{ marginTop: 24 }} onClick={onBack}>← Go Back</button>
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

                        {/* Summary Tiles */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }} className="fade-in">
                            <div style={{ background: "rgba(108,99,255,0.08)", border: "1px solid rgba(108,99,255,0.25)", borderRadius: 16, padding: "20px" }}>
                                <div style={{ fontSize: 22, marginBottom: 6 }}>📅</div>
                                <div className="section-label">Total Plans Generated</div>
                                <div style={{ fontSize: "2rem", fontWeight: 800, color: "#6c63ff" }}>{plans.length}</div>
                            </div>
                            <div style={{ background: "rgba(127,255,144,0.08)", border: "1px solid rgba(127,255,144,0.25)", borderRadius: 16, padding: "20px" }}>
                                <div style={{ fontSize: 22, marginBottom: 6 }}>📈</div>
                                <div className="section-label">Latest Engagement Rate</div>
                                <div style={{ fontSize: "2rem", fontWeight: 800, color: "#7eff90" }}>
                                    {plans[plans.length - 1]?.engagement_rate ?? "—"}%
                                </div>
                            </div>
                            <div style={{ background: "rgba(255,209,102,0.08)", border: "1px solid rgba(255,209,102,0.25)", borderRadius: 16, padding: "20px" }}>
                                <div style={{ fontSize: 22, marginBottom: 6 }}>🚀</div>
                                <div className="section-label">Total Followers Gained</div>
                                <div style={{ fontSize: "2rem", fontWeight: 800, color: "#ffd166" }}>
                                    +{feedbacks.reduce((s, f) => s + (f.followers_gained || 0), 0).toLocaleString()}
                                </div>
                            </div>
                        </div>

                        {/* Engagement Rate Chart */}
                        {chartData.length > 0 && (
                            <div className="card" style={{ padding: "24px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
                                    <span>📈</span>
                                    <div className="badge">Engagement Rate Over Time</div>
                                </div>
                                <ResponsiveContainer width="100%" height={220}>
                                    <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                        <XAxis dataKey="week" tick={{ fill: "#8888aa", fontSize: 12 }} />
                                        <YAxis tick={{ fill: "#8888aa", fontSize: 12 }} unit="%" />
                                        <Tooltip
                                            contentStyle={{ background: "#13131a", border: "1px solid rgba(108,99,255,0.3)", borderRadius: 10 }}
                                            labelStyle={{ color: "#f0f0ff" }}
                                            formatter={(v) => [`${v}%`, "Engagement Rate"]}
                                        />
                                        <Line type="monotone" dataKey="engagement_rate" stroke="#6c63ff" strokeWidth={2.5} dot={{ fill: "#6c63ff", r: 5 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        {/* Followers Gained Chart */}
                        {feedbacks.some(f => f.followers_gained) && (
                            <div className="card" style={{ padding: "24px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
                                    <span>👥</span>
                                    <div className="badge">Followers Gained Per Week</div>
                                </div>
                                <ResponsiveContainer width="100%" height={200}>
                                    <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                        <XAxis dataKey="week" tick={{ fill: "#8888aa", fontSize: 12 }} />
                                        <YAxis tick={{ fill: "#8888aa", fontSize: 12 }} />
                                        <Tooltip
                                            contentStyle={{ background: "#13131a", border: "1px solid rgba(255,209,102,0.3)", borderRadius: 10 }}
                                            labelStyle={{ color: "#f0f0ff" }}
                                            formatter={(v) => [v ? `+${v}` : "No data", "Followers Gained"]}
                                        />
                                        <Bar dataKey="followers_gained" fill="#ffd166" radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        {/* Caption A/B results */}
                        {Object.keys(captionStats).length > 0 && (
                            <div className="card" style={{ padding: "24px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                                    <span>✍️</span>
                                    <div className="badge">Caption Style Performance</div>
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                    {Object.entries(captionStats).map(([style, counts], i) => {
                                        const total = counts.worked + counts.flopped;
                                        const pct = total ? Math.round((counts.worked / total) * 100) : 0;
                                        return (
                                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                                <div style={{ flex: 1, fontSize: 13, color: "var(--text-secondary)", minWidth: 80 }}>{style}</div>
                                                <div style={{ flex: 3, background: "var(--bg-elevated)", borderRadius: 50, height: 8, overflow: "hidden" }}>
                                                    <div style={{ width: `${pct}%`, height: "100%", background: pct > 50 ? "#7eff90" : "#ff6b9d", borderRadius: 50 }} />
                                                </div>
                                                <div style={{ fontSize: 12, fontWeight: 700, color: pct > 50 ? "#7eff90" : "#ff6b9d", minWidth: 60 }}>
                                                    {pct}% worked
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Plans History Table */}
                        <div className="card" style={{ padding: "24px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                                <span>🗂️</span>
                                <div className="badge">Plan History</div>
                            </div>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr>
                                        {["Week", "Date", "Engagement Rate", "Followers Gained"].map(h => (
                                            <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontSize: 11, fontWeight: 700, letterSpacing: 1.2, color: "var(--text-secondary)", borderBottom: "1px solid var(--border)" }}>{h.toUpperCase()}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {plans.map((plan, i) => (
                                        <tr key={i} style={{ borderBottom: i < plans.length - 1 ? "1px solid var(--border)" : "none" }}>
                                            <td style={{ padding: "12px", fontSize: 13, color: "var(--text-primary)", fontWeight: 700 }}>Week {i + 1}</td>
                                            <td style={{ padding: "12px", fontSize: 13, color: "var(--text-secondary)" }}>{formatDate(plan.created_at)}</td>
                                            <td style={{ padding: "12px", fontSize: 13, color: "#6c63ff", fontWeight: 700 }}>{plan.engagement_rate}%</td>
                                            <td style={{ padding: "12px", fontSize: 13, color: feedbacks[i]?.followers_gained ? "#7eff90" : "var(--text-secondary)", fontWeight: 700 }}>
                                                {feedbacks[i]?.followers_gained ? `+${feedbacks[i].followers_gained}` : "—"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
