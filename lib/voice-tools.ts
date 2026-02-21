/**
 * Voice Agent tool definitions.
 *
 * These are the same Tesla tools from lib/tools.ts, but formatted
 * as JSON-Schema function definitions for the Grok Voice Agent
 * session.update message.
 */

// ─── Tool schemas for the Voice Agent API ────────────────────

export interface VoiceToolDef {
    type: "function";
    name: string;
    description: string;
    parameters: Record<string, unknown>;
}

const noParams = {
    type: "object" as const,
    properties: {},
};

export const voiceToolDefinitions: VoiceToolDef[] = [
    // Read-only tools
    {
        type: "function",
        name: "get_battery_status",
        description:
            "Get current battery level, estimated range, and charging state of the Tesla.",
        parameters: noParams,
    },
    {
        type: "function",
        name: "get_location",
        description:
            "Get current vehicle location with address and Google Maps link.",
        parameters: noParams,
    },
    {
        type: "function",
        name: "get_tire_pressure",
        description: "Get tire pressure for all four tires in PSI.",
        parameters: noParams,
    },
    {
        type: "function",
        name: "get_vehicle_status",
        description:
            "Get overall vehicle state including lock status, doors, windows, sentry mode, software version, and odometer.",
        parameters: noParams,
    },
    {
        type: "function",
        name: "get_climate_state",
        description:
            "Get current climate/HVAC state including inside and outside temperature, set temperature, and seat heater status.",
        parameters: noParams,
    },
    {
        type: "function",
        name: "get_weather",
        description: "Get weather conditions at the vehicle's current location.",
        parameters: noParams,
    },
    {
        type: "function",
        name: "get_drives",
        description:
            "Get recent drive history with start/end times, distances, and energy used.",
        parameters: {
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
        },
    },
    {
        type: "function",
        name: "get_charges",
        description:
            "Get recent charging history with energy added, cost, and duration.",
        parameters: {
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
        },
    },
    {
        type: "function",
        name: "check_vehicle_awake",
        description:
            'Check if the vehicle is awake or asleep. Returns "awake" or "asleep".',
        parameters: noParams,
    },

    // Command tools
    {
        type: "function",
        name: "wake_vehicle",
        description:
            "Wake up the vehicle from sleep. Should be called before other commands if the vehicle is asleep.",
        parameters: noParams,
    },
    {
        type: "function",
        name: "lock_doors",
        description: "Lock all vehicle doors.",
        parameters: noParams,
    },
    {
        type: "function",
        name: "unlock_doors",
        description: "Unlock all vehicle doors.",
        parameters: noParams,
    },
    {
        type: "function",
        name: "start_climate",
        description: "Start climate control / preconditioning.",
        parameters: noParams,
    },
    {
        type: "function",
        name: "stop_climate",
        description: "Stop climate control.",
        parameters: noParams,
    },
    {
        type: "function",
        name: "set_temperature",
        description:
            "Set the target cabin temperature in Fahrenheit (range 59-82°F).",
        parameters: {
            type: "object",
            properties: {
                driver_temp: {
                    type: "number",
                    description: "Driver side temperature in °F",
                    minimum: 59,
                    maximum: 82,
                },
                passenger_temp: {
                    type: "number",
                    description:
                        "Passenger side temperature in °F (defaults to driver_temp)",
                    minimum: 59,
                    maximum: 82,
                },
            },
            required: ["driver_temp"],
        },
    },
    {
        type: "function",
        name: "set_seat_heater",
        description: "Set heated seat level (0=off, 1=low, 2=medium, 3=high).",
        parameters: {
            type: "object",
            properties: {
                seat: {
                    type: "string",
                    enum: [
                        "driver",
                        "passenger",
                        "rear_left",
                        "rear_center",
                        "rear_right",
                    ],
                    description: "Which seat to heat",
                },
                level: {
                    type: "number",
                    description: "Heat level: 0=off, 1=low, 2=medium, 3=high",
                    minimum: 0,
                    maximum: 3,
                },
            },
            required: ["seat", "level"],
        },
    },
    {
        type: "function",
        name: "set_steering_wheel_heater",
        description: "Turn the steering wheel heater on or off.",
        parameters: {
            type: "object",
            properties: {
                on: {
                    type: "boolean",
                    description: "true to turn on, false to turn off",
                },
            },
            required: ["on"],
        },
    },
    {
        type: "function",
        name: "open_trunk",
        description: "Open the rear trunk or front trunk (frunk).",
        parameters: {
            type: "object",
            properties: {
                which_trunk: {
                    type: "string",
                    enum: ["rear", "front"],
                    description: '"rear" for trunk, "front" for frunk',
                },
            },
            required: ["which_trunk"],
        },
    },
    {
        type: "function",
        name: "flash_lights",
        description: "Flash the headlights.",
        parameters: noParams,
    },
    {
        type: "function",
        name: "honk_horn",
        description: "Honk the horn.",
        parameters: noParams,
    },
    {
        type: "function",
        name: "start_charging",
        description: "Start charging (vehicle must be plugged in).",
        parameters: noParams,
    },
    {
        type: "function",
        name: "stop_charging",
        description: "Stop charging.",
        parameters: noParams,
    },
    {
        type: "function",
        name: "set_charge_limit",
        description: "Set the charge limit percentage (50-100%).",
        parameters: {
            type: "object",
            properties: {
                percent: {
                    type: "number",
                    description: "Charge limit percentage",
                    minimum: 50,
                    maximum: 100,
                },
            },
            required: ["percent"],
        },
    },
    {
        type: "function",
        name: "toggle_sentry_mode",
        description: "Enable or disable sentry mode.",
        parameters: {
            type: "object",
            properties: {
                on: {
                    type: "boolean",
                    description: "true to enable, false to disable",
                },
            },
            required: ["on"],
        },
    },
    {
        type: "function",
        name: "trigger_homelink",
        description: "Trigger HomeLink (garage door opener).",
        parameters: noParams,
    },
    {
        type: "function",
        name: "share_address",
        description:
            "Send a destination address to the vehicle's navigation system.",
        parameters: {
            type: "object",
            properties: {
                address: {
                    type: "string",
                    description: "Full street address or place name",
                },
            },
            required: ["address"],
        },
    },
    {
        type: "function",
        name: "activate_defrost",
        description: "Turn max defrost mode on or off.",
        parameters: {
            type: "object",
            properties: {
                on: {
                    type: "boolean",
                    description: "true to turn on, false to turn off",
                },
            },
            required: ["on"],
        },
    },
    {
        type: "function",
        name: "vent_windows",
        description: "Vent all windows slightly open.",
        parameters: noParams,
    },
    {
        type: "function",
        name: "close_windows",
        description: "Close all windows.",
        parameters: noParams,
    },
];
