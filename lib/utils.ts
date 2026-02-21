/**
 * Utility helpers for date formatting, unit conversion, and URL generation.
 */

const DEFAULT_TIMEZONE = process.env.USER_TIMEZONE || "America/Chicago";

/**
 * Format a date string into a human-readable format
 */
export function formatDate(
    dateStr: string,
    options?: Intl.DateTimeFormatOptions
): string {
    const date = new Date(dateStr);
    return date.toLocaleString("en-US", {
        timeZone: DEFAULT_TIMEZONE,
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        ...options,
    });
}

/**
 * Format a date as a relative time (e.g., "5 minutes ago")
 */
export function formatRelativeTime(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffSec < 60) return "just now";
    if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
    if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
    return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
}

/**
 * Format a distance in miles
 */
export function formatDistance(miles: number): string {
    return `${miles.toFixed(1)} mi`;
}

/**
 * Format energy usage in kWh
 */
export function formatEnergy(kwh: number): string {
    return `${kwh.toFixed(1)} kWh`;
}

/**
 * Format a dollar amount
 */
export function formatCost(dollars: number): string {
    return `$${dollars.toFixed(2)}`;
}

/**
 * Format a duration from minutes
 */
export function formatDuration(minutes: number): string {
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Convert Celsius to Fahrenheit
 */
export function celsiusToFahrenheit(celsius: number): number {
    return Math.round((celsius * 9) / 5 + 32);
}

/**
 * Convert Fahrenheit to Celsius
 */
export function fahrenheitToCelsius(fahrenheit: number): number {
    return Math.round(((fahrenheit - 32) * 5) / 9);
}

/**
 * Generate a Google Maps link from coordinates
 */
export function generateMapsLink(lat: number, lng: number): string {
    return `https://www.google.com/maps?q=${lat},${lng}`;
}

/**
 * Convert tire pressure from bar to PSI
 */
export function barToPsi(bar: number): number {
    return Math.round(bar * 14.5038);
}

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
    return crypto.randomUUID();
}
