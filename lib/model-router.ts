import { createReasoningModel, createNonReasoningModel } from "./grok";

/**
 * Keywords that suggest a simple, single-action query.
 * These are routed to the faster non-reasoning model.
 */
const SIMPLE_KEYWORDS = [
    "battery",
    "charge level",
    "range",
    "tire",
    "tires",
    "pressure",
    "lock",
    "unlock",
    "where",
    "location",
    "temperature",
    "temp",
    "odometer",
    "mileage",
    "sentry",
    "horn",
    "honk",
    "flash",
    "lights",
    "trunk",
    "frunk",
    "windows",
    "weather",
    "awake",
    "asleep",
    "status",
];

/**
 * Indicators that a query needs the reasoning model:
 * compound requests, analysis, time-based questions, comparisons.
 */
const REASONING_INDICATORS = [
    " and ",
    " then ",
    " also ",
    " after ",
    "how much",
    "how many",
    "compare",
    "analyze",
    "analysis",
    "last week",
    "last month",
    "this week",
    "this month",
    "should i",
    "when should",
    "best time",
    "recommend",
    "history",
    "trend",
    "average",
    "total",
    "summarize",
    "summary",
];

/**
 * Routes a user query to the appropriate Grok model.
 *
 * Strategy:
 * - If reasoning indicators are found → reasoning model
 * - If only simple keywords match → non-reasoning model
 * - Default → reasoning model (safe fallback)
 */
export function selectModel(
    apiKey: string,
    message: string,
    preference: "auto" | "reasoning" | "non-reasoning" = "auto"
) {
    if (preference === "reasoning") return createReasoningModel(apiKey);
    if (preference === "non-reasoning") return createNonReasoningModel(apiKey);

    const lower = message.toLowerCase();

    const needsReasoning = REASONING_INDICATORS.some((indicator) =>
        lower.includes(indicator)
    );
    if (needsReasoning) return createReasoningModel(apiKey);

    const isSimple = SIMPLE_KEYWORDS.some((keyword) =>
        lower.includes(keyword)
    );
    if (isSimple) return createNonReasoningModel(apiKey);

    return createReasoningModel(apiKey);
}
