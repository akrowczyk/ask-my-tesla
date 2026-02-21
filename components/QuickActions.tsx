"use client";

import { useState } from "react";

interface QuickAction {
    label: string;
    message: string;
    icon: React.ReactNode;
}

const Icon = ({ d, size = 14 }: { d: string; size?: number }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d={d} />
    </svg>
);

const BatteryIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="6" width="18" height="12" rx="2" ry="2" />
        <line x1="23" y1="13" x2="23" y2="11" />
    </svg>
);

const quickActions: QuickAction[] = [
    {
        label: "Battery",
        message: "What's my battery level?",
        icon: <BatteryIcon />,
    },
    {
        label: "Climate",
        message: "What's the temperature inside and outside the car?",
        icon: <Icon d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />,
    },
    {
        label: "Location",
        message: "Where is my car right now?",
        icon: <Icon d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />,
    },
    {
        label: "Lock",
        message: "Lock the car",
        icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
        ),
    },
    {
        label: "Unlock",
        message: "Unlock the car",
        icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 9.9-1" />
            </svg>
        ),
    },
    {
        label: "Warm Up",
        message: "Start preconditioning the car",
        icon: <Icon d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" />,
    },
    {
        label: "Trunk",
        message: "Open the trunk",
        icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="21 8 21 21 3 21 3 8" />
                <rect x="1" y="3" width="22" height="5" rx="1" />
            </svg>
        ),
    },
    {
        label: "Tires",
        message: "Check my tire pressure",
        icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="3" />
            </svg>
        ),
    },
];

interface QuickActionsProps {
    onAction: (message: string) => void;
    disabled: boolean;
}

export default function QuickActions({ onAction, disabled }: QuickActionsProps) {
    const [expanded, setExpanded] = useState(true);

    return (
        <div className="quick-actions-wrapper">
            <button
                className="quick-actions-toggle"
                onClick={() => setExpanded(!expanded)}
                aria-expanded={expanded}
                aria-label="Toggle quick actions"
            >
                <span>Quick Actions</span>
                <span className={`toggle-chevron ${expanded ? "open" : ""}`}>▾</span>
            </button>

            {expanded && (
                <div className="quick-actions-row">
                    {quickActions.map((action) => (
                        <button
                            key={action.label}
                            className="quick-action-chip"
                            onClick={() => onAction(action.message)}
                            disabled={disabled}
                            title={action.message}
                        >
                            {action.icon}
                            {action.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
