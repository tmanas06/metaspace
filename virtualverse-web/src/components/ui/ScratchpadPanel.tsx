"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  pinned?: boolean;
}

interface ScratchpadPanelProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  mode?: "scratchpad" | "notes";
}

const STORAGE_KEY = "vv_session_notes";

function loadNotes(): Note[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveNotes(notes: Note[]) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch {}
}

function newNote(title = "Untitled Note"): Note {
  const now = Date.now();
  return { id: crypto.randomUUID(), title, content: "", createdAt: now, updatedAt: now };
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function ScratchpadPanel({ isOpen, onClose, username, mode = "notes" }: ScratchpadPanelProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tab, setTab] = useState<"scratchpad" | "notes">(mode);
  // Scratchpad state
  const [scratchText, setScratchText] = useState("");
  const scratchRef = useRef<HTMLTextAreaElement>(null);
  // Dragging
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 80, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [size, setSize] = useState({ w: 440, h: 560 });

  // Load notes on mount
  useEffect(() => {
    const loaded = loadNotes();
    setNotes(loaded);
    if (loaded.length > 0) setActiveId(loaded[0].id);
  }, []);

  // Load scratchpad from session
  useEffect(() => {
    const raw = sessionStorage.getItem("vv_scratchpad") || "";
    setScratchText(raw);
  }, []);

  const saveScratch = useCallback((text: string) => {
    sessionStorage.setItem("vv_scratchpad", text);
  }, []);

  const activeNote = notes.find((n) => n.id === activeId) ?? null;

  const updateNote = (id: string, patch: Partial<Note>) => {
    setNotes((prev) => {
      const next = prev.map((n) => n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n);
      saveNotes(next);
      return next;
    });
  };

  const addNote = () => {
    const n = newNote();
    setNotes((prev) => {
      const next = [n, ...prev];
      saveNotes(next);
      return next;
    });
    setActiveId(n.id);
    setTab("notes");
  };

  const deleteNote = (id: string) => {
    setNotes((prev) => {
      const next = prev.filter((n) => n.id !== id);
      saveNotes(next);
      if (activeId === id) setActiveId(next[0]?.id ?? null);
      return next;
    });
  };

  const downloadNotes = () => {
    const content = notes.map((n) =>
      `# ${n.title}\n_Created: ${new Date(n.createdAt).toLocaleString()}_\n\n${n.content}`
    ).join("\n\n---\n\n");
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `session-notes-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadScratch = () => {
    const blob = new Blob([scratchText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scratchpad-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Dragging logic
  const onMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button,textarea,input")) return;
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      setPos({
        x: Math.max(0, dragRef.current.origX + e.clientX - dragRef.current.startX),
        y: Math.max(0, dragRef.current.origY + e.clientY - dragRef.current.startY),
      });
    };
    const onUp = () => { setIsDragging(false); dragRef.current = null; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [isDragging]);

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      id="scratchpad-panel"
      style={{
        position: "fixed",
        top: pos.y,
        left: pos.x,
        width: size.w,
        maxWidth: "calc(100vw - 32px)",
        height: size.h,
        maxHeight: "calc(100vh - 80px)",
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        background: "rgba(8, 15, 22, 0.97)",
        border: "1px solid rgba(99, 102, 241, 0.3)",
        borderRadius: 16,
        boxShadow: "0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.1)",
        backdropFilter: "blur(24px)",
        overflow: "hidden",
        cursor: isDragging ? "grabbing" : "default",
      }}
    >
      {/* Header */}
      <div
        onMouseDown={onMouseDown}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 14px",
          background: "rgba(15,23,42,0.8)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          cursor: isDragging ? "grabbing" : "grab",
          userSelect: "none",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
          <span style={{ fontSize: 16 }}>📝</span>
          <span style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 13 }}>
            {tab === "scratchpad" ? "Scratchpad" : "Session Notes"}
          </span>
          <span style={{
            fontSize: 10, color: "rgba(148,163,184,0.6)", background: "rgba(255,255,255,0.04)",
            padding: "1px 7px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)",
          }}>
            {username}
          </span>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 2, background: "rgba(0,0,0,0.3)", borderRadius: 8, padding: 2 }}>
          {(["scratchpad", "notes"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background: tab === t ? "rgba(99,102,241,0.3)" : "transparent",
                border: tab === t ? "1px solid rgba(99,102,241,0.4)" : "1px solid transparent",
                color: tab === t ? "#a5b4fc" : "rgba(148,163,184,0.6)",
                fontSize: 10, fontWeight: 600, padding: "3px 9px", borderRadius: 6,
                cursor: "pointer", textTransform: "capitalize", transition: "all 0.15s",
              }}
            >
              {t === "scratchpad" ? "🖊 Scratch" : "🗒 Notes"}
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          style={{
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)",
            color: "#f87171", borderRadius: 8, width: 26, height: 26,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", fontSize: 14, transition: "all 0.15s",
          }}
        >
          ✕
        </button>
      </div>

      {/* Body */}
      {tab === "scratchpad" ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{
            display: "flex", gap: 6, padding: "8px 12px",
            borderBottom: "1px solid rgba(255,255,255,0.05)", flexShrink: 0,
          }}>
            <span style={{ color: "rgba(148,163,184,0.5)", fontSize: 11 }}>
              Quick scratch space — persists for session
            </span>
            <div style={{ flex: 1 }} />
            <button
              onClick={() => { setScratchText(""); saveScratch(""); }}
              style={{
                background: "transparent", border: "1px solid rgba(239,68,68,0.2)",
                color: "#f87171", fontSize: 10, padding: "2px 8px", borderRadius: 6,
                cursor: "pointer",
              }}
            >
              Clear
            </button>
            <button
              onClick={downloadScratch}
              style={{
                background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)",
                color: "#a5b4fc", fontSize: 10, padding: "2px 8px", borderRadius: 6,
                cursor: "pointer",
              }}
            >
              ↓ Export
            </button>
          </div>
          <textarea
            ref={scratchRef}
            value={scratchText}
            onChange={(e) => { setScratchText(e.target.value); saveScratch(e.target.value); }}
            placeholder={"Jot anything here...\n• Ideas, action items, links\n• Auto-saved to session storage"}
            style={{
              flex: 1, resize: "none", background: "transparent",
              color: "#e2e8f0", fontSize: 13, lineHeight: 1.7,
              padding: "14px 16px", border: "none", outline: "none",
              fontFamily: "'SF Mono', 'Fira Code', monospace",
            }}
          />
          <div style={{
            padding: "6px 14px", borderTop: "1px solid rgba(255,255,255,0.04)",
            display: "flex", justifyContent: "flex-end",
          }}>
            <span style={{ color: "rgba(148,163,184,0.4)", fontSize: 10 }}>
              {scratchText.length} chars · {scratchText.split(/\s+/).filter(Boolean).length} words
            </span>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* Notes list sidebar */}
          <div style={{
            width: 160, borderRight: "1px solid rgba(255,255,255,0.06)",
            display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0,
          }}>
            <div style={{
              padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,0.05)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <span style={{ color: "rgba(148,163,184,0.6)", fontSize: 10, fontWeight: 600 }}>
                {notes.length} note{notes.length !== 1 ? "s" : ""}
              </span>
              <button
                onClick={addNote}
                title="New Note"
                style={{
                  background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.4)",
                  color: "#a5b4fc", fontSize: 16, width: 22, height: 22, borderRadius: 6,
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  lineHeight: 1,
                }}
              >
                +
              </button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "6px 0" }}>
              {notes.length === 0 && (
                <div style={{ padding: "12px 10px", color: "rgba(148,163,184,0.4)", fontSize: 11, textAlign: "center" }}>
                  No notes yet.<br />Click + to create one.
                </div>
              )}
              {notes.map((n) => (
                <button
                  key={n.id}
                  onClick={() => setActiveId(n.id)}
                  style={{
                    width: "100%", textAlign: "left", background: activeId === n.id
                      ? "rgba(99,102,241,0.15)" : "transparent",
                    border: "none", borderLeft: activeId === n.id
                      ? "2px solid #6366f1" : "2px solid transparent",
                    padding: "8px 10px", cursor: "pointer", transition: "all 0.12s",
                  }}
                >
                  <div style={{
                    color: activeId === n.id ? "#e2e8f0" : "rgba(148,163,184,0.8)",
                    fontSize: 11, fontWeight: 600,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {n.title || "Untitled"}
                  </div>
                  <div style={{ color: "rgba(148,163,184,0.4)", fontSize: 9, marginTop: 2 }}>
                    {formatTime(n.updatedAt)}
                  </div>
                  {n.content && (
                    <div style={{
                      color: "rgba(148,163,184,0.4)", fontSize: 10, marginTop: 3,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {n.content.slice(0, 40)}
                    </div>
                  )}
                </button>
              ))}
            </div>
            <div style={{ padding: "8px 10px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <button
                onClick={downloadNotes}
                style={{
                  width: "100%", background: "rgba(99,102,241,0.12)",
                  border: "1px solid rgba(99,102,241,0.25)", color: "#a5b4fc",
                  fontSize: 10, padding: "5px 0", borderRadius: 6, cursor: "pointer",
                }}
              >
                ↓ Export All
              </button>
            </div>
          </div>

          {/* Note editor */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {activeNote ? (
              <>
                <div style={{
                  padding: "8px 14px", borderBottom: "1px solid rgba(255,255,255,0.05)",
                  display: "flex", alignItems: "center", gap: 8, flexShrink: 0,
                }}>
                  <input
                    value={activeNote.title}
                    onChange={(e) => updateNote(activeNote.id, { title: e.target.value })}
                    style={{
                      flex: 1, background: "transparent", border: "none", outline: "none",
                      color: "#e2e8f0", fontSize: 13, fontWeight: 700,
                    }}
                    placeholder="Note title..."
                  />
                  <button
                    onClick={() => deleteNote(activeNote.id)}
                    title="Delete note"
                    style={{
                      background: "transparent", border: "1px solid rgba(239,68,68,0.2)",
                      color: "#f87171", fontSize: 10, padding: "2px 8px", borderRadius: 6,
                      cursor: "pointer",
                    }}
                  >
                    Delete
                  </button>
                </div>
                <textarea
                  value={activeNote.content}
                  onChange={(e) => updateNote(activeNote.id, { content: e.target.value })}
                  placeholder={"Write your session notes here...\n\nSupports plain text with markdown-style formatting."}
                  style={{
                    flex: 1, resize: "none", background: "transparent",
                    color: "#cbd5e1", fontSize: 12.5, lineHeight: 1.75,
                    padding: "14px 16px", border: "none", outline: "none",
                    fontFamily: "inherit",
                  }}
                />
                <div style={{
                  padding: "5px 14px", borderTop: "1px solid rgba(255,255,255,0.04)",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <span style={{ color: "rgba(148,163,184,0.35)", fontSize: 10 }}>
                    Updated {formatTime(activeNote.updatedAt)}
                  </span>
                  <span style={{ color: "rgba(148,163,184,0.35)", fontSize: 10 }}>
                    {activeNote.content.length} chars
                  </span>
                </div>
              </>
            ) : (
              <div style={{
                flex: 1, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 12,
                color: "rgba(148,163,184,0.4)",
              }}>
                <span style={{ fontSize: 36 }}>📒</span>
                <span style={{ fontSize: 12 }}>No note selected</span>
                <button
                  onClick={addNote}
                  style={{
                    background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.4)",
                    color: "#a5b4fc", fontSize: 12, padding: "7px 16px", borderRadius: 8,
                    cursor: "pointer",
                  }}
                >
                  + New Note
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
