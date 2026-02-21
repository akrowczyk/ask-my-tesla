/**
 * POST /api/voice-token
 *
 * Fetches an ephemeral token from xAI's realtime API.
 * The token is scoped and short-lived (5 min) so the browser
 * can connect directly to wss://api.x.ai/v1/realtime without
 * exposing the full API key.
 */

import { resolveKeys } from "@/lib/resolve-keys";

export async function POST(req: Request) {
    const { xaiKey } = resolveKeys(req);

    if (!xaiKey) {
        return new Response(
            JSON.stringify({ error: "xAI API key is not configured. Add it in Settings or set XAI_API_KEY in your environment." }),
            { status: 401, headers: { "Content-Type": "application/json" } }
        );
    }

    try {
        const response = await fetch(
            "https://api.x.ai/v1/realtime/client_secrets",
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${xaiKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    expires_after: { seconds: 300 },
                }),
            }
        );

        if (!response.ok) {
            const text = await response.text();
            console.error("Failed to get ephemeral token:", text);
            return new Response(
                JSON.stringify({ error: "Failed to obtain voice session token" }),
                { status: response.status, headers: { "Content-Type": "application/json" } }
            );
        }

        const data = await response.json();
        return new Response(JSON.stringify(data), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Voice token error:", error);
        return new Response(
            JSON.stringify({ error: "Internal server error" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}
