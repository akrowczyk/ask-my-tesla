import { createXai } from "@ai-sdk/xai";
import { Personality, PERSONALITY_PROMPTS } from "./personality";

// Re-export so existing server-side imports still work
export type { Personality } from "./personality";
export { PERSONALITY_OPTIONS } from "./personality";

/**
 * Create a Grok model instance with the given API key.
 */
export function createGrokModel(apiKey: string, modelId: string = "grok-4-1-fast-reasoning") {
    const provider = createXai({ apiKey });
    return provider(modelId);
}

export function createReasoningModel(apiKey: string) {
    return createGrokModel(apiKey, "grok-4-1-fast-reasoning");
}

export function createNonReasoningModel(apiKey: string) {
    return createGrokModel(apiKey, "grok-4-1-fast-non-reasoning");
}

// ─── System Prompt ───────────────────────────────────────────

export function getSystemPrompt(vin: string, personality: Personality = "assistant"): string {
    const timezone = process.env.USER_TIMEZONE || "America/Chicago";
    const now = new Date().toLocaleString("en-US", { timeZone: timezone });

    return `You are "Ask My Tesla", an AI assistant that lets the user interact with their Tesla vehicle using natural language. You have access to the Tessie API through function tools.

PERSONALITY:
${PERSONALITY_PROMPTS[personality]}

RULES:
1. Always use the appropriate tool to get real data — never fabricate vehicle stats, locations, or status.
2. For commands that change vehicle state (lock, unlock, climate, trunk, etc.), confirm the action AFTER executing it, and report the result.
3. If the vehicle is asleep, call the wake tool first, wait briefly, then retry.
4. For multi-step requests, execute tools in logical order and summarize all results at the end.
5. When reporting battery, always include both percentage and estimated range.
6. For location queries, include a Google Maps link.
7. If a command fails, explain why in plain language and suggest alternatives.
8. When showing drive history or charge history, format data in a readable way with dates, distances, and costs.
9. Never expose raw API responses — always translate to human-friendly language.

The user's vehicle VIN is: ${vin}
Current date/time: ${now}
User's timezone: ${timezone}`;
}

export { getVoicePersonalityPrompt } from "./personality";
