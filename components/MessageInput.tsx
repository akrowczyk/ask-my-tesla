"use client";

import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from "react";
import VoiceMode from "./VoiceMode";
import { useVoiceAgent, VoiceName } from "@/hooks/useVoiceAgent";

interface MessageInputProps {
    onSend: (message: string) => void;
    disabled: boolean;
    voiceAgent: ReturnType<typeof useVoiceAgent>;
    voiceActive: boolean;
    setVoiceActive: (active: boolean) => void;
    selectedVoice: VoiceName;
    onVoiceChange: (voice: VoiceName) => void;
}

export default function MessageInput({
    onSend,
    disabled,
    voiceAgent,
    voiceActive,
    setVoiceActive,
    selectedVoice,
    onVoiceChange,
}: MessageInputProps) {
    const [input, setInput] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const prevDisabledRef = useRef(disabled);

    // Auto-resize textarea
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = "auto";
            textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
        }
    }, [input]);

    // Refocus textarea when it becomes enabled after a response completes
    useEffect(() => {
        if (prevDisabledRef.current && !disabled) {
            textareaRef.current?.focus();
        }
        prevDisabledRef.current = disabled;
    }, [disabled]);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        const trimmed = input.trim();
        if (trimmed && !disabled) {
            onSend(trimmed);
            setInput("");
            if (textareaRef.current) {
                textareaRef.current.style.height = "auto";
            }
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    // When voice is active, show the voice bar instead of the text input
    if (voiceActive) {
        return (
            <div className="message-input-form">
                <VoiceMode
                    onClose={() => setVoiceActive(false)}
                    voiceAgent={voiceAgent}
                    selectedVoice={selectedVoice}
                    onVoiceChange={onVoiceChange}
                />
            </div>
        );
    }

    return (
        <form className="message-input-form" onSubmit={handleSubmit} suppressHydrationWarning>
            <div className="message-input-container">
                <textarea
                    ref={textareaRef}
                    className="message-input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={disabled ? "Thinking..." : "Ask your Tesla anything..."}
                    disabled={disabled}
                    rows={1}
                    aria-label="Message input"
                />
                {!input.trim() && (
                    <button
                        type="button"
                        className="mic-button"
                        onClick={() => setVoiceActive(true)}
                        disabled={disabled}
                        aria-label="Start voice chat"
                        title="Voice chat"
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
                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                            <line x1="12" y1="19" x2="12" y2="23" />
                            <line x1="8" y1="23" x2="16" y2="23" />
                        </svg>
                    </button>
                )}
                <button
                    type="submit"
                    className="send-button"
                    disabled={disabled || !input.trim()}
                    aria-label="Send message"
                >
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                </button>
            </div>
        </form>
    );
}
