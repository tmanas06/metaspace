"use client";

import { MapPresetData } from "@/lib/api";

interface MapSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  presets: MapPresetData[];
  activeMapData: MapPresetData;
  onSelectMap: (presetData: MapPresetData) => void;
}

export function MapSelectorModal({
  isOpen,
  onClose,
  presets,
  activeMapData,
  onSelectMap,
}: MapSelectorModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90dvh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              Spatial Environments & Map Presets
            </h2>
            <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5">Choose a virtual metaverse space with custom zones, private rooms & furniture</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors shrink-0"
            title="Close modal"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Grid of presets */}
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5 overflow-y-auto max-h-[60vh]">
          {presets.map((preset) => {
            const isSelected = preset.id === activeMapData.id || preset.name === activeMapData.name;
            const zoneCount = preset.zones?.length ?? 0;
            const furnitureCount = preset.furniture?.length ?? 0;

            return (
              <button
                key={preset.id || preset.name}
                onClick={() => {
                  onSelectMap(preset);
                  onClose();
                }}
                className={`text-left p-4 rounded-xl border transition-all relative overflow-hidden flex flex-col justify-between group ${
                  isSelected
                    ? "bg-indigo-600/20 border-indigo-500 text-white ring-1 ring-indigo-500/50"
                    : "bg-white/[0.02] border-white/10 hover:border-indigo-500/40 text-zinc-300 hover:bg-white/[0.04]"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      {preset.theme || "Spatial Map"}
                    </span>
                    {isSelected && (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Active
                      </span>
                    )}
                  </div>

                  <h3 className="font-semibold text-sm text-white group-hover:text-indigo-300 transition-colors mb-1">
                    {preset.name}
                  </h3>

                  <p className="text-xs text-zinc-400 leading-relaxed font-sans mb-3 line-clamp-2">
                    {preset.description || "Interactive multiplayer spatial map environment."}
                  </p>

                  <div className="flex items-center gap-3 text-[11px] text-zinc-400">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                      {zoneCount} Zones
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                      {furnitureCount} Furniture
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-end text-xs text-indigo-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Enter Space</span>
                  <svg className="w-3.5 h-3.5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
