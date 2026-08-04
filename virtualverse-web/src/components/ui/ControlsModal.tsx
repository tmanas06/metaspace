"use client";

interface ControlsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ControlsModal({ isOpen, onClose }: ControlsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
            <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
            </svg>
            World Controls & Navigation
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3 text-xs">
          {/* Key Bindings */}
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
            <div className="font-semibold text-white">Avatar Movement</div>
            <div className="grid grid-cols-2 gap-2 text-zinc-300">
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-white/10 border border-white/20 rounded text-[11px] font-mono text-white">W A S D</kbd>
                <span>Move direction</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-white/10 border border-white/20 rounded text-[11px] font-mono text-white">Arrow Keys</kbd>
                <span>Alternate keys</span>
              </div>
            </div>
          </div>

          {/* Proximity Interaction */}
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
            <div className="font-semibold text-white">Spatial Video & Voice</div>
            <p className="text-zinc-400 leading-relaxed text-[11px]">
              Walk your avatar near another user within 80 pixels radius. LiveKit video and audio will automatically connect when close, and disconnect when moving away.
            </p>
          </div>
        </div>

        <div className="p-3 bg-white/[0.01] border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}
