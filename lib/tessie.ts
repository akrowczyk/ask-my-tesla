import type {
    TessieVehicleState,
    TessieTirePressure,
    TessieDrive,
    TessieCharge,
    TessieWeather,
} from "@/types";

const TESSIE_BASE_URL = "https://api.tessie.com";

export interface TessieOpts {
    apiKey: string;
    vin: string;
}

function makeHeaders(apiKey: string): HeadersInit {
    return {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
    };
}

/**
 * Handle Tessie API errors with human-friendly messages
 */
function handleTessieError(status: number, statusText: string): string {
    switch (status) {
        case 401:
            return "Your Tessie token appears to be expired. Please update it in settings.";
        case 403:
            return "Access denied. Your Tessie account may not have permission for this vehicle.";
        case 408:
        case 504:
            return "Your car didn't respond in time. It may be in a low-signal area.";
        case 422:
            return `The request was invalid: ${statusText}`;
        case 429:
            return "I'm getting rate-limited. Please wait a few seconds before your next request.";
        case 503:
            return "The Tessie service is temporarily unavailable. Please try again in a moment.";
        default:
            return `Tessie API error (${status}): ${statusText}`;
    }
}

async function tessieGet<T>(path: string, opts: TessieOpts): Promise<T> {
    const url = `${TESSIE_BASE_URL}${path.replace("{vin}", opts.vin)}`;

    const response = await fetch(url, {
        method: "GET",
        headers: makeHeaders(opts.apiKey),
    });

    if (!response.ok) {
        throw new Error(handleTessieError(response.status, response.statusText));
    }

    return response.json();
}

async function tessiePost<T>(
    path: string,
    opts: TessieOpts,
    body?: Record<string, unknown>
): Promise<T> {
    const url = `${TESSIE_BASE_URL}${path.replace("{vin}", opts.vin)}`;

    const response = await fetch(url, {
        method: "POST",
        headers: makeHeaders(opts.apiKey),
        body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
        throw new Error(handleTessieError(response.status, response.statusText));
    }

    return response.json();
}

// ─── Read-Only Endpoints ─────────────────────────────────────

export async function getVehicleState(opts: TessieOpts): Promise<TessieVehicleState> {
    return tessieGet<TessieVehicleState>("/{vin}/state", opts);
}

export async function getLocation(opts: TessieOpts): Promise<{
    latitude: number;
    longitude: number;
    address: string;
}> {
    return tessieGet("/{vin}/location", opts);
}

export async function getTirePressure(opts: TessieOpts): Promise<TessieTirePressure> {
    return tessieGet<TessieTirePressure>("/{vin}/tire_pressure", opts);
}

export async function getWeather(opts: TessieOpts): Promise<TessieWeather> {
    return tessieGet<TessieWeather>("/{vin}/weather", opts);
}

export async function getDrives(
    opts: TessieOpts,
    fromTimestamp?: string,
    toTimestamp?: string
): Promise<{ results: TessieDrive[] }> {
    let path = "/{vin}/drives";
    const params = new URLSearchParams();
    if (fromTimestamp) params.set("from", fromTimestamp);
    if (toTimestamp) params.set("to", toTimestamp);
    if (params.toString()) path += `?${params.toString()}`;
    return tessieGet(path, opts);
}

export async function getCharges(
    opts: TessieOpts,
    fromTimestamp?: string,
    toTimestamp?: string
): Promise<{ results: TessieCharge[] }> {
    let path = "/{vin}/charges";
    const params = new URLSearchParams();
    if (fromTimestamp) params.set("from", fromTimestamp);
    if (toTimestamp) params.set("to", toTimestamp);
    if (params.toString()) path += `?${params.toString()}`;
    return tessieGet(path, opts);
}

export async function checkVehicleAwake(opts: TessieOpts): Promise<{ status: string }> {
    return tessieGet("/{vin}/status", opts);
}

// ─── Command Endpoints ───────────────────────────────────────

export async function wakeVehicle(opts: TessieOpts): Promise<{ result: boolean }> {
    return tessiePost("/{vin}/wake", opts);
}

export async function lockDoors(opts: TessieOpts): Promise<{ result: boolean }> {
    return tessiePost("/{vin}/command/lock", opts);
}

export async function unlockDoors(opts: TessieOpts): Promise<{ result: boolean }> {
    return tessiePost("/{vin}/command/unlock", opts);
}

export async function startClimate(opts: TessieOpts): Promise<{ result: boolean }> {
    return tessiePost("/{vin}/command/start_climate", opts);
}

export async function stopClimate(opts: TessieOpts): Promise<{ result: boolean }> {
    return tessiePost("/{vin}/command/stop_climate", opts);
}

export async function setTemperature(
    opts: TessieOpts,
    driverTemp: number,
    passengerTemp?: number
): Promise<{ result: boolean }> {
    return tessiePost("/{vin}/command/set_temperatures", opts, {
        driver_temp: driverTemp,
        passenger_temp: passengerTemp ?? driverTemp,
    });
}

export async function setSeatHeater(
    opts: TessieOpts,
    seat: string,
    level: number
): Promise<{ result: boolean }> {
    return tessiePost("/{vin}/command/set_seat_heater", opts, { seat, level });
}

export async function setSeatCooler(
    opts: TessieOpts,
    seat: string,
    level: number
): Promise<{ result: boolean }> {
    return tessiePost("/{vin}/command/set_seat_cooler", opts, { seat, level });
}

export async function activateDefrost(
    opts: TessieOpts,
    on: boolean
): Promise<{ result: boolean }> {
    return tessiePost("/{vin}/command/set_preconditioning_max", opts, { on });
}

export async function setSteeringWheelHeater(
    opts: TessieOpts,
    on: boolean
): Promise<{ result: boolean }> {
    return tessiePost("/{vin}/command/set_steering_wheel_heater", opts, { on });
}

export async function openTrunk(
    opts: TessieOpts,
    whichTrunk: "rear" | "front"
): Promise<{ result: boolean }> {
    return tessiePost("/{vin}/command/actuate_trunk", opts, { which_trunk: whichTrunk });
}

export async function ventWindows(opts: TessieOpts): Promise<{ result: boolean }> {
    return tessiePost("/{vin}/command/vent_windows", opts);
}

export async function closeWindows(opts: TessieOpts): Promise<{ result: boolean }> {
    return tessiePost("/{vin}/command/close_windows", opts);
}

export async function flashLights(opts: TessieOpts): Promise<{ result: boolean }> {
    return tessiePost("/{vin}/command/flash_lights", opts);
}

export async function honkHorn(opts: TessieOpts): Promise<{ result: boolean }> {
    return tessiePost("/{vin}/command/honk", opts);
}

export async function startCharging(opts: TessieOpts): Promise<{ result: boolean }> {
    return tessiePost("/{vin}/command/start_charging", opts);
}

export async function stopCharging(opts: TessieOpts): Promise<{ result: boolean }> {
    return tessiePost("/{vin}/command/stop_charging", opts);
}

export async function setChargeLimit(
    opts: TessieOpts,
    percent: number
): Promise<{ result: boolean }> {
    return tessiePost("/{vin}/command/set_charge_limit", opts, { percent });
}

export async function toggleSentryMode(
    opts: TessieOpts,
    on: boolean
): Promise<{ result: boolean }> {
    return tessiePost("/{vin}/command/set_sentry_mode", opts, { on });
}

export async function triggerHomelink(opts: TessieOpts): Promise<{ result: boolean }> {
    return tessiePost("/{vin}/command/trigger_homelink", opts);
}

export async function shareAddress(
    opts: TessieOpts,
    address: string,
    locale: string = "en-US"
): Promise<{ result: boolean }> {
    return tessiePost("/{vin}/command/share", opts, { value: address, locale });
}
