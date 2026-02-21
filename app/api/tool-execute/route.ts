/**
 * POST /api/tool-execute
 *
 * Generic tool execution endpoint for voice mode.
 * Receives { tool_name, arguments } and executes the
 * corresponding Tessie function, returning the result.
 */

import { NextRequest } from "next/server";
import * as tessie from "@/lib/tessie";
import type { TessieOpts } from "@/lib/tessie";
import { generateMapsLink, celsiusToFahrenheit, barToPsi } from "@/lib/utils";
import { resolveKeys } from "@/lib/resolve-keys";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ToolHandler = (opts: TessieOpts, args: any) => Promise<Record<string, unknown>>;

const toolHandlers: Record<string, ToolHandler> = {
    get_battery_status: async (opts) => {
        const state = await tessie.getVehicleState(opts);
        const charge = state.charge_state;
        if (!charge) return { error: "Could not retrieve battery data." };
        return {
            battery_percent: charge.battery_level,
            estimated_range_miles: Math.round(charge.battery_range),
            charging_state: charge.charging_state,
            charge_limit_percent: charge.charge_limit_soc,
            time_to_full_charge_hours: charge.time_to_full_charge,
            charge_port_open: charge.charge_port_door_open,
        };
    },

    get_location: async (opts) => {
        const location = await tessie.getLocation(opts);
        return {
            latitude: location.latitude,
            longitude: location.longitude,
            address: location.address,
            maps_link: generateMapsLink(location.latitude, location.longitude),
        };
    },

    get_tire_pressure: async (opts) => {
        const tires = await tessie.getTirePressure(opts);
        return {
            front_left_psi: barToPsi(tires.front_left),
            front_right_psi: barToPsi(tires.front_right),
            rear_left_psi: barToPsi(tires.rear_left),
            rear_right_psi: barToPsi(tires.rear_right),
        };
    },

    get_vehicle_status: async (opts) => {
        const state = await tessie.getVehicleState(opts);
        const vs = state.vehicle_state;
        if (!vs) return { error: "Could not retrieve vehicle status." };
        return {
            locked: vs.locked,
            odometer_miles: Math.round(vs.odometer),
            software_version: vs.car_version,
            sentry_mode: vs.sentry_mode,
            driver_front_door: vs.df === 0 ? "closed" : "open",
            passenger_front_door: vs.pf === 0 ? "closed" : "open",
            driver_rear_door: vs.dr === 0 ? "closed" : "open",
            passenger_rear_door: vs.pr === 0 ? "closed" : "open",
            front_trunk: vs.ft === 0 ? "closed" : "open",
            rear_trunk: vs.rt === 0 ? "closed" : "open",
        };
    },

    get_climate_state: async (opts) => {
        const state = await tessie.getVehicleState(opts);
        const climate = state.climate_state;
        if (!climate) return { error: "Could not retrieve climate data." };
        return {
            climate_on: climate.is_climate_on,
            inside_temp_f: climate.inside_temp !== null ? celsiusToFahrenheit(climate.inside_temp) : null,
            outside_temp_f: climate.outside_temp !== null ? celsiusToFahrenheit(climate.outside_temp) : null,
            driver_set_temp_f: celsiusToFahrenheit(climate.driver_temp_setting),
            passenger_set_temp_f: celsiusToFahrenheit(climate.passenger_temp_setting),
            driver_seat_heater: climate.seat_heater_left,
            passenger_seat_heater: climate.seat_heater_right,
            front_defrost_on: climate.is_front_defroster_on,
            rear_defrost_on: climate.is_rear_defroster_on,
        };
    },

    get_weather: async (opts) => {
        const weather = await tessie.getWeather(opts);
        return { ...weather } as Record<string, unknown>;
    },

    get_drives: async (opts, args: { from_timestamp?: string; to_timestamp?: string }) => {
        const data = await tessie.getDrives(opts, args.from_timestamp, args.to_timestamp);
        return { drives: data.results };
    },

    get_charges: async (opts, args: { from_timestamp?: string; to_timestamp?: string }) => {
        const data = await tessie.getCharges(opts, args.from_timestamp, args.to_timestamp);
        return { charges: data.results };
    },

    check_vehicle_awake: async (opts) => {
        const result = await tessie.checkVehicleAwake(opts);
        return { status: result.status };
    },

    wake_vehicle: async (opts) => {
        const result = await tessie.wakeVehicle(opts);
        return { success: result.result, message: result.result ? "Vehicle is waking up." : "Failed to wake the vehicle." };
    },

    lock_doors: async (opts) => {
        const result = await tessie.lockDoors(opts);
        return { success: result.result, message: result.result ? "Doors are now locked." : "Failed to lock the doors." };
    },

    unlock_doors: async (opts) => {
        const result = await tessie.unlockDoors(opts);
        return { success: result.result, message: result.result ? "Doors are now unlocked." : "Failed to unlock the doors." };
    },

    start_climate: async (opts) => {
        const result = await tessie.startClimate(opts);
        return { success: result.result, message: result.result ? "Climate control is now on." : "Failed to start climate control." };
    },

    stop_climate: async (opts) => {
        const result = await tessie.stopClimate(opts);
        return { success: result.result, message: result.result ? "Climate control is now off." : "Failed to stop climate control." };
    },

    set_temperature: async (opts, args: { driver_temp: number; passenger_temp?: number }) => {
        const result = await tessie.setTemperature(opts, args.driver_temp, args.passenger_temp);
        return { success: result.result, message: result.result ? `Temperature set to ${args.driver_temp}\u00B0F.` : "Failed to set temperature." };
    },

    set_seat_heater: async (opts, args: { seat: string; level: number }) => {
        const result = await tessie.setSeatHeater(opts, args.seat, args.level);
        const levelNames = ["off", "low", "medium", "high"];
        return { success: result.result, message: result.result ? `${args.seat} seat heater set to ${levelNames[args.level]}.` : `Failed to set ${args.seat} seat heater.` };
    },

    set_steering_wheel_heater: async (opts, args: { on: boolean }) => {
        const result = await tessie.setSteeringWheelHeater(opts, args.on);
        return { success: result.result, message: result.result ? `Steering wheel heater ${args.on ? "on" : "off"}.` : "Failed to toggle steering wheel heater." };
    },

    open_trunk: async (opts, args: { which_trunk: "rear" | "front" }) => {
        const result = await tessie.openTrunk(opts, args.which_trunk);
        return { success: result.result, message: result.result ? `${args.which_trunk === "front" ? "Frunk" : "Trunk"} opened.` : `Failed to open the ${args.which_trunk} trunk.` };
    },

    flash_lights: async (opts) => {
        const result = await tessie.flashLights(opts);
        return { success: result.result, message: result.result ? "Lights flashed!" : "Failed to flash lights." };
    },

    honk_horn: async (opts) => {
        const result = await tessie.honkHorn(opts);
        return { success: result.result, message: result.result ? "Horn honked!" : "Failed to honk horn." };
    },

    start_charging: async (opts) => {
        const result = await tessie.startCharging(opts);
        return { success: result.result, message: result.result ? "Charging started." : "Failed to start charging. Is the vehicle plugged in?" };
    },

    stop_charging: async (opts) => {
        const result = await tessie.stopCharging(opts);
        return { success: result.result, message: result.result ? "Charging stopped." : "Failed to stop charging." };
    },

    set_charge_limit: async (opts, args: { percent: number }) => {
        const result = await tessie.setChargeLimit(opts, args.percent);
        return { success: result.result, message: result.result ? `Charge limit set to ${args.percent}%.` : "Failed to set charge limit." };
    },

    toggle_sentry_mode: async (opts, args: { on: boolean }) => {
        const result = await tessie.toggleSentryMode(opts, args.on);
        return { success: result.result, message: result.result ? `Sentry mode ${args.on ? "enabled" : "disabled"}.` : "Failed to toggle sentry mode." };
    },

    trigger_homelink: async (opts) => {
        const result = await tessie.triggerHomelink(opts);
        return { success: result.result, message: result.result ? "HomeLink triggered!" : "Failed to trigger HomeLink." };
    },

    share_address: async (opts, args: { address: string }) => {
        const result = await tessie.shareAddress(opts, args.address);
        return { success: result.result, message: result.result ? `Navigation destination set to: ${args.address}` : "Failed to send the address to your car." };
    },

    activate_defrost: async (opts, args: { on: boolean }) => {
        const result = await tessie.activateDefrost(opts, args.on);
        return { success: result.result, message: result.result ? `Max defrost ${args.on ? "activated" : "deactivated"}.` : "Failed to toggle defrost mode." };
    },
};

export async function POST(req: NextRequest) {
    try {
        const { tessieKey, vin } = resolveKeys(req);

        if (!tessieKey || !vin) {
            return new Response(
                JSON.stringify({ error: "Tessie API key and Tesla VIN are required." }),
                { status: 401, headers: { "Content-Type": "application/json" } }
            );
        }

        const { tool_name, arguments: args } = await req.json();

        if (!tool_name || typeof tool_name !== "string") {
            return new Response(
                JSON.stringify({ error: "tool_name is required" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        const handler = toolHandlers[tool_name];
        if (!handler) {
            return new Response(
                JSON.stringify({ error: `Unknown tool: ${tool_name}` }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        const tessieOpts = { apiKey: tessieKey, vin };
        const result = await handler(tessieOpts, args || {});
        return new Response(JSON.stringify(result), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Tool execution error:", error);
        return new Response(
            JSON.stringify({ error: (error as Error).message }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}
