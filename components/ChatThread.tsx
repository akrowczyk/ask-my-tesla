"use client";

import { useEffect, useRef } from "react";
import type { UIMessage } from "ai";
import ChatBubble from "./ChatBubble";
import { renderToolCard } from "./ToolCards";
import { VoiceMessage, VoiceState } from "@/hooks/useVoiceAgent";

interface ChatThreadProps {
    messages: UIMessage[];
    isLoading: boolean;
    voiceMessages?: VoiceMessage[];
    voiceState?: VoiceState;
    mapsKey?: string;
}

export default function ChatThread({
    messages,
    isLoading,
    voiceMessages = [],
    voiceState = "idle",
    mapsKey,
}: ChatThreadProps) {
    const bottomRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when messages or voice messages change
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading, voiceMessages]);

    const hasAnyMessages = messages.length > 0 || voiceMessages.length > 0;

    return (
        <div className="chat-thread">
            {!hasAnyMessages && (
                <div className="chat-welcome">
                    <h2>What can I help with?</h2>
                    <p>
                        Check your battery, lock the doors, warm up the car, or ask
                        anything about your Tesla. Type below or tap the mic for voice chat.
                    </p>
                </div>
            )}

            {messages.map((message) => (
                <ChatBubble key={message.id} message={message} mapsKey={mapsKey} />
            ))}

            {isLoading && messages.length > 0 && messages[messages.length - 1].role === "user" && (
                <div className="chat-bubble assistant">
                    <div className="bubble-content">
                        <div className="loading-dots">
                            <span />
                            <span />
                            <span />
                        </div>
                    </div>
                </div>
            )}

            {/* Voice conversation messages */}
            {voiceMessages.map((vm) => (
                <div key={vm.id} className={`chat-bubble ${vm.role === "user" ? "user" : "assistant"}`}>
                    <div className="bubble-content">
                        {vm.toolCard && renderToolCard(vm.toolCard.toolName, vm.toolCard.data, mapsKey)}
                        {vm.text && <div className="bubble-text">{vm.text}</div>}
                    </div>
                </div>
            ))}

            {/* Voice thinking indicator */}
            {voiceState === "thinking" && (
                <div className="chat-bubble assistant">
                    <div className="bubble-content">
                        <div className="loading-dots">
                            <span />
                            <span />
                            <span />
                        </div>
                    </div>
                </div>
            )}

            <div ref={bottomRef} />
        </div>
    );
}
