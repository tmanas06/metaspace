"use client";

import { useState, useRef, FormEvent } from "react";

// TODO: Wire to POST ${NEXT_PUBLIC_API_URL}/chat once the chat endpoint
//       is implemented on the server. Currently disabled with a visible
//       "Chat coming soon" notice — does NOT silently do nothing.

interface ChatMessage {
  id: string;
  username: string;
  text: string;
  timestamp: Date;
  local?: boolean;
}

interface ChatPanelProps {
  username: string;
  disabled?: boolean;
}

const CHAT_ENABLED = false; // Flip to true once /chat endpoint is ready

export function ChatPanel({ username, disabled }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !CHAT_ENABLED || disabled) return;

    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      username,
      text: input.trim(),
      timestamp: new Date(),
      local: true,
    };

    setMessages((prev) => [...prev, msg]);
    setInput("");
    setSending(true);

    try {
      // TODO: implement once /chat exists
      await fetch(`${apiUrl}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: msg.text }),
        credentials: "include",
      });
    } catch (err) {
      console.warn("[Chat] Send failed:", err);
    } finally {
      setSending(false);
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  };

  return (
    <div
      id="chat-panel"
      className="flex flex-col w-72 rounded-xl overflow-hidden
                 bg-black/60 backdrop-blur-md border border-white/10"
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
        <span className="text-white text-xs font-semibold uppercase tracking-widest">
          Chat
        </span>
        {!CHAT_ENABLED && (
          <span className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full">
            Coming soon
          </span>
        )}
      </div>

      {/* Message list */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-2 space-y-1.5 min-h-[120px] max-h-[200px]"
      >
        {messages.length === 0 ? (
          <p className="text-zinc-600 text-xs text-center mt-4">
            {CHAT_ENABLED
              ? "No messages yet"
              : "Chat will be available once the server endpoint is live."}
          </p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`text-xs ${m.local ? "text-right" : ""}`}>
              <span className="text-zinc-400 mr-1">{m.username}:</span>
              <span className="text-white">{m.text}</span>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="flex gap-1 p-2 border-t border-white/10">
        <input
          id="chat-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={!CHAT_ENABLED || disabled || sending}
          placeholder={CHAT_ENABLED ? "Send a message…" : "Chat coming soon"}
          className="flex-1 bg-white/5 text-white text-xs rounded-lg px-2 py-1.5
                     placeholder:text-zinc-600 border border-white/10
                     focus:outline-none focus:ring-1 focus:ring-indigo-500
                     disabled:opacity-40 disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          id="chat-send-btn"
          disabled={!CHAT_ENABLED || disabled || !input.trim() || sending}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40
                     disabled:cursor-not-allowed text-white text-xs px-2 py-1.5
                     rounded-lg transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
}
