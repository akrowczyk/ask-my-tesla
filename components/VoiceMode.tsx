"use client";

import { useVoiceAgent, VoiceState, VoiceName, VOICE_OPTIONS } from "@/hooks/useVoiceAgent";
import { useEffect } from "react";

const stateLabels: Record<VoiceState, string> = {
    idle: "",
    connecting: "Connecting…",
    listening: "Listening…",
    thinking: "Thinking…",
    speaking: "Speaking…",
    error: "Error",
};

interface VoiceModeProps {
    onClose: () => void;
    voiceAgent: ReturnType<typeof useVoiceAgent>;
    selectedVoice: VoiceName;
    onVoiceChange: (voice: VoiceName) => void;
}

/**
 * Inline voice bar that replaces the text input when voice mode is active.
 */
export default function VoiceMode({ onClose, voiceAgent, selectedVoice, onVoiceChange }: VoiceModeProps) {
    const { state, transcript, connect, disconnect, error, micMuted, speakerMuted, toggleMicMute, toggleSpeakerMute } = voiceAgent;

    // Auto-connect when mounted
    useEffect(() => {
        connect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleStop = () => {
        disconnect();
        onClose();
    };

    const isActive = state === "listening" || state === "thinking" || state === "speaking";

    return (
        <div className="voice-bar-ambient-wrap">
            <div className="voice-bar-ambient" />
        <div className="voice-bar">
            {/* Status line */}
            <div className="voice-bar-display">
                {error ? (
                    <span className="voice-bar-error">⚠️ {error}</span>
                ) : (
                    <span className="voice-bar-status">
                        {stateLabels[state] || "Starting voice…"}
                    </span>
                )}
            </div>

            {/* Controls row */}
            <div className="voice-bar-controls">
                {/* State indicator dots */}
                <div className="voice-bar-indicator">
                    <div className={`voice-dot-group ${state}`}>
                        <span className="voice-dot" />
                        <span className="voice-dot" />
                        <span className="voice-dot" />
                        <span className="voice-dot" />
                        <span className="voice-dot" />
                    </div>
                </div>

                {/* Mic toggle */}
                <button
                    className={`voice-bar-mic ${isActive ? state : ""} ${micMuted ? "muted" : ""}`}
                    aria-label={micMuted ? "Unmute microphone" : "Mute microphone"}
                    onClick={() => {
                        if (state === "idle" || state === "error") {
                            connect();
                        } else {
                            toggleMicMute();
                        }
                    }}
                >
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        {micMuted ? (
                            <>
                                <line x1="1" y1="1" x2="23" y2="23" />
                                <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                                <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.13 1.49-.35 2.17" />
                                <line x1="12" y1="19" x2="12" y2="23" />
                                <line x1="8" y1="23" x2="16" y2="23" />
                            </>
                        ) : (
                            <>
                                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                <line x1="12" y1="19" x2="12" y2="23" />
                                <line x1="8" y1="23" x2="16" y2="23" />
                            </>
                        )}
                    </svg>
                </button>

                {/* Speaker toggle */}
                <button
                    className={`voice-bar-speaker ${state === "speaking" && !speakerMuted ? "active" : ""} ${speakerMuted ? "muted" : ""}`}
                    aria-label={speakerMuted ? "Unmute speaker" : "Mute speaker"}
                    onClick={toggleSpeakerMute}
                >
                    <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        {speakerMuted ? (
                            <>
                                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                                <line x1="23" y1="9" x2="17" y2="15" />
                                <line x1="17" y1="9" x2="23" y2="15" />
                            </>
                        ) : (
                            <>
                                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                            </>
                        )}
                    </svg>
                </button>

                {/* Voice selector */}
                <div className="voice-bar-label">
                    <span className="voice-bar-voice-icon">🎧</span>
                    <select
                        className="voice-select"
                        value={selectedVoice}
                        onChange={(e) => onVoiceChange(e.target.value as VoiceName)}
                        disabled={state === "connecting" || state === "thinking"}
                        aria-label="Select voice"
                    >
                        {VOICE_OPTIONS.map((v) => (
                            <option key={v.id} value={v.id}>
                                {v.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Spacer */}
                <div style={{ flex: 1 }} />

                {/* Close button */}
                <button
                    className="voice-bar-close"
                    onClick={handleStop}
                    aria-label="End voice chat"
                >
                    ✕
                </button>
            </div>
        </div>
        </div>
    );
}
