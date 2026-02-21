import { streamText, stepCountIs, convertToModelMessages } from "ai";
import { getSystemPrompt } from "@/lib/grok";
import { selectModel } from "@/lib/model-router";
import { createTeslaTools } from "@/lib/tools";
import { getOrCreateSession, addMessage } from "@/lib/session-store";
import { resolveKeys } from "@/lib/resolve-keys";

export const maxDuration = 60;

export async function POST(req: Request) {
    try {
        const { tessieKey, xaiKey, vin } = resolveKeys(req);

        if (!xaiKey) {
            return new Response(
                JSON.stringify({ error: "xAI API key is not configured. Add it in Settings or set XAI_API_KEY in your environment." }),
                { status: 401, headers: { "Content-Type": "application/json" } }
            );
        }
        if (!tessieKey || !vin) {
            return new Response(
                JSON.stringify({ error: "Tessie API key and Tesla VIN are required. Add them in Settings." }),
                { status: 401, headers: { "Content-Type": "application/json" } }
            );
        }

        const body = await req.json();
        const { messages: incomingMessages, sessionId, personality } = body;

        if (!incomingMessages || !Array.isArray(incomingMessages) || incomingMessages.length === 0) {
            return new Response(
                JSON.stringify({ error: "Messages are required" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        const session = getOrCreateSession(sessionId);

        const lastUserMessage = [...incomingMessages]
            .reverse()
            .find((m: { role: string }) => m.role === "user");
        const userText = lastUserMessage?.parts
            ?.filter((p: { type: string }) => p.type === "text")
            .map((p: { text: string }) => p.text)
            .join("") ?? "";

        if (userText) {
            addMessage(session.id, {
                role: "user",
                content: userText,
                timestamp: new Date(),
            });
        }

        const model = selectModel(xaiKey, userText, session.modelPreference);
        const tools = createTeslaTools({ apiKey: tessieKey, vin });

        const messages = await convertToModelMessages(incomingMessages, { tools });

        const maxSteps = parseInt(process.env.MAX_TOOL_ITERATIONS || "10", 10);

        console.log("[chat] personality:", personality ?? "(not set, defaulting to assistant)");

        const result = streamText({
            model,
            system: getSystemPrompt(vin, personality),
            messages,
            tools,
            stopWhen: stepCountIs(maxSteps),
            temperature: 0.3,
            onFinish: ({ text }) => {
                if (text) {
                    addMessage(session.id, {
                        role: "assistant",
                        content: text,
                        timestamp: new Date(),
                    });
                }
            },
        });

        return result.toUIMessageStreamResponse({
            headers: { "X-Session-Id": session.id },
        });
    } catch (error) {
        console.error("Chat API error:", error);
        return new Response(
            JSON.stringify({ error: "I'm having trouble thinking right now. Please try again in a moment." }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}
