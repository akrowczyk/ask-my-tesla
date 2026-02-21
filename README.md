# Ask My Tesla

A conversational AI assistant for controlling and querying your Tesla vehicle through chat and voice. Built with Next.js, the xAI Grok API, and the Tessie API. Supports self-hosting with a **Bring Your Own Key** (BYOK) model — users provide their own API keys via the browser with no server-side storage.

## Features

- **Text chat** with Grok-powered AI that can read vehicle status, execute commands (lock/unlock, climate, etc.), and answer questions about your car
- **Real-time voice mode** using the xAI Grok Voice Agent API over WebSocket — talk to your Tesla hands-free
- **Voice selection** — choose from 5 voices (Rex, Ara, Sal, Eve, Leo) with your preference persisted across sessions
- **Mic and speaker mute** toggles during voice conversations
- **Personality modes** — switch between "Assistant" (friendly and helpful) and "Sarcastic" (witty copilot with attitude) for both text and voice, persisted across sessions
- **Quick actions** for common operations (battery, climate, location)
- **Live status bar** showing vehicle state at a glance
- **Google Maps embed** for location results (when a Maps API key is provided)
- **Smart model routing** — automatically selects reasoning vs non-reasoning models based on query complexity
- **BYOK hosting** — deploy to Vercel and let users enter their own API keys, or set env vars for a personal instance

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS 4 |
| AI | xAI Grok (chat + voice), Vercel AI SDK |
| Vehicle API | Tessie |
| Maps | Google Maps Embed API (optional) |
| Hosting | Vercel (or any Node.js host) |

## Getting Started

### Prerequisites

- Node.js 18+
- An [xAI API key](https://console.x.ai/)
- A [Tessie API token](https://developer.tessie.com/)
- Your Tesla's VIN

### Local Development

1. Clone the repo and install dependencies:

```bash
npm install
```

2. Copy the example env file and fill in your keys:

```bash
cp .env.local.example .env.local
```

Required variables:

```
XAI_API_KEY=xai-xxxxxxxxxxxx
TESSIE_API_KEY=xxxxxxxxxxxx
TESLA_VIN=5YJ3E1EA1NF000000
```

Optional variables:

```
GOOGLE_MAPS_API_KEY=xxxxxxxxxxxx                # Map embeds (server-side)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=xxxxxxxxxxxx    # Map embeds (client-side)
USER_TIMEZONE=America/Chicago                   # Date formatting
DEFAULT_MODEL=auto                              # auto | reasoning | non-reasoning
MAX_TOOL_ITERATIONS=10                          # Safety limit for tool loops
SESSION_TTL_HOURS=24                            # Session expiry
```

3. Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. When env vars are set, everything works out of the box — no settings modal needed.

## BYOK Architecture

The app supports a **Bring Your Own Key** model for hosted deployments. Users enter their API keys in a settings modal; the keys are stored in `localStorage` and sent as encrypted HTTPS headers on every request. The server never persists them.

### How It Works

```
Browser                          Server (API Routes)              External APIs
┌─────────────┐                  ┌──────────────────┐             ┌───────────┐
│ Settings UI │──save keys──▶    │                  │             │           │
│ localStorage│──read keys──▶    │  resolveKeys()   │             │ Tessie    │
│             │  X-Tessie-Key    │  1. Check header │────────────▶│ xAI       │
│             │  X-XAI-Key       │  2. Fallback env │             │           │
│             │  X-Tesla-VIN     │  3. Return 401   │             │           │
└─────────────┘                  └──────────────────┘             └───────────┘
```

Every API route resolves keys with this priority:

1. **Request header** — `X-Tessie-Key`, `X-XAI-Key`, `X-Tesla-VIN` (user-provided)
2. **Environment variable** — `TESSIE_API_KEY`, `XAI_API_KEY`, `TESLA_VIN` (server default)
3. **401 error** if neither is available

This means:

| Scenario | Env vars | User keys | What happens |
|----------|----------|-----------|--------------|
| **Local dev** | Set in `.env.local` | Not needed | Works immediately, no modal |
| **Personal hosted instance** | Set on Vercel | Not needed | Works like local dev |
| **Public BYOK instance** | Not set | Required | Users see onboarding modal on first visit |
| **Mixed** | Set on Vercel | Optional | Server keys are defaults; users can override |

### Deploying to Vercel

1. Push the repo to GitHub
2. Import the project on [Vercel](https://vercel.com)
3. Optionally set environment variables for a personal instance
4. Deploy — no special configuration needed

For a pure BYOK deployment, don't set any env vars. Users will be prompted to enter their keys on first visit.

### Security

- Keys are stored only in the user's browser (`localStorage`) and sent over HTTPS
- Server-side routes are stateless — keys exist only for the duration of each request
- The Google Maps key is inherently public (visible in the iframe URL)
- A `/api/config` endpoint reports whether server-side keys exist (without revealing values) so the client can decide whether to show the onboarding modal

## Project Structure

```
app/
  api/
    chat/           # Text chat endpoint (Grok + tool use)
    config/         # Reports server-side key availability
    voice-token/    # Ephemeral token for voice WebSocket
    tool-execute/   # Executes Tessie tools for voice mode
    session/        # Session creation
    vehicle/status/ # Vehicle status polling
  page.tsx          # Main page
  layout.tsx        # Root layout with KeysProvider
  globals.css       # All styles

components/
  ChatThread.tsx    # Message list
  ChatBubble.tsx    # Individual message rendering
  MessageInput.tsx  # Text input + voice mode toggle
  VoiceMode.tsx     # Voice bar UI (controls, mute, voice selector)
  StatusBar.tsx     # Vehicle status display + settings gear icon
  SettingsModal.tsx # API key entry / onboarding modal
  ToolCards.tsx     # Rich cards for tool results (battery, location, etc.)
  QuickActions.tsx  # Quick action buttons
  Logo.tsx          # App logo

hooks/
  useVoiceAgent.ts  # Voice WebSocket, audio capture/playback, mute controls

lib/
  keys.tsx          # KeysProvider context, useKeys hook, getKeyHeaders helper
  resolve-keys.ts   # Server-side headers-then-env key resolution
  personality.ts    # Personality types, prompts, and voice personality config
  grok.ts           # Grok model factory (accepts API key)
  tessie.ts         # Tessie API client (accepts API key + VIN)
  tools.ts          # Tool definitions for text chat (accepts TessieOpts)
  voice-tools.ts    # Tool definitions for voice mode
  model-router.ts   # Reasoning vs non-reasoning model selection
  session-store.ts  # In-memory session management
  utils.ts          # Shared utilities
```

## Referrals

- **Tessie** — The vehicle API that powers this app. Sign up here: [share.tessie.com/v4Gklbe1U0b](https://share.tessie.com/v4Gklbe1U0b)
- **Want to buy a Tesla?** Use my referral code for special deals and rewards: [ts.la/andrew80231](https://ts.la/andrew80231)

## License

[MIT](LICENSE) - Andrew Krowczyk
