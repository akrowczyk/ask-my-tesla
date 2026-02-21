import { NextRequest, NextResponse } from "next/server";
import * as tessie from "@/lib/tessie";
import type { VehicleStatusResponse } from "@/types";
import { resolveKeys } from "@/lib/resolve-keys";

const DISCONNECTED: VehicleStatusResponse = {
    battery: 0,
    range: 0,
    locked: false,
    climate_on: false,
    sentry_on: false,
    connected: false,
    last_updated: new Date().toISOString(),
};

export async function GET(req: NextRequest) {
    try {
        const { tessieKey, vin } = resolveKeys(req);

        if (!tessieKey || !vin) {
            return NextResponse.json({ ...DISCONNECTED, last_updated: new Date().toISOString() });
        }

        const state = await tessie.getVehicleState({ apiKey: tessieKey, vin });

        const response: VehicleStatusResponse = {
            battery: state.charge_state?.battery_level ?? 0,
            range: Math.round(state.charge_state?.battery_range ?? 0),
            locked: state.vehicle_state?.locked ?? false,
            climate_on: state.climate_state?.is_climate_on ?? false,
            sentry_on: state.vehicle_state?.sentry_mode ?? false,
            connected: true,
            last_updated: new Date().toISOString(),
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error("Vehicle status error:", error);
        return NextResponse.json({ ...DISCONNECTED, last_updated: new Date().toISOString() });
    }
}
