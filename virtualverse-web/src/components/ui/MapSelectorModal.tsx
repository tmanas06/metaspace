"use client";

interface MapSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  presets: string[];
  activeMap: string;
  onSelectMap: (preset: string) => void;
}

const PRESET_METADATA: Record<
  string,
  { tag: string; desc: string; themeColor: string; borderColor: string }
> = {
  "Event Hall & Main Stage": {
    tag: "Event & Conference",
    desc: "Grand auditorium with stage lighting for virtual keynotes, conferences, and presentations.",
    themeColor: "from-indigo-600/20 to-blue-600/20 text-indigo-400",
    borderColor: "hover:border-indigo-500/50",
  },
  "Classroom & Academy Campus": {
    tag: "Education & Learning",
    desc: "Academic lecture halls, breakout rooms, and campus grounds for workshops and lectures.",
    themeColor: "from-emerald-600/20 to-teal-600/20 text-emerald-400",
    borderColor: "hover:border-emerald-500/50",
  },
  "Playground & Sports Park": {
    tag: "Social & Recreation",
    desc: "Open-air green park with sports courts, social pavilions, and outdoor meeting zones.",
    themeColor: "from-green-600/20 to-lime-600/20 text-green-400",
    borderColor: "hover:border-green-500/50",
  },
  "Cyberpunk Lounge & Nightclub": {
    tag: "Entertainment & Party",
    desc: "Futuristic neon-lit lounge with music stages, VIP booths, and dark aesthetic vibes.",
    themeColor: "from-purple-600/20 to-fuchsia-600/20 text-purple-400",
    borderColor: "hover:border-purple-500/50",
  },
  "Sci-Fi Space Station": {
    tag: "Futuristic & Tech",
    desc: "Orbital space station with command decks, observation bays, and metallic corridors.",
    themeColor: "from-cyan-600/20 to-sky-600/20 text-cyan-400",
    borderColor: "hover:border-cyan-500/50",
  },
  "Zen Garden & Ocean Beach": {
    tag: "Relaxation & Wellness",
    desc: "Serene coastal beach with wooden boardwalks, garden pavilions, and ocean views.",
    themeColor: "from-teal-600/20 to-amber-600/20 text-teal-400",
    borderColor: "hover:border-teal-500/50",
  },
  "Startup Office & Coworking": {
    tag: "Work & Collaboration",
    desc: "Modern open-plan office with meeting desks, coffee lounges, and collaboration spaces.",
    themeColor: "from-slate-600/20 to-indigo-600/20 text-slate-300",
    borderColor: "hover:border-slate-400/50",
  },
};

export function MapSelectorModal({
  isOpen,
  onClose,
  presets,
  activeMap,
  onSelectMap,
}: MapSelectorModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              Map Preset Environments
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">Select a spatial environment to explore with your avatar</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Grid of presets */}
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5 overflow-y-auto max-h-[60vh]">
          {presets.map((preset) => {
            const meta = PRESET_METADATA[preset] ?? {
              tag: "Virtual Environment",
              desc: "Explore this interactive multiplayer spatial environment.",
              themeColor: "from-indigo-600/20 to-purple-600/20 text-indigo-400",
              borderColor: "hover:border-indigo-500/50",
            };
            const isSelected = preset === activeMap;

            return (
              <button
                key={preset}
                onClick={() => {
                  onSelectMap(preset);
                  onClose();
                }}
                className={`text-left p-4 rounded-xl border transition-all relative overflow-hidden flex flex-col justify-between group ${
                  isSelected
                    ? "bg-indigo-600/15 border-indigo-500 text-white ring-1 ring-indigo-500/50"
                    : `bg-white/[0.02] border-white/10 ${meta.borderColor} text-zinc-300 hover:bg-white/[0.04]`
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gradient-to-r ${meta.themeColor}`}>
                      {meta.tag}
                    </span>
                    {isSelected && (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Active
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-sm text-white group-hover:text-indigo-300 transition-colors mb-1">
                    {preset}
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                    {meta.desc}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-end text-xs text-indigo-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Enter Environment</span>
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
