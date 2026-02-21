export default function Logo({ size = 28 }: { size?: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-label="Ask My Tesla logo"
        >
            {/* Outer ring with gradient */}
            <defs>
                <linearGradient id="logo-ring" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#e31937" />
                    <stop offset="100%" stopColor="#ff4d6a" />
                </linearGradient>
                <linearGradient id="logo-t" x1="12" y1="8" x2="28" y2="32" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="100%" stopColor="#e0e0e8" />
                </linearGradient>
                <filter id="logo-glow">
                    <feGaussianBlur stdDeviation="1.5" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            {/* Background circle */}
            <circle cx="20" cy="20" r="19" fill="url(#logo-ring)" opacity="0.15" />
            <circle cx="20" cy="20" r="19" stroke="url(#logo-ring)" strokeWidth="1.5" fill="none" />

            {/* Tesla-style "T" mark */}
            <g filter="url(#logo-glow)">
                <path
                    d="M20 10 L20 30"
                    stroke="url(#logo-t)"
                    strokeWidth="3"
                    strokeLinecap="round"
                />
                <path
                    d="M11 13 C11 13, 15.5 10, 20 10 C24.5 10, 29 13, 29 13"
                    stroke="url(#logo-t)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    fill="none"
                />
            </g>

            {/* Subtle chat bubble indicator */}
            <circle cx="31" cy="9" r="5" fill="#e31937" />
            <path
                d="M29 8 L30.5 9.5 L33 7"
                stroke="white"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
            />
        </svg>
    );
}
