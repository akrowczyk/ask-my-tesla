import type { Session, ChatMessage } from "@/types";
import { v4 as uuidv4 } from "uuid";

const SESSION_TTL_MS =
    (parseInt(process.env.SESSION_TTL_HOURS || "24", 10)) * 60 * 60 * 1000;

/**
 * In-memory session store.
 * Sessions are keyed by session ID and expire after SESSION_TTL_HOURS.
 */
const sessions = new Map<string, Session>();

/**
 * Periodic cleanup of expired sessions (runs every 10 minutes).
 */
if (typeof setInterval !== "undefined") {
    setInterval(() => {
        const now = Date.now();
        for (const [id, session] of sessions) {
            if (now - session.lastActiveAt.getTime() > SESSION_TTL_MS) {
                sessions.delete(id);
            }
        }
    }, 10 * 60 * 1000);
}

export function createSession(vin?: string): Session {
    const session: Session = {
        id: uuidv4(),
        vin: vin || process.env.TESLA_VIN || "",
        messages: [],
        createdAt: new Date(),
        lastActiveAt: new Date(),
        modelPreference: (process.env.DEFAULT_MODEL as Session["modelPreference"]) || "auto",
    };
    sessions.set(session.id, session);
    return session;
}

export function getSession(sessionId: string): Session | undefined {
    const session = sessions.get(sessionId);
    if (!session) return undefined;

    // Check expiry
    if (Date.now() - session.lastActiveAt.getTime() > SESSION_TTL_MS) {
        sessions.delete(sessionId);
        return undefined;
    }

    session.lastActiveAt = new Date();
    return session;
}

export function addMessage(sessionId: string, message: ChatMessage): void {
    const session = sessions.get(sessionId);
    if (session) {
        session.messages.push(message);
        session.lastActiveAt = new Date();
    }
}

export function clearSession(sessionId: string): boolean {
    return sessions.delete(sessionId);
}

export function getOrCreateSession(sessionId?: string): Session {
    if (sessionId) {
        const existing = getSession(sessionId);
        if (existing) return existing;
    }
    return createSession();
}
