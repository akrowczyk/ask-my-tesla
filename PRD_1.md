# PRD: "Ask My Tesla" — AI-Powered Tesla Chatbot

## Product Requirements Document

**Version:** 1.0
**Author:** Andrew (RedPath Technologies)
**Date:** February 19, 2026
**Status:** Draft — Ready for Claude Code Implementation

---

## 1. Executive Summary

"Ask My Tesla" is a conversational web application that lets Tesla owners interact with their vehicle using natural language. Instead of navigating multiple apps or remembering specific commands, users simply type (or speak) what they want — "What's my battery at?", "Warm up the car", "Show me last week's drives" — and the app interprets intent, calls the appropriate Tessie API endpoints, and returns a friendly, contextual response.

The LLM/agentic layer is powered by **xAI's Grok 4.1 Fast** models via the xAI API, using OpenAI-compatible function calling to bridge natural language to Tessie API operations. The app supports both the **reasoning** variant (`grok-4-1-fast-reasoning`) for complex multi-step queries and the **non-reasoning** variant (`grok-4-1-fast-non-reasoning`) for fast, simple lookups.

**Target User:** Tesla Model Y owner (initially personal use), with potential to productize through RedPath Technologies for the broader Tesla enthusiast market.

---

## 2. Goals & Success Criteria

### Primary Goals
- Natural language control and querying of a Tesla via Tessie API
- Sub-3-second response for simple queries (battery, location, tire pressure)
- Reliable multi-step operations (e.g., "precondition the car and set it to 72°")
- Clean, mobile-first chat UI that feels like texting your car

### Success Criteria
- 95%+ intent recognition accuracy for the defined command set
- Graceful error handling when the car is asleep or API is unreachable
- Conversation context maintained across a session (multi-turn)
- Monthly API cost under $5 for personal daily use

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React/Next.js)              │
│   Chat UI  ·  Message History  ·  Vehicle Status Bar    │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS
┌──────────────────────▼──────────────────────────────────┐
│                  Backend API (Node.js/Express)           │
│                                                         │
│  ┌─────────────┐    ┌──────────────┐   ┌─────────────┐ │
│  │ Chat Router  │───▶│ Grok Agent   │──▶│ Tool Exec   │ │
│  │ /api/chat    │    │ (xAI API)    │   │ Engine      │ │
│  └─────────────┘    └──────────────┘   └──────┬──────┘ │
│                                               │        │
│  ┌─────────────────────────────────────────────▼──────┐ │
│  │              Tessie API Client                     │ │
│  │  Vehicle Data  ·  Commands  ·  History  ·  Telemetry│ │
│  └────────────────────────────────────────────────────┘ │
│                                                         │
│  ┌────────────────┐  ┌────────────────┐                 │
│  │ Session Store   │  │ Rate Limiter   │                 │
│  │ (in-memory/     │  │ (per-user,     │                 │
│  │  Redis)         │  │  per-endpoint) │                 │
│  └────────────────┘  └────────────────┘                 │
└─────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | **Next.js 14+ (App Router)** with React | SSR, API routes co-located, fast dev |
| Styling | **Tailwind CSS** | Rapid prototyping, mobile-first |
| LLM | **xAI Grok 4.1 Fast** (reasoning + non-reasoning) | Best-in-class tool calling, $0.20/1M input, 2M context |
| xAI SDK | **OpenAI JS SDK** with `baseURL: "https://api.x.ai/v1"` | xAI is OpenAI-compatible; simplest integration path |
| Vehicle API | **Tessie REST API** (https://api.tessie.com) | Stable Tesla vehicle proxy, no Tesla Fleet API complexity |
| Session | **In-memory Map** (v1) → Redis (v2) | Keeps conversation history per session |
| Auth | **Environment variables** (v1) → NextAuth (v2) | Single-user initially; multi-user later |
| Deployment | **Vercel** or **Railway** | Zero-config Next.js hosting |

---

## 4. Grok Integration Design

### 4.1 Model Selection Strategy

The app uses a **dual-model approach** to optimize cost and latency:

| Query Type | Model | Reasoning | Example |
|------------|-------|-----------|---------|
| Simple data lookup | `grok-4-1-fast-non-reasoning` | Off | "What's my battery?" |
| Single command | `grok-4-1-fast-non-reasoning` | Off | "Lock the car" |
| Multi-step operation | `grok-4-1-fast-reasoning` | On | "Precondition to 72° and open the trunk" |
| Analysis / history | `grok-4-1-fast-reasoning` | On | "How much did I spend charging last month?" |
| Ambiguous / conversational | `grok-4-1-fast-reasoning` | On | "Should I charge tonight or wait?" |

**Implementation:** A lightweight classifier (keyword + heuristic) on the backend routes to the appropriate model. If unsure, default to reasoning.

### 4.2 System Prompt

```
You are "Ask My Tesla", a helpful AI assistant that lets the user interact with 
their Tesla vehicle using natural language. You have access to the Tessie API 
through function tools. 

RULES:
1. Always use the appropriate tool to get real data — never fabricate vehicle 
   stats, locations, or status.
2. For commands that change vehicle state (lock, unlock, climate, trunk, etc.), 
   confirm the action AFTER executing it, and report the result.
3. If the vehicle is asleep, call the wake tool first, wait briefly, then retry.
4. For multi-step requests, execute tools in logical order and summarize all 
   results at the end.
5. Use conversational, friendly tone. You're talking to a car owner, not 
   writing documentation.
6. When reporting battery, always include both percentage and estimated range.
7. For location queries, include a Google Maps link.
8. If a command fails, explain why in plain language and suggest alternatives.
9. When showing drive history or charge history, format data in a readable way 
   with dates, distances, and costs.
10. Never expose raw API responses — always translate to human-friendly language.

The user's vehicle VIN is provided in context. Use it for all API calls.
Current date/time: {current_datetime}
User's timezone: {user_timezone}
```

### 4.3 xAI API Integration (OpenAI-Compatible)

```typescript
// Backend: lib/grok.ts
import OpenAI from "openai";

const grokClient = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: "https://api.x.ai/v1",
});

// For simple queries
const nonReasoningModel = "grok-4-1-fast-non-reasoning";

// For complex/multi-step queries  
const reasoningModel = "grok-4-1-fast-reasoning";

async function chat(messages, tools, model) {
  const response = await grokClient.chat.completions.create({
    model,
    messages,
    tools,
    tool_choice: "auto",
    max_tokens: 2048,
    temperature: 0.3, // Low for accuracy on tool calls
  });
  return response;
}
```

---

## 5. Tessie API Tool Definitions

These are the function tools registered with Grok for function calling. Each maps to one or more Tessie API endpoints.

### 5.1 Vehicle Data Tools (Read-Only)

#### `get_battery_status`
- **Description:** Get current battery level, range, and charging state
- **Tessie endpoint:** `GET /api/1/vehicles/{vin}/state`
- **Returns:** Battery %, estimated range (mi), charging state, charge limit, time to full
- **Parameters:** None (VIN from context)

#### `get_location`
- **Description:** Get current vehicle location with address
- **Tessie endpoint:** `GET /api/1/vehicles/{vin}/location`
- **Returns:** Latitude, longitude, reverse-geocoded address, Google Maps link, speed (if moving)
- **Parameters:** None

#### `get_tire_pressure`
- **Description:** Get tire pressure for all four tires
- **Tessie endpoint:** `GET /api/1/vehicles/{vin}/tire_pressure`
- **Returns:** FL, FR, RL, RR pressures in PSI, any low-pressure warnings
- **Parameters:** None

#### `get_vehicle_status`
- **Description:** Get overall vehicle state (locked, doors, windows, sentry, odometer)
- **Tessie endpoint:** `GET /api/1/vehicles/{vin}/state`
- **Returns:** Lock state, door open/closed, window state, sentry mode, software version, odometer
- **Parameters:** None

#### `get_climate_state`
- **Description:** Get current climate/HVAC state
- **Tessie endpoint:** `GET /api/1/vehicles/{vin}/state`
- **Returns:** Inside temp, outside temp, climate on/off, set temp, seat heaters, defrost state
- **Parameters:** None

#### `get_weather`
- **Description:** Get weather at the vehicle's current location
- **Tessie endpoint:** `GET /api/1/vehicles/{vin}/weather`
- **Returns:** Temperature, conditions, humidity, wind
- **Parameters:** None

#### `get_drives`
- **Description:** Get recent drive history
- **Tessie endpoint:** `GET /api/1/vehicles/{vin}/drives`
- **Returns:** Array of drives with start/end time, distance, energy used, start/end locations
- **Parameters:**
  - `from_timestamp` (optional): Start of date range (ISO 8601)
  - `to_timestamp` (optional): End of date range (ISO 8601)

#### `get_charges`
- **Description:** Get recent charging history
- **Tessie endpoint:** `GET /api/1/vehicles/{vin}/charges`
- **Returns:** Array of charges with date, energy added (kWh), cost, location, duration
- **Parameters:**
  - `from_timestamp` (optional): Start of date range
  - `to_timestamp` (optional): End of date range

#### `get_driving_path`
- **Description:** Get the GPS path for a specific drive
- **Tessie endpoint:** `GET /api/1/vehicles/{vin}/drives/{drive_id}/path`
- **Returns:** Array of lat/lng coordinates for mapping
- **Parameters:**
  - `drive_id` (required): The drive ID from get_drives

#### `check_vehicle_awake`
- **Description:** Check if the vehicle is awake or asleep
- **Tessie endpoint:** `GET /api/1/vehicles/{vin}/status`
- **Returns:** "awake" or "asleep"
- **Parameters:** None

### 5.2 Vehicle Command Tools (Write)

#### `wake_vehicle`
- **Description:** Wake up the vehicle from sleep
- **Tessie endpoint:** `POST /api/1/vehicles/{vin}/wake`
- **Returns:** Success/failure, current state
- **Parameters:** None
- **Note:** Should be called automatically if vehicle is asleep before executing other commands

#### `lock_doors`
- **Description:** Lock all vehicle doors
- **Tessie endpoint:** `POST /api/1/vehicles/{vin}/command/lock`
- **Returns:** Success/failure confirmation
- **Parameters:** None

#### `unlock_doors`
- **Description:** Unlock all vehicle doors
- **Tessie endpoint:** `POST /api/1/vehicles/{vin}/command/unlock`
- **Returns:** Success/failure confirmation
- **Parameters:** None

#### `start_climate`
- **Description:** Start climate control / preconditioning
- **Tessie endpoint:** `POST /api/1/vehicles/{vin}/command/start_climate`
- **Returns:** Success/failure confirmation
- **Parameters:** None

#### `stop_climate`
- **Description:** Stop climate control
- **Tessie endpoint:** `POST /api/1/vehicles/{vin}/command/stop_climate`
- **Returns:** Success/failure confirmation
- **Parameters:** None

#### `set_temperature`
- **Description:** Set the target cabin temperature
- **Tessie endpoint:** `POST /api/1/vehicles/{vin}/command/set_temperatures`
- **Returns:** Confirmation with new set temperature
- **Parameters:**
  - `driver_temp` (required): Temperature in °F (range 59-82)
  - `passenger_temp` (optional): Defaults to driver_temp

#### `set_seat_heater`
- **Description:** Set heated seat level
- **Tessie endpoint:** `POST /api/1/vehicles/{vin}/command/set_seat_heater`
- **Returns:** Confirmation
- **Parameters:**
  - `seat` (required): "driver" | "passenger" | "rear_left" | "rear_center" | "rear_right"
  - `level` (required): 0 (off), 1 (low), 2 (medium), 3 (high)

#### `set_seat_cooler`
- **Description:** Set ventilated/cooled seat level
- **Tessie endpoint:** `POST /api/1/vehicles/{vin}/command/set_seat_cooler`
- **Returns:** Confirmation
- **Parameters:**
  - `seat` (required): "driver" | "passenger"
  - `level` (required): 0 (off), 1 (low), 2 (medium), 3 (high)

#### `activate_defrost`
- **Description:** Turn on max defrost mode
- **Tessie endpoint:** `POST /api/1/vehicles/{vin}/command/set_preconditioning_max`
- **Returns:** Confirmation
- **Parameters:**
  - `on` (required): true | false

#### `set_steering_wheel_heater`
- **Description:** Toggle steering wheel heater
- **Tessie endpoint:** `POST /api/1/vehicles/{vin}/command/set_steering_wheel_heater`
- **Returns:** Confirmation
- **Parameters:**
  - `on` (required): true | false

#### `open_trunk`
- **Description:** Open the rear trunk
- **Tessie endpoint:** `POST /api/1/vehicles/{vin}/command/actuate_trunk`
- **Returns:** Confirmation
- **Parameters:**
  - `which_trunk` (required): "rear" | "front"

#### `vent_windows`
- **Description:** Vent all windows slightly
- **Tessie endpoint:** `POST /api/1/vehicles/{vin}/command/vent_windows`
- **Returns:** Confirmation
- **Parameters:** None

#### `close_windows`
- **Description:** Close all windows
- **Tessie endpoint:** `POST /api/1/vehicles/{vin}/command/close_windows`
- **Returns:** Confirmation
- **Parameters:** None

#### `flash_lights`
- **Description:** Flash the headlights
- **Tessie endpoint:** `POST /api/1/vehicles/{vin}/command/flash_lights`
- **Returns:** Confirmation
- **Parameters:** None

#### `honk_horn`
- **Description:** Honk the horn
- **Tessie endpoint:** `POST /api/1/vehicles/{vin}/command/honk`
- **Returns:** Confirmation
- **Parameters:** None

#### `start_charging`
- **Description:** Start charging (if plugged in)
- **Tessie endpoint:** `POST /api/1/vehicles/{vin}/command/start_charging`
- **Returns:** Confirmation or error if not plugged in
- **Parameters:** None

#### `stop_charging`
- **Description:** Stop charging
- **Tessie endpoint:** `POST /api/1/vehicles/{vin}/command/stop_charging`
- **Returns:** Confirmation
- **Parameters:** None

#### `set_charge_limit`
- **Description:** Set the charge limit percentage
- **Tessie endpoint:** `POST /api/1/vehicles/{vin}/command/set_charge_limit`
- **Returns:** Confirmation with new limit
- **Parameters:**
  - `percent` (required): 50-100

#### `toggle_sentry_mode`
- **Description:** Enable or disable sentry mode
- **Tessie endpoint:** `POST /api/1/vehicles/{vin}/command/set_sentry_mode`
- **Returns:** Confirmation
- **Parameters:**
  - `on` (required): true | false

#### `trigger_homelink`
- **Description:** Trigger the HomeLink (garage door)
- **Tessie endpoint:** `POST /api/1/vehicles/{vin}/command/trigger_homelink`
- **Returns:** Confirmation
- **Parameters:** None

#### `share_address`
- **Description:** Send a destination/address to the vehicle's navigation
- **Tessie endpoint:** `POST /api/1/vehicles/{vin}/command/share`
- **Returns:** Confirmation
- **Parameters:**
  - `address` (required): Full street address or place name
  - `locale` (optional): defaults to "en-US"

---

## 6. Tool Execution Engine

### 6.1 Agentic Tool Loop

The backend implements a standard tool-calling loop compatible with the OpenAI function-calling protocol:

```
1. User sends message
2. Append to conversation history
3. Send history + tools to Grok
4. If response contains tool_calls:
   a. For EACH tool_call:
      - Parse function name + arguments
      - Execute corresponding Tessie API call
      - Collect result
   b. Append assistant message (with tool_calls) to history
   c. Append tool results to history
   d. Go to step 3 (let Grok process results and potentially call more tools)
5. If response is a text message (no tool_calls):
   - Return to user as final response
6. Safety: Max 10 loop iterations to prevent runaway
```

### 6.2 Wake-on-Command Pattern

Many Tessie API calls fail if the vehicle is asleep. The tool execution engine implements automatic wake:

```
1. Before executing any command tool, call check_vehicle_awake
2. If asleep:
   a. Call wake_vehicle
   b. Poll status every 2 seconds, up to 30 seconds
   c. If wake succeeds, proceed with original command
   d. If wake fails after 30s, return error to Grok with context
3. If already awake, proceed immediately
```

### 6.3 Error Handling

| Scenario | Behavior |
|----------|----------|
| Tessie API 401 | "Your Tessie token appears to be expired. Please update it in settings." |
| Tessie API 408/504 | "Your car didn't respond in time. It may be in a low-signal area." |
| Tessie API 422 | Parse error details, translate to plain English |
| Vehicle asleep + wake fails | "I wasn't able to wake up your Tesla. It might be in deep sleep or in a garage with no signal." |
| Grok API error | "I'm having trouble thinking right now. Please try again in a moment." |
| Rate limit hit | "I'm getting rate-limited. Please wait a few seconds before your next request." |
| Unknown tool called | Log warning, return graceful error to Grok |

---

## 7. Frontend Design

### 7.1 Layout

```
┌──────────────────────────────────────┐
│  🚗 Ask My Tesla          ⚡ 78%  🔒 │  ← Status bar (auto-refreshes)
├──────────────────────────────────────┤
│                                      │
│  ┌──────────────────────────────┐    │
│  │ 🤖 Hey! I'm connected to    │    │
│  │ your Model Y. What would    │    │
│  │ you like to know or do?     │    │
│  └──────────────────────────────┘    │
│                                      │
│  ┌──────────────────────────────┐    │
│  │ 👤 What's my battery and     │    │
│  │ tire pressure?              │    │
│  └──────────────────────────────┘    │
│                                      │
│  ┌──────────────────────────────┐    │
│  │ 🤖 Your Model Y is at 78%   │    │
│  │ (198 mi range). Tires are   │    │
│  │ all good:                   │    │
│  │ FL: 42 PSI  FR: 41 PSI     │    │
│  │ RL: 42 PSI  RR: 41 PSI     │    │
│  └──────────────────────────────┘    │
│                                      │
│  ┌──────────────────────────────┐    │
│  │ 👤 Warm it up to 72         │    │
│  └──────────────────────────────┘    │
│                                      │
│  ┌──────────────────────────────┐    │
│  │ 🤖 Done! Climate is on and  │    │
│  │ set to 72°F. Current cabin  │    │
│  │ temp is 34°F — should be    │    │
│  │ cozy in about 10 minutes.   │    │
│  └──────────────────────────────┘    │
│                                      │
├──────────────────────────────────────┤
│ [💡 Quick actions ▾]                 │  ← Collapsible quick action chips
│ [🔋 Battery] [🌡️ Climate] [📍 Location]│
│ [🔒 Lock] [🔓 Unlock] [🏠 Garage]   │
├──────────────────────────────────────┤
│ [Type a message...          ] [Send] │
└──────────────────────────────────────┘
```

### 7.2 Key UI Components

| Component | Description |
|-----------|-------------|
| **StatusBar** | Persistent top bar showing battery %, lock state, connection status. Auto-refreshes every 60s. |
| **ChatThread** | Scrollable message list with user/assistant bubbles. Supports streaming responses. |
| **MessageInput** | Text input with send button. Enter to send. |
| **QuickActions** | Collapsible row of chip buttons for common commands. Tapping inserts a pre-filled message. |
| **LoadingIndicator** | Animated dots or spinner when waiting for Grok/Tessie response. Shows "Checking battery..." contextual messages. |
| **DriveCard** | Rich card component for displaying drive history entries (route preview, distance, time). |
| **ChargeCard** | Rich card for charge history (kWh, cost, duration, location). |
| **MapEmbed** | Inline Google Maps embed for location and drive path queries. |

### 7.3 Quick Action Definitions

```typescript
const quickActions = [
  { label: "🔋 Battery", message: "What's my battery level?" },
  { label: "🌡️ Climate", message: "What's the temperature inside and outside the car?" },
  { label: "📍 Where?", message: "Where is my car right now?" },
  { label: "🔒 Lock", message: "Lock the car" },
  { label: "🔓 Unlock", message: "Unlock the car" },
  { label: "❄️ Warm Up", message: "Start preconditioning the car" },
  { label: "🏠 Garage", message: "Open the garage door" },
  { label: "🛞 Tires", message: "Check my tire pressure" },
  { label: "📊 Drives", message: "Show me my drives from this week" },
  { label: "⚡ Charges", message: "Show me my recent charging sessions" },
];
```

### 7.4 Streaming Responses

Use the xAI streaming API to display responses token-by-token for better perceived latency:

```typescript
const stream = await grokClient.chat.completions.create({
  model,
  messages,
  tools,
  stream: true,
});

for await (const chunk of stream) {
  // Forward deltas to frontend via SSE or WebSocket
}
```

The frontend uses Server-Sent Events (SSE) from the Next.js API route to stream tokens to the chat UI in real-time.

---

## 8. Data Models

### 8.1 Conversation Session

```typescript
interface Session {
  id: string;                    // UUID
  vin: string;                   // Tesla VIN (from env)
  messages: ChatMessage[];       // Full conversation history
  createdAt: Date;
  lastActiveAt: Date;
  modelPreference: "auto" | "reasoning" | "non-reasoning";
}

interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ToolCall[];       // For assistant messages with tool requests
  tool_call_id?: string;         // For tool result messages
  name?: string;                 // Tool function name (for tool results)
  timestamp: Date;
}

interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;           // JSON string
  };
}
```

### 8.2 Vehicle Context (Cached)

```typescript
interface VehicleContext {
  vin: string;
  displayName: string;           // e.g., "Model Y"
  lastKnownBattery: number;      // Cached for status bar
  lastKnownLockState: boolean;
  lastKnownLocation: { lat: number; lng: number };
  lastUpdated: Date;
}
```

---

## 9. API Routes

### Next.js App Router API Structure

```
app/
  api/
    chat/
      route.ts          POST — Main chat endpoint (streams SSE)
    vehicle/
      status/
        route.ts        GET  — Quick status for status bar
    session/
      route.ts          POST — Create new session
                        DELETE — Clear session history
```

### POST `/api/chat`

**Request:**
```json
{
  "message": "What's my battery?",
  "sessionId": "uuid-here"
}
```

**Response:** Server-Sent Events stream
```
data: {"type": "token", "content": "Your"}
data: {"type": "token", "content": " Model"}
data: {"type": "token", "content": " Y"}
data: {"type": "tool_start", "name": "get_battery_status"}
data: {"type": "tool_end", "name": "get_battery_status", "success": true}
data: {"type": "token", "content": " is at 78%..."}
data: {"type": "done", "fullMessage": "Your Model Y is at 78% (198 mi range)."}
```

### GET `/api/vehicle/status`

**Response:**
```json
{
  "battery": 78,
  "range": 198,
  "locked": true,
  "climate_on": false,
  "sentry_on": true,
  "connected": true,
  "last_updated": "2026-02-19T14:30:00Z"
}
```

---

## 10. Security & Configuration

### 10.1 Environment Variables

```bash
# Required
XAI_API_KEY=xai-xxxxxxxxxxxx           # xAI API key
TESSIE_API_KEY=xxxxxxxxxxxx             # Tessie bearer token
TESLA_VIN=5YJ3E1EA1NF000000            # Vehicle VIN

# Optional
GOOGLE_MAPS_API_KEY=xxxxxxxxxxxx        # For map embeds
USER_TIMEZONE=America/Chicago           # For date formatting
DEFAULT_MODEL=auto                      # auto | reasoning | non-reasoning
MAX_TOOL_ITERATIONS=10                  # Safety limit for tool loops
SESSION_TTL_HOURS=24                    # Session expiry
```

### 10.2 Security Considerations

- **API keys server-side only** — Never expose xAI or Tessie keys to the frontend
- **Rate limiting** — Max 30 requests/minute per session to prevent abuse
- **Command confirmation** — Destructive-ish commands (unlock, open trunk) execute immediately but always confirm the result; future version could add a "confirm before executing" mode
- **No persistent storage of conversations** in v1 (privacy-first)
- **CORS** — Lock API routes to same-origin
- **Input sanitization** — Strip any injection attempts before passing to Grok system prompt

### 10.3 Tessie API Authentication

All Tessie API calls use Bearer token authentication:
```
Authorization: Bearer {TESSIE_API_KEY}
```

The token is obtained from the Tessie dashboard (Settings → API). It provides access to the specific vehicles linked to the Tessie account.

---

## 11. Cost Estimation

### xAI API Costs (Grok 4.1 Fast)

| Item | Rate | Est. Monthly (personal use) |
|------|------|-----------------------------|
| Input tokens | $0.20 / 1M | ~$0.10 (500K tokens) |
| Output tokens | $0.50 / 1M | ~$0.15 (300K tokens) |
| Cached input | ~$0.05 / 1M | Savings from system prompt caching |
| **Total xAI** | | **~$0.25/month** |

### Tessie API

Tessie's API is included with a Tessie subscription (~$5/month or $50/year). No per-call charges.

### Infrastructure

| Service | Cost |
|---------|------|
| Vercel (Hobby) | Free |
| Vercel (Pro, if needed) | $20/month |
| Domain (optional) | $12/year |

**Total estimated cost for personal use: ~$5-6/month** (dominated by Tessie subscription)

---

## 12. Project Structure

```
ask-my-tesla/
├── app/
│   ├── layout.tsx                    # Root layout with StatusBar
│   ├── page.tsx                      # Main chat page
│   ├── globals.css                   # Tailwind imports
│   └── api/
│       ├── chat/
│       │   └── route.ts              # Main chat SSE endpoint
│       ├── vehicle/
│       │   └── status/
│       │       └── route.ts          # Quick status endpoint
│       └── session/
│           └── route.ts              # Session management
├── components/
│   ├── ChatThread.tsx                # Message list
│   ├── ChatBubble.tsx                # Individual message bubble
│   ├── MessageInput.tsx              # Text input + send
│   ├── StatusBar.tsx                 # Top vehicle status bar
│   ├── QuickActions.tsx              # Action chip buttons
│   ├── LoadingIndicator.tsx          # Thinking/working state
│   ├── DriveCard.tsx                 # Rich drive history card
│   ├── ChargeCard.tsx                # Rich charge history card
│   └── MapEmbed.tsx                  # Inline Google Maps
├── lib/
│   ├── grok.ts                       # xAI/Grok client setup
│   ├── tessie.ts                     # Tessie API client with all endpoints
│   ├── tools.ts                      # Tool definitions (JSON Schema for Grok)
│   ├── tool-executor.ts              # Maps tool calls → Tessie functions
│   ├── agent-loop.ts                 # Agentic tool loop with streaming
│   ├── model-router.ts              # Routes queries to reasoning/non-reasoning
│   ├── session-store.ts              # In-memory session management
│   └── utils.ts                      # Date formatting, unit conversion, etc.
├── types/
│   └── index.ts                      # TypeScript interfaces
├── .env.local                        # Environment variables (git-ignored)
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
└── README.md
```

---

## 13. Implementation Phases

### Phase 1: MVP (Target: 1-2 days with Claude Code)

**Goal:** Working chat that handles the top 10 most common queries.

- [x] Next.js project scaffold with Tailwind
- [ ] Grok client setup (OpenAI SDK with xAI base URL)
- [ ] Tessie API client with core endpoints (battery, location, tire pressure, lock/unlock, climate)
- [ ] 10 core tool definitions
- [ ] Agentic tool loop (non-streaming first)
- [ ] Basic chat UI (messages, input, send)
- [ ] Status bar with auto-refresh
- [ ] Wake-on-command pattern
- [ ] Error handling for common failures

### Phase 2: Rich Experience (Target: 2-3 days)

- [ ] SSE streaming for token-by-token display
- [ ] All 25+ tool definitions
- [ ] Quick action chips
- [ ] Drive history with DriveCard components
- [ ] Charge history with ChargeCard components
- [ ] Map embed for location queries
- [ ] Model routing (auto-select reasoning vs non-reasoning)
- [ ] Session persistence with TTL

### Phase 3: Polish & Productize (Target: ongoing)

- [ ] Voice input (Web Speech API)
- [ ] PWA support (installable on phone home screen)
- [ ] Multi-vehicle support (vehicle picker)
- [ ] User authentication (NextAuth)
- [ ] Conversation history persistence (database)
- [ ] Push notifications for sentry events (webhook)
- [ ] "Confirm before execute" mode for commands
- [ ] Dark/light theme
- [ ] RedPath branding + potential SaaS packaging

---

## 14. Example Conversations

### Simple Query
```
User: "What's my battery?"
→ Tool: get_battery_status()
Assistant: "Your Model Y is at 78% with about 198 miles of range. 
           You're not plugged in right now."
```

### Multi-Step Command
```
User: "It's freezing — warm up the car, turn on the seat heater, 
       and the steering wheel heater"
→ Tool: start_climate()
→ Tool: set_temperature({driver_temp: 72})
→ Tool: set_seat_heater({seat: "driver", level: 3})
→ Tool: set_steering_wheel_heater({on: true})
Assistant: "All set! Climate is running at 72°F, driver's seat heater 
           is on high, and the steering wheel heater is on. Your cabin 
           is currently 28°F so give it about 10-15 minutes. ❄️→🔥"
```

### History Analysis
```
User: "How much did I spend on charging this month?"
→ Tool: get_charges({from_timestamp: "2026-02-01", to_timestamp: "2026-02-19"})
Assistant: "So far in February, you've had 8 charging sessions totaling 
           312 kWh. Based on your charging invoices, that's about $28.40 
           total — averaging $3.55 per session. Most of your charging 
           happened at home (6 sessions) vs. Superchargers (2 sessions).
           Your home charging is running about $0.07/kWh vs $0.12/kWh 
           at Superchargers."
```

### Sleepy Car
```
User: "Lock my car"
→ Tool: check_vehicle_awake() → "asleep"
→ Tool: wake_vehicle()
→ [polling 2s intervals... vehicle wakes after 8s]
→ Tool: lock_doors()
Assistant: "Done! Your car was sleeping so I woke it up first — 
           doors are now locked. 🔒"
```

---

## 15. Testing Strategy

### Unit Tests
- Tool definition validation (all required fields present, valid JSON Schema)
- Tessie API client methods (mock HTTP responses)
- Model router logic (correct model selected per query type)
- Session management (create, retrieve, expire)

### Integration Tests
- End-to-end tool loop with mocked Grok responses containing tool_calls
- Wake-on-command flow with simulated asleep vehicle
- Streaming SSE output validation
- Error handling for all failure scenarios

### Manual Testing Checklist
- [ ] "What's my battery?" → Returns real data
- [ ] "Lock the car" → Car actually locks
- [ ] "Warm it up to 72" → Climate starts, temp sets
- [ ] "Where's my car?" → Shows address + map link
- [ ] "Show me last week's drives" → Formatted drive list
- [ ] Command while car is asleep → Auto-wakes then executes
- [ ] Invalid command → Graceful error message
- [ ] Rapid-fire 10 messages → Rate limiter kicks in gracefully

---

## 16. Open Questions & Future Considerations

1. **Tessie API rate limits** — Need to verify Tessie's rate limit policy and build in backoff. Some endpoints may have stricter limits.

2. **Vehicle wake latency** — Tesla vehicles can take 10-30+ seconds to wake from deep sleep. Consider a "waking up your car..." progressive UI state.

3. **Command safety** — Should unlock/trunk commands require a second confirmation step? For v1, no — the user is already authenticated. For multi-user/productized version, yes.

4. **Grok tool call reliability** — Monitor function-calling accuracy in production. If Grok occasionally calls wrong tools, may need to add validation layer or switch to structured output mode.

5. **Offline/disconnected car** — Tesla vehicles in underground garages or remote areas may be unreachable. Need clear messaging and retry UX.

6. **xAI API availability** — Monitor for outages. Consider fallback to a different LLM provider (e.g., OpenRouter) if xAI has downtime.

7. **Voice input** — Web Speech API works well on Chrome/Safari. Worth adding in Phase 3 for true hands-free "talk to your car" experience.

---

## 17. References

- **Tessie API Docs:** https://developer.tessie.com/reference
- **xAI API Docs:** https://docs.x.ai/overview
- **xAI Function Calling Guide:** https://docs.x.ai/docs/guides/function-calling
- **xAI Tools Overview:** https://docs.x.ai/docs/guides/tools/overview
- **xAI Models & Pricing:** https://docs.x.ai/developers/models
- **Grok 4.1 Fast Announcement:** https://x.ai/news/grok-4-1-fast
- **OpenAI JS SDK (xAI-compatible):** https://www.npmjs.com/package/openai
- **Next.js Docs:** https://nextjs.org/docs
- **Vercel AI SDK xAI Provider:** https://ai-sdk.dev/providers/ai-sdk-providers/xai
