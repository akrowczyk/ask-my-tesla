"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

const STORAGE_KEY = "ask-my-tesla-keys";

interface Keys {
    tessieKey: string;
    xaiKey: string;
    vin: string;
    mapsKey: string;
}

interface KeysContextValue extends Keys {
    isConfigured: boolean;
    hasEnvKeys: boolean;
    setKeys: (keys: Partial<Keys>) => void;
    clearKeys: () => void;
    getKeyHeaders: () => Record<string, string>;
}

const EMPTY_KEYS: Keys = { tessieKey: "", xaiKey: "", vin: "", mapsKey: "" };

const KeysContext = createContext<KeysContextValue>({
    ...EMPTY_KEYS,
    isConfigured: false,
    hasEnvKeys: false,
    setKeys: () => {},
    clearKeys: () => {},
    getKeyHeaders: () => ({}),
});

function loadKeys(): Keys {
    if (typeof window === "undefined") return EMPTY_KEYS;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return EMPTY_KEYS;
        return { ...EMPTY_KEYS, ...JSON.parse(raw) };
    } catch {
        return EMPTY_KEYS;
    }
}

function saveKeys(keys: Keys) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
}

export function KeysProvider({ children }: { children: ReactNode }) {
    const [keys, _setKeys] = useState<Keys>(EMPTY_KEYS);
    const [hasEnvKeys, setHasEnvKeys] = useState(false);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        _setKeys(loadKeys());
        setLoaded(true);

        fetch("/api/config")
            .then((r) => r.json())
            .then((data) => setHasEnvKeys(!!data.hasEnvKeys))
            .catch(() => {});
    }, []);

    const setKeys = useCallback((partial: Partial<Keys>) => {
        _setKeys((prev) => {
            const next = { ...prev, ...partial };
            saveKeys(next);
            return next;
        });
    }, []);

    const clearKeys = useCallback(() => {
        _setKeys(EMPTY_KEYS);
        localStorage.removeItem(STORAGE_KEY);
    }, []);

    const getKeyHeaders = useCallback((): Record<string, string> => {
        const headers: Record<string, string> = {};
        if (keys.tessieKey) headers["X-Tessie-Key"] = keys.tessieKey;
        if (keys.xaiKey) headers["X-XAI-Key"] = keys.xaiKey;
        if (keys.vin) headers["X-Tesla-VIN"] = keys.vin;
        return headers;
    }, [keys.tessieKey, keys.xaiKey, keys.vin]);

    const localConfigured = !!(keys.tessieKey && keys.xaiKey && keys.vin);
    const isConfigured = localConfigured || hasEnvKeys;

    return (
        <KeysContext.Provider
            value={{
                ...keys,
                isConfigured: loaded ? isConfigured : true,
                hasEnvKeys,
                setKeys,
                clearKeys,
                getKeyHeaders,
            }}
        >
            {children}
        </KeysContext.Provider>
    );
}

export function useKeys() {
    return useContext(KeysContext);
}
