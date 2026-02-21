import { NextResponse } from "next/server";
import { createSession, clearSession } from "@/lib/session-store";
import { resolveKeys } from "@/lib/resolve-keys";

export async function POST(req: Request) {
    const { vin } = resolveKeys(req);
    const session = createSession(vin);
    return NextResponse.json({
        sessionId: session.id,
        vin: session.vin,
    });
}

export async function DELETE(req: Request) {
    try {
        const { sessionId } = await req.json();
        if (sessionId) {
            clearSession(sessionId);
        }
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ success: false }, { status: 400 });
    }
}
