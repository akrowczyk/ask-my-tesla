"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import ChatThread from "@/components/ChatThread";
import type { TimelineEntry } from "@/components/ChatThread";
import MessageInput from "@/components/MessageInput";
import QuickActions from "@/components/QuickActions";
import { useVoiceAgent, VoiceName } from "@/hooks/useVoiceAgent";
import { Personality } from "@/lib/personality";
import { useKeys } from "@/lib/keys";

export default function Home() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [voiceActive, setVoiceActive] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<VoiceName>("Rex");
  const [personality, setPersonality] = useState<Personality>("assistant");
  const { getKeyHeaders, mapsKey: userMapsKey } = useKeys();
  const mapsKey = userMapsKey || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  useEffect(() => {
    const storedVoice = localStorage.getItem("voice") as VoiceName | null;
    if (storedVoice) setSelectedVoice(storedVoice);
    const storedPersonality = localStorage.getItem("personality") as Personality | null;
    if (storedPersonality) setPersonality(storedPersonality);

    const onPersonalityChanged = (e: Event) => {
      setPersonality((e as CustomEvent).detail as Personality);
    };
    window.addEventListener("personality-changed", onPersonalityChanged);
    return () => window.removeEventListener("personality-changed", onPersonalityChanged);
  }, []);

  const handleVoiceChange = useCallback((v: VoiceName) => {
    setSelectedVoice(v);
    localStorage.setItem("voice", v);
  }, []);

  const handlePersonalityChange = useCallback((p: Personality) => {
    setPersonality(p);
    localStorage.setItem("personality", p);
  }, []);

  const voiceAgent = useVoiceAgent(selectedVoice, personality, getKeyHeaders);

  const keyHeadersRef = useRef(getKeyHeaders);
  keyHeadersRef.current = getKeyHeaders;

  useEffect(() => {
    const initSession = async () => {
      try {
        const res = await fetch("/api/session", {
          method: "POST",
          headers: keyHeadersRef.current(),
        });
        const data = await res.json();
        setSessionId(data.sessionId);
      } catch {
        // Session creation failed — chat will still work, just without persistence
      }
    };
    initSession();
  }, []);

  const personalityRef = useRef(personality);
  personalityRef.current = personality;
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        headers: () => keyHeadersRef.current(),
        body: () => ({ sessionId: sessionIdRef.current, personality: personalityRef.current }),
      }),
    []
  );

  const {
    messages,
    status,
    sendMessage,
    error,
  } = useChat({
    transport,
  });

  const isLoading = status === "streaming" || status === "submitted";

  useEffect(() => {
    if (status === "ready" && messages.length > 0) {
      window.dispatchEvent(new Event("vehicle-command-executed"));
    }
  }, [status, messages.length]);

  const handleSend = useCallback(
    (message: string) => {
      sendMessage({ text: message });
    },
    [sendMessage]
  );

  // ─── Unified Timeline ──────────────────────────────────────
  // Track which chat message IDs we've already added to the timeline
  // so new chat messages are appended at the correct position relative
  // to voice messages (instead of always rendering above them).

  const timelineRef = useRef<TimelineEntry[]>([]);
  const knownChatIdsRef = useRef(new Set<string>());
  const knownVoiceIdsRef = useRef(new Set<string>());

  const timeline = useMemo(() => {
    const tl = [...timelineRef.current];

    // Append any new chat messages
    for (const m of messages) {
      if (!knownChatIdsRef.current.has(m.id)) {
        knownChatIdsRef.current.add(m.id);
        tl.push({ kind: "chat", message: m });
      }
    }

    // Append any new voice messages
    for (const vm of voiceAgent.voiceMessages) {
      if (!knownVoiceIdsRef.current.has(vm.id)) {
        knownVoiceIdsRef.current.add(vm.id);
        tl.push({ kind: "voice", message: vm });
      }
    }

    // Update existing entries with latest state (streaming content)
    for (let i = 0; i < tl.length; i++) {
      if (tl[i].kind === "chat") {
        const fresh = messages.find((m) => m.id === tl[i].message.id);
        if (fresh) tl[i] = { kind: "chat", message: fresh };
      } else {
        const fresh = voiceAgent.voiceMessages.find((m) => m.id === tl[i].message.id);
        if (fresh) tl[i] = { kind: "voice", message: fresh };
      }
    }

    // Remove chat entries that no longer exist (e.g. if chat was reset)
    const currentChatIds = new Set(messages.map((m) => m.id));
    const currentVoiceIds = new Set(voiceAgent.voiceMessages.map((m) => m.id));
    const filtered = tl.filter((entry) => {
      if (entry.kind === "chat") return currentChatIds.has(entry.message.id);
      return currentVoiceIds.has(entry.message.id);
    });

    // Sync known IDs with what actually remains
    knownChatIdsRef.current = new Set(messages.map((m) => m.id));
    knownVoiceIdsRef.current = new Set(voiceAgent.voiceMessages.map((m) => m.id));

    timelineRef.current = filtered;
    return filtered;
  }, [messages, voiceAgent.voiceMessages]);

  const lastChatRole = messages.length > 0 ? messages[messages.length - 1].role : undefined;

  return (
    <main className="chat-container">
      <ChatThread
        timeline={timeline}
        isLoading={isLoading}
        lastChatRole={lastChatRole}
        voiceState={voiceActive ? voiceAgent.state : "idle"}
        mapsKey={mapsKey}
      />

      {error && (
        <div className="error-banner">
          <span>⚠️</span>
          <span>{error.message || "Something went wrong. Please try again."}</span>
        </div>
      )}

      <div className="chat-footer">
        <QuickActions onAction={handleSend} disabled={isLoading} />
        <MessageInput
          onSend={handleSend}
          disabled={isLoading}
          voiceAgent={voiceAgent}
          voiceActive={voiceActive}
          setVoiceActive={setVoiceActive}
          selectedVoice={selectedVoice}
          onVoiceChange={handleVoiceChange}
        />
      </div>
    </main>
  );
}
