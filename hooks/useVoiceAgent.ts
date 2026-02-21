"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { voiceToolDefinitions } from "@/lib/voice-tools";
import { Personality, getVoicePersonalityPrompt } from "@/lib/personality";

export type VoiceName = "Rex" | "Ara" | "Sal" | "Eve" | "Leo";

export const VOICE_OPTIONS: { id: VoiceName; label: string; description: string }[] = [
    { id: "Rex", label: "Rex", description: "Confident & professional" },
    { id: "Ara", label: "Ara", description: "Warm & conversational" },
    { id: "Sal", label: "Sal", description: "Smooth & balanced" },
    { id: "Eve", label: "Eve", description: "Energetic & upbeat" },
    { id: "Leo", label: "Leo", description: "Authoritative & commanding" },
];

export type VoiceState =
    | "idle"
    | "connecting"
    | "listening"
    | "thinking"
    | "speaking"
    | "error";

export interface VoiceMessage {
    id: string;
    role: "user" | "assistant";
    text: string;
    toolCard?: { toolName: string; data: Record<string, unknown> };
}

const SAMPLE_RATE = 24000;
const WS_URL = "wss://api.x.ai/v1/realtime";

interface UseVoiceAgentReturn {
    state: VoiceState;
    transcript: string;
    voiceMessages: VoiceMessage[];
    connect: () => Promise<void>;
    disconnect: () => void;
    error: string | null;
    micMuted: boolean;
    speakerMuted: boolean;
    toggleMicMute: () => void;
    toggleSpeakerMute: () => void;
}

function buildSystemPrompt(personality: Personality = "assistant"): string {
    const now = new Date().toLocaleString("en-US", { timeZone: "America/Chicago" });
    const personalityPrompt = getVoicePersonalityPrompt(personality);
    const isSarcastic = personality === "sarcastic";

    return `${isSarcastic ? "IMPORTANT — You are a SARCASTIC assistant. Every reply must have wit and attitude.\n\n" : ""}You are "Ask My Tesla", an AI assistant that lets the user interact with their Tesla vehicle using natural language. You have access to the Tessie API through function tools.

PERSONALITY:
${personalityPrompt}

RULES:
1. Always use the appropriate tool to get real data — never fabricate vehicle stats.
2. For commands that change vehicle state, confirm the action AFTER executing it.
3. If the vehicle is asleep, call the wake tool first, wait briefly, then retry.
4. When reporting battery, include both percentage and estimated range.
5. If a command fails, explain why in plain language.
6. Keep responses concise — you're speaking, not writing a document.

Current date/time: ${now}${isSarcastic ? "\n\nREMINDER: Stay in character. Be sarcastic and witty in EVERY response. No boring answers." : ""}`;
}

let msgIdCounter = 0;
function nextMsgId() {
    return `voice-${Date.now()}-${++msgIdCounter}`;
}

export function useVoiceAgent(voice: VoiceName = "Rex", personality: Personality = "assistant", getKeyHeaders?: () => Record<string, string>): UseVoiceAgentReturn {
    const [state, setState] = useState<VoiceState>("idle");
    const [transcript, setTranscript] = useState("");
    const [voiceMessages, setVoiceMessages] = useState<VoiceMessage[]>([]);
    const [error, setError] = useState<string | null>(null);

    const [micMuted, setMicMuted] = useState(false);
    const [speakerMuted, setSpeakerMuted] = useState(false);
    const micMutedRef = useRef(false);
    const speakerMutedRef = useRef(false);

    const getKeyHeadersRef = useRef(getKeyHeaders);
    getKeyHeadersRef.current = getKeyHeaders;

    // Keep latest values in refs so `connect` always reads current state
    const voiceRef = useRef(voice);
    voiceRef.current = voice;
    const personalityRef = useRef(personality);
    personalityRef.current = personality;

    const wsRef = useRef<WebSocket | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const playbackContextRef = useRef<AudioContext | null>(null);
    const audioQueueRef = useRef<Float32Array[]>([]);
    const isPlayingRef = useRef(false);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const isSpeakingRef = useRef(false);
    const isConnectingRef = useRef(false);
    const responseActiveRef = useRef(false);
    const pendingToolCallsRef = useRef(0);
    const currentAssistantMsgIdRef = useRef<string | null>(null);

    // ─── Audio Playback ─────────────────────────────────────

    const playNextChunk = useCallback(() => {
        if (audioQueueRef.current.length === 0) {
            isPlayingRef.current = false;
            // Add a short cooldown before re-enabling mic
            // to let any trailing speaker audio die out
            setTimeout(() => {
                isSpeakingRef.current = false;
            }, 500);
            return;
        }

        isPlayingRef.current = true;
        const chunk = audioQueueRef.current.shift()!;

        const ctx = playbackContextRef.current;
        if (!ctx) return;

        const buffer = ctx.createBuffer(1, chunk.length, SAMPLE_RATE);
        buffer.getChannelData(0).set(chunk);

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.onended = () => playNextChunk();
        source.start();
    }, []);

    const enqueueAudio = useCallback(
        (base64Audio: string) => {
            if (speakerMutedRef.current) return;

            const binaryString = atob(base64Audio);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const int16 = new Int16Array(bytes.buffer);
            const float32 = new Float32Array(int16.length);
            for (let i = 0; i < int16.length; i++) {
                float32[i] = int16[i] / 32768.0;
            }

            audioQueueRef.current.push(float32);

            if (!isPlayingRef.current) {
                playNextChunk();
            }
        },
        [playNextChunk]
    );

    const toggleMicMute = useCallback(() => {
        const next = !micMutedRef.current;
        micMutedRef.current = next;
        setMicMuted(next);
        // Disable/enable the actual mic track so the hardware LED reflects state
        streamRef.current?.getAudioTracks().forEach((t) => {
            t.enabled = !next;
        });
    }, []);

    const toggleSpeakerMute = useCallback(() => {
        const next = !speakerMutedRef.current;
        speakerMutedRef.current = next;
        setSpeakerMuted(next);
        if (next) {
            audioQueueRef.current = [];
            isPlayingRef.current = false;
        }
    }, []);

    // ─── Tool Execution ─────────────────────────────────────

    const VISUAL_TOOLS = new Set(["get_location"]);

    const executeTool = useCallback(
        async (callId: string, name: string, argsJson: string) => {
            const ws = wsRef.current;
            if (!ws || ws.readyState !== WebSocket.OPEN) return;

            try {
                const args = argsJson ? JSON.parse(argsJson) : {};
                const res = await fetch("/api/tool-execute", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...(getKeyHeadersRef.current ? getKeyHeadersRef.current() : {}),
                    },
                    body: JSON.stringify({ tool_name: name, arguments: args }),
                });
                const result = await res.json();

                if (VISUAL_TOOLS.has(name) && !result.error) {
                    setVoiceMessages((prev) => [
                        ...prev,
                        {
                            id: nextMsgId(),
                            role: "assistant",
                            text: "",
                            toolCard: { toolName: name, data: result },
                        },
                    ]);
                }

                ws.send(
                    JSON.stringify({
                        type: "conversation.item.create",
                        item: {
                            type: "function_call_output",
                            call_id: callId,
                            output: JSON.stringify(result),
                        },
                    })
                );
            } catch (err) {
                console.error("Tool execution failed:", err);
                ws.send(
                    JSON.stringify({
                        type: "conversation.item.create",
                        item: {
                            type: "function_call_output",
                            call_id: callId,
                            output: JSON.stringify({
                                error: `Failed to execute ${name}: ${(err as Error).message}`,
                            }),
                        },
                    })
                );
            } finally {
                // Notify StatusBar to refresh
                window.dispatchEvent(new Event("vehicle-command-executed"));
                // Only send response.create when ALL pending tool calls are done
                pendingToolCallsRef.current--;
                if (pendingToolCallsRef.current <= 0) {
                    pendingToolCallsRef.current = 0;
                    ws.send(JSON.stringify({ type: "response.create" }));
                }
            }
        },
        []
    );

    // ─── WebSocket Message Handler ──────────────────────────

    const handleMessage = useCallback(
        (event: MessageEvent) => {
            const data = JSON.parse(event.data);

            switch (data.type) {
                case "session.updated":
                    console.log("[voice] session.updated:", JSON.stringify(data.session, null, 2));
                    setState("listening");
                    break;

                case "input_audio_buffer.speech_started": {
                    // User started speaking — stop any playing audio
                    // Let the server VAD handle turn detection naturally
                    // (don't send response.cancel — it causes the server
                    // to re-process the audio buffer and generate duplicates)
                    audioQueueRef.current = [];
                    isPlayingRef.current = false;
                    isSpeakingRef.current = false;

                    // Remove the partial assistant message if one was being streamed
                    if (currentAssistantMsgIdRef.current) {
                        const partialId = currentAssistantMsgIdRef.current;
                        setVoiceMessages((prev) => prev.filter((m) => m.id !== partialId));
                        currentAssistantMsgIdRef.current = null;
                    }

                    setState("listening");
                    setTranscript("");
                    break;
                }

                case "input_audio_buffer.speech_stopped":
                    setState("thinking");
                    responseActiveRef.current = true;
                    break;

                // User's speech transcribed
                case "conversation.item.input_audio_transcription.completed":
                    if (data.transcript) {
                        const userMsg: VoiceMessage = {
                            id: nextMsgId(),
                            role: "user",
                            text: data.transcript.trim(),
                        };
                        setVoiceMessages((prev) => [...prev, userMsg]);
                    }
                    break;

                case "response.output_audio_transcript.delta": {
                    const delta = data.delta || "";
                    setTranscript((prev) => prev + delta);

                    // Stream into the current assistant message
                    if (!currentAssistantMsgIdRef.current) {
                        // Create a new assistant message
                        const id = nextMsgId();
                        currentAssistantMsgIdRef.current = id;
                        setVoiceMessages((prev) => [
                            ...prev,
                            { id, role: "assistant", text: delta },
                        ]);
                    } else {
                        // Append to existing assistant message
                        const msgId = currentAssistantMsgIdRef.current;
                        setVoiceMessages((prev) =>
                            prev.map((m) =>
                                m.id === msgId
                                    ? { ...m, text: m.text + delta }
                                    : m
                            )
                        );
                    }
                    break;
                }

                case "response.output_audio_transcript.done":
                    // Transcript complete for this turn
                    break;

                case "response.output_audio.delta":
                    setState("speaking");
                    isSpeakingRef.current = true;
                    if (data.delta) {
                        enqueueAudio(data.delta);
                    }
                    break;

                case "response.output_audio.done":
                    break;

                case "response.done":
                    // Don't reset isSpeakingRef here — wait for audio
                    // playback to fully drain in playNextChunk
                    responseActiveRef.current = false;
                    currentAssistantMsgIdRef.current = null;
                    setState("listening");
                    setTranscript("");
                    break;

                case "response.function_call_arguments.done":
                    setState("thinking");
                    pendingToolCallsRef.current++;
                    executeTool(data.call_id, data.name, data.arguments);
                    break;

                case "error":
                    console.error("Voice Agent error:", data);
                    setError(data.error?.message || "Voice agent error");
                    setState("error");
                    break;
            }
        },
        [enqueueAudio, executeTool]
    );

    // ─── Connect ────────────────────────────────────────────

    const connect = useCallback(async () => {
        if (wsRef.current || isConnectingRef.current) return;
        isConnectingRef.current = true;

        setState("connecting");
        setError(null);
        setTranscript("");

        try {
            // 1. Get ephemeral token
            const tokenRes = await fetch("/api/voice-token", {
                method: "POST",
                headers: getKeyHeadersRef.current ? getKeyHeadersRef.current() : {},
            });
            if (!tokenRes.ok) {
                throw new Error("Failed to obtain voice session token");
            }
            const tokenData = await tokenRes.json();
            const token = tokenData.client_secret?.value ?? tokenData.value;
            if (!token) {
                throw new Error("Invalid token response");
            }

            // 2. Get mic access
            if (!navigator.mediaDevices?.getUserMedia) {
                throw new Error(
                    "Microphone access requires a secure connection (HTTPS). " +
                    "If you're on a local network, access this app via HTTPS."
                );
            }
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: SAMPLE_RATE,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                },
            });
            streamRef.current = stream;

            // 3. Connect WebSocket using ephemeral token
            const ws = new WebSocket(WS_URL, [
                `xai-client-secret.${token}`,
            ]);
            wsRef.current = ws;

            ws.onopen = async () => {
                console.log("[voice] personality:", personalityRef.current);
                const systemPrompt = buildSystemPrompt(personalityRef.current);
                console.log("[voice] instructions:", systemPrompt);

                const sessionConfig = {
                    type: "session.update",
                    session: {
                        voice: voiceRef.current,
                        instructions: systemPrompt,
                        turn_detection: {
                            type: "server_vad",
                            silence_duration_ms: 800,
                            eagerness: "low",
                        },
                        input_audio_transcription: { model: "grok-2-latest" },
                        audio: {
                            input: {
                                format: { type: "audio/pcm", rate: SAMPLE_RATE },
                            },
                            output: {
                                format: { type: "audio/pcm", rate: SAMPLE_RATE },
                            },
                        },
                        tools: voiceToolDefinitions,
                    },
                };
                ws.send(JSON.stringify(sessionConfig));

                // 4. Set up audio capture
                const audioCtx = new AudioContext({ sampleRate: SAMPLE_RATE });
                audioContextRef.current = audioCtx;

                const source = audioCtx.createMediaStreamSource(stream);

                const processor = audioCtx.createScriptProcessor(4096, 1, 1);
                processorRef.current = processor;

                processor.onaudioprocess = (e: AudioProcessingEvent) => {
                    if (
                        ws.readyState !== WebSocket.OPEN ||
                        isSpeakingRef.current ||
                        micMutedRef.current
                    )
                        return;

                    const inputData = e.inputBuffer.getChannelData(0);
                    const int16 = new Int16Array(inputData.length);
                    for (let i = 0; i < inputData.length; i++) {
                        const s = Math.max(-1, Math.min(1, inputData[i]));
                        int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
                    }

                    const bytes = new Uint8Array(int16.buffer);
                    let binary = "";
                    for (let i = 0; i < bytes.length; i++) {
                        binary += String.fromCharCode(bytes[i]);
                    }
                    const base64 = btoa(binary);

                    ws.send(
                        JSON.stringify({
                            type: "input_audio_buffer.append",
                            audio: base64,
                        })
                    );
                };

                source.connect(processor);
                processor.connect(audioCtx.destination);

                // 5. Set up playback context
                playbackContextRef.current = new AudioContext({
                    sampleRate: SAMPLE_RATE,
                });
            };

            ws.onmessage = handleMessage;

            ws.onerror = (e) => {
                console.error("WebSocket error:", e);
                setError("Connection error");
                setState("error");
            };

            ws.onclose = () => {
                console.log("Voice WebSocket closed");
                setState("idle");
                wsRef.current = null;
            };
        } catch (err) {
            console.error("Voice connect failed:", err);
            setError((err as Error).message || "Failed to connect");
            setState("error");
            isConnectingRef.current = false;
            streamRef.current?.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }
    }, [handleMessage]);

    // ─── Disconnect ─────────────────────────────────────────

    const disconnect = useCallback(() => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        processorRef.current?.disconnect();
        processorRef.current = null;

        audioContextRef.current?.close();
        audioContextRef.current = null;
        playbackContextRef.current?.close();
        playbackContextRef.current = null;

        audioQueueRef.current = [];
        isPlayingRef.current = false;
        isSpeakingRef.current = false;
        isConnectingRef.current = false;
        currentAssistantMsgIdRef.current = null;
        micMutedRef.current = false;
        speakerMutedRef.current = false;
        setMicMuted(false);
        setSpeakerMuted(false);

        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        setState("idle");
        setTranscript("");
        setError(null);
    }, []);

    // Reconnect when voice or personality changes mid-session
    const prevVoiceRef = useRef(voice);
    const prevPersonalityRef = useRef(personality);
    useEffect(() => {
        const voiceChanged = prevVoiceRef.current !== voice;
        const personalityChanged = prevPersonalityRef.current !== personality;
        prevVoiceRef.current = voice;
        prevPersonalityRef.current = personality;
        if ((voiceChanged || personalityChanged) && wsRef.current) {
            disconnect();
            const timer = setTimeout(() => connect(), 200);
            return () => clearTimeout(timer);
        }
    }, [voice, personality, disconnect, connect]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            disconnect();
        };
    }, [disconnect]);

    return { state, transcript, voiceMessages, connect, disconnect, error, micMuted, speakerMuted, toggleMicMute, toggleSpeakerMute };
}
