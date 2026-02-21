"use client";

import { useEffect, useRef } from "react";
import type { UIMessage } from "ai";
import ChatBubble from "./ChatBubble";
import { renderToolCard } from "./ToolCards";
import { VoiceMessage, VoiceState } from "@/hooks/useVoiceAgent";

export type TimelineEntry =
    | { kind: "chat"; message: UIMessage }
    | { kind: "voice"; message: VoiceMessage };

interface ChatThreadProps {
    timeline: TimelineEntry[];
    isLoading: boolean;
    lastChatRole?: string;
    voiceState?: VoiceState;
    mapsKey?: string;
}

export default function ChatThread({
    timeline,
    isLoading,
    lastChatRole,
    voiceState = "idle",
    mapsKey,
}: ChatThreadProps) {
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [timeline, isLoading]);

    return (
        <div className="chat-thread">
            {timeline.length === 0 && (
                <div className="chat-welcome">
                    <h2>What can I help with?</h2>
                    <p>
                        Check your battery, lock the doors, warm up the car, or ask
                        anything about your Tesla. Type below or tap the mic for voice chat.
                    </p>
                </div>
            )}

            {timeline.map((entry) => {
                if (entry.kind === "chat") {
                    return (
                        <ChatBubble
                            key={entry.message.id}
                            message={entry.message}
                            mapsKey={mapsKey}
                        />
                    );
                }
                const vm = entry.message;
                return (
                    <div key={vm.id} className={`chat-bubble ${vm.role === "user" ? "user" : "assistant"}`}>
                        <div className="bubble-content">
                            {vm.toolCard && renderToolCard(vm.toolCard.toolName, vm.toolCard.data, mapsKey)}
                            {vm.text && <div className="bubble-text">{vm.text}</div>}
                        </div>
                    </div>
                );
            })}

            {isLoading && lastChatRole === "user" && (
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
