// Session & Chat Types

export interface Session {
  id: string;
  vin: string;
  messages: ChatMessage[];
  createdAt: Date;
  lastActiveAt: Date;
  modelPreference: "auto" | "reasoning" | "non-reasoning";
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
  timestamp: Date;
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

// Vehicle Types

export interface VehicleContext {
  vin: string;
  displayName: string;
  lastKnownBattery: number;
  lastKnownRange: number;
  lastKnownLockState: boolean;
  lastKnownLocation: { lat: number; lng: number };
  climateOn: boolean;
  sentryOn: boolean;
  connected: boolean;
  lastUpdated: Date;
}

export interface VehicleStatusResponse {
  battery: number;
  range: number;
  locked: boolean;
  climate_on: boolean;
  sentry_on: boolean;
  connected: boolean;
  last_updated: string;
}

export interface QuickAction {
  label: string;
  message: string;
}

// Tessie API Response Types

export interface TessieVehicleState {
  charge_state?: {
    battery_level: number;
    battery_range: number;
    charging_state: string;
    charge_limit_soc: number;
    time_to_full_charge: number;
    charge_port_door_open: boolean;
  };
  climate_state?: {
    inside_temp: number | null;
    outside_temp: number | null;
    is_climate_on: boolean;
    driver_temp_setting: number;
    passenger_temp_setting: number;
    seat_heater_left: number;
    seat_heater_right: number;
    is_front_defroster_on: boolean;
    is_rear_defroster_on: boolean;
  };
  vehicle_state?: {
    locked: boolean;
    odometer: number;
    car_version: string;
    sentry_mode: boolean;
    fd_window: number;
    fp_window: number;
    rd_window: number;
    rp_window: number;
    df: number;
    pf: number;
    dr: number;
    pr: number;
    ft: number;
    rt: number;
  };
  drive_state?: {
    latitude: number;
    longitude: number;
    heading: number;
    speed: number | null;
  };
}

export interface TessieTirePressure {
  front_left: number;
  front_right: number;
  rear_left: number;
  rear_right: number;
}

export interface TessieDrive {
  id: number;
  started_at: string;
  ended_at: string;
  start_location: string;
  end_location: string;
  distance_miles: number;
  energy_used_kwh: number;
  duration_minutes: number;
}

export interface TessieCharge {
  id: number;
  started_at: string;
  ended_at: string;
  location: string;
  energy_added_kwh: number;
  cost: number;
  charge_type: string;
  duration_minutes: number;
}

export interface TessieWeather {
  temperature: number;
  condition: string;
  humidity: number;
  wind_speed: number;
  wind_direction: string;
}
