/**
 * REST API client for VirtualVerse backend.
 * Map schema extended with trees, outdoor areas, floor patterns, and richer furniture types.
 */

export interface MapZone {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  floorType?: string;     // overrides map-level floorType inside this zone
  isPrivate?: boolean;
  isOutdoor?: boolean;    // render with grass texture
}

export interface MapObstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
}

export interface MapTree {
  x: number;
  y: number;
  radius?: number;       // canopy radius, default 22
  trunkH?: number;       // trunk height, default 12
  variant?: number;      // 0=round, 1=tall, 2=bush — visual variety
}

export interface MapFurniture {
  id: string;
  name: string;
  /** desk | chair | monitor | plant | sofa | table | board | podium |
   *  bookshelf | bar | fountain | dj | reactor | console | bench | rug */
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  collides?: boolean;
  label?: string;
  facing?: "north" | "south" | "east" | "west"; // for directional furniture
}

export interface MapStyle {
  floorType: string;     // tile | wood | carpet | grass | metal | neon_tile
  floorColor: string;
  wallColor: string;
  gridColor: string;
  accentColor: string;
  outsideColor?: string; // colour of map border / outdoor fringe
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
  trees?: MapTree[];
}

// ─── Map Presets ──────────────────────────────────────────────────────────────

export const FALLBACK_MAP_PRESETS: MapPresetData[] = [

  // ── 1. Startup Office ──────────────────────────────────────────────────────
  {
    id: "startup_office",
    name: "Startup Office",
    theme: "Modern Coworking",
    description: "Open-plan coworking office with desk pods, boardroom, coffee lounge, and a rooftop garden fringe.",
    width: 960,
    height: 832,
    tileSize: 32,
    style: {
      floorType: "tile",
      floorColor: "#f0ece3",  // warm light tile
      wallColor: "#c7bfb0",
      gridColor: "#ddd6cb",
      accentColor: "#6366f1",
      outsideColor: "#8dbf7a",  // grass fringe
    },
    spawnPoint: { x: 480, y: 700 },

    zones: [
      // Left wing — engineering pods
      { id: "eng", name: "Engineering",    x: 60,  y: 80,  width: 280, height: 260, color: "#c7d2fe", floorType: "carpet", isPrivate: true },
      // Right wing — design
      { id: "design", name: "Design",      x: 400, y: 80,  width: 280, height: 260, color: "#fbcfe8", floorType: "carpet", isPrivate: true },
      // Centre — boardroom
      { id: "board", name: "Boardroom",    x: 700, y: 80,  width: 200, height: 260, color: "#bfdbfe", floorType: "wood", isPrivate: true },
      // Bottom — lounge
      { id: "lounge", name: "Break Room",  x: 60,  y: 420, width: 840, height: 200, color: "#d1fae5", floorType: "wood", isPrivate: false },
      // Outdoor fringe top
      { id: "outdoor_top", name: "Rooftop Garden", x: 60, y: 640, width: 840, height: 140, color: "#86efac", isPrivate: false, isOutdoor: true },
    ],

    obstacles: [
      // outer walls
      { x: 0,   y: 0,   width: 960, height: 48 },
      { x: 0,   y: 784, width: 960, height: 48 },
      { x: 0,   y: 0,   width: 48,  height: 832 },
      { x: 912, y: 0,   width: 48,  height: 832 },
      // inner room walls (horizontal dividers)
      { x: 48,  y: 360, width: 864, height: 20 },
      { x: 48,  y: 630, width: 864, height: 18 },
      // vertical dividers
      { x: 350, y: 48,  width: 18,  height: 312 },
      { x: 690, y: 48,  width: 18,  height: 312 },
    ],

    furniture: [
      // Engineering desks (3 L-shape clusters)
      { id: "eng_d1", name: "Dev Desk",    type: "desk",     x: 80,  y: 110, width: 70, height: 45, color: "#cbd5e1", collides: true },
      { id: "eng_m1", name: "Monitor",     type: "monitor",  x: 82,  y: 112, width: 28, height: 18, color: "#1e293b", collides: false },
      { id: "eng_c1", name: "Chair",       type: "chair",    x: 100, y: 155, width: 32, height: 28, color: "#818cf8", collides: false },
      { id: "eng_d2", name: "Dev Desk",    type: "desk",     x: 180, y: 110, width: 70, height: 45, color: "#cbd5e1", collides: true },
      { id: "eng_m2", name: "Monitor",     type: "monitor",  x: 182, y: 112, width: 28, height: 18, color: "#1e293b", collides: false },
      { id: "eng_c2", name: "Chair",       type: "chair",    x: 200, y: 155, width: 32, height: 28, color: "#818cf8", collides: false },
      { id: "eng_d3", name: "Dev Desk",    type: "desk",     x: 80,  y: 240, width: 70, height: 45, color: "#cbd5e1", collides: true },
      { id: "eng_m3", name: "Monitor",     type: "monitor",  x: 82,  y: 242, width: 28, height: 18, color: "#1e293b", collides: false },
      { id: "eng_c3", name: "Chair",       type: "chair",    x: 100, y: 285, width: 32, height: 28, color: "#818cf8", collides: false },
      { id: "eng_plant", name: "Plant",    type: "plant",    x: 290, y: 100, width: 28, height: 40, color: "#22c55e", collides: false },

      // Design desks
      { id: "dsg_d1", name: "Design Desk", type: "desk",    x: 420, y: 110, width: 70, height: 45, color: "#fce7f3", collides: true },
      { id: "dsg_m1", name: "Monitor",     type: "monitor", x: 422, y: 112, width: 28, height: 18, color: "#1e293b", collides: false },
      { id: "dsg_c1", name: "Chair",       type: "chair",   x: 440, y: 155, width: 32, height: 28, color: "#f9a8d4", collides: false },
      { id: "dsg_d2", name: "Design Desk", type: "desk",    x: 520, y: 110, width: 70, height: 45, color: "#fce7f3", collides: true },
      { id: "dsg_m2", name: "Monitor",     type: "monitor", x: 522, y: 112, width: 28, height: 18, color: "#1e293b", collides: false },
      { id: "dsg_c2", name: "Chair",       type: "chair",   x: 540, y: 155, width: 32, height: 28, color: "#f9a8d4", collides: false },
      { id: "dsg_d3", name: "Design Desk", type: "desk",    x: 420, y: 230, width: 120, height: 45, color: "#fce7f3", collides: true },
      { id: "dsg_c3", name: "Chair",       type: "chair",   x: 450, y: 275, width: 32, height: 28, color: "#f9a8d4", collides: false },
      { id: "dsg_plant","name":"Plant",    type: "plant",   x: 630, y: 100, width: 28, height: 40, color: "#22c55e", collides: false },

      // Boardroom
      { id: "br_table","name":"Conf Table", type: "table",  x: 715, y: 130, width: 170, height: 90, color: "#b0cae8", collides: true, label: "Boardroom" },
      { id: "br_c1",  name: "Chair",        type: "chair",  x: 720, y: 115, width: 28, height: 22, color: "#93c5fd", collides: false },
      { id: "br_c2",  name: "Chair",        type: "chair",  x: 758, y: 115, width: 28, height: 22, color: "#93c5fd", collides: false },
      { id: "br_c3",  name: "Chair",        type: "chair",  x: 796, y: 115, width: 28, height: 22, color: "#93c5fd", collides: false },
      { id: "br_c4",  name: "Chair",        type: "chair",  x: 834, y: 115, width: 28, height: 22, color: "#93c5fd", collides: false },
      { id: "br_screen","name":"Screen",    type: "board",  x: 715, y: 235, width: 170, height: 16, color: "#1e40af", collides: true, label: "Presentation" },

      // Lounge / break room
      { id: "sofa1",  name: "Sofa",         type: "sofa",   x: 80,  y: 450, width: 110, height: 55, color: "#86efac", collides: true },
      { id: "sofa2",  name: "Sofa",         type: "sofa",   x: 230, y: 450, width: 110, height: 55, color: "#86efac", collides: true },
      { id: "ctable", name: "Coffee Table", type: "table",  x: 130, y: 515, width: 60,  height: 40, color: "#a3e635", collides: false },
      { id: "ping",   name: "Ping Pong",    type: "table",  x: 450, y: 445, width: 100, height: 55, color: "#4ade80", collides: true, label: "Ping Pong" },
      { id: "fridge", name: "Fridge",       type: "bookshelf", x: 800, y: 430, width: 45, height: 70, color: "#e2e8f0", collides: true, label: "Fridge" },
      { id: "coffee", name: "Coffee Bar",   type: "bar",    x: 700, y: 435, width: 90,  height: 35, color: "#92400e", collides: true, label: "Coffee" },
      { id: "rug1",   name: "Rug",          type: "rug",    x: 100, y: 455, width: 260, height: 130, color: "#fde68a", collides: false },

      // Outdoor plants
      { id: "out_p1", name: "Plant",        type: "plant",  x: 100, y: 665, width: 28, height: 40, color: "#4ade80", collides: false },
      { id: "out_p2", name: "Plant",        type: "plant",  x: 250, y: 680, width: 28, height: 40, color: "#4ade80", collides: false },
      { id: "out_bench1","name":"Bench",    type: "bench",  x: 400, y: 660, width: 70, height: 30, color: "#92400e", collides: false },
      { id: "out_bench2","name":"Bench",    type: "bench",  x: 600, y: 660, width: 70, height: 30, color: "#92400e", collides: false },
    ],

    trees: [
      { x: 140, y: 695, radius: 26, variant: 0 },
      { x: 210, y: 720, radius: 20, variant: 1 },
      { x: 330, y: 690, radius: 24, variant: 0 },
      { x: 520, y: 700, radius: 22, variant: 2 },
      { x: 700, y: 695, radius: 28, variant: 0 },
      { x: 800, y: 715, radius: 20, variant: 1 },
      { x: 870, y: 690, radius: 18, variant: 2 },
    ],
  },

  // ── 2. Event Hall ──────────────────────────────────────────────────────────
  {
    id: "event_hall",
    name: "Event Hall",
    theme: "Conference Auditorium",
    description: "Grand auditorium with stage, VIP seating, networking foyer, and outdoor plaza.",
    width: 960,
    height: 832,
    tileSize: 32,
    style: {
      floorType: "carpet",
      floorColor: "#312e81",
      wallColor: "#1e1b4b",
      gridColor: "#4338ca",
      accentColor: "#fbbf24",
      outsideColor: "#1e1b4b",
    },
    spawnPoint: { x: 480, y: 700 },
    zones: [
      { id: "stage",      name: "Main Stage",       x: 200, y: 60,  width: 560, height: 180, color: "#d97706", floorType: "wood" },
      { id: "vip",        name: "VIP Front Row",     x: 160, y: 270, width: 640, height: 140, color: "#4f46e5", isPrivate: true },
      { id: "auditorium", name: "Auditorium Seats",  x: 80,  y: 430, width: 800, height: 240, color: "#3730a3" },
      { id: "foyer",      name: "Networking Foyer",  x: 80,  y: 680, width: 800, height: 100, color: "#6366f1", isPrivate: false },
    ],
    obstacles: [
      { x: 0,   y: 0,   width: 960, height: 48 },
      { x: 0,   y: 784, width: 960, height: 48 },
      { x: 0,   y: 0,   width: 48,  height: 832 },
      { x: 912, y: 0,   width: 48,  height: 832 },
    ],
    furniture: [
      { id: "screen",   name: "Main Screen",  type: "board",   x: 260, y: 65,  width: 440, height: 22, color: "#fbbf24", collides: true, label: "Main Screen" },
      { id: "podium",   name: "Podium",       type: "podium",  x: 450, y: 140, width: 60,  height: 50, color: "#f59e0b", collides: true, label: "Podium" },
      { id: "desk_l",   name: "Info Desk",    type: "desk",    x: 100, y: 700, width: 100, height: 45, color: "#6366f1", collides: true, label: "Info" },
      { id: "desk_r",   name: "Info Desk",    type: "desk",    x: 760, y: 700, width: 100, height: 45, color: "#6366f1", collides: true },
      { id: "plant_l",  name: "Plant",        type: "plant",   x: 70,  y: 65,  width: 28,  height: 40, color: "#22c55e", collides: false },
      { id: "plant_r",  name: "Plant",        type: "plant",   x: 862, y: 65,  width: 28,  height: 40, color: "#22c55e", collides: false },
    ],
    trees: [
      { x: 80,  y: 750, radius: 20, variant: 2 },
      { x: 880, y: 750, radius: 20, variant: 2 },
    ],
  },

  // ── 3. Zen Garden ──────────────────────────────────────────────────────────
  {
    id: "zen_garden",
    name: "Zen Garden",
    theme: "Nature & Beach",
    description: "Serene outdoor garden with wooden pavilion, water pond, sandy beach, and lush greenery.",
    width: 960,
    height: 832,
    tileSize: 32,
    style: {
      floorType: "grass",
      floorColor: "#4ade80",
      wallColor: "#16a34a",
      gridColor: "#86efac",
      accentColor: "#f59e0b",
      outsideColor: "#15803d",
    },
    spawnPoint: { x: 480, y: 500 },
    zones: [
      { id: "pavilion",  name: "Zen Pavilion",  x: 60,  y: 60,  width: 350, height: 300, color: "#a16207", floorType: "wood", isPrivate: true },
      { id: "pond",      name: "Lotus Pond",    x: 300, y: 400, width: 280, height: 220, color: "#38bdf8", floorType: "tile", isPrivate: false },
      { id: "beach",     name: "Sandy Beach",   x: 620, y: 60,  width: 280, height: 712, color: "#fef08a", floorType: "tile", isPrivate: false },
      { id: "garden",    name: "Garden Path",   x: 60,  y: 400, width: 220, height: 380, color: "#86efac", floorType: "grass", isOutdoor: true },
    ],
    obstacles: [
      { x: 0,   y: 0,   width: 960, height: 48 },
      { x: 0,   y: 784, width: 960, height: 48 },
      { x: 0,   y: 0,   width: 48,  height: 832 },
      { x: 912, y: 0,   width: 48,  height: 832 },
    ],
    furniture: [
      { id: "tea_table", name: "Tea Table",  type: "table",  x: 140, y: 160, width: 100, height: 70, color: "#92400e", collides: true, label: "Tea House" },
      { id: "tea_c1",   name: "Chair",       type: "chair",  x: 145, y: 145, width: 28, height: 22, color: "#d97706", collides: false },
      { id: "tea_c2",   name: "Chair",       type: "chair",  x: 185, y: 145, width: 28, height: 22, color: "#d97706", collides: false },
      { id: "bridge1",  name: "Bridge",      type: "bench",  x: 330, y: 430, width: 70,  height: 30, color: "#d97706", collides: false, label: "Bridge" },
      { id: "lantern1", name: "Lantern",     type: "plant",  x: 80,  y: 100, width: 16,  height: 30, color: "#f59e0b", collides: false },
      { id: "lantern2", name: "Lantern",     type: "plant",  x: 380, y: 100, width: 16,  height: 30, color: "#f59e0b", collides: false },
      { id: "bench1",   name: "Bench",       type: "bench",  x: 100, y: 450, width: 60,  height: 28, color: "#92400e", collides: false },
      { id: "rug2",     name: "Garden Rug",  type: "rug",    x: 100, y: 160, width: 250, height: 160, color: "#d97706", collides: false },
    ],
    trees: [
      { x: 100, y: 380, radius: 30, variant: 0 },
      { x: 200, y: 360, radius: 26, variant: 1 },
      { x: 90,  y: 480, radius: 22, variant: 2 },
      { x: 160, y: 530, radius: 28, variant: 0 },
      { x: 250, y: 520, radius: 20, variant: 1 },
      { x: 80,  y: 650, radius: 24, variant: 0 },
      { x: 200, y: 700, radius: 18, variant: 2 },
      { x: 500, y: 100, radius: 22, variant: 0 },
      { x: 570, y: 140, radius: 18, variant: 1 },
      { x: 550, y: 350, radius: 20, variant: 2 },
      { x: 600, y: 600, radius: 25, variant: 0 },
    ],
  },

  // ── 4. Cyberpunk Lounge ────────────────────────────────────────────────────
  {
    id: "cyberpunk_lounge",
    name: "Cyberpunk Lounge",
    theme: "Neon Nightclub",
    description: "Futuristic neon-lit lounge with DJ stage, neon bar, VIP booths, and glowing dance floor.",
    width: 832,
    height: 832,
    tileSize: 32,
    style: {
      floorType: "neon_tile",
      floorColor: "#1a0533",
      wallColor: "#3b0764",
      gridColor: "#7c3aed",
      accentColor: "#f43f5e",
      outsideColor: "#0d0015",
    },
    spawnPoint: { x: 416, y: 680 },
    zones: [
      { id: "dancefloor", name: "Dance Floor",    x: 216, y: 240, width: 400, height: 300, color: "#be123c" },
      { id: "dj_booth",   name: "DJ Stage",       x: 276, y: 60,  width: 280, height: 130, color: "#431407", isPrivate: true },
      { id: "bar",        name: "Neon Bar",        x: 60,  y: 230, width: 130, height: 320, color: "#701a75", isPrivate: true },
      { id: "vip",        name: "VIP Lounge",      x: 642, y: 230, width: 130, height: 320, color: "#831843", isPrivate: true },
      { id: "foyer",      name: "Entry Foyer",     x: 60,  y: 600, width: 712, height: 140, color: "#3b0764" },
    ],
    obstacles: [
      { x: 0,   y: 0,   width: 832, height: 48 },
      { x: 0,   y: 784, width: 832, height: 48 },
      { x: 0,   y: 0,   width: 48,  height: 832 },
      { x: 784, y: 0,   width: 48,  height: 832 },
    ],
    furniture: [
      { id: "dj_deck",  name: "DJ Decks",   type: "dj",      x: 356, y: 100, width: 120, height: 55, color: "#f43f5e", collides: true,  label: "DJ Decks" },
      { id: "speakers", name: "Speakers",   type: "podium",  x: 276, y: 65,  width: 50,  height: 40, color: "#e11d48", collides: true },
      { id: "speakers2","name":"Speakers",  type: "podium",  x: 506, y: 65,  width: 50,  height: 40, color: "#e11d48", collides: true },
      { id: "bar_cnt",  name: "Bar Counter",type: "bar",     x: 65,  y: 260, width: 50,  height: 260, color: "#a21caf", collides: true, label: "Bar" },
      { id: "vip_sofa1","name":"VIP Sofa",  type: "sofa",    x: 648, y: 260, width: 100, height: 50, color: "#9f1239", collides: true },
      { id: "vip_sofa2","name":"VIP Sofa",  type: "sofa",    x: 648, y: 330, width: 100, height: 50, color: "#9f1239", collides: true },
      { id: "vip_tbl",  name: "VIP Table",  type: "table",   x: 662, y: 400, width: 70,  height: 40, color: "#831843", collides: false },
    ],
    trees: [],
  },

  // ── 5. Sci-Fi Station ─────────────────────────────────────────────────────
  {
    id: "scifi_station",
    name: "Sci-Fi Station",
    theme: "Futuristic Orbital Hub",
    description: "High-tech orbital station with command bridge, reactor core, teleporter bays, and zero-g corridors.",
    width: 960,
    height: 832,
    tileSize: 32,
    style: {
      floorType: "metal",
      floorColor: "#0a0f1e",
      wallColor: "#1e293b",
      gridColor: "#1e3a5f",
      accentColor: "#38bdf8",
      outsideColor: "#020409",
    },
    spawnPoint: { x: 480, y: 620 },
    zones: [
      { id: "bridge",   name: "Command Bridge",  x: 300, y: 60,  width: 360, height: 200, color: "#0369a1", isPrivate: true, floorType: "metal" },
      { id: "reactor",  name: "Reactor Core",    x: 380, y: 340, width: 200, height: 200, color: "#0e7490", isPrivate: true },
      { id: "teleport", name: "Teleport Bay",    x: 60,  y: 280, width: 200, height: 200, color: "#0891b2", isPrivate: true },
      { id: "science",  name: "Science Lab",     x: 700, y: 280, width: 200, height: 200, color: "#164e63", isPrivate: true },
      { id: "corridor", name: "Main Corridor",   x: 60,  y: 560, width: 840, height: 140, color: "#1e3a5f" },
    ],
    obstacles: [
      { x: 0,   y: 0,   width: 960, height: 48 },
      { x: 0,   y: 784, width: 960, height: 48 },
      { x: 0,   y: 0,   width: 48,  height: 832 },
      { x: 912, y: 0,   width: 48,  height: 832 },
    ],
    furniture: [
      { id: "console1","name":"Console",   type: "console",  x: 330, y: 100, width: 80,  height: 40, color: "#38bdf8", collides: true,  label: "Navigation" },
      { id: "console2","name":"Console",   type: "console",  x: 440, y: 100, width: 80,  height: 40, color: "#38bdf8", collides: true,  label: "Weapons" },
      { id: "console3","name":"Console",   type: "console",  x: 550, y: 100, width: 80,  height: 40, color: "#38bdf8", collides: true,  label: "Shields" },
      { id: "capt",    "name":"Captain",   type: "chair",    x: 440, y: 180, width: 40,  height: 40, color: "#0369a1", collides: false, label: "Captain" },
      { id: "reactor_c","name":"Reactor",  type: "reactor",  x: 430, y: 390, width: 100, height: 100, color: "#22d3ee", collides: true, label: "Core" },
      { id: "tele1",   "name":"Telepad",   type: "fountain", x: 100, y: 320, width: 60,  height: 60, color: "#7dd3fc", collides: true,  label: "Pad A" },
      { id: "tele2",   "name":"Telepad",   type: "fountain", x: 180, y: 320, width: 60,  height: 60, color: "#7dd3fc", collides: true,  label: "Pad B" },
    ],
    trees: [],
  },

  // ── 6. Playground ─────────────────────────────────────────────────────────
  {
    id: "playground",
    name: "Sports Park",
    theme: "Outdoor Park",
    description: "Vibrant outdoor park with basketball court, fountain plaza, and shaded picnic areas.",
    width: 960,
    height: 832,
    tileSize: 32,
    style: {
      floorType: "grass",
      floorColor: "#4ade80",
      wallColor: "#15803d",
      gridColor: "#86efac",
      accentColor: "#f97316",
      outsideColor: "#166534",
    },
    spawnPoint: { x: 480, y: 500 },
    zones: [
      { id: "court",   name: "Basketball Court",  x: 60,  y: 60,  width: 340, height: 300, color: "#c2410c", floorType: "tile" },
      { id: "fountain",name: "Fountain Plaza",    x: 360, y: 280, width: 240, height: 200, color: "#38bdf8", floorType: "tile" },
      { id: "picnic",  name: "Picnic Lawn",       x: 620, y: 60,  width: 280, height: 300, color: "#86efac", isOutdoor: true },
      { id: "pool",    name: "Splash Pool",       x: 360, y: 60,  width: 240, height: 200, color: "#7dd3fc", floorType: "tile" },
    ],
    obstacles: [
      { x: 0,   y: 0,   width: 960, height: 48 },
      { x: 0,   y: 784, width: 960, height: 48 },
      { x: 0,   y: 0,   width: 48,  height: 832 },
      { x: 912, y: 0,   width: 48,  height: 832 },
    ],
    furniture: [
      { id: "hoop1",    name: "Hoop",       type: "podium",   x: 230, y: 70,  width: 20, height: 30, color: "#f97316", collides: true, label: "🏀" },
      { id: "hoop2",    name: "Hoop",       type: "podium",   x: 230, y: 330, width: 20, height: 30, color: "#f97316", collides: true },
      { id: "fountain_c","name":"Fountain", type: "fountain", x: 430, y: 330, width: 100, height: 100, color: "#38bdf8", collides: true, label: "Fountain" },
      { id: "pool_c",   name: "Pool",       type: "fountain", x: 400, y: 90,  width: 160, height: 130, color: "#7dd3fc", collides: false },
      { id: "bench_p1", name: "Bench",      type: "bench",    x: 640, y: 120, width: 70,  height: 28, color: "#92400e", collides: false },
      { id: "bench_p2", name: "Bench",      type: "bench",    x: 640, y: 280, width: 70,  height: 28, color: "#92400e", collides: false },
      { id: "table_pic","name":"Picnic Table",type: "table",  x: 680, y: 180, width: 80,  height: 45, color: "#78350f", collides: true, label: "Picnic" },
    ],
    trees: [
      { x: 120, y: 600, radius: 30, variant: 0 },
      { x: 200, y: 640, radius: 24, variant: 1 },
      { x: 300, y: 620, radius: 28, variant: 0 },
      { x: 450, y: 630, radius: 22, variant: 2 },
      { x: 550, y: 600, radius: 26, variant: 0 },
      { x: 650, y: 420, radius: 20, variant: 1 },
      { x: 720, y: 440, radius: 18, variant: 2 },
      { x: 800, y: 400, radius: 24, variant: 0 },
      { x: 870, y: 500, radius: 22, variant: 1 },
      { x: 100, y: 700, radius: 22, variant: 2 },
      { x: 750, y: 650, radius: 26, variant: 0 },
      { x: 880, y: 700, radius: 20, variant: 1 },
    ],
  },

];

// ─── API fetch ────────────────────────────────────────────────────────────────

export async function fetchRoomPresets(): Promise<MapPresetData[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    console.warn("[API] NEXT_PUBLIC_API_URL is not set — using built-in map presets.");
    return FALLBACK_MAP_PRESETS;
  }
  try {
    const res = await fetch(`${apiUrl}/rooms/presets`, { headers: { Accept: "application/json" } });
    if (!res.ok) {
      console.warn(`[API] Preset fetch failed (${res.status}) — using built-in presets.`);
      return FALLBACK_MAP_PRESETS;
    }
    const data = await res.json();
    return Array.isArray(data) && data.length > 0 ? (data as MapPresetData[]) : FALLBACK_MAP_PRESETS;
  } catch {
    console.info("[API] Backend unavailable — using built-in room presets.");
    return FALLBACK_MAP_PRESETS;
  }
}
