"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import { colyseusManager } from "@/lib/colyseus";

export interface ChatMessage {
  id: string;
  username: string;
  text: string;
  timestamp: Date;
  local?: boolean;
}

interface ChatPanelProps {
  username: string;
  disabled?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

export function ChatPanel({ username, disabled, isOpen = true, onClose }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      username: "System",
      text: "Welcome to VirtualVerse! Type a message below to chat with others in this space.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Subscribe to real-time chat messages from Colyseus server
  useEffect(() => {
    const unsub = colyseusManager.onChatMessage((msg) => {
      setMessages((prev) => [...prev, msg]);
    });
    return unsub;
  }, []);

  // Auto-scroll on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, collapsed]);

  const sendMessage = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || disabled) return;

    const text = input.trim();

    const localMsg: ChatMessage = {
      id: crypto.randomUUID(),
      username: username || "You",
      text,
      timestamp: new Date(),
      local: true,
    };

    setMessages((prev) => [...prev, localMsg]);
    setInput("");

    // Broadcast to Colyseus room if connected
    colyseusManager.sendChatMessage(text);
  };

  if (!isOpen) return null;

  if (collapsed) {
    return (
      <button
        id="chat-toggle-btn"
        onClick={() => setCollapsed(false)}
        style={{
          background: "rgba(15, 23, 42, 0.95)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          backdropFilter: "blur(12px)",
          borderRadius: 14,
          padding: "8px 14px",
          color: "#fff",
          fontSize: 12,
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: 8,
          cursor: "pointer",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          transition: "transform 0.15s ease, background 0.15s ease",
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.transform = "scale(1.03)")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.transform = "scale(1)")}
        title="Expand Chat"
      >
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#818cf8" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <span>Chat</span>
        {messages.length > 1 && (
          <span
            style={{
              background: "#6366f1",
              color: "#fff",
              fontSize: 10,
              borderRadius: 10,
              padding: "1px 6px",
            }}
          >
            {messages.length - 1}
          </span>
        )}
      </button>
    );
  }

  return (
    <div
      id="chat-panel"
      style={{
        width: 300,
        borderRadius: 16,
        background: "rgba(15, 23, 42, 0.95)",
        border: "1px solid rgba(255, 255, 255, 0.12)",
        backdropFilter: "blur(16px)",
        boxShadow: "0 12px 36px rgba(0,0,0,0.5)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(255, 255, 255, 0.02)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#818cf8" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span style={{ color: "#fff", fontSize: 13, fontWeight: 700, letterSpacing: "-0.2px" }}>
            Room Chat
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {/* Minimize button */}
          <button
            onClick={() => setCollapsed(true)}
            style={{
              background: "none",
              border: "none",
              color: "rgba(255,255,255,0.4)",
              cursor: "pointer",
              padding: 4,
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
            }}
            title="Minimize Chat"
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                color: "rgba(255,255,255,0.4)",
                cursor: "pointer",
                padding: 4,
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
              }}
              title="Close Chat"
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Message list */}
      <div
        ref={scrollRef}
        style={{
          height: 180,
          overflowY: "auto",
          padding: "10px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {messages.map((m) => {
          const isSystem = m.username === "System";
          const isMe = m.local || m.username === username;

          if (isSystem) {
            return (
              <div
                key={m.id}
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.5)",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 8,
                  padding: "6px 10px",
                  lineHeight: "1.4",
                  textAlign: "center",
                }}
              >
                {m.text}
              </div>
            );
          }

          return (
            <div
              key={m.id}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: isMe ? "flex-end" : "flex-start",
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  color: isMe ? "#a5b4fc" : "rgba(255,255,255,0.4)",
                  marginBottom: 2,
                  fontWeight: 600,
                  paddingLeft: 2,
                  paddingRight: 2,
                }}
              >
                {m.username}
              </span>
              <div
                style={{
                  maxWidth: "85%",
                  padding: "7px 11px",
                  borderRadius: isMe ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                  background: isMe ? "linear-gradient(135deg, #4f46e5, #6366f1)" : "rgba(255,255,255,0.08)",
                  color: "#fff",
                  fontSize: 12,
                  lineHeight: "1.4",
                  wordBreak: "break-word",
                  boxShadow: isMe ? "0 2px 8px rgba(99,102,241,0.25)" : "none",
                }}
              >
                {m.text}
              </div>
            </div>
          );
        })}
      </div>

      {/* Input Form */}
      <form
        onSubmit={sendMessage}
        style={{
          padding: 8,
          borderTop: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          gap: 6,
          background: "rgba(0,0,0,0.2)",
        }}
      >
        <input
          id="chat-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={disabled}
          placeholder="Send a message…"
          style={{
            flex: 1,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10,
            color: "#fff",
            fontSize: 12,
            padding: "8px 12px",
            outline: "none",
            fontFamily: "inherit",
          }}
        />
        <button
          type="submit"
          id="chat-send-btn"
          disabled={disabled || !input.trim()}
          style={{
            background: input.trim() ? "#6366f1" : "rgba(255,255,255,0.08)",
            color: input.trim() ? "#fff" : "rgba(255,255,255,0.3)",
            border: "none",
            borderRadius: 10,
            padding: "0 14px",
            fontSize: 12,
            fontWeight: 600,
            cursor: input.trim() ? "pointer" : "default",
            transition: "background 0.15s ease",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          Send
        </button>
      </form>
    </div>
  );
}
