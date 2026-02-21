import { NextResponse } from "next/server";

/**
 * GET /api/config
 *
 * Reports whether server-side env vars are configured (without revealing values).
 * The client uses this to decide whether to show the onboarding modal.
 */
export async function GET() {
    const hasEnvKeys = !!(
        process.env.TESSIE_API_KEY &&
        process.env.XAI_API_KEY &&
        process.env.TESLA_VIN
    );

    return NextResponse.json({ hasEnvKeys });
}
