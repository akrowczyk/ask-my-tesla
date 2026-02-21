"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface ToolCardProps {
    data: any;
    mapsKey?: string;
}

// ─── Battery Card ────────────────────────────────────────────

function BatteryCard({ data }: ToolCardProps) {
    const pct = data.battery_percent ?? 0;
    const range = data.estimated_range_miles ?? 0;
    const charging = data.charging_state;
    const limit = data.charge_limit_percent ?? 80;
    const isCharging = charging === "Charging";

    const barColor =
        pct <= 15 ? "#ef4444" : pct <= 30 ? "#f97316" : "#22c55e";

    return (
        <div className="tool-card">
            <div className="tool-card-header">
                <span className="tool-card-icon">🔋</span>
                <span className="tool-card-title">Battery</span>
                {isCharging && <span className="tool-card-tag charging">Charging</span>}
            </div>
            <div className="battery-gauge">
                <div className="battery-bar-track">
                    <div
                        className="battery-bar-fill"
                        style={{ width: `${pct}%`, background: barColor }}
                    />
                    <div
                        className="battery-bar-limit"
                        style={{ left: `${limit}%` }}
                    />
                </div>
                <div className="battery-stats">
                    <span className="battery-pct">{pct}%</span>
                    <span className="battery-range">~{range} mi</span>
                </div>
            </div>
            {data.time_to_full_charge_hours > 0 && (
                <div className="tool-card-detail">
                    Full in ~{data.time_to_full_charge_hours.toFixed(1)}h
                </div>
            )}
        </div>
    );
}

// ─── Climate Card ────────────────────────────────────────────

function ClimateCard({ data }: ToolCardProps) {
    const on = data.climate_on;
    const inside = data.inside_temp_f != null ? Math.round(data.inside_temp_f) : "--";
    const outside = data.outside_temp_f != null ? Math.round(data.outside_temp_f) : "--";
    const setTemp = data.driver_set_temp_f != null ? Math.round(data.driver_set_temp_f) : null;

    const seatLevel = (level: number | null | undefined) => {
        if (!level) return "Off";
        return ["Off", "Low", "Med", "High"][level] ?? "Off";
    };

    return (
        <div className="tool-card">
            <div className="tool-card-header">
                <span className="tool-card-icon">🌡️</span>
                <span className="tool-card-title">Climate</span>
                <span className={`tool-card-tag ${on ? "on" : "off"}`}>
                    {on ? "On" : "Off"}
                </span>
            </div>
            <div className="climate-temps">
                <div className="climate-temp-block">
                    <span className="climate-temp-value">{inside}°</span>
                    <span className="climate-temp-label">Inside</span>
                </div>
                <div className="climate-temp-divider" />
                <div className="climate-temp-block">
                    <span className="climate-temp-value">{outside}°</span>
                    <span className="climate-temp-label">Outside</span>
                </div>
                {setTemp != null && (
                    <>
                        <div className="climate-temp-divider" />
                        <div className="climate-temp-block">
                            <span className="climate-temp-value">{setTemp}°</span>
                            <span className="climate-temp-label">Set</span>
                        </div>
                    </>
                )}
            </div>
            <div className="climate-extras">
                {data.driver_seat_heater != null && (
                    <span className="tool-card-detail">🪑 Driver: {seatLevel(data.driver_seat_heater)}</span>
                )}
                {data.passenger_seat_heater != null && (
                    <span className="tool-card-detail">🪑 Pass: {seatLevel(data.passenger_seat_heater)}</span>
                )}
                {data.front_defrost_on && (
                    <span className="tool-card-detail">❄️ Defrost on</span>
                )}
            </div>
        </div>
    );
}

// ─── Tire Pressure Card ──────────────────────────────────────

function TirePressureCard({ data }: ToolCardProps) {
    const fl = data.front_left_psi?.toFixed(1) ?? "--";
    const fr = data.front_right_psi?.toFixed(1) ?? "--";
    const rl = data.rear_left_psi?.toFixed(1) ?? "--";
    const rr = data.rear_right_psi?.toFixed(1) ?? "--";

    const isLow = (val: number | undefined) => val != null && val < 35;

    return (
        <div className="tool-card">
            <div className="tool-card-header">
                <span className="tool-card-icon">🛞</span>
                <span className="tool-card-title">Tire Pressure</span>
                <span className="tool-card-unit">PSI</span>
            </div>
            <div className="tire-grid">
                <div className={`tire-cell ${isLow(data.front_left_psi) ? "low" : ""}`}>
                    <span className="tire-label">FL</span>
                    <span className="tire-value">{fl}</span>
                </div>
                <div className={`tire-cell ${isLow(data.front_right_psi) ? "low" : ""}`}>
                    <span className="tire-label">FR</span>
                    <span className="tire-value">{fr}</span>
                </div>
                <div className={`tire-cell ${isLow(data.rear_left_psi) ? "low" : ""}`}>
                    <span className="tire-label">RL</span>
                    <span className="tire-value">{rl}</span>
                </div>
                <div className={`tire-cell ${isLow(data.rear_right_psi) ? "low" : ""}`}>
                    <span className="tire-label">RR</span>
                    <span className="tire-value">{rr}</span>
                </div>
            </div>
        </div>
    );
}

// ─── Map Embed ──────────────────────────────────────────────

function MapEmbed({ lat, lng, apiKey }: { lat: number; lng: number; apiKey?: string }) {
    if (!apiKey) return null;

    const src = `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${lat},${lng}&zoom=15`;

    return (
        <iframe
            className="map-embed"
            src={src}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Vehicle location"
        />
    );
}

// ─── Location Card ───────────────────────────────────────────

function LocationCard({ data, mapsKey }: ToolCardProps) {
    const addr = data.address || "Unknown location";
    const link = data.maps_link;
    const hasCoords = data.latitude != null && data.longitude != null;

    return (
        <div className="tool-card">
            <div className="tool-card-header">
                <span className="tool-card-icon">📍</span>
                <span className="tool-card-title">Location</span>
            </div>
            {hasCoords && <MapEmbed lat={data.latitude} lng={data.longitude} apiKey={mapsKey} />}
            <div className="location-address">{addr}</div>
            {link && (
                <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="location-link"
                >
                    Open in Google Maps →
                </a>
            )}
        </div>
    );
}

// ─── Vehicle Status Card ─────────────────────────────────────

function VehicleStatusCard({ data }: ToolCardProps) {
    const locked = data.locked;
    const sentry = data.sentry_mode;
    const odometer = data.odometer_miles?.toLocaleString() ?? "--";
    const sw = data.software_version || "--";

    const doors = [
        { label: "DF", val: data.driver_front_door },
        { label: "PF", val: data.passenger_front_door },
        { label: "DR", val: data.driver_rear_door },
        { label: "PR", val: data.passenger_rear_door },
        { label: "Frunk", val: data.front_trunk },
        { label: "Trunk", val: data.rear_trunk },
    ];

    const anyOpen = doors.some((d) => d.val === "open");

    return (
        <div className="tool-card">
            <div className="tool-card-header">
                <span className="tool-card-icon">🚗</span>
                <span className="tool-card-title">Vehicle</span>
                <span className={`tool-card-tag ${locked ? "on" : "off"}`}>
                    {locked ? "🔒 Locked" : "🔓 Unlocked"}
                </span>
            </div>
            <div className="status-grid">
                <div className="status-item">
                    <span className="status-item-label">Sentry</span>
                    <span className={`status-item-value ${sentry ? "on" : ""}`}>
                        {sentry ? "On" : "Off"}
                    </span>
                </div>
                <div className="status-item">
                    <span className="status-item-label">Odometer</span>
                    <span className="status-item-value">{odometer} mi</span>
                </div>
                <div className="status-item full-width">
                    <span className="status-item-label">Software</span>
                    <span className="status-item-value">{sw}</span>
                </div>
            </div>
            {anyOpen && (
                <div className="status-doors">
                    {doors.filter((d) => d.val === "open").map((d) => (
                        <span key={d.label} className="tool-card-tag off">{d.label} open</span>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Dispatcher ──────────────────────────────────────────────

const CARD_MAP: Record<string, React.FC<ToolCardProps>> = {
    get_battery_status: BatteryCard,
    get_climate_state: ClimateCard,
    get_tire_pressure: TirePressureCard,
    get_location: LocationCard,
    get_vehicle_status: VehicleStatusCard,
};

export function renderToolCard(
    toolName: string,
    output: unknown,
    mapsKey?: string
): React.ReactNode | null {
    const Card = CARD_MAP[toolName];
    if (!Card) return null;

    const data = typeof output === "string" ? tryParse(output) : output;
    if (!data || typeof data !== "object" || "error" in (data as Record<string, unknown>)) {
        return null;
    }

    return <Card data={data} mapsKey={mapsKey} />;
}

function tryParse(s: string): unknown {
    try {
        return JSON.parse(s);
    } catch {
        return null;
    }
}
