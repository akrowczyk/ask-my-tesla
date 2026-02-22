"use client";

import { useState, useEffect, useCallback } from "react";
import type { VehicleStatusResponse } from "@/types";
import { Personality, PERSONALITY_OPTIONS } from "@/lib/personality";
import { useKeys } from "@/lib/keys";
import SettingsModal from "./SettingsModal";

export default function StatusBar() {
    const [status, setStatus] = useState<VehicleStatusResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [personality, setPersonality] = useState<Personality>("assistant");
    const [settingsOpen, setSettingsOpen] = useState(false);
    const { isConfigured, hasEnvKeys, getKeyHeaders } = useKeys();

    useEffect(() => {
        const stored = localStorage.getItem("personality") as Personality | null;
        if (stored) setPersonality(stored);
    }, []);

    const handlePersonalityChange = (p: Personality) => {
        setPersonality(p);
        localStorage.setItem("personality", p);
        window.dispatchEvent(new CustomEvent("personality-changed", { detail: p }));
    };

    const fetchStatus = useCallback(async () => {
        try {
            const res = await fetch("/api/vehicle/status", {
                headers: getKeyHeaders(),
            });
            if (res.ok) {
                const data = await res.json();
                setStatus(data);
            }
        } catch {
            // Silently fail — status bar just shows disconnected
        } finally {
            setLoading(false);
        }
    }, [getKeyHeaders]);

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 60_000);

        const onCommand = () => setTimeout(fetchStatus, 2000);
        window.addEventListener("vehicle-command-executed", onCommand);

        return () => {
            clearInterval(interval);
            window.removeEventListener("vehicle-command-executed", onCommand);
        };
    }, [fetchStatus]);

    return (
        <header className="status-bar">
            <div className="status-bar-left">
                <img
                    src="/amt-logo.png"
                    alt="Ask My Tesla"
                    className="status-bar-logo-img"
                />
                <div className="personality-selector">
                    <select
                        className="personality-select"
                        value={personality}
                        onChange={(e) => handlePersonalityChange(e.target.value as Personality)}
                        aria-label="Select personality"
                        suppressHydrationWarning
                    >
                        {PERSONALITY_OPTIONS.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
            <div className="status-bar-right">
                {loading ? (
                    <span className="status-pill status-loading">connecting...</span>
                ) : status?.connected ? (
                    <>
                        <span className="status-pill status-battery">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="1" y="6" width="18" height="12" rx="2" ry="2" />
                                <line x1="23" y1="13" x2="23" y2="11" />
                            </svg>
                            {status.battery}%
                        </span>
                        <span className="status-pill" title={status.locked ? "Locked" : "Unlocked"}>
                            {status.locked ? (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>
                            ) : (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                    <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                                </svg>
                            )}
                        </span>
                        <span className="status-dot connected" title="Connected" />
                    </>
                ) : (
                    <span className="status-pill status-disconnected">
                        Offline
                    </span>
                )}
                <button
                    className="settings-gear"
                    onClick={() => setSettingsOpen(true)}
                    aria-label="Settings"
                    title="Settings"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                </button>
            </div>
            {!isConfigured && !hasEnvKeys && (
                <SettingsModal open onClose={() => {}} onboarding />
            )}
            <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        </header>
    );
}
