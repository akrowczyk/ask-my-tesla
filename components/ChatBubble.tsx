"use client";

import type { UIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import { renderToolCard } from "./ToolCards";

interface ChatBubbleProps {
    message: UIMessage;
    mapsKey?: string;
}

export default function ChatBubble({ message, mapsKey }: ChatBubbleProps) {
    const isUser = message.role === "user";

    // Extract text content from message parts
    const textContent = message.parts
        ?.filter((part): part is Extract<typeof part, { type: "text" }> => part.type === "text")
        .map((part) => part.text)
        .join("\n") || "";

    // Extract tool invocation parts
    const toolParts = message.parts
        ?.filter((part) => part.type.startsWith("tool-")) || [];

    const hasToolCalls = toolParts.length > 0;

    return (
        <div className={`chat-bubble ${isUser ? "user" : "assistant"}`}>
            <div className="bubble-content">
                {/* Tool invocations: rich cards when complete, badges when in-flight */}
                {hasToolCalls && (
                    <div className="tool-results">
                        {toolParts.map((part, i) => {
                            const toolName = "toolName" in part ? (part.toolName as string) : "tool";
                            const state = "state" in part ? (part.state as string) : "";
                            const output = "output" in part ? part.output : undefined;
                            const isComplete = state === "result" || state === "output-available";

                            if (isComplete && output) {
                                const card = renderToolCard(toolName, output, mapsKey);
                                if (card) return <div key={i}>{card}</div>;
                            }

                            return (
                                <span key={i} className="tool-badge">
                                    {getToolEmoji(toolName)}{" "}
                                    {formatToolName(toolName)}
                                    {isComplete ? " ✓" : " ..."}
                                </span>
                            );
                        })}
                    </div>
                )}

                {/* Message content */}
                {textContent && (
                    <div className="bubble-text">
                        {isUser ? (
                            formatContent(textContent)
                        ) : (
                            <ReactMarkdown>{textContent}</ReactMarkdown>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function formatToolName(name: string): string {
    return name
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getToolEmoji(name: string): string {
    const emojiMap: Record<string, string> = {
        get_battery_status: "🔋",
        get_location: "📍",
        get_tire_pressure: "🛞",
        get_vehicle_status: "🚗",
        get_climate_state: "🌡️",
        get_weather: "🌤️",
        get_drives: "🛣️",
        get_charges: "⚡",
        check_vehicle_awake: "😴",
        wake_vehicle: "⏰",
        lock_doors: "🔒",
        unlock_doors: "🔓",
        start_climate: "❄️",
        stop_climate: "⛔",
        set_temperature: "🌡️",
        set_seat_heater: "🪑",
        set_steering_wheel_heater: "🎡",
        open_trunk: "📦",
        vent_windows: "🪟",
        close_windows: "🪟",
        flash_lights: "💡",
        honk_horn: "📯",
        start_charging: "🔌",
        stop_charging: "🔌",
        set_charge_limit: "🔋",
        toggle_sentry_mode: "👁️",
        trigger_homelink: "🏠",
        share_address: "📍",
        activate_defrost: "❄️",
    };
    return emojiMap[name] || "🔧";
}

function formatContent(content: string): React.ReactNode {
    const lines = content.split("\n");
    return lines.map((line, i) => (
        <span key={i}>
            {line}
            {i < lines.length - 1 && <br />}
        </span>
    ));
}
