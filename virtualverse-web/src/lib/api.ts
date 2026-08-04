/**
 * REST API client for VirtualVerse backend.
 * Uses NEXT_PUBLIC_API_URL environment variable.
 */

export interface RoomPreset {
  id?: string;
  name: string;
  description?: string;
  thumbnail?: string;
}

export const DEFAULT_PRESETS: string[] = [
  "Event Hall & Main Stage",
  "Classroom & Academy Campus",
  "Playground & Sports Park",
  "Cyberpunk Lounge & Nightclub",
  "Sci-Fi Space Station",
  "Zen Garden & Ocean Beach",
  "Startup Office & Coworking",
];

export async function fetchRoomPresets(): Promise<string[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    console.warn("[API] NEXT_PUBLIC_API_URL is not set, using default presets");
    return DEFAULT_PRESETS;
  }

  try {
    const res = await fetch(`${apiUrl}/rooms/presets`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      console.warn(`[API] Failed to fetch presets (${res.status}), using defaults`);
      return DEFAULT_PRESETS;
    }
    const data = await res.json();
    if (Array.isArray(data)) {
      const names = data.map((item) => (typeof item === "string" ? item : item.name)).filter(Boolean);
      return names.length > 0 ? names : DEFAULT_PRESETS;
    }
    return DEFAULT_PRESETS;
  } catch (err) {
    console.warn("[API] Fetch room presets error, using defaults:", err);
    return DEFAULT_PRESETS;
  }
}
