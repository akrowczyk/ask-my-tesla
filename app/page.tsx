"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import ChatThread from "@/components/ChatThread";
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

  // Stable ref for getKeyHeaders so transport doesn't recreate
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

  return (
    <main className="chat-container">
      <ChatThread
        messages={messages}
        isLoading={isLoading}
        voiceMessages={voiceAgent.voiceMessages}
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
