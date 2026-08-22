/**
 * REST API client for VirtualVerse backend.
 * Map schema extended with trees, outdoor areas, floor patterns, and rich furniture types.
 * Maps expanded into sprawling, large multi-room spaces (2240x1600px) with halls, stages, wings & courtyards.
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
   *  bookshelf | bar | fountain | dj | reactor | console | bench | rug |
   *  arcade | server | booth */
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

  // ── 1. Startup Office & Tech Campus ────────────────────────────────────────
  {
    id: "startup_office",
    name: "Startup HQ & Tech Campus",
    theme: "Sprawling Coworking HQ",
    description: "Expansive tech campus with grand entrance atrium, central hall, auditorium stage, engineering squad pods, design studio, boardroom, cafeteria, game lounge & sakura garden.",
    width: 2240,
    height: 1600,
    tileSize: 32,
    style: {
      floorType: "tile",
      floorColor: "#f1f5f9",  // slate tile
      wallColor: "#94a3b8",
      gridColor: "#cbd5e1",
      accentColor: "#4f46e5",
      outsideColor: "#475569", // sleek dark border
    },
    spawnPoint: { x: 1120, y: 1380 },

    zones: [
      // ── Central Thoroughfare ──
      { id: "lobby",        name: "Welcome Lobby & Reception", x: 800,  y: 1160, width: 640, height: 380, color: "#cbd5e1", floorType: "tile",   isPrivate: false },
      { id: "atrium_hall",   name: "Grand Central Atrium",      x: 800,  y: 440,  width: 640, height: 680, color: "#e2e8f0", floorType: "wood",   isPrivate: false },

      // ── North Wing ──
      { id: "auditorium",   name: "Townhall Auditorium Stage", x: 800,  y: 60,   width: 640, height: 340, color: "#f59e0b", floorType: "carpet", isPrivate: false },

      // ── West Wing (Tech & Strategy) ──
      { id: "eng_squad",    name: "Frontend & Cloud Squad",    x: 60,   y: 60,   width: 700, height: 480, color: "#818cf8", floorType: "carpet", isPrivate: true },
      { id: "ai_lab",       name: "AI & Server Research Lab",   x: 60,   y: 580,  width: 700, height: 440, color: "#38bdf8", floorType: "metal",  isPrivate: true },
      { id: "boardroom",    name: "Executive Boardroom Suite", x: 60,   y: 1060, width: 700, height: 480, color: "#6366f1", floorType: "wood",   isPrivate: true },

      // ── East Wing (Creative & Social) ──
      { id: "design_studio",name: "UI/UX & Creative Studio",    x: 1480, y: 60,   width: 700, height: 480, color: "#f472b6", floorType: "carpet", isPrivate: true },
      { id: "cafeteria",    name: "Bistro & Coffee Lounge",    x: 1480, y: 580,  width: 700, height: 440, color: "#34d399", floorType: "wood",   isPrivate: false },
      { id: "game_lounge",  name: "Rec Room & Arcade Lounge",  x: 1480, y: 1060, width: 700, height: 480, color: "#a855f7", floorType: "neon_tile", isPrivate: false },

      // ── Outdoor Garden Courtyard ──
      { id: "courtyard",    name: "Sakura Zen Courtyard",      x: 800,  y: 1160, width: 0,   height: 0,   color: "#4ade80", floorType: "grass",  isOutdoor: true },
    ],

    obstacles: [
      // Perimeter Walls
      { x: 0,    y: 0,    width: 2240, height: 48 },
      { x: 0,    y: 1552, width: 2240, height: 48 },
      { x: 0,    y: 0,    width: 48,   height: 1600 },
      { x: 2192, y: 0,    width: 48,   height: 1600 },

      // West Wing Wall Dividers
      { x: 760,  y: 48,   width: 20,   height: 1504 },
      { x: 48,   y: 550,  width: 712,  height: 20 },
      { x: 48,   y: 1030, width: 712,  height: 20 },

      // East Wing Wall Dividers
      { x: 1460, y: 48,   width: 20,   height: 1504 },
      { x: 1480, y: 550,  width: 712,  height: 20 },
      { x: 1480, y: 1030, width: 712,  height: 20 },

      // Hallway Passageway Walls (with doors/archways left open)
      { x: 760,  y: 390,  width: 720,  height: 20 },
    ],

    furniture: [
      // ── 1. Welcome Lobby & Reception ──
      { id: "rec_desk",   name: "Reception Counter", type: "desk",    x: 1040, y: 1220, width: 160, height: 60, color: "#6366f1", collides: true, label: "Reception" },
      { id: "rec_mon",    name: "Monitor",           type: "monitor", x: 1100, y: 1225, width: 40,  height: 20, color: "#1e293b" },
      { id: "rec_chair",  name: "Chair",             type: "chair",   x: 1100, y: 1285, width: 40,  height: 30, color: "#4f46e5" },
      { id: "rec_rug",    name: "Welcome Rug",       type: "rug",     x: 980,  y: 1350, width: 280, height: 120, color: "#818cf8" },
      { id: "rec_fount",  name: "Plaza Fountain",    type: "fountain",x: 850,  y: 1240, width: 90,  height: 90, color: "#38bdf8", collides: true, label: "Fountain" },
      { id: "rec_p1",     name: "Lobby Plant",       type: "plant",   x: 1400, y: 1200, width: 32,  height: 45, color: "#22c55e" },
      { id: "rec_p2",     name: "Lobby Plant",       type: "plant",   x: 810,  y: 1200, width: 32,  height: 45, color: "#22c55e" },

      // ── 2. Auditorium & Stage ──
      { id: "aud_screen", name: "Main LED Screen",   type: "board",   x: 940,  y: 75,   width: 360, height: 24, color: "#fbbf24", collides: true, label: "Presentation LED Screen" },
      { id: "aud_podium", name: "Speaker Podium",    type: "podium",  x: 1100, y: 130,  width: 80,  height: 50, color: "#f59e0b", collides: true, label: "Podium" },
      // Auditorium Seats Row 1
      { id: "aud_s1",     name: "Auditorium Seat",   type: "chair",   x: 880,  y: 220,  width: 50,  height: 35, color: "#d97706" },
      { id: "aud_s2",     name: "Auditorium Seat",   type: "chair",   x: 950,  y: 220,  width: 50,  height: 35, color: "#d97706" },
      { id: "aud_s3",     name: "Auditorium Seat",   type: "chair",   x: 1020, y: 220,  width: 50,  height: 35, color: "#d97706" },
      { id: "aud_s4",     name: "Auditorium Seat",   type: "chair",   x: 1170, y: 220,  width: 50,  height: 35, color: "#d97706" },
      { id: "aud_s5",     name: "Auditorium Seat",   type: "chair",   x: 1240, y: 220,  width: 50,  height: 35, color: "#d97706" },
      { id: "aud_s6",     name: "Auditorium Seat",   type: "chair",   x: 1310, y: 220,  width: 50,  height: 35, color: "#d97706" },
      // Auditorium Seats Row 2
      { id: "aud_s7",     name: "Auditorium Seat",   type: "chair",   x: 880,  y: 280,  width: 50,  height: 35, color: "#b45309" },
      { id: "aud_s8",     name: "Auditorium Seat",   type: "chair",   x: 950,  y: 280,  width: 50,  height: 35, color: "#b45309" },
      { id: "aud_s9",     name: "Auditorium Seat",   type: "chair",   x: 1020, y: 280,  width: 50,  height: 35, color: "#b45309" },
      { id: "aud_s10",    name: "Auditorium Seat",   type: "chair",   x: 1170, y: 280,  width: 50,  height: 35, color: "#b45309" },
      { id: "aud_s11",    name: "Auditorium Seat",   type: "chair",   x: 1240, y: 280,  width: 50,  height: 35, color: "#b45309" },
      { id: "aud_s12",    name: "Auditorium Seat",   type: "chair",   x: 1310, y: 280,  width: 50,  height: 35, color: "#b45309" },

      // ── 3. Engineering & Tech Wing ──
      // Dev Pod A
      { id: "eng_d1",     name: "Dev Desk A1",       type: "desk",    x: 100,  y: 120,  width: 85,  height: 50, color: "#94a3b8", collides: true, label: "Dev Desk A" },
      { id: "eng_m1",     name: "Monitor",           type: "monitor", x: 105,  y: 122,  width: 32,  height: 20, color: "#1e293b" },
      { id: "eng_c1",     name: "Chair",             type: "chair",   x: 125,  y: 175,  width: 35,  height: 30, color: "#6366f1" },
      { id: "eng_d2",     name: "Dev Desk A2",       type: "desk",    x: 220,  y: 120,  width: 85,  height: 50, color: "#94a3b8", collides: true, label: "Dev Desk B" },
      { id: "eng_m2",     name: "Monitor",           type: "monitor", x: 225,  y: 122,  width: 32,  height: 20, color: "#1e293b" },
      { id: "eng_c2",     name: "Chair",             type: "chair",   x: 245,  y: 175,  width: 35,  height: 30, color: "#6366f1" },

      // Dev Pod B
      { id: "eng_d3",     name: "Dev Desk B1",       type: "desk",    x: 100,  y: 260,  width: 85,  height: 50, color: "#94a3b8", collides: true, label: "Ops Desk A" },
      { id: "eng_m3",     name: "Monitor",           type: "monitor", x: 105,  y: 262,  width: 32,  height: 20, color: "#1e293b" },
      { id: "eng_c3",     name: "Chair",             type: "chair",   x: 125,  y: 315,  width: 35,  height: 30, color: "#6366f1" },
      { id: "eng_d4",     name: "Dev Desk B2",       type: "desk",    x: 220,  y: 260,  width: 85,  height: 50, color: "#94a3b8", collides: true, label: "Ops Desk B" },
      { id: "eng_m4",     name: "Monitor",           type: "monitor", x: 225,  y: 262,  width: 32,  height: 20, color: "#1e293b" },
      { id: "eng_c4",     name: "Chair",             type: "chair",   x: 245,  y: 315,  width: 35,  height: 30, color: "#6366f1" },

      // Cloud Pod
      { id: "eng_d5",     name: "Cloud Desk C1",     type: "desk",    x: 420,  y: 120,  width: 90,  height: 50, color: "#cbd5e1", collides: true, label: "Cloud Desk" },
      { id: "eng_c5",     name: "Chair",             type: "chair",   x: 445,  y: 175,  width: 35,  height: 30, color: "#4f46e5" },
      { id: "eng_d6",     name: "Cloud Desk C2",     type: "desk",    x: 540,  y: 120,  width: 90,  height: 50, color: "#cbd5e1", collides: true, label: "Cloud Desk" },
      { id: "eng_c6",     name: "Chair",             type: "chair",   x: 565,  y: 175,  width: 35,  height: 30, color: "#4f46e5" },

      // AI Research & Server Room
      { id: "ai_console", name: "AI GPU Cluster",    type: "console", x: 100,  y: 640,  width: 140, height: 60, color: "#38bdf8", collides: true, label: "GPU Workstation" },
      { id: "srv_rack1",  name: "Server Rack 1",     type: "server",  x: 500,  y: 620,  width: 65,  height: 100, color: "#0f172a", collides: true, label: "Server A" },
      { id: "srv_rack2",  name: "Server Rack 2",     type: "server",  x: 580,  y: 620,  width: 65,  height: 100, color: "#0f172a", collides: true, label: "Server B" },
      { id: "ai_board",   name: "Glass AI Board",    type: "board",   x: 280,  y: 620,  width: 180, height: 20, color: "#0284c7", collides: true, label: "Glass Board" },

      // ── 4. Executive Boardroom & Huddles ──
      { id: "br_table",   name: "Conference Table",  type: "table",   x: 180,  y: 1140, width: 280, height: 130, color: "#4f46e5", collides: true, label: "Boardroom Table" },
      { id: "br_c1",      name: "Exec Chair",        type: "chair",   x: 200,  y: 1105, width: 35,  height: 30, color: "#4338ca" },
      { id: "br_c2",      name: "Exec Chair",        type: "chair",   x: 260,  y: 1105, width: 35,  height: 30, color: "#4338ca" },
      { id: "br_c3",      name: "Exec Chair",        type: "chair",   x: 320,  y: 1105, width: 35,  height: 30, color: "#4338ca" },
      { id: "br_c4",      name: "Exec Chair",        type: "chair",   x: 380,  y: 1105, width: 35,  height: 30, color: "#4338ca" },
      { id: "br_c5",      name: "Exec Chair",        type: "chair",   x: 200,  y: 1275, width: 35,  height: 30, color: "#4338ca" },
      { id: "br_c6",      name: "Exec Chair",        type: "chair",   x: 260,  y: 1275, width: 35,  height: 30, color: "#4338ca" },
      { id: "br_c7",      name: "Exec Chair",        type: "chair",   x: 320,  y: 1275, width: 35,  height: 30, color: "#4338ca" },
      { id: "br_c8",      name: "Exec Chair",        type: "chair",   x: 380,  y: 1275, width: 35,  height: 30, color: "#4338ca" },
      { id: "br_board",   name: "Presentation Screen",type: "board",  x: 180,  y: 1080, width: 280, height: 20, color: "#3730a3", collides: true, label: "Presentation Board" },

      // Phone Booths
      { id: "booth_1",    name: "Phone Booth A",     type: "booth",   x: 550,  y: 1120, width: 60,  height: 70, color: "#6366f1", collides: true, label: "Booth 1" },
      { id: "booth_2",    name: "Phone Booth B",     type: "booth",   x: 630,  y: 1120, width: 60,  height: 70, color: "#6366f1", collides: true, label: "Booth 2" },

      // ── 5. Design & Product Studio ──
      { id: "dsg_d1",     name: "Design Desk 1",     type: "desk",    x: 1520, y: 120,  width: 90,  height: 50, color: "#f472b6", collides: true, label: "Design Desk" },
      { id: "dsg_m1",     name: "Monitor",           type: "monitor", x: 1525, y: 122,  width: 32,  height: 20, color: "#1e293b" },
      { id: "dsg_c1",     name: "Chair",             type: "chair",   x: 1545, y: 175,  width: 35,  height: 30, color: "#db2777" },
      { id: "dsg_d2",     name: "Design Desk 2",     type: "desk",    x: 1640, y: 120,  width: 90,  height: 50, color: "#f472b6", collides: true, label: "Design Desk" },
      { id: "dsg_m2",     name: "Monitor",           type: "monitor", x: 1645, y: 122,  width: 32,  height: 20, color: "#1e293b" },
      { id: "dsg_c2",     name: "Chair",             type: "chair",   x: 1665, y: 175,  width: 35,  height: 30, color: "#db2777" },
      { id: "dsg_table",  name: "Strategy Table",    type: "table",   x: 1800, y: 140,  width: 220, height: 100, color: "#fbcfe8", collides: true, label: "Product Strategy Table" },
      { id: "dsg_board",  name: "Moodboard",         type: "board",   x: 1800, y: 100,  width: 220, height: 20, color: "#f472b6", collides: true, label: "Design Moodboard" },

      // ── 6. Cafeteria & Bistro ──
      { id: "cafe_bar",   name: "Espresso Bar",      type: "bar",     x: 1520, y: 640,  width: 220, height: 50, color: "#92400e", collides: true, label: "Coffee Bar" },
      { id: "cafe_fridge",name: "Kitchen Fridge",    type: "bookshelf",x: 1760,y: 630,  width: 60,  height: 80, color: "#e2e8f0", collides: true, label: "Fridge" },
      { id: "cafe_t1",    name: "Dining Table 1",    type: "table",   x: 1540, y: 760,  width: 140, height: 80, color: "#34d399", collides: true, label: "Dining Table" },
      { id: "cafe_t2",    name: "Dining Table 2",    type: "table",   x: 1740, y: 760,  width: 140, height: 80, color: "#34d399", collides: true, label: "Dining Table" },
      { id: "cafe_p1",    name: "Cafeteria Plant",   type: "plant",   x: 2100, y: 620,  width: 35,  height: 45, color: "#10b981" },

      // ── 7. Rec Room & Gaming Lounge ──
      { id: "game_ping",  name: "Ping Pong",         type: "table",   x: 1540, y: 1140, width: 140, height: 80, color: "#10b981", collides: true, label: "Ping Pong" },
      { id: "game_arc1",  name: "Arcade Cabinet A",  type: "arcade",  x: 1750, y: 1120, width: 65,  height: 85, color: "#f59e0b", collides: true, label: "Arcade 1" },
      { id: "game_arc2",  name: "Arcade Cabinet B",  type: "arcade",  x: 1830, y: 1120, width: 65,  height: 85, color: "#ef4444", collides: true, label: "Arcade 2" },
      { id: "game_sofa",  name: "Lounge Sofa",       type: "sofa",    x: 1940, y: 1140, width: 180, height: 75, color: "#a855f7", collides: true, label: "Lounge Sofa" },
      { id: "game_dj",    name: "DJ Synthesizer",    type: "dj",      x: 1540, y: 1320, width: 180, height: 80, color: "#ec4899", collides: true, label: "DJ Stage Decks" },
    ],

    trees: [
      // Central Courtyard & Entrance Sakura Trees
      { x: 740,  y: 1220, radius: 32, variant: 0 },
      { x: 740,  y: 1360, radius: 28, variant: 1 },
      { x: 1500, y: 1220, radius: 32, variant: 0 },
      { x: 1500, y: 1360, radius: 28, variant: 1 },
      { x: 1120, y: 1500, radius: 30, variant: 2 },
      { x: 920,  y: 1500, radius: 26, variant: 0 },
      { x: 1320, y: 1500, radius: 26, variant: 1 },
    ],
  },

  // ── 2. Event Hall & Convention Center ──────────────────────────────────────
  {
    id: "event_hall",
    name: "Global Convention Center",
    theme: "Auditorium & Expo Grounds",
    description: "Massive auditorium hall with keynote stage, VIP suites, exhibition booths, and networking grounds.",
    width: 2240,
    height: 1600,
    tileSize: 32,
    style: {
      floorType: "carpet",
      floorColor: "#1e1b4b",
      wallColor: "#312e81",
      gridColor: "#3730a3",
      accentColor: "#fbbf24",
      outsideColor: "#0f172a",
    },
    spawnPoint: { x: 1120, y: 1400 },
    zones: [
      { id: "stage",      name: "Main Keynote Stage",     x: 640,  y: 60,   width: 960, height: 360, color: "#f59e0b", floorType: "wood",   isPrivate: false },
      { id: "vip_suite",  name: "Executive VIP Suite",   x: 60,   y: 60,   width: 520, height: 360, color: "#6366f1", floorType: "carpet", isPrivate: true },
      { id: "expo_hall",  name: "Exhibition Booths Bay",  x: 60,   y: 480,  width: 1040,height: 1020,color: "#4f46e5", floorType: "tile",   isPrivate: false },
      { id: "foyer",      name: "Networking Foyer",       x: 1160, y: 480,  width: 1020,height: 520, color: "#4338ca", floorType: "carpet", isPrivate: false },
      { id: "garden",     name: "Outdoor Expo Plaza",     x: 1160, y: 1060, width: 1020,height: 440, color: "#10b981", floorType: "grass",  isOutdoor: true },
    ],
    obstacles: [
      { x: 0,    y: 0,    width: 2240, height: 48 },
      { x: 0,    y: 1552, width: 2240, height: 48 },
      { x: 0,    y: 0,    width: 48,   height: 1600 },
      { x: 2192, y: 0,    width: 48,   height: 1600 },
      { x: 600,  y: 48,   width: 20,   height: 372 },
      { x: 1120, y: 480,  width: 20,   height: 1072 },
    ],
    furniture: [
      { id: "stage_screen",name: "Giant Keynote Screen",type: "board",   x: 820,  y: 80,   width: 600, height: 30, color: "#fbbf24", collides: true, label: "Main Keynote Screen" },
      { id: "podium",     name: "Main Podium",          type: "podium",  x: 1080, y: 170,  width: 80,  height: 50, color: "#d97706", collides: true, label: "Keynote Podium" },
      { id: "booth_1",    name: "Exhibitor Booth A",    type: "desk",    x: 120,  y: 560,  width: 180, height: 90, color: "#818cf8", collides: true, label: "Expo Booth A" },
      { id: "booth_2",    name: "Exhibitor Booth B",    type: "desk",    x: 400,  y: 560,  width: 180, height: 90, color: "#818cf8", collides: true, label: "Expo Booth B" },
      { id: "booth_3",    name: "Exhibitor Booth C",    type: "desk",    x: 680,  y: 560,  width: 180, height: 90, color: "#818cf8", collides: true, label: "Expo Booth C" },
      { id: "foyer_bar",  name: "Cocktail Bar",         type: "bar",     x: 1300, y: 560,  width: 320, height: 60, color: "#fbbf24", collides: true, label: "Networking Bar" },
    ],
    trees: [
      { x: 1240, y: 1160, radius: 32, variant: 0 },
      { x: 1400, y: 1160, radius: 28, variant: 1 },
      { x: 1700, y: 1200, radius: 34, variant: 0 },
      { x: 1900, y: 1240, radius: 28, variant: 2 },
    ],
  },

  // ── 3. Zen Garden Resort ──────────────────────────────────────────────────
  {
    id: "zen_garden",
    name: "Zen Coastal Resort",
    theme: "Nature & Ocean Beach",
    description: "Serene coastal botanical garden with tea house pavilion, lotus pond, wooden footbridges & sandy beach.",
    width: 2240,
    height: 1600,
    tileSize: 32,
    style: {
      floorType: "grass",
      floorColor: "#22c55e",
      wallColor: "#15803d",
      gridColor: "#4ade80",
      accentColor: "#f59e0b",
      outsideColor: "#166534",
    },
    spawnPoint: { x: 1120, y: 800 },
    zones: [
      { id: "tea_house",  name: "Zen Tea Pavilion",      x: 60,   y: 60,   width: 800, height: 600, color: "#b45309", floorType: "wood",   isPrivate: true },
      { id: "lotus_pond", name: "Lotus Water Lake",       x: 60,   y: 740,  width: 800, height: 800, color: "#0284c7", floorType: "tile",   isPrivate: false },
      { id: "beach",      name: "Ocean Beach & Shore",   x: 1400, y: 60,   width: 780, height: 1480,color: "#fef08a", floorType: "tile",   isPrivate: false },
      { id: "lawn",       name: "Central Garden Lawn",   x: 900,  y: 60,   width: 460, height: 1480,color: "#4ade80", floorType: "grass",  isOutdoor: true },
    ],
    obstacles: [
      { x: 0,    y: 0,    width: 2240, height: 48 },
      { x: 0,    y: 1552, width: 2240, height: 48 },
      { x: 0,    y: 0,    width: 48,   height: 1600 },
      { x: 2192, y: 0,    width: 48,   height: 1600 },
    ],
    furniture: [
      { id: "tea_table",  name: "Tea House Table",       type: "table",   x: 300,  y: 260,  width: 220, height: 140, color: "#78350f", collides: true, label: "Tea Table" },
      { id: "bridge_1",   name: "North Wooden Bridge",   type: "bench",   x: 380,  y: 730,  width: 140, height: 45,  color: "#d97706", collides: false, label: "Wooden Bridge" },
      { id: "fountain_1", name: "Zen Water Basin",       type: "fountain",x: 1040, y: 300,  width: 120, height: 120, color: "#38bdf8", collides: true, label: "Water Basin" },
    ],
    trees: [
      { x: 960,  y: 180,  radius: 34, variant: 0 },
      { x: 1100, y: 140,  radius: 28, variant: 1 },
      { x: 1260, y: 220,  radius: 32, variant: 0 },
      { x: 980,  y: 450,  radius: 30, variant: 2 },
      { x: 1180, y: 520,  radius: 36, variant: 0 },
      { x: 1020, y: 900,  radius: 32, variant: 1 },
      { x: 1200, y: 980,  radius: 30, variant: 0 },
      { x: 960,  y: 1300, radius: 34, variant: 2 },
      { x: 1180, y: 1360, radius: 32, variant: 0 },
    ],
  },

  // ── 4. Cyberpunk Lounge ────────────────────────────────────────────────────
  {
    id: "cyberpunk_lounge",
    name: "Cyberpunk Lounge",
    theme: "Neon Megacity Club",
    description: "Futuristic neon-lit lounge with DJ stage, neon bar, VIP booths, arcade alley & main dance floor.",
    width: 2240,
    height: 1600,
    tileSize: 32,
    style: {
      floorType: "neon_tile",
      floorColor: "#1a0533",
      wallColor: "#3b0764",
      gridColor: "#7c3aed",
      accentColor: "#f43f5e",
      outsideColor: "#0d0015",
    },
    spawnPoint: { x: 1120, y: 1400 },
    zones: [
      { id: "dancefloor", name: "Neon Dance Floor",      x: 720,  y: 440,  width: 800, height: 600, color: "#be123c", isPrivate: false },
      { id: "dj_stage",   name: "DJ Keynote Stage",      x: 820,  y: 60,   width: 600, height: 320, color: "#431407", isPrivate: true },
      { id: "bar",        name: "Neon Cocktail Bar",      x: 60,   y: 440,  width: 600, height: 600, color: "#701a75", isPrivate: true },
      { id: "vip_booths", name: "Executive VIP Lounges",  x: 1580, y: 440,  width: 600, height: 600, color: "#831843", isPrivate: true },
      { id: "arcade_bay", name: "Retro Arcade Alley",     x: 60,   y: 60,   width: 600, height: 320, color: "#581c87", isPrivate: false },
    ],
    obstacles: [
      { x: 0,    y: 0,    width: 2240, height: 48 },
      { x: 0,    y: 1552, width: 2240, height: 48 },
      { x: 0,    y: 0,    width: 48,   height: 1600 },
      { x: 2192, y: 0,    width: 48,   height: 1600 },
    ],
    furniture: [
      { id: "dj_decks",   name: "DJ Synthesizer Decks",  type: "dj",      x: 1020, y: 120,  width: 200, height: 85, color: "#f43f5e", collides: true, label: "DJ Decks" },
      { id: "bar_cnt",    name: "Neon Bar Counter",      type: "bar",     x: 120,  y: 520,  width: 340, height: 70, color: "#e11d48", collides: true, label: "Cocktail Bar" },
      { id: "arc_1",      name: "Arcade Machine A",      type: "arcade",  x: 120,  y: 120,  width: 70,  height: 90, color: "#f59e0b", collides: true, label: "Arcade 1" },
      { id: "arc_2",      name: "Arcade Machine B",      type: "arcade",  x: 220,  y: 120,  width: 70,  height: 90, color: "#38bdf8", collides: true, label: "Arcade 2" },
    ],
    trees: [],
  },

  // ── 5. Sci-Fi Space Station ───────────────────────────────────────────────
  {
    id: "scifi_station",
    name: "Sci-Fi Orbital Station",
    theme: "Futuristic Orbital Hub",
    description: "High-tech orbital station with command bridge, quantum reactor core, teleporter bays & lab.",
    width: 2240,
    height: 1600,
    tileSize: 32,
    style: {
      floorType: "metal",
      floorColor: "#0a0f1e",
      wallColor: "#1e293b",
      gridColor: "#1e3a5f",
      accentColor: "#38bdf8",
      outsideColor: "#020409",
    },
    spawnPoint: { x: 1120, y: 1350 },
    zones: [
      { id: "bridge",     name: "Command Bridge",        x: 720,  y: 60,   width: 800, height: 420, color: "#0369a1", isPrivate: true, floorType: "metal" },
      { id: "reactor",    name: "Quantum Reactor Core",  x: 820,  y: 580,  width: 600, height: 500, color: "#0e7490", isPrivate: true },
      { id: "teleport",   name: "Teleporter Bay",        x: 60,   y: 480,  width: 600, height: 600, color: "#0891b2", isPrivate: true },
      { id: "lab",        name: "Bio-Genetics Lab",       x: 1580, y: 480,  width: 600, height: 600, color: "#164e63", isPrivate: true },
    ],
    obstacles: [
      { x: 0,    y: 0,    width: 2240, height: 48 },
      { x: 0,    y: 1552, width: 2240, height: 48 },
      { x: 0,    y: 0,    width: 48,   height: 1600 },
      { x: 2192, y: 0,    width: 48,   height: 1600 },
    ],
    furniture: [
      { id: "capt_console",name:"Captain Console",       type: "console", x: 1040, y: 160,  width: 160, height: 60, color: "#38bdf8", collides: true, label: "Captain Console" },
      { id: "reactor_c",  name:"Quantum Core",          type: "reactor", x: 1020, y: 730,  width: 200, height: 200,color: "#22d3ee", collides: true, label: "Quantum Reactor" },
      { id: "tele_pad",   name:"Teleport Pad",           type: "fountain",x: 280,  y: 730,  width: 140, height: 140,color: "#7dd3fc", collides: true, label: "Teleport Pad" },
    ],
    trees: [],
  },

  // ── 6. Sports & Recreation Park ──────────────────────────────────────────
  {
    id: "playground",
    name: "Sports & Recreation Park",
    theme: "Outdoor Park & Stadium",
    description: "Vibrant outdoor park with basketball court, central fountain plaza, picnic lawn & swimming pool.",
    width: 2240,
    height: 1600,
    tileSize: 32,
    style: {
      floorType: "grass",
      floorColor: "#22c55e",
      wallColor: "#15803d",
      gridColor: "#4ade80",
      accentColor: "#f97316",
      outsideColor: "#166534",
    },
    spawnPoint: { x: 1120, y: 1350 },
    zones: [
      { id: "court",      name: "Basketball Court",      x: 60,   y: 60,   width: 800, height: 600, color: "#ea580c", floorType: "tile" },
      { id: "fountain",   name: "Central Fountain Plaza",x: 720,  y: 480,  width: 800, height: 600, color: "#38bdf8", floorType: "tile" },
      { id: "picnic",     name: "Shaded Picnic Lawn",     x: 1480, y: 60,   width: 700, height: 600, color: "#4ade80", isOutdoor: true },
      { id: "pool",       name: "Olympic Splash Pool",   x: 1480, y: 740,  width: 700, height: 800, color: "#0284c7", floorType: "tile" },
    ],
    obstacles: [
      { x: 0,    y: 0,    width: 2240, height: 48 },
      { x: 0,    y: 1552, width: 2240, height: 48 },
      { x: 0,    y: 0,    width: 48,   height: 1600 },
      { x: 2192, y: 0,    width: 48,   height: 1600 },
    ],
    furniture: [
      { id: "fountain_c", name: "Stone Fountain",        type: "fountain",x: 1020, y: 680,  width: 200, height: 200,color: "#38bdf8", collides: true, label: "Fountain Plaza" },
      { id: "picnic_t1",  name: "Picnic Bench 1",        type: "table",   x: 1640, y: 220,  width: 160, height: 80, color: "#78350f", collides: true, label: "Picnic Bench" },
      { id: "picnic_t2",  name: "Picnic Bench 2",        type: "table",   x: 1860, y: 220,  width: 160, height: 80, color: "#78350f", collides: true, label: "Picnic Bench" },
    ],
    trees: [
      { x: 900,  y: 160,  radius: 36, variant: 0 },
      { x: 1120, y: 120,  radius: 30, variant: 1 },
      { x: 1300, y: 180,  radius: 34, variant: 0 },
      { x: 780,  y: 1140, radius: 32, variant: 2 },
      { x: 1440, y: 1180, radius: 36, variant: 0 },
      { x: 1080, y: 1400, radius: 32, variant: 1 },
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
