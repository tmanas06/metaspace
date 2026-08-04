/**
 * REST API client for VirtualVerse backend.
 * Uses NEXT_PUBLIC_API_URL environment variable.
 * Fetches rich map preset schemas including style, zones, obstacles, and furniture.
 */

export interface MapZone {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  isPrivate?: boolean;
}

export interface MapObstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
}

export interface MapFurniture {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  collides?: boolean;
  label?: string;
}

export interface MapStyle {
  floorType: string;
  floorColor: string;
  wallColor: string;
  gridColor: string;
  accentColor: string;
}

export interface MapPresetData {
  id: string;
  name: string;
  theme?: string;
  description?: string;
  icon?: string;
  width: number;
  height: number;
  tileSize: number;
  style: MapStyle;
  spawnPoint?: { x: number; y: number };
  zones?: MapZone[];
  obstacles?: MapObstacle[];
  furniture?: MapFurniture[];
}

export const FALLBACK_MAP_PRESETS: MapPresetData[] = [
  {
    id: "event_hall",
    name: "Event Hall & Main Stage",
    theme: "Conference Auditorium",
    description: "Grand auditorium with stage lighting for virtual keynotes, conferences, and presentations.",
    width: 960,
    height: 768,
    tileSize: 32,
    style: {
      floorType: "carpet",
      floorColor: "#1e1b4b",
      wallColor: "#312e81",
      gridColor: "#3730a3",
      accentColor: "#fbbf24",
    },
    spawnPoint: { x: 480, y: 650 },
    zones: [
      { id: "stage", name: "Main Stage & Podium", x: 280, y: 60, width: 400, height: 160, color: "#d97706", isPrivate: false },
      { id: "vip_seating", name: "VIP Front Row", x: 180, y: 260, width: 600, height: 140, color: "#4f46e5", isPrivate: true },
      { id: "networking", name: "Networking Foyer", x: 100, y: 460, width: 760, height: 220, color: "#3730a3", isPrivate: true },
    ],
    obstacles: [
      { x: 0, y: 0, width: 960, height: 32 },
      { x: 0, y: 736, width: 960, height: 32 },
      { x: 0, y: 0, width: 32, height: 768 },
      { x: 928, y: 0, width: 32, height: 768 },
    ],
    furniture: [
      { id: "podium", name: "Speaker Podium", type: "podium", x: 440, y: 110, width: 80, height: 50, color: "#f59e0b", collides: true, label: "Podium" },
      { id: "screen", name: "Presentation Screen", type: "screen", x: 300, y: 40, width: 360, height: 20, color: "#fbbf24", collides: true, label: "Main Screen" },
      { id: "desk_1", name: "Info Desk", type: "table", x: 120, y: 500, width: 100, height: 50, color: "#6366f1", collides: true, label: "Information" },
    ],
  },
  {
    id: "classroom",
    name: "Classroom & Academy Campus",
    theme: "Academic Campus",
    description: "Academic lecture halls, breakout rooms, and campus grounds for workshops and lectures.",
    width: 832,
    height: 768,
    tileSize: 32,
    style: {
      floorType: "wood",
      floorColor: "#271c19",
      wallColor: "#451a03",
      gridColor: "#78350f",
      accentColor: "#10b981",
    },
    spawnPoint: { x: 416, y: 640 },
    zones: [
      { id: "blackboard", name: "Lecturer Stage & Chalkboard", x: 216, y: 60, width: 400, height: 140, color: "#047857", isPrivate: false },
      { id: "desks", name: "Student Study Desks", x: 116, y: 240, width: 600, height: 260, color: "#065f46", isPrivate: true },
      { id: "library", name: "Resource Library", x: 116, y: 540, width: 600, height: 160, color: "#064e3b", isPrivate: true },
    ],
    obstacles: [
      { x: 0, y: 0, width: 832, height: 32 },
      { x: 0, y: 736, width: 832, height: 32 },
      { x: 0, y: 0, width: 32, height: 768 },
      { x: 800, y: 0, width: 32, height: 768 },
    ],
    furniture: [
      { id: "board", name: "Chalkboard", type: "board", x: 266, y: 40, width: 300, height: 16, color: "#10b981", collides: true, label: "Chalkboard" },
      { id: "teacher_desk", name: "Teacher Desk", type: "table", x: 366, y: 120, width: 100, height: 50, color: "#b45309", collides: true, label: "Teacher Desk" },
    ],
  },
  {
    id: "startup_office",
    name: "Startup Office & Coworking",
    theme: "Modern Office",
    description: "Modern open-plan office with meeting desks, coffee lounges, and collaboration spaces.",
    width: 896,
    height: 768,
    tileSize: 32,
    style: {
      floorType: "tile",
      floorColor: "#1e293b",
      wallColor: "#0f172a",
      gridColor: "#334155",
      accentColor: "#6366f1",
    },
    spawnPoint: { x: 448, y: 640 },
    zones: [
      { id: "desks", name: "Engineering Workstation Pods", x: 96, y: 80, width: 320, height: 300, color: "#4f46e5", isPrivate: true },
      { id: "boardroom", name: "Executive Boardroom", x: 480, y: 80, width: 320, height: 300, color: "#4338ca", isPrivate: true },
      { id: "lounge", name: "Coffee Lounge & Kitchen", x: 96, y: 440, width: 704, height: 240, color: "#3730a3", isPrivate: false },
    ],
    obstacles: [
      { x: 0, y: 0, width: 896, height: 32 },
      { x: 0, y: 736, width: 896, height: 32 },
      { x: 0, y: 0, width: 32, height: 768 },
      { x: 864, y: 0, width: 32, height: 768 },
    ],
    furniture: [
      { id: "desk_a", name: "Developer Desk Cluster", type: "table", x: 140, y: 140, width: 230, height: 180, color: "#6366f1", collides: true, label: "Engineering" },
      { id: "meeting_table", name: "Conference Table", type: "table", x: 520, y: 140, width: 240, height: 180, color: "#818cf8", collides: true, label: "Boardroom Table" },
      { id: "coffee_bar", name: "Espresso Bar", type: "bar", x: 140, y: 490, width: 200, height: 60, color: "#93c5fd", collides: true, label: "Coffee Station" },
    ],
  },
  {
    id: "zen_garden",
    name: "Zen Garden & Ocean Beach",
    theme: "Nature & Beach",
    description: "Serene coastal beach with wooden boardwalks, garden pavilions, and ocean views.",
    width: 832,
    height: 832,
    tileSize: 32,
    style: {
      floorType: "grass",
      floorColor: "#134e4a",
      wallColor: "#0f766e",
      gridColor: "#115e59",
      accentColor: "#f59e0b",
    },
    spawnPoint: { x: 416, y: 416 },
    zones: [
      { id: "garden", name: "Zen Bamboo Pavilion", x: 60, y: 60, width: 320, height: 320, color: "#0d9488", isPrivate: true },
      { id: "beach", name: "Ocean Beach Shoreline", x: 452, y: 60, width: 320, height: 712, color: "#d97706", isPrivate: false },
      { id: "pond", name: "Lotus Water Pond", x: 60, y: 452, width: 320, height: 320, color: "#0284c7", isPrivate: true },
    ],
    obstacles: [
      { x: 0, y: 0, width: 832, height: 32 },
      { x: 0, y: 800, width: 832, height: 32 },
      { x: 0, y: 0, width: 32, height: 832 },
      { x: 800, y: 0, width: 32, height: 832 },
    ],
    furniture: [
      { id: "pavilion_table", name: "Wooden Tea Table", type: "table", x: 160, y: 160, width: 120, height: 120, color: "#b45309", collides: true, label: "Tea House" },
      { id: "bridge", name: "Wooden Footbridge", type: "bridge", x: 180, y: 450, width: 80, height: 40, color: "#d97706", collides: false, label: "Bridge" },
    ],
  },
  {
    id: "cyberpunk_lounge",
    name: "Cyberpunk Lounge & Nightclub",
    theme: "Neon Nightclub",
    description: "Futuristic neon-lit lounge with music stages, VIP booths, and dark aesthetic vibes.",
    width: 768,
    height: 768,
    tileSize: 32,
    style: {
      floorType: "neon_tile",
      floorColor: "#2e1065",
      wallColor: "#581c87",
      gridColor: "#6b21a8",
      accentColor: "#f43f5e",
    },
    spawnPoint: { x: 384, y: 650 },
    zones: [
      { id: "dancefloor", name: "Neon Dance Floor", x: 234, y: 234, width: 300, height: 300, color: "#be123c", isPrivate: false },
      { id: "dj_booth", name: "DJ Stage", x: 284, y: 60, width: 200, height: 120, color: "#431407", isPrivate: true },
      { id: "bar", name: "Neon Cocktail Bar", x: 60, y: 220, width: 130, height: 350, color: "#701a75", isPrivate: true },
      { id: "vip_booths", name: "VIP Lounges", x: 578, y: 220, width: 130, height: 350, color: "#831843", isPrivate: true },
    ],
    obstacles: [
      { x: 0, y: 0, width: 768, height: 32 },
      { x: 0, y: 736, width: 768, height: 32 },
      { x: 0, y: 0, width: 32, height: 768 },
      { x: 736, y: 0, width: 32, height: 768 },
    ],
    furniture: [
      { id: "dj_deck", name: "DJ Synthesizer Decks", type: "dj", x: 344, y: 90, width: 80, height: 50, color: "#f43f5e", collides: true, label: "DJ Decks" },
      { id: "bar_counter", name: "Neon Bar Counter", type: "bar", x: 75, y: 240, width: 45, height: 300, color: "#e11d48", collides: true, label: "Bar" },
    ],
  },
  {
    id: "scifi_station",
    name: "Sci-Fi Space Station",
    theme: "Futuristic Orbital Hub",
    description: "High-tech orbital facility featuring a command bridge, quantum reactor core, teleporter pads, and observation deck.",
    width: 832,
    height: 832,
    tileSize: 32,
    style: {
      floorType: "metal",
      floorColor: "#090d16",
      wallColor: "#1e293b",
      gridColor: "#334155",
      accentColor: "#38bdf8",
    },
    spawnPoint: { x: 416, y: 416 },
    zones: [
      { id: "bridge", name: "Command Bridge", x: 266, y: 60, width: 300, height: 180, color: "#0369a1", isPrivate: true },
      { id: "reactor", name: "Quantum Reactor Core", x: 316, y: 316, width: 200, height: 200, color: "#0891b2", isPrivate: true },
      { id: "teleport", name: "Teleporter Pad Bay", x: 60, y: 316, width: 180, height: 200, color: "#0e7490", isPrivate: true },
    ],
    obstacles: [
      { x: 0, y: 0, width: 832, height: 32 },
      { x: 0, y: 800, width: 832, height: 32 },
      { x: 0, y: 0, width: 32, height: 832 },
      { x: 800, y: 0, width: 32, height: 832 },
    ],
    furniture: [
      { id: "captain_console", name: "Captain Command Console", type: "console", x: 376, y: 100, width: 80, height: 40, color: "#38bdf8", collides: true, label: "Captain Console" },
      { id: "plasma_core", name: "Quantum Plasma Reactor", type: "reactor", x: 386, y: 386, width: 60, height: 60, color: "#22d3ee", collides: true, label: "Reactor" },
    ],
  },
  {
    id: "playground",
    name: "Playground & Sports Park",
    theme: "Outdoor Sports & Park",
    description: "Vibrant outdoor park featuring a basketball court, central water fountain plaza, picnic benches, and play structures.",
    width: 832,
    height: 832,
    tileSize: 32,
    style: {
      floorType: "grass",
      floorColor: "#064e3b",
      wallColor: "#047857",
      gridColor: "#059669",
      accentColor: "#a7f3d0",
    },
    spawnPoint: { x: 416, y: 416 },
    zones: [
      { id: "fountain", name: "Central Fountain Plaza", x: 316, y: 316, width: 200, height: 200, color: "#0284c7", isPrivate: true },
      { id: "court", name: "Basketball Court", x: 60, y: 80, width: 300, height: 300, color: "#c2410c", isPrivate: false },
      { id: "picnic", name: "Picnic Lawn", x: 472, y: 80, width: 300, height: 300, color: "#15803d", isPrivate: true },
    ],
    obstacles: [
      { x: 0, y: 0, width: 832, height: 32 },
      { x: 0, y: 800, width: 832, height: 32 },
      { x: 0, y: 0, width: 32, height: 832 },
      { x: 800, y: 0, width: 32, height: 832 },
    ],
    furniture: [
      { id: "fountain_core", name: "Stone Water Fountain", type: "fountain", x: 386, y: 386, width: 60, height: 60, color: "#38bdf8", collides: true, label: "Fountain" },
      { id: "picnic_bench_1", name: "Picnic Bench", type: "table", x: 520, y: 150, width: 80, height: 40, color: "#78350f", collides: true },
    ],
  },
];

export async function fetchRoomPresets(): Promise<MapPresetData[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    console.warn("[API] NEXT_PUBLIC_API_URL is not set, using default rich presets");
    return FALLBACK_MAP_PRESETS;
  }

  try {
    const res = await fetch(`${apiUrl}/rooms/presets`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      console.warn(`[API] Failed to fetch presets (${res.status}), using fallback rich presets`);
      return FALLBACK_MAP_PRESETS;
    }
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return data as MapPresetData[];
    }
    return FALLBACK_MAP_PRESETS;
  } catch {
    console.info("[API] Backend server unavailable. Using fallback rich room presets.");
    return FALLBACK_MAP_PRESETS;
  }
}
