"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { colyseusManager, DocShareMessage } from "@/lib/colyseus";
import { usePlayers, PlayerEntry } from "@/hooks/usePlayers";

interface DocSharePanelProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
}

interface SharedDocItem extends DocShareMessage {
  read?: boolean;
}

const STORAGE_KEY = "metaspace_shared_docs";
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB limit for WebSockets

export function DocSharePanel({ isOpen, onClose, username }: DocSharePanelProps) {
  const players = usePlayers(username);
  const [docs, setDocs] = useState<SharedDocItem[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "received" | "sent">("all");
  
  // Upload form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [shareTarget, setShareTarget] = useState<"everyone" | string>("everyone");
  const [shareMessage, setShareMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // Preview modal state
  const [previewDoc, setPreviewDoc] = useState<SharedDocItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load from sessionStorage on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setDocs(
          parsed.map((d: any) => ({
            ...d,
            timestamp: new Date(d.timestamp),
          }))
        );
      }
    } catch {
      // ignore JSON parse errors
    }
  }, []);

  // Sync to sessionStorage whenever docs state updates
  const updateDocs = useCallback((updater: (prev: SharedDocItem[]) => SharedDocItem[]) => {
    setDocs((prev) => {
      const updated = updater(prev);
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updated.slice(0, 50)));
      } catch {
        // ignore storage quota errors
      }
      return updated;
    });
  }, []);

  // Listen for incoming shared documents via Colyseus
  useEffect(() => {
    const unsub = colyseusManager.onDocShare((doc) => {
      updateDocs((prev) => {
        if (prev.some((d: SharedDocItem) => d.id === doc.id)) return prev;
        return [doc, ...prev];
      });
    });
    return unsub;
  }, [updateDocs]);

  // Filter other players for target selector
  const otherPlayers = players.filter((p: PlayerEntry) => !p.isLocal);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrorMsg(`File too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Max limit is 5MB.`);
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  };

  // Convert file to Base64 and send
  const handleShareSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMsg("Please select a file to share.");
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Extract pure base64 payload after data URL prefix
          const base64 = result.includes(",") ? result.split(",")[1] : result;
          resolve(base64);
        };
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(selectedFile);
      });

      const colyseusState = colyseusManager.getState();
      const mySessionId = colyseusState.sessionId || "local";

      let toSessionId: string | undefined = undefined;
      let toUsername: string | undefined = undefined;

      if (shareTarget !== "everyone") {
        const targetPlayer = players.find((p) => p.sessionId === shareTarget);
        if (targetPlayer) {
          toSessionId = targetPlayer.sessionId;
          toUsername = targetPlayer.username;
        }
      }

      const docPayload: Omit<DocShareMessage, "id" | "timestamp"> = {
        fromUsername: username || "Anonymous",
        fromSessionId: mySessionId,
        toSessionId,
        toUsername,
        fileName: selectedFile.name,
        fileType: selectedFile.type || "application/octet-stream",
        fileSizeBytes: selectedFile.size,
        dataBase64: base64Data,
        message: shareMessage.trim() || undefined,
      };

      colyseusManager.sendDocShare(docPayload);

      setSuccessMsg(`"${selectedFile.name}" shared successfully with ${toUsername ? toUsername : "Everyone"}!`);
      setSelectedFile(null);
      setShareMessage("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to process file for sharing.");
    } finally {
      setIsUploading(false);
    }
  };

  // Download helper
  const handleDownload = (doc: DocShareMessage) => {
    try {
      const mime = doc.fileType || "application/octet-stream";
      const dataUrl = `data:${mime};base64,${doc.dataBase64}`;
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = doc.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("Download failed:", err);
    }
  };

  if (!isOpen) return null;

  // Filter docs according to active tab
  const colyseusState = colyseusManager.getState();
  const mySessionId = colyseusState.sessionId;

  const filteredDocs = docs.filter((d) => {
    const isSentByMe = d.fromUsername === username || (mySessionId && d.fromSessionId === mySessionId);
    if (activeTab === "received") return !isSentByMe;
    if (activeTab === "sent") return isSentByMe;
    return true;
  });

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(8px)",
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "680px",
          maxHeight: "88vh",
          backgroundColor: "#0f172a",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "16px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          color: "#f8fafc",
          fontFamily: "sans-serif",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "linear-gradient(180deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.8) 100%)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                backgroundColor: "rgba(59, 130, 246, 0.2)",
                border: "1px solid rgba(59, 130, 246, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
              }}
            >
              📁
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#ffffff" }}>
                Document Sharing
              </h2>
              <p style={{ margin: 0, fontSize: "12px", color: "#94a3b8" }}>
                Share files, specs, and resources with everyone or specific players
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#94a3b8",
              fontSize: "20px",
              cursor: "pointer",
              padding: "4px 8px",
              borderRadius: "6px",
              lineHeight: 1,
            }}
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
          {/* Share Form Section */}
          <form
            onSubmit={handleShareSubmit}
            style={{
              backgroundColor: "rgba(30, 41, 59, 0.5)",
              border: "1px dashed rgba(59, 130, 246, 0.4)",
              borderRadius: "12px",
              padding: "16px",
              marginBottom: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "13px", fontWeight: "600", color: "#60a5fa", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                📤 Share a Document
              </span>
              <span style={{ fontSize: "11px", color: "#64748b" }}>Max file size: 5 MB</span>
            </div>

            {/* Drag & Drop File Input */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                id="doc-share-file-input"
                style={{ display: "none" }}
                onChange={handleFileChange}
              />
              <label
                htmlFor="doc-share-file-input"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "18px",
                  borderRadius: "8px",
                  backgroundColor: selectedFile ? "rgba(34, 197, 94, 0.1)" : "rgba(15, 23, 42, 0.6)",
                  border: selectedFile ? "1px solid rgba(34, 197, 94, 0.4)" : "1px dashed rgba(148, 163, 184, 0.3)",
                  cursor: "pointer",
                  textAlign: "center",
                  transition: "all 0.2s ease",
                }}
              >
                {selectedFile ? (
                  <>
                    <span style={{ fontSize: "24px", marginBottom: "4px" }}>
                      {getFileIcon(selectedFile.name, selectedFile.type)}
                    </span>
                    <span style={{ fontSize: "14px", fontWeight: "600", color: "#4ade80" }}>
                      {selectedFile.name}
                    </span>
                    <span style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>
                      {(selectedFile.size / 1024).toFixed(1)} KB — Click to change file
                    </span>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: "24px", marginBottom: "4px" }}>📎</span>
                    <span style={{ fontSize: "13px", color: "#cbd5e1" }}>
                      Click to choose a file or drag & drop here
                    </span>
                    <span style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                      Supports PDF, images, docs, code, text, spreadsheets & zip files
                    </span>
                  </>
                )}
              </label>
            </div>

            {/* Target & Note Row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              {/* Recipient Dropdown */}
              <div>
                <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "6px" }}>
                  Share with:
                </label>
                <select
                  value={shareTarget}
                  onChange={(e) => setShareTarget(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    backgroundColor: "#0f172a",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    color: "#f8fafc",
                    fontSize: "13px",
                    outline: "none",
                  }}
                >
                  <option value="everyone">🌐 Everyone in Room</option>
                  {otherPlayers.length > 0 ? (
                    <optgroup label="Direct Message (Selected Person)">
                      {otherPlayers.map((p: PlayerEntry) => (
                        <option key={p.sessionId} value={p.sessionId}>
                          👤 {p.username}
                        </option>
                      ))}
                    </optgroup>
                  ) : (
                    <option disabled value="">(No other players online)</option>
                  )}
                </select>
              </div>

              {/* Message Input */}
              <div>
                <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "6px" }}>
                  Optional Note:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Check page 3 for spec..."
                  value={shareMessage}
                  onChange={(e) => setShareMessage(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    backgroundColor: "#0f172a",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    color: "#f8fafc",
                    fontSize: "13px",
                    outline: "none",
                  }}
                />
              </div>
            </div>

            {/* Feedback messages */}
            {errorMsg && (
              <div style={{ fontSize: "12px", color: "#f87171", backgroundColor: "rgba(239, 68, 68, 0.1)", padding: "8px 12px", borderRadius: "6px", border: "1px solid rgba(239, 68, 68, 0.3)" }}>
                ⚠️ {errorMsg}
              </div>
            )}
            {successMsg && (
              <div style={{ fontSize: "12px", color: "#4ade80", backgroundColor: "rgba(34, 197, 94, 0.1)", padding: "8px 12px", borderRadius: "6px", border: "1px solid rgba(34, 197, 94, 0.3)" }}>
                ✅ {successMsg}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!selectedFile || isUploading}
              style={{
                padding: "10px 18px",
                borderRadius: "8px",
                backgroundColor: !selectedFile || isUploading ? "rgba(59, 130, 246, 0.3)" : "#2563eb",
                color: "#ffffff",
                fontSize: "13px",
                fontWeight: "600",
                border: "none",
                cursor: !selectedFile || isUploading ? "not-allowed" : "pointer",
                transition: "background-color 0.2s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              {isUploading ? (
                <>⏳ Preparing & Sharing...</>
              ) : (
                <>🚀 Send Document</>
              )}
            </button>
          </form>

          {/* Shared Documents History Section */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "14px",
                borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                paddingBottom: "10px",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "600", color: "#e2e8f0" }}>
                Shared Documents ({docs.length})
              </h3>

              {/* Tabs */}
              <div style={{ display: "flex", gap: "6px", backgroundColor: "rgba(30, 41, 59, 0.6)", padding: "3px", borderRadius: "8px" }}>
                {(["all", "received", "sent"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      padding: "4px 12px",
                      borderRadius: "6px",
                      border: "none",
                      backgroundColor: activeTab === tab ? "#3b82f6" : "transparent",
                      color: activeTab === tab ? "#ffffff" : "#94a3b8",
                      fontSize: "12px",
                      fontWeight: "500",
                      cursor: "pointer",
                      textTransform: "capitalize",
                    }}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Document list */}
            {filteredDocs.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "36px 16px",
                  color: "#64748b",
                  backgroundColor: "rgba(15, 23, 42, 0.4)",
                  borderRadius: "10px",
                  border: "1px dashed rgba(255, 255, 255, 0.05)",
                }}
              >
                <div style={{ fontSize: "28px", marginBottom: "8px" }}>📂</div>
                <div style={{ fontSize: "14px", fontWeight: "500" }}>No documents in this list</div>
                <div style={{ fontSize: "12px", marginTop: "4px" }}>
                  Files shared during this session will appear here.
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {filteredDocs.map((doc) => {
                  const isSentByMe = doc.fromUsername === username || (mySessionId && doc.fromSessionId === mySessionId);
                  const isDirect = Boolean(doc.toSessionId || doc.toUsername);

                  return (
                    <div
                      key={doc.id}
                      style={{
                        backgroundColor: "rgba(30, 41, 59, 0.6)",
                        border: isDirect
                          ? "1px solid rgba(168, 85, 247, 0.4)"
                          : "1px solid rgba(255, 255, 255, 0.08)",
                        borderRadius: "10px",
                        padding: "14px 16px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "12px",
                        transition: "background-color 0.2s ease",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "10px",
                            backgroundColor: "rgba(15, 23, 42, 0.8)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "20px",
                            flexShrink: 0,
                          }}
                        >
                          {getFileIcon(doc.fileName, doc.fileType)}
                        </div>

                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                            <span
                              style={{
                                fontSize: "14px",
                                fontWeight: "600",
                                color: "#f1f5f9",
                                textOverflow: "ellipsis",
                                overflow: "hidden",
                                whiteSpace: "nowrap",
                              }}
                              title={doc.fileName}
                            >
                              {doc.fileName}
                            </span>

                            {/* Recipient badge */}
                            {isDirect ? (
                              <span
                                style={{
                                  fontSize: "10px",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  backgroundColor: "rgba(168, 85, 247, 0.2)",
                                  color: "#c084fc",
                                  border: "1px solid rgba(168, 85, 247, 0.3)",
                                }}
                              >
                                🔒 Direct ({isSentByMe ? `To ${doc.toUsername || "Player"}` : "To You"})
                              </span>
                            ) : (
                              <span
                                style={{
                                  fontSize: "10px",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  backgroundColor: "rgba(59, 130, 246, 0.15)",
                                  color: "#60a5fa",
                                  border: "1px solid rgba(59, 130, 246, 0.3)",
                                }}
                              >
                                🌐 Everyone
                              </span>
                            )}
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12px", color: "#94a3b8", marginTop: "3px" }}>
                            <span>
                              {isSentByMe ? "You" : doc.fromUsername}
                            </span>
                            <span>•</span>
                            <span>{(doc.fileSizeBytes / 1024).toFixed(1)} KB</span>
                            <span>•</span>
                            <span>{new Date(doc.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                          </div>

                          {doc.message && (
                            <div style={{ fontSize: "12px", color: "#cbd5e1", marginTop: "4px", fontStyle: "italic" }}>
                              💬 "{doc.message}"
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                        {canPreview(doc.fileName, doc.fileType) && (
                          <button
                            onClick={() => setPreviewDoc(doc)}
                            style={{
                              padding: "6px 12px",
                              borderRadius: "6px",
                              backgroundColor: "rgba(59, 130, 246, 0.2)",
                              border: "1px solid rgba(59, 130, 246, 0.4)",
                              color: "#60a5fa",
                              fontSize: "12px",
                              fontWeight: "500",
                              cursor: "pointer",
                            }}
                          >
                            👁️ Preview
                          </button>
                        )}
                        <button
                          onClick={() => handleDownload(doc)}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "6px",
                            backgroundColor: "rgba(34, 197, 94, 0.2)",
                            border: "1px solid rgba(34, 197, 94, 0.4)",
                            color: "#4ade80",
                            fontSize: "12px",
                            fontWeight: "500",
                            cursor: "pointer",
                          }}
                        >
                          ⬇️ Download
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Inline Preview Modal */}
      {previewDoc && (
        <DocPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} onDownload={handleDownload} />
      )}
    </div>
  );
}

// ── Preview Modal ─────────────────────────────────────────────────────────────
function DocPreviewModal({
  doc,
  onClose,
  onDownload,
}: {
  doc: SharedDocItem;
  onClose: () => void;
  onDownload: (doc: SharedDocItem) => void;
}) {
  const isImage = doc.fileType.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg)$/i.test(doc.fileName);
  const isPdf = doc.fileType === "application/pdf" || /\.pdf$/i.test(doc.fileName);
  const isText = doc.fileType.startsWith("text/") || /\.(txt|md|json|csv|js|ts|html|css|py)$/i.test(doc.fileName);

  let textContent = "";
  if (isText && doc.dataBase64) {
    try {
      textContent = atob(doc.dataBase64);
    } catch {
      textContent = "(Unable to parse text content)";
    }
  }

  const dataUrl = `data:${doc.fileType || "application/octet-stream"};base64,${doc.dataBase64}`;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        backdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "800px",
          maxHeight: "90vh",
          backgroundColor: "#0f172a",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          borderRadius: "16px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#1e293b",
          }}
        >
          <div style={{ fontSize: "15px", fontWeight: "600", color: "#f8fafc" }}>
            👁️ Preview: {doc.fileName}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => onDownload(doc)}
              style={{
                padding: "4px 10px",
                borderRadius: "6px",
                backgroundColor: "#22c55e",
                color: "#ffffff",
                border: "none",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              ⬇️ Download
            </button>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                color: "#94a3b8",
                fontSize: "18px",
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content Preview */}
        <div style={{ flex: 1, overflow: "auto", padding: "20px", display: "flex", justifyContent: "center" }}>
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={dataUrl}
              alt={doc.fileName}
              style={{ maxWidth: "100%", maxHeight: "70vh", objectFit: "contain", borderRadius: "8px" }}
            />
          ) : isPdf ? (
            <iframe
              src={dataUrl}
              title={doc.fileName}
              style={{ width: "100%", height: "70vh", border: "none", borderRadius: "8px" }}
            />
          ) : isText ? (
            <pre
              style={{
                width: "100%",
                maxHeight: "70vh",
                overflow: "auto",
                backgroundColor: "#020617",
                color: "#e2e8f0",
                padding: "16px",
                borderRadius: "8px",
                fontSize: "13px",
                fontFamily: "monospace",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {textContent}
            </pre>
          ) : (
            <div style={{ color: "#94a3b8", padding: "40px", textAlign: "center" }}>
              Preview not available for this file type. Please download to view.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getFileIcon(fileName: string, fileType: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  if (fileType.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) return "🖼️";
  if (fileType === "application/pdf" || ext === "pdf") return "📄";
  if (["doc", "docx", "pages"].includes(ext)) return "📝";
  if (["xls", "xlsx", "csv"].includes(ext)) return "📊";
  if (["ppt", "pptx", "key"].includes(ext)) return "📊";
  if (["zip", "tar", "gz", "7z", "rar"].includes(ext)) return "📦";
  if (["js", "ts", "tsx", "html", "css", "json", "py", "sh", "sol"].includes(ext)) return "💻";
  if (fileType.startsWith("text/") || ext === "txt" || ext === "md") return "📝";
  return "📁";
}

function canPreview(fileName: string, fileType: string): boolean {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  return (
    fileType.startsWith("image/") ||
    fileType.startsWith("text/") ||
    fileType === "application/pdf" ||
    ["png", "jpg", "jpeg", "gif", "webp", "svg", "pdf", "txt", "md", "json", "csv", "js", "ts", "html", "css", "py"].includes(ext)
  );
}
