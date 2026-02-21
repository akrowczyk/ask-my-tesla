// @ts-nocheck
// Type checking disabled for this file due to AI SDK v6 + Zod v4 generics
// incompatibility in the tool() overloads. The tool() function is an identity
// function (pass-through), so runtime behavior is correct regardless.

import { tool, jsonSchema } from "ai";
import * as tessie from "./tessie";
import type { TessieOpts } from "./tessie";
import { generateMapsLink, celsiusToFahrenheit, barToPsi } from "./utils";

const noParams = jsonSchema({ type: "object", properties: {} });

/**
 * Build all tool definitions bound to the given Tessie credentials.
 */
export function createTeslaTools(opts: TessieOpts) {
    return {
        // ─── Read-Only Tools ─────────────────────────────────────

        get_battery_status: tool({
            description:
                "Get current battery level, estimated range, and charging state of the Tesla.",
            parameters: noParams,
            execute: async () => {
                try {
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
                } catch (e) {
                    return { error: (e as Error).message };
                }
            },
        }),

        get_location: tool({
            description:
                "Get current vehicle location with address and Google Maps link.",
            parameters: noParams,
            execute: async () => {
                try {
                    const location = await tessie.getLocation(opts);
                    return {
                        latitude: location.latitude,
                        longitude: location.longitude,
                        address: location.address,
                        maps_link: generateMapsLink(location.latitude, location.longitude),
                    };
                } catch (e) {
                    return { error: (e as Error).message };
                }
            },
        }),

        get_tire_pressure: tool({
            description: "Get tire pressure for all four tires in PSI.",
            parameters: noParams,
            execute: async () => {
                try {
                    const tires = await tessie.getTirePressure(opts);
                    return {
                        front_left_psi: barToPsi(tires.front_left),
                        front_right_psi: barToPsi(tires.front_right),
                        rear_left_psi: barToPsi(tires.rear_left),
                        rear_right_psi: barToPsi(tires.rear_right),
                    };
                } catch (e) {
                    return { error: (e as Error).message };
                }
            },
        }),

        get_vehicle_status: tool({
            description:
                "Get overall vehicle state including lock status, doors, windows, sentry mode, software version, and odometer.",
            parameters: noParams,
            execute: async () => {
                try {
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
                } catch (e) {
                    return { error: (e as Error).message };
                }
            },
        }),

        get_climate_state: tool({
            description:
                "Get current climate/HVAC state including inside and outside temperature, set temperature, and seat heater status.",
            parameters: noParams,
            execute: async () => {
                try {
                    const state = await tessie.getVehicleState(opts);
                    const climate = state.climate_state;
                    if (!climate) return { error: "Could not retrieve climate data." };
                    return {
                        climate_on: climate.is_climate_on,
                        inside_temp_f:
                            climate.inside_temp !== null
                                ? celsiusToFahrenheit(climate.inside_temp)
                                : null,
                        outside_temp_f:
                            climate.outside_temp !== null
                                ? celsiusToFahrenheit(climate.outside_temp)
                                : null,
                        driver_set_temp_f: celsiusToFahrenheit(climate.driver_temp_setting),
                        passenger_set_temp_f: celsiusToFahrenheit(
                            climate.passenger_temp_setting
                        ),
                        driver_seat_heater: climate.seat_heater_left,
                        passenger_seat_heater: climate.seat_heater_right,
                        front_defrost_on: climate.is_front_defroster_on,
                        rear_defrost_on: climate.is_rear_defroster_on,
                    };
                } catch (e) {
                    return { error: (e as Error).message };
                }
            },
        }),

        get_weather: tool({
            description: "Get weather conditions at the vehicle's current location.",
            parameters: noParams,
            execute: async () => {
                try {
                    return await tessie.getWeather(opts);
                } catch (e) {
                    return { error: (e as Error).message };
                }
            },
        }),

        get_drives: tool({
            description:
                "Get recent drive history with start/end times, distances, and energy used.",
            parameters: jsonSchema({
                type: "object",
                properties: {
                    from_timestamp: {
                        type: "string",
                        description: "Start of date range in ISO 8601 format",
                    },
                    to_timestamp: {
                        type: "string",
                        description: "End of date range in ISO 8601 format",
                    },
                },
            }),
            execute: async ({ from_timestamp, to_timestamp }) => {
                try {
                    const data = await tessie.getDrives(opts, from_timestamp, to_timestamp);
                    return { drives: data.results };
                } catch (e) {
                    return { error: (e as Error).message };
                }
            },
        }),

        get_charges: tool({
            description:
                "Get recent charging history with energy added, cost, and duration.",
            parameters: jsonSchema({
                type: "object",
                properties: {
                    from_timestamp: {
                        type: "string",
                        description: "Start of date range in ISO 8601 format",
                    },
                    to_timestamp: {
                        type: "string",
                        description: "End of date range in ISO 8601 format",
                    },
                },
            }),
            execute: async ({ from_timestamp, to_timestamp }) => {
                try {
                    const data = await tessie.getCharges(opts, from_timestamp, to_timestamp);
                    return { charges: data.results };
                } catch (e) {
                    return { error: (e as Error).message };
                }
            },
        }),

        check_vehicle_awake: tool({
            description:
                'Check if the vehicle is awake or asleep. Returns "awake" or "asleep".',
            parameters: noParams,
            execute: async () => {
                try {
                    const result = await tessie.checkVehicleAwake(opts);
                    return { status: result.status };
                } catch (e) {
                    return { error: (e as Error).message };
                }
            },
        }),

        // ─── Command Tools ───────────────────────────────────────

        wake_vehicle: tool({
            description:
                "Wake up the vehicle from sleep. Should be called before other commands if the vehicle is asleep.",
            parameters: noParams,
            execute: async () => {
                try {
                    const result = await tessie.wakeVehicle(opts);
                    return {
                        success: result.result,
                        message: result.result
                            ? "Vehicle is waking up."
                            : "Failed to wake the vehicle. It might be in deep sleep or in a low-signal area.",
                    };
                } catch (e) {
                    return { error: (e as Error).message };
                }
            },
        }),

        lock_doors: tool({
            description: "Lock all vehicle doors.",
            parameters: noParams,
            execute: async () => {
                try {
                    const result = await tessie.lockDoors(opts);
                    return {
                        success: result.result,
                        message: result.result ? "Doors are now locked." : "Failed to lock the doors.",
                    };
                } catch (e) {
                    return { error: (e as Error).message };
                }
            },
        }),

        unlock_doors: tool({
            description: "Unlock all vehicle doors.",
            parameters: noParams,
            execute: async () => {
                try {
                    const result = await tessie.unlockDoors(opts);
                    return {
                        success: result.result,
                        message: result.result ? "Doors are now unlocked." : "Failed to unlock the doors.",
                    };
                } catch (e) {
                    return { error: (e as Error).message };
                }
            },
        }),

        start_climate: tool({
            description: "Start climate control / preconditioning.",
            parameters: noParams,
            execute: async () => {
                try {
                    const result = await tessie.startClimate(opts);
                    return {
                        success: result.result,
                        message: result.result ? "Climate control is now on." : "Failed to start climate control.",
                    };
                } catch (e) {
                    return { error: (e as Error).message };
                }
            },
        }),

        stop_climate: tool({
            description: "Stop climate control.",
            parameters: noParams,
            execute: async () => {
                try {
                    const result = await tessie.stopClimate(opts);
                    return {
                        success: result.result,
                        message: result.result ? "Climate control is now off." : "Failed to stop climate control.",
                    };
                } catch (e) {
                    return { error: (e as Error).message };
                }
            },
        }),

        set_temperature: tool({
            description: "Set the target cabin temperature in Fahrenheit (range 59-82\u00B0F).",
            parameters: jsonSchema({
                type: "object",
                properties: {
                    driver_temp: { type: "number", description: "Driver side temperature in \u00B0F", minimum: 59, maximum: 82 },
                    passenger_temp: { type: "number", description: "Passenger side temperature in \u00B0F (defaults to driver_temp)", minimum: 59, maximum: 82 },
                },
                required: ["driver_temp"],
            }),
            execute: async ({ driver_temp, passenger_temp }) => {
                try {
                    const result = await tessie.setTemperature(opts, driver_temp, passenger_temp);
                    return {
                        success: result.result,
                        message: result.result ? `Temperature set to ${driver_temp}\u00B0F.` : "Failed to set temperature.",
                    };
                } catch (e) {
                    return { error: (e as Error).message };
                }
            },
        }),

        set_seat_heater: tool({
            description: "Set heated seat level (0=off, 1=low, 2=medium, 3=high).",
            parameters: jsonSchema({
                type: "object",
                properties: {
                    seat: { type: "string", enum: ["driver", "passenger", "rear_left", "rear_center", "rear_right"], description: "Which seat to heat" },
                    level: { type: "number", description: "Heat level: 0=off, 1=low, 2=medium, 3=high", minimum: 0, maximum: 3 },
                },
                required: ["seat", "level"],
            }),
            execute: async ({ seat, level }) => {
                try {
                    const result = await tessie.setSeatHeater(opts, seat, level);
                    const levelNames = ["off", "low", "medium", "high"];
                    return {
                        success: result.result,
                        message: result.result ? `${seat} seat heater set to ${levelNames[level]}.` : `Failed to set ${seat} seat heater.`,
                    };
                } catch (e) {
                    return { error: (e as Error).message };
                }
            },
        }),

        set_steering_wheel_heater: tool({
            description: "Turn the steering wheel heater on or off.",
            parameters: jsonSchema({
                type: "object",
                properties: { on: { type: "boolean", description: "true to turn on, false to turn off" } },
                required: ["on"],
            }),
            execute: async ({ on }) => {
                try {
                    const result = await tessie.setSteeringWheelHeater(opts, on);
                    return {
                        success: result.result,
                        message: result.result ? `Steering wheel heater ${on ? "on" : "off"}.` : "Failed to toggle steering wheel heater.",
                    };
                } catch (e) {
                    return { error: (e as Error).message };
                }
            },
        }),

        open_trunk: tool({
            description: "Open the rear trunk or front trunk (frunk).",
            parameters: jsonSchema({
                type: "object",
                properties: { which_trunk: { type: "string", enum: ["rear", "front"], description: '"rear" for trunk, "front" for frunk' } },
                required: ["which_trunk"],
            }),
            execute: async ({ which_trunk }) => {
                try {
                    const result = await tessie.openTrunk(opts, which_trunk);
                    return {
                        success: result.result,
                        message: result.result ? `${which_trunk === "front" ? "Frunk" : "Trunk"} opened.` : `Failed to open the ${which_trunk} trunk.`,
                    };
                } catch (e) {
                    return { error: (e as Error).message };
                }
            },
        }),

        vent_windows: tool({
            description: "Vent all windows slightly.",
            parameters: noParams,
            execute: async () => {
                try {
                    const result = await tessie.ventWindows(opts);
                    return { success: result.result, message: result.result ? "Windows are now venting." : "Failed to vent windows." };
                } catch (e) {
                    return { error: (e as Error).message };
                }
            },
        }),

        close_windows: tool({
            description: "Close all windows.",
            parameters: noParams,
            execute: async () => {
                try {
                    const result = await tessie.closeWindows(opts);
                    return { success: result.result, message: result.result ? "All windows are now closed." : "Failed to close windows." };
                } catch (e) {
                    return { error: (e as Error).message };
                }
            },
        }),

        flash_lights: tool({
            description: "Flash the headlights.",
            parameters: noParams,
            execute: async () => {
                try {
                    const result = await tessie.flashLights(opts);
                    return { success: result.result, message: result.result ? "Lights flashed!" : "Failed to flash lights." };
                } catch (e) {
                    return { error: (e as Error).message };
                }
            },
        }),

        honk_horn: tool({
            description: "Honk the horn.",
            parameters: noParams,
            execute: async () => {
                try {
                    const result = await tessie.honkHorn(opts);
                    return { success: result.result, message: result.result ? "Horn honked!" : "Failed to honk horn." };
                } catch (e) {
                    return { error: (e as Error).message };
                }
            },
        }),

        start_charging: tool({
            description: "Start charging (vehicle must be plugged in).",
            parameters: noParams,
            execute: async () => {
                try {
                    const result = await tessie.startCharging(opts);
                    return { success: result.result, message: result.result ? "Charging started." : "Failed to start charging. Is the vehicle plugged in?" };
                } catch (e) {
                    return { error: (e as Error).message };
                }
            },
        }),

        stop_charging: tool({
            description: "Stop charging.",
            parameters: noParams,
            execute: async () => {
                try {
                    const result = await tessie.stopCharging(opts);
                    return { success: result.result, message: result.result ? "Charging stopped." : "Failed to stop charging." };
                } catch (e) {
                    return { error: (e as Error).message };
                }
            },
        }),

        set_charge_limit: tool({
            description: "Set the charge limit percentage (50-100%).",
            parameters: jsonSchema({
                type: "object",
                properties: { percent: { type: "number", description: "Charge limit percentage", minimum: 50, maximum: 100 } },
                required: ["percent"],
            }),
            execute: async ({ percent }) => {
                try {
                    const result = await tessie.setChargeLimit(opts, percent);
                    return { success: result.result, message: result.result ? `Charge limit set to ${percent}%.` : "Failed to set charge limit." };
                } catch (e) {
                    return { error: (e as Error).message };
                }
            },
        }),

        toggle_sentry_mode: tool({
            description: "Enable or disable sentry mode.",
            parameters: jsonSchema({
                type: "object",
                properties: { on: { type: "boolean", description: "true to enable, false to disable" } },
                required: ["on"],
            }),
            execute: async ({ on }) => {
                try {
                    const result = await tessie.toggleSentryMode(opts, on);
                    return { success: result.result, message: result.result ? `Sentry mode ${on ? "enabled" : "disabled"}.` : "Failed to toggle sentry mode." };
                } catch (e) {
                    return { error: (e as Error).message };
                }
            },
        }),

        trigger_homelink: tool({
            description: "Trigger HomeLink (garage door opener).",
            parameters: noParams,
            execute: async () => {
                try {
                    const result = await tessie.triggerHomelink(opts);
                    return { success: result.result, message: result.result ? "HomeLink triggered!" : "Failed to trigger HomeLink. Make sure you're near your garage." };
                } catch (e) {
                    return { error: (e as Error).message };
                }
            },
        }),

        share_address: tool({
            description: "Send a destination address to the vehicle's navigation system.",
            parameters: jsonSchema({
                type: "object",
                properties: { address: { type: "string", description: "Full street address or place name" } },
                required: ["address"],
            }),
            execute: async ({ address }) => {
                try {
                    const result = await tessie.shareAddress(opts, address);
                    return { success: result.result, message: result.result ? `Navigation destination set to: ${address}` : "Failed to send the address to your car." };
                } catch (e) {
                    return { error: (e as Error).message };
                }
            },
        }),

        activate_defrost: tool({
            description: "Turn max defrost mode on or off.",
            parameters: jsonSchema({
                type: "object",
                properties: { on: { type: "boolean", description: "true to turn on, false to turn off" } },
                required: ["on"],
            }),
            execute: async ({ on }) => {
                try {
                    const result = await tessie.activateDefrost(opts, on);
                    return { success: result.result, message: result.result ? `Max defrost ${on ? "activated" : "deactivated"}.` : "Failed to toggle defrost mode." };
                } catch (e) {
                    return { error: (e as Error).message };
                }
            },
        }),
    };
}
