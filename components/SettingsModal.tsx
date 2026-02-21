"use client";

import { useState, useEffect } from "react";
import { useKeys } from "@/lib/keys";

interface SettingsModalProps {
    open: boolean;
    onClose: () => void;
    onboarding?: boolean;
}

export default function SettingsModal({ open, onClose, onboarding }: SettingsModalProps) {
    const { tessieKey, xaiKey, vin, mapsKey, setKeys, clearKeys } = useKeys();

    const [form, setForm] = useState({
        tessieKey: "",
        xaiKey: "",
        vin: "",
        mapsKey: "",
    });
    const [error, setError] = useState("");

    useEffect(() => {
        if (open) {
            setForm({ tessieKey, xaiKey, vin, mapsKey });
            setError("");
        }
    }, [open, tessieKey, xaiKey, vin, mapsKey]);

    if (!open) return null;

    const handleSave = () => {
        if (!form.tessieKey.trim() || !form.xaiKey.trim() || !form.vin.trim()) {
            setError("Tessie API Key, xAI API Key, and Tesla VIN are required.");
            return;
        }
        setKeys({
            tessieKey: form.tessieKey.trim(),
            xaiKey: form.xaiKey.trim(),
            vin: form.vin.trim(),
            mapsKey: form.mapsKey.trim(),
        });
        onClose();
        window.location.reload();
    };

    const handleClear = () => {
        clearKeys();
        setForm({ tessieKey: "", xaiKey: "", vin: "", mapsKey: "" });
    };

    return (
        <div className="settings-overlay" onClick={onboarding ? undefined : onClose}>
            <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
                <div className="settings-header">
                    <h2>{onboarding ? "Welcome to Ask My Tesla" : "Settings"}</h2>
                    {!onboarding && (
                        <button className="settings-close" onClick={onClose} aria-label="Close">
                            ✕
                        </button>
                    )}
                </div>

                {onboarding && (
                    <p className="settings-description">
                        Enter your API keys to get started. Your keys are stored
                        locally in your browser and sent securely over HTTPS.
                    </p>
                )}

                <div className="settings-fields">
                    <label className="settings-label">
                        <span>xAI API Key <span className="settings-required">*</span></span>
                        <input
                            type="password"
                            className="settings-input"
                            value={form.xaiKey}
                            onChange={(e) => setForm((f) => ({ ...f, xaiKey: e.target.value }))}
                            placeholder="xai-..."
                            autoComplete="off"
                        />
                    </label>
                    <label className="settings-label">
                        <span>Tessie API Key <span className="settings-required">*</span></span>
                        <input
                            type="password"
                            className="settings-input"
                            value={form.tessieKey}
                            onChange={(e) => setForm((f) => ({ ...f, tessieKey: e.target.value }))}
                            placeholder="Your Tessie bearer token"
                            autoComplete="off"
                        />
                    </label>
                    <label className="settings-label">
                        <span>Tesla VIN <span className="settings-required">*</span></span>
                        <input
                            type="text"
                            className="settings-input"
                            value={form.vin}
                            onChange={(e) => setForm((f) => ({ ...f, vin: e.target.value }))}
                            placeholder="5YJ3E1EA..."
                            autoComplete="off"
                        />
                    </label>
                    <label className="settings-label">
                        <span>Google Maps API Key <span className="settings-optional">(optional)</span></span>
                        <input
                            type="password"
                            className="settings-input"
                            value={form.mapsKey}
                            onChange={(e) => setForm((f) => ({ ...f, mapsKey: e.target.value }))}
                            placeholder="AIza..."
                            autoComplete="off"
                        />
                    </label>
                </div>

                {error && <div className="settings-error">{error}</div>}

                <div className="settings-actions">
                    <button className="settings-btn-primary" onClick={handleSave}>
                        Save
                    </button>
                    {!onboarding && (
                        <button className="settings-btn-secondary" onClick={handleClear}>
                            Clear Keys
                        </button>
                    )}
                </div>

                <p className="settings-security-note">
                    Your keys never leave your browser except as encrypted HTTPS headers to this app's server.
                </p>
            </div>
        </div>
    );
}
