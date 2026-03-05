import { useEffect, useState } from "react";

const AGENTS = [
    { id: 1, icon: "🔍", name: "Audit Agent", description: "Calculating engagement rate & identifying growth gaps" },
    { id: 2, icon: "🎯", name: "Strategy Agent", description: "Building your 7-day structured growth roadmap" },
    { id: 3, icon: "✍️", name: "Content Agent", description: "Generating post ideas, reel concepts & scripts" },
    { id: 4, icon: "💬", name: "Caption Agent", description: "Writing captions, CTAs & hashtag clusters" },
];

export default function ProcessingView({ done, error, onRetry, onReset }) {
    const [activeAgent, setActiveAgent] = useState(0);
    const [completedAgents, setCompletedAgents] = useState([]);

    useEffect(() => {
        if (done) {
            setCompletedAgents([1, 2, 3, 4]);
            setActiveAgent(null);
            return;
        }
        if (error) return;

        // Simulate agent progress while API runs (~25-40s total)
        const timings = [0, 7000, 16000, 25000]; // when each agent "starts"
        const durations = [7000, 9000, 9000, 8000]; // how long each "runs"

        const timers = [];
        AGENTS.forEach((agent, i) => {
            timers.push(setTimeout(() => {
                setActiveAgent(agent.id);
            }, timings[i]));
            timers.push(setTimeout(() => {
                setCompletedAgents(prev => [...prev, agent.id]);
                setActiveAgent(null);
            }, timings[i] + durations[i]));
        });

        return () => timers.forEach(clearTimeout);
    }, [done, error]);

    const getStatus = (agentId) => {
        if (completedAgents.includes(agentId)) return "done";
        if (activeAgent === agentId) return "running";
        return "waiting";
    };

    return (
        <div style={{
            minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
            padding: "48px 24px"
        }}>
            <div style={{ width: "100%", maxWidth: "480px" }}>

                <div style={{ textAlign: "center", marginBottom: "40px" }} className="fade-in">
                    <div className="badge" style={{ marginBottom: "16px" }}>✦ AI Agents Running</div>
                    <h2 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "10px" }}>
                        {error ? "Something went wrong" : done ? "Plan ready!" : "Building your growth plan..."}
                    </h2>
                    <p style={{ color: "var(--text-secondary)", fontSize: "15px", whiteSpace: "pre-wrap", maxWidth: "100%", wordBreak: "break-word" }}>
                        {error ? (typeof error === 'object' ? JSON.stringify(error) : error) : done ? "Your weekly growth package is ready." : "Our agents are analyzing your profile"}
                    </p>
                </div>

                {error ? (
                    <div style={{ textAlign: "center", display: "flex", gap: "12px", justifyContent: "center" }}>
                        <button className="btn-primary" onClick={onRetry}>Try Again</button>
                        <button className="btn-ghost" onClick={onReset}>Start Over</button>
                    </div>
                ) : (
                    <>
                        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                            {AGENTS.map((agent, i) => {
                                const status = getStatus(agent.id);
                                return (
                                    <div
                                        key={agent.id}
                                        className={`card ${status === "running" ? "agent-running" : ""}`}
                                        style={{
                                            padding: "18px 20px",
                                            opacity: status === "waiting" ? 0.4 : 1,
                                            transition: "opacity 300ms ease, border-color 300ms ease",
                                            borderColor: status === "done" ? "rgba(78,205,196,0.3)" : undefined,
                                            animationDelay: `${i * 0.1}s`,
                                        }}
                                    >
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                                                <span style={{ fontSize: "22px" }}>{agent.icon}</span>
                                                <div>
                                                    <div style={{ fontWeight: 700, fontSize: "15px", fontFamily: "Plus Jakarta Sans", marginBottom: "2px" }}>
                                                        {agent.name}
                                                    </div>
                                                    <div style={{ color: "var(--text-secondary)", fontSize: "12px" }}>
                                                        {agent.description}
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                {status === "waiting" && <span className="tag">Waiting</span>}
                                                {status === "running" && <span className="tag" style={{ background: "rgba(108,99,255,0.2)", color: "var(--accent-primary)", borderColor: "rgba(108,99,255,0.4)" }}>Running...</span>}
                                                {status === "done" && <span className="tag tag-teal">✓ Done</span>}
                                            </div>
                                        </div>
                                        {status === "running" && (
                                            <div style={{ marginTop: "14px", background: "var(--bg-elevated)", borderRadius: "50px", overflow: "hidden", height: "4px" }}>
                                                <div className="progress-bar-fill" style={{ width: "0%" }} />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <p style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: "12px", marginTop: "28px" }}>
                            This usually takes 20–40 seconds
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}
