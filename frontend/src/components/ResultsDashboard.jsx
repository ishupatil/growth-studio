import { useState } from "react";

// ── Constants ─────────────────────────────────────────────
const DAY_COLORS = [
    "linear-gradient(135deg,#6c63ff22,#6c63ff11)",
    "linear-gradient(135deg,#ff6b9d22,#ff6b9d11)",
    "linear-gradient(135deg,#00d4ff22,#00d4ff11)",
    "linear-gradient(135deg,#ffd16622,#ffd16611)",
    "linear-gradient(135deg,#7eff9022,#7eff9011)",
    "linear-gradient(135deg,#ff8c6b22,#ff8c6b11)",
    "linear-gradient(135deg,#c77dff22,#c77dff11)",
];
const DAY_BORDERS = ["#6c63ff", "#ff6b9d", "#00d4ff", "#ffd166", "#7eff90", "#ff8c6b", "#c77dff"];
const FORMAT_COLORS = { Reel: "#6c63ff", Reels: "#6c63ff", Carousel: "#ff6b9d", Carousels: "#ff6b9d", "Static Post": "#00d4ff", Mix: "#ffd166" };

const TABS = [
    { id: "audit", label: "🔍 Audit" },
    { id: "strategy", label: "🗓 Strategy" },
    { id: "ideas", label: "💡 Ideas" },
    { id: "captions", label: "✍️ Captions" },
    { id: "schedule", label: "⏰ Schedule" },
    { id: "competitor", label: "🕵️ Competitor" },
];

// ── Parsers ───────────────────────────────────────────────
function parseAuditReport(text = "") {
    const sections = {};
    const engM = text.match(/ENGAGEMENT RATE ASSESSMENT:([\s\S]*?)(?=WEAKNESSES:|$)/i);
    const weakM = text.match(/WEAKNESSES:([\s\S]*?)(?=GROWTH OPPORTUNITIES:|$)/i);
    const oppM = text.match(/GROWTH OPPORTUNITIES:([\s\S]*?)(?=OVERALL ASSESSMENT:|$)/i);
    const overM = text.match(/OVERALL ASSESSMENT:([\s\S]*?)$/i);
    if (engM) sections.engagement = engM[1].trim();
    if (weakM) sections.weaknesses = weakM[1].trim().split(/\n\d+\./).filter(Boolean).map(s => s.trim());
    if (oppM) sections.opportunities = oppM[1].trim().split(/\n\d+\./).filter(Boolean).map(s => s.trim());
    if (overM) sections.overall = overM[1].trim();
    return sections;
}

function parseDays(text = "") {
    return text.split(/\n(?=DAY \d)/).filter(Boolean).map(day => ({
        title: (day.match(/DAY \d+\s*[—-]\s*(.+)/) || [null, day.split("\n")[0]])[0].trim(),
        focus: (day.match(/Focus:\s*(.+)/) || [null, ""])[1].trim(),
        action: (day.match(/Action:\s*(.+)/) || [null, ""])[1].trim(),
        engagement: (day.match(/Engagement Tactic:\s*(.+)/) || [null, ""])[1].trim(),
    }));
}

function parseIdeas(text = "") {
    return text.split(/\n(?=IDEA \d)/).filter(Boolean).map(idea => ({
        title: (idea.match(/Title:\s*(.+)/) || [null, ""])[1].trim(),
        format: (idea.match(/Format:\s*(.+)/) || [null, ""])[1].trim(),
        hook: (idea.match(/Hook:\s*(.+)/) || [null, ""])[1].trim(),
        description: (idea.match(/Description:\s*([\s\S]+?)(?=Difficulty:|Virality|$)/) || [null, ""])[1].trim(),
        difficulty: (idea.match(/Difficulty:\s*(.+)/) || [null, ""])[1].trim(),
        viralityScore: (idea.match(/Virality Score:\s*(\d+)/) || [null, "0"])[1].trim(),
        productionTime: (idea.match(/Production Time:\s*(.+)/) || [null, ""])[1].trim(),
        bestPosted: (idea.match(/Best Posted:\s*(.+)/) || [null, ""])[1].trim(),
    }));
}

function parseCaptions(text = "") {
    return text.split(/\n---\n/).filter(Boolean).map(cap => {
        const ctaM = cap.match(/CTA:\s*(.+)/);
        const toneM = cap.match(/Tone:\s*(.+)/);
        const hookTypeM = cap.match(/Hook Type:\s*(.+)/);
        const nicheM = cap.match(/Niche:\s*([\s\S]+?)(?=Mid:|$)/i);
        const midM = cap.match(/Mid:\s*([\s\S]+?)(?=Broad:|$)/i);
        const broadM = cap.match(/Broad:\s*([\s\S]+?)$/i);
        const end = cap.indexOf("\nCTA:") !== -1 ? cap.indexOf("\nCTA:") : cap.indexOf("\nHASHTAGS:");
        const rawBody = end > 0 ? cap.slice(0, end).replace(/^CAPTION \d+\n/, "").trim() : cap.trim();
        const body = rawBody.replace(/^Tone:.+\n?/m, "").replace(/^Hook Type:.+\n?/m, "").trim();
        const hashtags = [
            ...(nicheM ? nicheM[1].trim().split(/\s+/) : []),
            ...(midM ? midM[1].trim().split(/\s+/) : []),
            ...(broadM ? broadM[1].trim().split(/\s+/) : []),
        ].filter(h => h.startsWith("#"));
        return {
            body,
            cta: ctaM ? ctaM[1].trim() : "",
            hashtags,
            tone: toneM ? toneM[1].trim() : "",
            hookType: hookTypeM ? hookTypeM[1].trim() : "",
        };
    });
}

function parseCompetitor(text = "") {
    const parse = (label, ends) => {
        const pat = new RegExp(`${label}:([\\s\\S]*?)(?=${ends.join("|")}|$)`, "i");
        const m = text.match(pat);
        return m ? m[1].trim().split(/\n\d+\./).filter(Boolean).map(s => s.trim()) : [];
    };
    const qm = text.match(/QUICK WIN:\s*(.+)/i);
    return {
        strengths: parse("COMPETITOR STRENGTHS", ["COMPETITOR WEAKNESSES", "DIFFERENTIATION", "CONTENT ANGLES", "QUICK WIN"]),
        weaknesses: parse("COMPETITOR WEAKNESSES", ["DIFFERENTIATION", "CONTENT ANGLES", "QUICK WIN"]),
        differentiation: parse("DIFFERENTIATION STRATEGY", ["CONTENT ANGLES", "QUICK WIN"]),
        angles: parse("CONTENT ANGLES TO ADAPT", ["QUICK WIN"]),
        quickWin: qm ? qm[1].trim() : "",
    };
}

function parseSchedule(text = "") {
    const days = text.split(/\n(?=DAY \d)/).filter(Boolean).map(block => ({
        title: (block.match(/DAY \d+\s*[—-]\s*(.+)/) || [null, block.split("\n")[0]])[0].trim(),
        primary: (block.match(/Primary Post Time:\s*(.+)/) || [null, ""])[1].trim(),
        secondary: (block.match(/Secondary Post Time:\s*(.+)/) || [null, ""])[1].trim(),
        stories: (block.match(/Stories Window:\s*(.+)/) || [null, ""])[1].trim(),
        why: (block.match(/Why These Times:\s*(.+)/) || [null, ""])[1].trim(),
    }));
    const sumM = text.match(/WEEKLY SUMMARY:([\s\S]*?)$/i);
    return { days, summary: sumM ? sumM[1].trim() : "" };
}

// ── Section Components ────────────────────────────────────
function AuditSection({ text }) {
    const d = parseAuditReport(text);
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {d.engagement && (
                <div style={{ background: "rgba(108,99,255,0.08)", border: "1px solid rgba(108,99,255,0.25)", borderRadius: 14, padding: "18px 20px" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: "#6c63ff", marginBottom: 8 }}>ENGAGEMENT ASSESSMENT</div>
                    <p style={{ color: "var(--text-primary)", fontSize: 14, lineHeight: 1.7, margin: 0 }}>{d.engagement}</p>
                </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {d.weaknesses && (
                    <div style={{ background: "rgba(255,107,157,0.07)", border: "1px solid rgba(255,107,157,0.2)", borderRadius: 14, padding: "18px 20px" }}>
                        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: "#ff6b9d", marginBottom: 12 }}>⚠️ WEAKNESSES</div>
                        {d.weaknesses.map((w, i) => (
                            <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                                <span style={{ minWidth: 22, height: 22, borderRadius: "50%", background: "rgba(255,107,157,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#ff6b9d" }}>{i + 1}</span>
                                <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.6, margin: 0 }}>{w}</p>
                            </div>
                        ))}
                    </div>
                )}
                {d.opportunities && (
                    <div style={{ background: "rgba(0,212,255,0.07)", border: "1px solid rgba(0,212,255,0.2)", borderRadius: 14, padding: "18px 20px" }}>
                        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: "#00d4ff", marginBottom: 12 }}>✅ OPPORTUNITIES</div>
                        {d.opportunities.map((o, i) => (
                            <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                                <span style={{ minWidth: 22, height: 22, borderRadius: "50%", background: "rgba(0,212,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#00d4ff" }}>{i + 1}</span>
                                <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.6, margin: 0 }}>{o}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            {d.overall && (
                <div style={{ background: "rgba(127,255,144,0.07)", border: "1px solid rgba(127,255,144,0.2)", borderRadius: 14, padding: "18px 20px" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: "#7eff90", marginBottom: 8 }}>📝 OVERALL VERDICT</div>
                    <p style={{ color: "var(--text-primary)", fontSize: 14, lineHeight: 1.7, margin: 0 }}>{d.overall}</p>
                </div>
            )}
        </div>
    );
}

function StrategySection({ text }) {
    const days = parseDays(text);
    return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
            {days.map((day, i) => (
                <div key={i} style={{ background: DAY_COLORS[i % 7], border: `1px solid ${DAY_BORDERS[i % 7]}44`, borderRadius: 16, padding: "20px 18px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                        <span style={{ width: 28, height: 28, borderRadius: "50%", background: DAY_BORDERS[i % 7], color: "#fff", fontWeight: 800, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: DAY_BORDERS[i % 7] }}>{day.title.replace(/^DAY \d+\s*[—-]\s*/, "")}</span>
                    </div>
                    {day.focus && <div style={{ marginBottom: 10 }}><div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, color: DAY_BORDERS[i % 7], marginBottom: 4, opacity: 0.8 }}>FOCUS</div><p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>{day.focus}</p></div>}
                    {day.action && <div style={{ marginBottom: 10 }}><div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, color: DAY_BORDERS[i % 7], marginBottom: 4, opacity: 0.8 }}>ACTION</div><p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>{day.action}</p></div>}
                    {day.engagement && <div><div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, color: DAY_BORDERS[i % 7], marginBottom: 4, opacity: 0.8 }}>ENGAGEMENT TACTIC</div><p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>{day.engagement}</p></div>}
                </div>
            ))}
        </div>
    );
}

function IdeasSection({ text }) {
    const ideas = parseIdeas(text);
    const diffColors = { Easy: "#7eff90", Medium: "#ffd166", Hard: "#ff6b9d" };
    const diffBg = { Easy: "rgba(127,255,144,0.12)", Medium: "rgba(255,209,102,0.12)", Hard: "rgba(255,107,157,0.12)" };
    const diffEmoji = { Easy: "🟢", Medium: "🟡", Hard: "🔴" };
    return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 16 }}>
            {ideas.map((idea, i) => {
                const fc = FORMAT_COLORS[idea.format] || "#6c63ff";
                const dc = diffColors[idea.difficulty] || "var(--text-secondary)";
                const stars = parseInt(idea.viralityScore) || 0;
                return (
                    <div key={i} style={{ background: "var(--bg-elevated)", border: `1px solid ${fc}33`, borderRadius: 16, padding: "20px", display: "flex", flexDirection: "column", gap: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 6 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, color: "var(--text-secondary)" }}>IDEA {i + 1}</span>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                {idea.format && <span style={{ fontSize: 11, fontWeight: 700, background: `${fc}22`, color: fc, padding: "3px 10px", borderRadius: 20, border: `1px solid ${fc}44` }}>{idea.format}</span>}
                                {idea.difficulty && <span style={{ fontSize: 11, fontWeight: 700, background: diffBg[idea.difficulty] || "transparent", color: dc, padding: "3px 10px", borderRadius: 20 }}>{diffEmoji[idea.difficulty] || ""} {idea.difficulty}</span>}
                            </div>
                        </div>
                        {idea.title && <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", margin: 0, lineHeight: 1.3 }}>{idea.title}</h3>}
                        {stars > 0 && (
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Virality</span>
                                <div>{[1, 2, 3, 4, 5].map(n => <span key={n} style={{ color: n <= stars ? "#ffd166" : "rgba(255,255,255,0.15)", fontSize: 14 }}>★</span>)}</div>
                                <span style={{ fontSize: 11, color: "#ffd166", fontWeight: 700 }}>{stars}/5</span>
                            </div>
                        )}
                        {idea.hook && (
                            <div style={{ background: `${fc}11`, borderLeft: `3px solid ${fc}`, paddingLeft: 12, paddingTop: 6, paddingBottom: 6, borderRadius: "0 8px 8px 0" }}>
                                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: fc, marginBottom: 2 }}>HOOK</div>
                                <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0, lineHeight: 1.5, fontStyle: "italic" }}>"{idea.hook}"</p>
                            </div>
                        )}
                        {idea.description && <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0, lineHeight: 1.6 }}>{idea.description}</p>}
                        {(idea.productionTime || idea.bestPosted) && (
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                                {idea.productionTime && <span style={{ fontSize: 11, color: "var(--text-secondary)", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", borderRadius: 20, padding: "3px 10px" }}>⏱ {idea.productionTime}</span>}
                                {idea.bestPosted && <span style={{ fontSize: 11, color: "var(--text-secondary)", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", borderRadius: 20, padding: "3px 10px" }}>📅 {idea.bestPosted}</span>}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function CaptionsSection({ text, username }) {
    const [copied, setCopied] = useState(null);
    const [abVotes, setAbVotes] = useState({});
    const captions = parseCaptions(text);

    const copyCaption = (cap, i) => {
        navigator.clipboard.writeText(`${cap.body}\n\n${cap.cta}\n\n${cap.hashtags.join(" ")}`);
        setCopied(i);
        setTimeout(() => setCopied(null), 2000);
    };

    const handleVote = async (i, result) => {
        setAbVotes(prev => ({ ...prev, [i]: result }));
        if (username) {
            await fetch("/api/caption-feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, caption_style: `Caption ${i + 1}`, result }),
            }).catch(() => { });
        }
    };

    const voteColors = { worked: "#7eff90", flopped: "#ff6b9d", unused: "#8888aa" };
    const voteLabels = { worked: "🔥 Worked!", flopped: "😕 Flopped", unused: "⏭ Skipped" };
    const toneColors = { Emotional: "#ff6b9d", Educational: "#00d4ff", Curious: "#ffd166", Entertaining: "#7eff90", Inspiring: "#6c63ff", Bold: "#ff8c6b" };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {captions.map((cap, i) => (
                <div key={i} style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid var(--border)", background: "rgba(108,99,255,0.05)", flexWrap: "wrap", gap: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: "#6c63ff", letterSpacing: 1 }}>CAPTION {i + 1}</span>
                            {cap.tone && <span style={{ fontSize: 11, fontWeight: 700, background: `${toneColors[cap.tone] || "#6c63ff"}22`, color: toneColors[cap.tone] || "#6c63ff", padding: "3px 10px", borderRadius: 20 }}>{cap.tone}</span>}
                            {cap.hookType && <span style={{ fontSize: 11, color: "var(--text-secondary)", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", padding: "3px 10px", borderRadius: 20 }}>{cap.hookType}</span>}
                        </div>
                        <button onClick={() => copyCaption(cap, i)} style={{ background: copied === i ? "rgba(127,255,144,0.15)" : "rgba(108,99,255,0.1)", border: `1px solid ${copied === i ? "#7eff9044" : "#6c63ff44"}`, color: copied === i ? "#7eff90" : "#6c63ff", borderRadius: 8, padding: "5px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}>
                            {copied === i ? "✓ Copied!" : "Copy"}
                        </button>
                    </div>
                    <div style={{ padding: "20px" }}>
                        <p style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.8, whiteSpace: "pre-wrap", margin: "0 0 16px" }}>{cap.body}</p>
                        {cap.cta && (
                            <div style={{ background: "rgba(255,209,102,0.08)", border: "1px solid rgba(255,209,102,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 16 }}>
                                <span style={{ fontSize: 10, fontWeight: 700, color: "#ffd166", letterSpacing: 1.2 }}>CTA  </span>
                                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{cap.cta}</span>
                            </div>
                        )}
                        {cap.hashtags.length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                                {cap.hashtags.map((h, j) => (
                                    <span key={j} style={{ fontSize: 12, color: "#6c63ff", background: "rgba(108,99,255,0.1)", border: "1px solid rgba(108,99,255,0.2)", borderRadius: 20, padding: "3px 10px", cursor: "pointer" }} onClick={() => navigator.clipboard.writeText(h)} title="Click to copy">{h}</span>
                                ))}
                            </div>
                        )}
                        {/* A/B Feedback row */}
                        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Did you use this?</span>
                            {["worked", "flopped", "unused"].map(v => (
                                <button key={v} onClick={() => handleVote(i, v)} style={{ fontSize: 12, padding: "4px 12px", borderRadius: 20, border: `1px solid ${abVotes[i] === v ? voteColors[v] : "var(--border)"}`, background: abVotes[i] === v ? `${voteColors[v]}22` : "transparent", color: abVotes[i] === v ? voteColors[v] : "var(--text-secondary)", cursor: "pointer", transition: "all 0.2s", fontWeight: abVotes[i] === v ? 700 : 400 }}>
                                    {voteLabels[v]}
                                </button>
                            ))}
                            {abVotes[i] && <span style={{ fontSize: 11, color: "#6c63ff" }}>✓ Saved — AI will learn from this next week</span>}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function CompetitorSection({ text }) {
    if (!text || text.trim().length < 20) return (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-secondary)" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🕵️</div>
            <p>No competitor was specified. Re-generate with a competitor username to unlock this tab.</p>
        </div>
    );
    const d = parseCompetitor(text);
    const sections = [
        { key: "strengths", label: "COMPETITOR STRENGTHS", color: "#ff6b9d", emoji: "💪" },
        { key: "weaknesses", label: "THEIR WEAKNESSES", color: "#7eff90", emoji: "🎯" },
        { key: "differentiation", label: "HOW YOU WIN", color: "#6c63ff", emoji: "🚀" },
        { key: "angles", label: "CONTENT ANGLES TO ADAPT", color: "#00d4ff", emoji: "💡" },
    ];
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {sections.map(s => (
                    <div key={s.key} style={{ background: `${s.color}11`, border: `1px solid ${s.color}33`, borderRadius: 14, padding: "18px 20px" }}>
                        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: s.color, marginBottom: 12 }}>{s.emoji} {s.label}</div>
                        {(d[s.key] || []).map((item, i) => (
                            <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                                <span style={{ minWidth: 22, height: 22, borderRadius: "50%", background: `${s.color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: s.color }}>{i + 1}</span>
                                <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.6, margin: 0 }}>{item}</p>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
            {d.quickWin && (
                <div style={{ background: "rgba(255,209,102,0.08)", border: "1px solid rgba(255,209,102,0.3)", borderRadius: 14, padding: "18px 20px" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: "#ffd166", marginBottom: 8 }}>⚡ QUICK WIN THIS WEEK</div>
                    <p style={{ color: "var(--text-primary)", fontSize: 14, lineHeight: 1.7, margin: 0 }}>{d.quickWin}</p>
                </div>
            )}
        </div>
    );
}

function ScheduleSection({ text }) {
    if (!text || text.trim().length < 20) return (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-secondary)" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⏰</div>
            <p>Schedule data will appear after the next generation.</p>
        </div>
    );
    const { days, summary } = parseSchedule(text);
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
                {days.map((day, i) => (
                    <div key={i} style={{ background: DAY_COLORS[i % 7], border: `1px solid ${DAY_BORDERS[i % 7]}44`, borderRadius: 14, padding: "18px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                            <span style={{ width: 28, height: 28, borderRadius: "50%", background: DAY_BORDERS[i % 7], color: "#fff", fontWeight: 800, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: DAY_BORDERS[i % 7] }}>{day.title.replace(/^DAY \d+\s*[—-]\s*/, "")}</span>
                        </div>
                        {day.primary && <div style={{ marginBottom: 8 }}><div style={{ fontSize: 10, fontWeight: 700, color: DAY_BORDERS[i % 7], marginBottom: 3, opacity: 0.8, letterSpacing: 1 }}>🎯 PRIMARY</div><p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>{day.primary}</p></div>}
                        {day.secondary && <div style={{ marginBottom: 8 }}><div style={{ fontSize: 10, fontWeight: 700, color: DAY_BORDERS[i % 7], marginBottom: 3, opacity: 0.8, letterSpacing: 1 }}>📤 SECONDARY</div><p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>{day.secondary}</p></div>}
                        {day.stories && <div style={{ marginBottom: 8 }}><div style={{ fontSize: 10, fontWeight: 700, color: DAY_BORDERS[i % 7], marginBottom: 3, opacity: 0.8, letterSpacing: 1 }}>📖 STORIES</div><p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>{day.stories}</p></div>}
                        {day.why && <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${DAY_BORDERS[i % 7]}33` }}><p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0, fontStyle: "italic" }}>{day.why}</p></div>}
                    </div>
                ))}
            </div>
            {summary && (
                <div style={{ background: "rgba(108,99,255,0.08)", border: "1px solid rgba(108,99,255,0.25)", borderRadius: 14, padding: "18px 20px" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#6c63ff", letterSpacing: 1.5, marginBottom: 10 }}>📊 WEEKLY SUMMARY</div>
                    <pre style={{ whiteSpace: "pre-wrap", fontFamily: "Nunito, sans-serif", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7, margin: 0 }}>{summary}</pre>
                </div>
            )}
        </div>
    );
}

// ── Main Dashboard ────────────────────────────────────────
export default function ResultsDashboard({ results, formData, onReset, onProgress }) {
    const [activeTab, setActiveTab] = useState("audit");
    const [copiedAll, setCopiedAll] = useState(false);

    const engagementRate = results.engagement_rate;
    const growthGap = (formData.target_followers - formData.followers).toLocaleString();

    const copyAll = () => {
        const fullText = `GROWTH STUDIO — WEEKLY GROWTH PACKAGE\nGenerated for @${formData.username}\n\n=== AUDIT REPORT ===\n${results.audit_report}\n\n=== 7-DAY STRATEGY ===\n${results.strategy_plan}\n\n=== CONTENT IDEAS ===\n${results.content_ideas}\n\n=== CAPTIONS & HASHTAGS ===\n${results.captions}\n\n=== COMPETITOR ANALYSIS ===\n${results.competitor_analysis || ""}\n\n=== POSTING SCHEDULE ===\n${results.posting_schedule || ""}`.trim();
        navigator.clipboard.writeText(fullText);
        setCopiedAll(true);
        setTimeout(() => setCopiedAll(false), 2000);
    };

    const metrics = [
        { label: "Engagement Rate", value: `${engagementRate}%`, icon: "📈", color: engagementRate > 3 ? "#7eff90" : "#ffd166", bg: engagementRate > 3 ? "rgba(127,255,144,0.08)" : "rgba(255,209,102,0.08)" },
        { label: "Growth Gap", value: `+${growthGap}`, icon: "🚀", color: "#6c63ff", bg: "rgba(108,99,255,0.08)" },
        { label: "Content Type", value: formData.content_type, icon: "🎬", color: "#00d4ff", bg: "rgba(0,212,255,0.08)" },
        { label: "Brand Tone", value: formData.brand_tone, icon: "🎨", color: "#ff6b9d", bg: "rgba(255,107,157,0.08)" },
    ];

    return (
        <div style={{ minHeight: "100vh", paddingBottom: 100 }}>
            {/* Header */}
            <div style={{ background: "rgba(10,10,15,0.8)", backdropFilter: "blur(20px)", borderBottom: "1px solid var(--border)", padding: "24px 32px", position: "sticky", top: 0, zIndex: 50 }}>
                <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                        <div className="badge" style={{ marginBottom: 6 }}>✦ Your Weekly Growth Package</div>
                        <h1 style={{ fontSize: "1.6rem", fontWeight: 800, margin: 0 }}>
                            <span className="gradient-text">@{formData.username}</span>
                            <span style={{ color: "var(--text-secondary)", fontWeight: 400, fontSize: "1rem", marginLeft: 12 }}>{formData.followers.toLocaleString()} → {formData.target_followers.toLocaleString()} followers</span>
                        </h1>
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                        {onProgress && <button onClick={onProgress} className="btn-ghost" style={{ padding: "9px 18px", fontSize: 13 }}>📊 My Progress</button>}
                        <button onClick={copyAll} className="btn-primary" style={{ padding: "9px 20px", fontSize: 13 }}>{copiedAll ? "✓ Copied!" : "📋 Copy All"}</button>
                        <button onClick={onReset} className="btn-ghost" style={{ padding: "9px 18px", fontSize: 13 }}>New Plan</button>
                    </div>
                </div>
            </div>

            <div style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 24px" }}>
                {/* Metrics */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 32 }} className="fade-in">
                    {metrics.map((m, i) => (
                        <div key={i} style={{ background: m.bg, border: `1px solid ${m.color}33`, borderRadius: 16, padding: "18px 20px" }}>
                            <div style={{ fontSize: 22, marginBottom: 8 }}>{m.icon}</div>
                            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.4, color: "var(--text-secondary)", marginBottom: 6 }}>{m.label.toUpperCase()}</div>
                            <div style={{ fontSize: "1.4rem", fontWeight: 800, color: m.color, lineHeight: 1.1 }}>{m.value}</div>
                        </div>
                    ))}
                </div>

                {/* Tabs */}
                <div style={{ display: "flex", gap: 6, marginBottom: 24, background: "var(--bg-elevated)", padding: 6, borderRadius: 14, border: "1px solid var(--border)", flexWrap: "wrap" }}>
                    {TABS.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                            flex: 1, minWidth: 90, padding: "10px 10px", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, transition: "all 0.2s",
                            background: activeTab === tab.id ? "rgba(108,99,255,0.2)" : "transparent",
                            color: activeTab === tab.id ? "#6c63ff" : "var(--text-secondary)",
                            boxShadow: activeTab === tab.id ? "inset 0 0 0 1px rgba(108,99,255,0.4)" : "none",
                        }}>{tab.label}</button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="fade-in">
                    {activeTab === "audit" && <AuditSection text={results.audit_report} />}
                    {activeTab === "strategy" && <StrategySection text={results.strategy_plan} />}
                    {activeTab === "ideas" && <IdeasSection text={results.content_ideas} />}
                    {activeTab === "captions" && <CaptionsSection text={results.captions} username={formData.username} />}
                    {activeTab === "schedule" && <ScheduleSection text={results.posting_schedule} />}
                    {activeTab === "competitor" && <CompetitorSection text={results.competitor_analysis} />}
                </div>
            </div>
        </div>
    );
}
