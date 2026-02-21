/**
 * Resolve API keys from request headers with env var fallback.
 * Headers take priority so user-provided keys override server defaults.
 */
export function resolveKeys(req: Request) {
    const tessieKey = req.headers.get("x-tessie-key") || process.env.TESSIE_API_KEY || "";
    const xaiKey = req.headers.get("x-xai-key") || process.env.XAI_API_KEY || "";
    const vin = req.headers.get("x-tesla-vin") || process.env.TESLA_VIN || "";
    return { tessieKey, xaiKey, vin };
}
