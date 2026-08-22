/**
 * MainScene — Phaser 3 game scene for VirtualVerse.
 *
 * Visual system:
 *  ┌─ MAP ──────────────────────────────────────────────────────────────────┐
 *  │  • Tiled floor patterns (wood planks / carpet dots / tile grid /       │
 *  │    grass blades / metal grating / neon grid)                           │
 *  │  • Outdoor areas rendered with grass + trees (multi-layer circles)     │
 *  │  • Room zones with floor-type override, corner brackets, name badges   │
 *  │  • Detailed furniture: desk+monitor, chair, sofa, plant, bookshelf…    │
 *  │  • Thick outer walls + inner partition lines                           │
 *  └────────────────────────────────────────────────────────────────────────┘
 *  ┌─ AVATARS ───────────────────────────────────────────────────────────────┐
 *  │  • 32×48 pixel-art characters generated via Canvas 2D API              │
 *  │  • 4-directional × 3-frame walking animation (12 frames total)         │
 *  │  • Unique skin tone + hair color + shirt color derived from username   │
 *  │  • Name badge (pill tag) + status dot + proximity ring                 │
 *  └────────────────────────────────────────────────────────────────────────┘
 */

import Phaser from "phaser";
import { gameBridge, BooleanInput, PlayerState } from "../GameBridge";
import { MapPresetData, MapFurniture, MapTree, FALLBACK_MAP_PRESETS } from "@/lib/api";

// ─── Constants ────────────────────────────────────────────────────────────────
const PROXIMITY_RADIUS = 200;
const SPEED = 160;

const AV_W = 32;           // avatar frame width
const AV_H = 48;           // avatar frame height
const AV_SCALE = 1.2;      // display scale — smaller = more map visible
const WALK_FRAMES = 3;     // frames per direction: 0=idle, 1=step-L, 2=step-R
const AV_DIRS = ["down", "left", "right", "up"] as const;
type Direction = (typeof AV_DIRS)[number];

// ─── Avatar Color System ──────────────────────────────────────────────────────
const SKIN_TONES  = ["#FFDAB9", "#F1C27D", "#C68642", "#8D5524"];
const HAIR_COLORS = ["#1a0800", "#4a2c00", "#A0522D", "#DAA520",
                     "#1a1a2e", "#8B0000", "#4B0082", "#696969"];

interface AvatarColors {
  skin: string; hair: string; shirt: string;
  pants: string; shoes: string;
}

function usernameToColors(name: string): AvatarColors {
  let h = 5381;
  for (let i = 0; i < name.length; i++) h = ((h << 5) + h) ^ name.charCodeAt(i);
  h = Math.abs(h);
  const hue = h % 360;
  return {
    skin:  SKIN_TONES[(h >>  3) % 4],
    hair:  HAIR_COLORS[(h >> 7) % 8],
    shirt: `hsl(${hue}, 68%, 55%)`,
    pants: `hsl(${(hue + 210) % 360}, 30%, 28%)`,
    shoes: "#2a2020",
  };
}

// ─── Canvas Pixel Art Avatar Generator ───────────────────────────────────────

/** Filled rounded rectangle helper for Canvas 2D */
function rrect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r = 2
): void {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
  ctx.fill();
}

/**
 * Draw one avatar frame onto `ctx` at pixel offset (ox, oy).
 * dir: facing direction. wf: walk frame index (0=idle, 1/2=steps).
 */
function drawAvatarFrame(
  ctx: CanvasRenderingContext2D,
  ox: number, oy: number,
  dir: Direction,
  wf: number,
  c: AvatarColors
): void {
  // Leg Y offsets for walking animation
  const lLY = wf === 1 ? -4 : wf === 2 ? 4 : 0;
  const lRY = wf === 1 ? 4  : wf === 2 ? -4 : 0;

  // Ground shadow
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath();
  ctx.ellipse(ox + 16, oy + 46, 10, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  if (dir === "down") {
    // Shoes
    ctx.fillStyle = c.shoes;
    rrect(ctx, ox + 8,  oy + 37 + lLY, 7, 5, 2);
    rrect(ctx, ox + 17, oy + 37 + lRY, 7, 5, 2);
    // Pants legs
    ctx.fillStyle = c.pants;
    rrect(ctx, ox + 9,  oy + 25 + lLY, 6, 14, 1);
    rrect(ctx, ox + 17, oy + 25 + lRY, 6, 14, 1);
    // Shirt body
    ctx.fillStyle = c.shirt;
    rrect(ctx, ox + 7, oy + 14, 18, 13, 3);
    // Shirt sheen
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    rrect(ctx, ox + 8, oy + 15, 9, 5, 2);
    // Arms
    ctx.fillStyle = c.skin;
    rrect(ctx, ox + 2,  oy + 15, 6, 10, 2);
    rrect(ctx, ox + 24, oy + 15, 6, 10, 2);
    // Neck
    ctx.fillStyle = c.skin;
    rrect(ctx, ox + 13, oy + 14, 6, 4, 1);
    // Head
    ctx.fillStyle = c.skin;
    ctx.beginPath(); ctx.arc(ox + 16, oy + 9, 9, 0, Math.PI * 2); ctx.fill();
    // Hair — top & sides
    ctx.fillStyle = c.hair;
    ctx.beginPath();
    ctx.arc(ox + 16, oy + 9, 9, Math.PI * 1.05, Math.PI * 2.0);
    ctx.lineTo(ox + 16, oy + 9); ctx.closePath(); ctx.fill();
    ctx.fillStyle = c.hair;
    ctx.fillRect(ox + 7, oy + 5, 3, 8);
    ctx.fillRect(ox + 22, oy + 5, 3, 8);
    // Eyes
    ctx.fillStyle = "#1a0800";
    ctx.beginPath(); ctx.arc(ox + 12, oy + 10, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(ox + 20, oy + 10, 1.5, 0, Math.PI * 2); ctx.fill();
    // Eye whites
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.beginPath(); ctx.arc(ox + 12.5, oy + 9.5, 0.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(ox + 20.5, oy + 9.5, 0.6, 0, Math.PI * 2); ctx.fill();
    // Smile
    ctx.strokeStyle = "rgba(0,0,0,0.3)"; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(ox + 16, oy + 14, 2.5, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();

  } else if (dir === "up") {
    // Shoes (back)
    ctx.fillStyle = c.shoes;
    rrect(ctx, ox + 8,  oy + 37 + lLY, 7, 5, 2);
    rrect(ctx, ox + 17, oy + 37 + lRY, 7, 5, 2);
    // Pants
    ctx.fillStyle = c.pants;
    rrect(ctx, ox + 9,  oy + 25 + lLY, 6, 14, 1);
    rrect(ctx, ox + 17, oy + 25 + lRY, 6, 14, 1);
    // Shirt
    ctx.fillStyle = c.shirt;
    rrect(ctx, ox + 7, oy + 14, 18, 13, 3);
    // Arms
    ctx.fillStyle = c.skin;
    rrect(ctx, ox + 2,  oy + 15, 6, 10, 2);
    rrect(ctx, ox + 24, oy + 15, 6, 10, 2);
    // Head (all hair from back)
    ctx.fillStyle = c.hair;
    ctx.beginPath(); ctx.arc(ox + 16, oy + 9, 9, 0, Math.PI * 2); ctx.fill();
    // Hair underline
    ctx.strokeStyle = "rgba(0,0,0,0.18)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(ox + 8, oy + 16); ctx.lineTo(ox + 24, oy + 16); ctx.stroke();

  } else if (dir === "left") {
    // Shoes
    ctx.fillStyle = c.shoes;
    rrect(ctx, ox + 7, oy + 37 + lLY, 8, 5, 2);
    rrect(ctx, ox + 11, oy + 37 + lRY, 8, 5, 2);
    // Pants
    ctx.fillStyle = c.pants;
    rrect(ctx, ox + 8,  oy + 25 + lLY, 6, 14, 1);
    rrect(ctx, ox + 13, oy + 25 + lRY, 6, 14, 1);
    // Shirt
    ctx.fillStyle = c.shirt;
    rrect(ctx, ox + 7, oy + 14, 15, 13, 3);
    // Far arm
    ctx.fillStyle = c.skin;
    rrect(ctx, ox + 18, oy + 15, 6, 10, 2);
    // Neck
    ctx.fillStyle = c.skin; rrect(ctx, ox + 12, oy + 14, 5, 4, 1);
    // Head
    ctx.fillStyle = c.skin;
    ctx.beginPath(); ctx.arc(ox + 14, oy + 9, 9, 0, Math.PI * 2); ctx.fill();
    // Hair
    ctx.fillStyle = c.hair;
    ctx.beginPath();
    ctx.arc(ox + 14, oy + 9, 9, -Math.PI * 0.95, Math.PI * 0.1);
    ctx.lineTo(ox + 14, oy + 9); ctx.closePath(); ctx.fill();
    // Back hair
    ctx.fillStyle = c.hair; rrect(ctx, ox + 20, oy + 4, 3, 10, 1);
    // Eye
    ctx.fillStyle = "#1a0800";
    ctx.beginPath(); ctx.arc(ox + 8, oy + 10, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.beginPath(); ctx.arc(ox + 8.5, oy + 9.5, 0.5, 0, Math.PI * 2); ctx.fill();
    // Nose
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath(); ctx.moveTo(ox + 5, oy + 12); ctx.lineTo(ox + 4, oy + 15); ctx.lineTo(ox + 7, oy + 14); ctx.fill();

  } else { // right (mirror of left)
    // Shoes
    ctx.fillStyle = c.shoes;
    rrect(ctx, ox + 17, oy + 37 + lLY, 8, 5, 2);
    rrect(ctx, ox + 13, oy + 37 + lRY, 8, 5, 2);
    // Pants
    ctx.fillStyle = c.pants;
    rrect(ctx, ox + 18, oy + 25 + lLY, 6, 14, 1);
    rrect(ctx, ox + 13, oy + 25 + lRY, 6, 14, 1);
    // Shirt
    ctx.fillStyle = c.shirt;
    rrect(ctx, ox + 10, oy + 14, 15, 13, 3);
    // Far arm
    ctx.fillStyle = c.skin;
    rrect(ctx, ox + 8, oy + 15, 6, 10, 2);
    // Neck
    ctx.fillStyle = c.skin; rrect(ctx, ox + 15, oy + 14, 5, 4, 1);
    // Head
    ctx.fillStyle = c.skin;
    ctx.beginPath(); ctx.arc(ox + 18, oy + 9, 9, 0, Math.PI * 2); ctx.fill();
    // Hair
    ctx.fillStyle = c.hair;
    ctx.beginPath();
    ctx.arc(ox + 18, oy + 9, 9, Math.PI * 0.9, Math.PI * 1.95);
    ctx.lineTo(ox + 18, oy + 9); ctx.closePath(); ctx.fill();
    ctx.fillStyle = c.hair; rrect(ctx, ox + 9, oy + 4, 3, 10, 1);
    // Eye
    ctx.fillStyle = "#1a0800";
    ctx.beginPath(); ctx.arc(ox + 24, oy + 10, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.beginPath(); ctx.arc(ox + 24.5, oy + 9.5, 0.5, 0, Math.PI * 2); ctx.fill();
    // Nose
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath(); ctx.moveTo(ox + 27, oy + 12); ctx.lineTo(ox + 28, oy + 15); ctx.lineTo(ox + 25, oy + 14); ctx.fill();
  }
}

/**
 * Generates a Phaser texture atlas for one character color scheme.
 * Atlas layout: 3 frames wide × 4 directions tall.
 * Frame names: "down_0" … "up_2"
 */
function generateAvatarTexture(
  scene: Phaser.Scene,
  key: string,
  colors: AvatarColors
): void {
  if (scene.textures.exists(key)) return;

  const cw = AV_W * WALK_FRAMES;
  const ch = AV_H * AV_DIRS.length;

  const canvas = document.createElement("canvas");
  canvas.width  = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d")!;

  AV_DIRS.forEach((dir, di) => {
    for (let f = 0; f < WALK_FRAMES; f++) {
      drawAvatarFrame(ctx, f * AV_W, di * AV_H, dir, f, colors);
    }
  });

  scene.textures.addCanvas(key, canvas);
  const tex = scene.textures.get(key);
  AV_DIRS.forEach((dir, di) => {
    for (let f = 0; f < WALK_FRAMES; f++) {
      tex.add(`${dir}_${f}`, 0, f * AV_W, di * AV_H, AV_W, AV_H);
    }
  });
}

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface RemoteAvatar {
  sessionId: string;
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Image;
  serverX: number;
  serverY: number;
  dir: Direction;
  walkPhase: number;
  walkTimer: number;
  textureKey: string;
}

// ─── MainScene ────────────────────────────────────────────────────────────────

export class MainScene extends Phaser.Scene {
  // Local player
  private playerContainer!: Phaser.GameObjects.Container;
  private playerSprite!: Phaser.GameObjects.Image;
  private localSessionId = "";
  private localDir: Direction = "down";
  private localWalkPhase = 0;
  private localWalkTimer = 0;
  private localIsMoving = false;
  private localTextureKey = "";

  private predictedX = 400;
  private predictedY = 400;

  // Physics
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<"up" | "down" | "left" | "right", Phaser.Input.Keyboard.Key>;

  // Remote players
  private remoteAvatars: Map<string, RemoteAvatar> = new Map();
  private proximityActive: Set<string> = new Set();

  // Rendering
  private mapGfx!: Phaser.GameObjects.Graphics;
  private mapLabels!: Phaser.GameObjects.Group;
  private currentMap: MapPresetData = FALLBACK_MAP_PRESETS[0];

  private lastInput: BooleanInput = { left: false, right: false, up: false, down: false };
  private frameCount = 0;

  constructor() { super({ key: "MainScene" }); }

  // ── create ──────────────────────────────────────────────────────────────────

  create(): void {
    this.mapGfx    = this.add.graphics();
    this.mapLabels = this.add.group();
    this.walls     = this.physics.add.staticGroup();

    this.buildMap(this.currentMap);

    // Map theme listener
    gameBridge.registerMapThemeListener((d: MapPresetData | string) => {
      const preset = typeof d === "string"
        ? FALLBACK_MAP_PRESETS.find((m) => m.name === d || m.id === d)
        : d;
      if (preset) { this.currentMap = preset; this.buildMap(preset); }
    });

    // ── Local player ──────────────────────────────────────────────────────────
    const name   = gameBridge.getLocalUsername?.() ?? "You";
    const colors = usernameToColors(name);
    this.localTextureKey = `av_${name}`;
    generateAvatarTexture(this, this.localTextureKey, colors);

    const sx = this.currentMap.spawnPoint?.x ?? 400;
    const sy = this.currentMap.spawnPoint?.y ?? 400;
    this.predictedX = sx; this.predictedY = sy;

    this.playerContainer = this.createAvatarContainer(sx, sy, name, this.localTextureKey, true);
    this.physics.add.existing(this.playerContainer);
    const body = this.playerContainer.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setSize(18, 12);
    body.setOffset(-9, 18);
    this.physics.add.collider(this.playerContainer, this.walls);

    this.cameras.main.startFollow(this.playerContainer, true, 0.1, 0.1);
    this.cameras.main.setZoom(1);
    this.cameras.main.setViewport(0, 0, this.scale.width, this.scale.height);

    // Input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      up:    this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down:  this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left:  this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.input.keyboard!.removeCapture("SPACE");
    this.input.keyboard!.removeCapture(32);

    gameBridge.registerStateApplier((p: PlayerState[]) => this.reconcileState(p));
  }

  // ── Avatar container factory ─────────────────────────────────────────────────

  private createAvatarContainer(
    x: number, y: number,
    name: string,
    textureKey: string,
    isLocal: boolean
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    // Character sprite
    const sprite = this.add.image(0, 0, textureKey, "down_0")
      .setOrigin(0.5, 1)
      .setScale(AV_SCALE)
      .setDepth(1);

    // Name badge (pill tag)
    const label = isLocal
      ? `● You  (${name})`
      : name;
    const badge = this.add.text(0, -(AV_H * AV_SCALE) - 4, label, {
      fontSize: "11px",
      fontFamily: "'Inter', system-ui, sans-serif",
      fontStyle: "bold",
      color: isLocal ? "#ffffff" : "#e2e8f0",
      backgroundColor: isLocal ? "#4f46e5" : "#1e293bcc",
      padding: { x: 7, y: 3 },
    })
      .setOrigin(0.5, 1)
      .setDepth(2);

    // Status dot (green)
    const dot = this.add.circle(badge.width / 2 - 6, -(AV_H * AV_SCALE) - 8, 3, 0x22c55e)
      .setDepth(3);

    container.add([sprite, badge, dot]);

    // Store sprite ref for frame updates
    if (isLocal) {
      this.playerSprite = sprite;
    }

    return container;
  }

  private getAvatarSprite(container: Phaser.GameObjects.Container): Phaser.GameObjects.Image | undefined {
    return container.list.find((c): c is Phaser.GameObjects.Image => c instanceof Phaser.GameObjects.Image);
  }

  // ── Map builder ──────────────────────────────────────────────────────────────

  private buildMap(data: MapPresetData): void {
    const W  = data.width  || 960;
    const H  = data.height || 832;
    const TS = data.tileSize || 32;

    this.physics.world.setBounds(0, 0, W, H);
    this.walls.clear(true, true);
    this.mapLabels.clear(true, true);
    this.mapGfx.clear();

    const g   = this.mapGfx;
    const s   = data.style;
    const hx  = (c: string) => parseInt(c.replace("#", "0x"), 16);
    const floorCol  = hx(s.floorColor  || "#1e293b");
    const wallCol   = hx(s.wallColor   || "#0f172a");
    const accentCol = hx(s.accentColor || "#6366f1");
    const gridCol   = hx(s.gridColor   || "#334155");
    const outsideCol = hx(s.outsideColor ?? s.floorColor);

    this.cameras.main.setBackgroundColor(outsideCol);

    // ── 1. Draw base floor ────────────────────────────────────────────────────
    g.fillStyle(floorCol, 1);
    g.fillRect(0, 0, W, H);
    this.drawFloorTexture(g, 0, 0, W, H, s.floorType || "tile", floorCol, gridCol, TS);

    // ── 2. Draw outdoor areas with grass texture ──────────────────────────────
    if (Array.isArray(data.zones)) {
      data.zones.filter((z) => z.isOutdoor).forEach((z) => {
        const zc = hx(z.color || "#4ade80");
        g.fillStyle(zc, 0.22);
        g.fillRoundedRect(z.x, z.y, z.width, z.height, 6);
        this.drawFloorTexture(g, z.x, z.y, z.width, z.height, "grass", hx(z.color || "#4ade80"), gridCol, TS);
      });
    }

    // ── 3. Draw zones ─────────────────────────────────────────────────────────
    if (Array.isArray(data.zones)) {
      data.zones.filter((z) => !z.isOutdoor).forEach((z) => {
        const zc      = hx(z.color || accentCol.toString());
        const ft      = z.floorType || s.floorType;
        const zFloor  = hx(z.color || s.floorColor);

        // Zone carpet/floor override
        g.fillStyle(zFloor, 0.16);
        g.fillRect(z.x, z.y, z.width, z.height);

        // Floor texture inside zone
        this.drawFloorTexture(g, z.x, z.y, z.width, z.height, ft, zFloor, gridCol, TS);

        // Zone border
        g.lineStyle(2, zc, 0.65);
        g.strokeRoundedRect(z.x, z.y, z.width, z.height, 4);

        // Corner L-brackets
        const b = 10;
        g.lineStyle(2.5, zc, 0.9);
        [[0, 0], [z.width, 0], [0, z.height], [z.width, z.height]].forEach(([cx, cy]) => {
          const sx = cx === 0 ? 1 : -1;
          const sy = cy === 0 ? 1 : -1;
          g.lineBetween(z.x + cx + sx * 2, z.y + cy + sy * (b + 2), z.x + cx + sx * 2, z.y + cy + sy * 2);
          g.lineBetween(z.x + cx + sx * 2, z.y + cy + sy * 2, z.x + cx + sx * (b + 2), z.y + cy + sy * 2);
        });

        // Zone label badge
        this.addLabel(z.x + 8, z.y + 5, z.name, zc, z.isPrivate);
      });
    }

    // ── 4. Draw trees (before furniture, behind avatars) ─────────────────────
    if (Array.isArray(data.trees)) {
      data.trees.forEach((t) => this.drawTree(g, t));
    }

    // ── 5. Draw furniture ────────────────────────────────────────────────────
    if (Array.isArray(data.furniture)) {
      data.furniture.forEach((f) => {
        this.drawFurniture(g, f, accentCol);
        if (f.collides !== false) {
          const zone = this.add.zone(f.x + f.width / 2, f.y + f.height / 2, f.width, f.height);
          this.physics.add.existing(zone, true);
          this.walls.add(zone as unknown as Phaser.GameObjects.GameObject);
        }
      });
    }

    // ── 6. Draw outer walls ──────────────────────────────────────────────────
    if (Array.isArray(data.obstacles)) {
      data.obstacles.forEach((o) => {
        // Wall body
        g.fillStyle(wallCol, 1);
        g.fillRect(o.x, o.y, o.width, o.height);
        // Inner highlight (top/left faces)
        g.fillStyle(0xffffff, 0.04);
        g.fillRect(o.x, o.y, o.width, 2);
        g.fillRect(o.x, o.y, 2, o.height);
        // Accent stripe
        g.lineStyle(1, accentCol, 0.18);
        g.strokeRect(o.x + 1, o.y + 1, o.width - 2, o.height - 2);

        const zone = this.add.zone(o.x + o.width / 2, o.y + o.height / 2, o.width, o.height);
        this.physics.add.existing(zone, true);
        this.walls.add(zone as unknown as Phaser.GameObjects.GameObject);
      });
    }

    // Reposition player
    if (this.playerContainer && data.spawnPoint) {
      this.playerContainer.setPosition(data.spawnPoint.x, data.spawnPoint.y);
      this.predictedX = data.spawnPoint.x;
      this.predictedY = data.spawnPoint.y;
    }

    this.applyAutoZoom(W, H);
  }

  // ── Floor texture renderer ───────────────────────────────────────────────────

  private drawFloorTexture(
    g: Phaser.GameObjects.Graphics,
    x: number, y: number, w: number, h: number,
    type: string,
    baseCol: number,
    gridCol: number,
    ts: number
  ): void {
    const lighter = (col: number, amt = 0.08) => {
      const r = Math.min(255, ((col >> 16) & 0xff) + amt * 255);
      const gr = Math.min(255, ((col >> 8)  & 0xff) + amt * 255);
      const b  = Math.min(255, (col & 0xff) + amt * 255);
      return (Math.round(r) << 16) | (Math.round(gr) << 8) | Math.round(b);
    };

    switch (type) {
      case "wood": {
        // Horizontal planks — alternating slightly lighter strips
        const plankH = Math.max(8, ts / 4);
        for (let row = 0; row * plankH < h; row++) {
          const py = y + row * plankH;
          const shade = row % 2 === 0 ? 0.06 : 0.0;
          g.fillStyle(lighter(baseCol, shade), 0.55);
          g.fillRect(x, Math.min(py, y + h - 1), w, Math.min(plankH - 1, h - row * plankH));
        }
        // Grain lines
        g.lineStyle(0.5, gridCol, 0.12);
        for (let row = 1; row * plankH < h; row++) {
          g.lineBetween(x, y + row * plankH, x + w, y + row * plankH);
        }
        break;
      }
      case "carpet": {
        // Small dot pattern
        g.fillStyle(lighter(baseCol, 0.12), 0.3);
        const d = ts / 4;
        for (let px = x + d; px < x + w; px += d) {
          for (let py = y + d; py < y + h; py += d) {
            g.fillRect(px - 0.5, py - 0.5, 1, 1);
          }
        }
        // Carpet border inset line
        g.lineStyle(2, gridCol, 0.2);
        g.strokeRect(x + 4, y + 4, w - 8, h - 8);
        break;
      }
      case "tile": {
        // Square tiles with grout lines
        g.lineStyle(1, gridCol, 0.25);
        for (let tx = x; tx < x + w; tx += ts) g.lineBetween(tx, y, tx, y + h);
        for (let ty = y; ty < y + h; ty += ts) g.lineBetween(x, ty, x + w, ty);
        // Checkerboard tint (every other tile)
        g.fillStyle(lighter(baseCol, 0.06), 0.2);
        for (let tx = x; tx < x + w; tx += ts) {
          for (let ty = y; ty < y + h; ty += ts) {
            const col = (Math.round((tx - x) / ts) + Math.round((ty - y) / ts)) % 2;
            if (col === 0) g.fillRect(tx + 1, ty + 1, ts - 2, ts - 2);
          }
        }
        break;
      }
      case "grass": {
        // Scattered grass blades (small angled lines)
        g.lineStyle(1, lighter(baseCol, 0.2), 0.35);
        const step = 18;
        for (let gx = x + 9; gx < x + w; gx += step) {
          for (let gy = y + 9; gy < y + h; gy += step) {
            const offset = (gx + gy) % 5 - 2;
            g.lineBetween(gx + offset, gy + 3, gx + offset + 2, gy - 3);
            g.lineBetween(gx + offset + 4, gy + 3, gx + offset + 6, gy - 3);
          }
        }
        break;
      }
      case "metal": {
        // Diagonal hatch + grating
        g.lineStyle(0.5, gridCol, 0.2);
        for (let k = x - h; k < x + w + h; k += ts) {
          g.lineBetween(Math.max(x, k), y, Math.min(x + w, k + h), Math.min(y + h, y + (k + h - x)));
        }
        g.lineStyle(0.5, gridCol, 0.12);
        for (let tx = x; tx < x + w; tx += ts) g.lineBetween(tx, y, tx, y + h);
        for (let ty = y; ty < y + h; ty += ts) g.lineBetween(x, ty, x + w, ty);
        break;
      }
      case "neon_tile": {
        // Larger squares with glowing border
        const nt = ts * 2;
        for (let tx = x; tx < x + w; tx += nt) {
          for (let ty = y; ty < y + h; ty += nt) {
            g.lineStyle(1, 0xe11d48, 0.3);
            g.strokeRect(tx + 1, ty + 1, Math.min(nt - 2, x + w - tx - 2), Math.min(nt - 2, y + h - ty - 2));
          }
        }
        // Inner dot at each grid intersection
        g.fillStyle(0xf43f5e, 0.2);
        for (let tx = x + nt; tx < x + w; tx += nt) {
          for (let ty = y + nt; ty < y + h; ty += nt) {
            g.fillCircle(tx, ty, 2);
          }
        }
        break;
      }
      default:
        break;
    }
  }

  // ── Tree renderer ────────────────────────────────────────────────────────────

  private drawTree(g: Phaser.GameObjects.Graphics, t: MapTree): void {
    const r       = t.radius ?? 22;
    const trunkH  = t.trunkH ?? 14;
    const variant = t.variant ?? 0;
    const { x, y } = t;

    // Shadow
    g.fillStyle(0x000000, 0.15);
    g.fillEllipse(x, y + r + trunkH * 0.6, r * 1.6, r * 0.55);

    // Trunk
    g.fillStyle(0x6b3f1e, 1);
    g.fillRect(x - 5, y, 10, trunkH);
    g.fillStyle(0x8b5e3c, 1);
    g.fillRect(x - 4, y, 4, trunkH); // highlight face

    if (variant === 0) {
      // Round tree — 3 layered circles
      g.fillStyle(0x1a6b2c, 1); g.fillCircle(x, y - r * 0.4, r);
      g.fillStyle(0x22913d, 1); g.fillCircle(x - r * 0.15, y - r * 0.55, r * 0.8);
      g.fillStyle(0x2db84e, 1); g.fillCircle(x + r * 0.05, y - r * 0.65, r * 0.6);
      // Highlight
      g.fillStyle(0x4dce6a, 0.6); g.fillCircle(x - r * 0.2, y - r * 0.8, r * 0.25);
    } else if (variant === 1) {
      // Tall/pine — stacked triangles
      const levels = 3;
      for (let i = 0; i < levels; i++) {
        const lr = r * (0.85 - i * 0.22);
        const ly = y - i * r * 0.45;
        g.fillStyle(0x1a6b2c, 1);
        g.fillTriangle(x, ly - lr - r * 0.3, x - lr, ly + r * 0.2, x + lr, ly + r * 0.2);
        g.fillStyle(0x2db84e, 0.7);
        g.fillTriangle(x, ly - lr - r * 0.4, x - lr * 0.6, ly, x + lr * 0.6, ly);
      }
    } else {
      // Bush — wide and low
      g.fillStyle(0x1a6b2c, 1); g.fillEllipse(x, y - r * 0.3, r * 2.2, r * 1.1);
      g.fillStyle(0x22913d, 1); g.fillEllipse(x - r * 0.3, y - r * 0.5, r * 1.4, r * 0.9);
      g.fillStyle(0x2db84e, 0.7); g.fillEllipse(x + r * 0.2, y - r * 0.55, r * 1.2, r * 0.75);
      g.fillStyle(0x4dce6a, 0.5); g.fillCircle(x - r * 0.1, y - r * 0.6, r * 0.3);
    }
  }

  // ── Furniture renderer ───────────────────────────────────────────────────────

  private drawFurniture(
    g: Phaser.GameObjects.Graphics,
    f: MapFurniture,
    accentCol: number
  ): void {
    const hx = (c: string) => parseInt(c.replace("#", "0x"), 16);
    const col = hx(f.color);
    const { x, y, width: w, height: h, type } = f;

    // Drop shadow
    g.fillStyle(0x000000, 0.22);
    g.fillRoundedRect(x + 3, y + 5, w, h, 5);

    switch (type) {
      case "desk": {
        // Desk surface
        g.fillStyle(col, 1);
        g.fillRoundedRect(x, y, w, h, 5);
        // Surface highlight
        g.fillStyle(0xffffff, 0.1);
        g.fillRoundedRect(x + 2, y + 2, w * 0.55, h * 0.4, 3);
        // Edge line
        g.lineStyle(1.5, 0xffffff, 0.25);
        g.strokeRoundedRect(x, y, w, h, 5);
        // Desk legs (bottom edge darker strip)
        g.fillStyle(0x000000, 0.15);
        g.fillRect(x + 5, y + h - 5, w - 10, 5);
        if (f.label) this.addSmallLabel(x + w / 2, y + h / 2, f.label);
        break;
      }
      case "monitor": {
        // Monitor back
        g.fillStyle(0x1e293b, 1);
        g.fillRoundedRect(x, y, w, h, 3);
        // Screen (slightly inset)
        g.fillStyle(0x0ea5e9, 0.8);
        g.fillRoundedRect(x + 2, y + 2, w - 4, h - 5, 2);
        // Screen glare
        g.fillStyle(0xffffff, 0.18);
        g.fillRoundedRect(x + 3, y + 3, (w - 6) * 0.45, (h - 8) * 0.5, 1);
        // Stand
        g.fillStyle(0x475569, 1);
        g.fillRect(x + w / 2 - 2, y + h - 3, 4, 4);
        break;
      }
      case "chair": {
        // Seat cushion
        g.fillStyle(col, 1);
        g.fillRoundedRect(x, y + h * 0.3, w, h * 0.7, 5);
        // Back rest
        g.fillStyle(col, 1);
        g.fillRoundedRect(x + 3, y, w - 6, h * 0.45, 5);
        // Cushion highlight
        g.fillStyle(0xffffff, 0.15);
        g.fillRoundedRect(x + 4, y + h * 0.33, w - 8, h * 0.25, 3);
        // Border
        g.lineStyle(1, 0x000000, 0.15);
        g.strokeRoundedRect(x, y + h * 0.3, w, h * 0.7, 5);
        break;
      }
      case "sofa": {
        // Base
        g.fillStyle(col, 1); g.fillRoundedRect(x, y, w, h, 8);
        // Back cushion
        g.fillStyle(0x000000, 0.1); g.fillRoundedRect(x + 2, y + 2, w - 4, h * 0.45, 5);
        // Seat cushions (2)
        g.fillStyle(0xffffff, 0.12);
        g.fillRoundedRect(x + 4, y + h * 0.52, w / 2 - 6, h * 0.36, 4);
        g.fillRoundedRect(x + w / 2 + 2, y + h * 0.52, w / 2 - 6, h * 0.36, 4);
        // Armrests
        g.fillStyle(0x000000, 0.15);
        g.fillRoundedRect(x, y, 8, h, 4);
        g.fillRoundedRect(x + w - 8, y, 8, h, 4);
        g.lineStyle(1.5, 0xffffff, 0.2); g.strokeRoundedRect(x, y, w, h, 8);
        if (f.label) this.addSmallLabel(x + w / 2, y + h / 2, f.label);
        break;
      }
      case "table": {
        // Table top
        g.fillStyle(col, 1); g.fillRoundedRect(x, y, w, h, 6);
        g.fillStyle(0xffffff, 0.12); g.fillRoundedRect(x + 3, y + 3, w * 0.55, h * 0.4, 3);
        g.lineStyle(1.5, 0xffffff, 0.2); g.strokeRoundedRect(x, y, w, h, 6);
        // Table legs (corner dots)
        g.fillStyle(0x000000, 0.25);
        [[6, 6], [w - 10, 6], [6, h - 10], [w - 10, h - 10]].forEach(([lx, ly]) => {
          g.fillRect(x + lx, y + ly, 4, 4);
        });
        if (f.label) this.addSmallLabel(x + w / 2, y + h / 2, f.label);
        break;
      }
      case "plant": {
        // Pot
        const potH = h * 0.42;
        g.fillStyle(0xc2410c, 1); g.fillRoundedRect(x + w * 0.2, y + h - potH, w * 0.6, potH, 3);
        g.fillStyle(0x92400e, 1); g.fillRect(x + w * 0.18, y + h - potH - 2, w * 0.64, 4);
        // Dirt
        g.fillStyle(0x4a2c00, 1); g.fillEllipse(x + w / 2, y + h - potH + 4, w * 0.55, 6);
        // Leaves (stacked circles)
        g.fillStyle(0x166534, 1); g.fillCircle(x + w / 2, y + h - potH - 8, w * 0.48);
        g.fillStyle(0x16a34a, 1); g.fillCircle(x + w / 2 - 3, y + h - potH - 14, w * 0.38);
        g.fillStyle(0x4ade80, 0.7); g.fillCircle(x + w / 2 + 2, y + h - potH - 18, w * 0.26);
        g.fillStyle(0x86efac, 0.5); g.fillCircle(x + w / 2 - 1, y + h - potH - 22, w * 0.16);
        break;
      }
      case "bookshelf": {
        // Frame
        g.fillStyle(0x78350f, 1); g.fillRoundedRect(x, y, w, h, 3);
        g.lineStyle(1, 0x000000, 0.3); g.strokeRoundedRect(x, y, w, h, 3);
        // Shelves
        const shelfCount = Math.max(2, Math.floor(h / 20));
        const shelfH = h / shelfCount;
        for (let i = 0; i < shelfCount; i++) {
          const sy2 = y + i * shelfH;
          // Shelf line
          g.fillStyle(0x92400e, 1); g.fillRect(x + 2, sy2 + shelfH - 3, w - 4, 3);
          // Books (colored spines)
          const bookColors = [0xe11d48, 0x2563eb, 0x16a34a, 0xd97706, 0x7c3aed, 0x0891b2];
          let bx = x + 4;
          while (bx < x + w - 6) {
            const bw = 5 + Math.floor(((bx + i) % 4) * 2);
            const bc = bookColors[(bx + i) % bookColors.length];
            g.fillStyle(bc, 0.85);
            g.fillRect(bx, sy2 + 2, bw, shelfH - 5);
            bx += bw + 1;
          }
        }
        if (f.label) this.addSmallLabel(x + w / 2, y + h / 2, f.label);
        break;
      }
      case "bar": {
        g.fillStyle(col, 1); g.fillRoundedRect(x, y, w, h, 6);
        // Bar top surface sheen
        g.fillStyle(0xffffff, 0.18); g.fillRoundedRect(x + 2, y + 2, w - 4, h * 0.35, 4);
        // Bottles (top edge)
        const bottleColors = [0xef4444, 0x22d3ee, 0xa3e635, 0xfbbf24];
        for (let i = 0; i < 4 && i * 14 < w - 10; i++) {
          g.fillStyle(bottleColors[i % 4], 0.8);
          g.fillRoundedRect(x + 5 + i * 14, y + 3, 8, 14, 3);
        }
        g.lineStyle(1.5, 0xffffff, 0.2); g.strokeRoundedRect(x, y, w, h, 6);
        if (f.label) this.addSmallLabel(x + w / 2, y + h * 0.7, f.label);
        break;
      }
      case "board": {
        // Board frame
        g.fillStyle(0x1e293b, 1); g.fillRoundedRect(x, y, w, h + 2, 3);
        // Board surface
        g.fillStyle(col, 1); g.fillRect(x + 3, y + 2, w - 6, h - 2);
        // Board lines (content)
        g.lineStyle(1, 0xffffff, 0.25);
        for (let i = 1; i < 3; i++) g.lineBetween(x + 3, y + 2 + i * (h / 3), x + w - 3, y + 2 + i * (h / 3));
        // Glare
        g.fillStyle(0xffffff, 0.08); g.fillRoundedRect(x + 3, y + 2, (w - 6) * 0.4, h - 2, 1);
        if (f.label) this.addSmallLabel(x + w / 2, y + h / 2, f.label);
        break;
      }
      case "podium": {
        g.fillStyle(col, 1); g.fillRoundedRect(x, y, w, h, 5);
        g.fillStyle(0xffffff, 0.15); g.fillRoundedRect(x + 3, y + 3, w - 6, h * 0.38, 3);
        g.lineStyle(1.5, 0xffffff, 0.3); g.strokeRoundedRect(x, y, w, h, 5);
        if (f.label) this.addSmallLabel(x + w / 2, y + h / 2, f.label);
        break;
      }
      case "bench": {
        g.fillStyle(0x78350f, 1); g.fillRoundedRect(x, y + h * 0.35, w, h * 0.35, 4); // seat
        g.fillStyle(0x92400e, 1); g.fillRect(x + 5, y + h * 0.7, w - 10, h * 0.3); // legs area
        g.fillStyle(0x6b2d0a, 1);
        g.fillRect(x + 6, y + h * 0.7, 5, h * 0.3);
        g.fillRect(x + w - 11, y + h * 0.7, 5, h * 0.3);
        break;
      }
      case "rug": {
        g.fillStyle(col, 0.55); g.fillRoundedRect(x, y, w, h, 10);
        g.lineStyle(4, col, 0.7); g.strokeRoundedRect(x + 5, y + 5, w - 10, h - 10, 7);
        g.lineStyle(2, 0xffffff, 0.1); g.strokeRoundedRect(x + 10, y + 10, w - 20, h - 20, 5);
        break;
      }
      case "fountain": {
        // Outer basin
        g.fillStyle(0x94a3b8, 1); g.fillCircle(x + w / 2, y + h / 2, w / 2);
        // Water
        g.fillStyle(col, 0.75); g.fillCircle(x + w / 2, y + h / 2, w / 2 - 6);
        // Water ripple lines
        g.lineStyle(1, 0xffffff, 0.35);
        g.strokeCircle(x + w / 2, y + h / 2, w / 2 - 10);
        g.lineStyle(0.5, 0xffffff, 0.2);
        g.strokeCircle(x + w / 2, y + h / 2, w / 2 - 14);
        // Centre spout
        g.fillStyle(0xe2e8f0, 1); g.fillCircle(x + w / 2, y + h / 2, 5);
        g.fillStyle(0xbae6fd, 0.7); g.fillCircle(x + w / 2, y + h / 2, 3);
        if (f.label) this.addSmallLabel(x + w / 2, y + h / 2 + w / 2 + 6, f.label);
        break;
      }
      case "console": {
        // Console unit
        g.fillStyle(0x1e3a5f, 1); g.fillRoundedRect(x, y, w, h, 4);
        // Screen
        g.fillStyle(col, 0.85); g.fillRoundedRect(x + 3, y + 3, w - 6, h * 0.55, 3);
        g.fillStyle(0xffffff, 0.2); g.fillRoundedRect(x + 4, y + 4, (w - 8) * 0.4, h * 0.25, 2);
        // Buttons row
        const btnColors = [0xef4444, 0xf59e0b, 0x22c55e];
        btnColors.forEach((bc, i) => { g.fillStyle(bc, 1); g.fillCircle(x + 8 + i * 9, y + h - 7, 3); });
        g.lineStyle(1, col, 0.5); g.strokeRoundedRect(x, y, w, h, 4);
        if (f.label) this.addSmallLabel(x + w / 2, y - 4, f.label);
        break;
      }
      case "reactor": {
        // Outer casing
        g.fillStyle(0x1e3a5f, 1); g.fillCircle(x + w / 2, y + h / 2, w / 2);
        // Inner ring
        g.fillStyle(col, 0.6); g.fillCircle(x + w / 2, y + h / 2, w / 2 - 8);
        // Core glow
        g.fillStyle(0xffffff, 0.7); g.fillCircle(x + w / 2, y + h / 2, w / 2 - 18);
        g.fillStyle(col, 1); g.fillCircle(x + w / 2, y + h / 2, w / 2 - 22);
        // Pulse ring
        g.lineStyle(2, col, 0.5); g.strokeCircle(x + w / 2, y + h / 2, w / 2 - 4);
        if (f.label) this.addSmallLabel(x + w / 2, y + h / 2, f.label);
        break;
      }
      case "dj": {
        g.fillStyle(0x0a0a0a, 1); g.fillRoundedRect(x, y, w, h, 5);
        // Decks (two turntables)
        const dkW = w * 0.38;
        g.fillStyle(0x1e293b, 1); g.fillCircle(x + w * 0.25, y + h * 0.5, dkW / 2);
        g.fillStyle(1 ? col : 0x111, 1); g.fillCircle(x + w * 0.75, y + h * 0.5, dkW / 2);
        // Record grooves
        g.lineStyle(0.5, 0x475569, 0.5);
        for (let r2 = 5; r2 < dkW / 2 - 2; r2 += 5) {
          g.strokeCircle(x + w * 0.25, y + h * 0.5, r2);
          g.strokeCircle(x + w * 0.75, y + h * 0.5, r2);
        }
        // Centre pins
        g.fillStyle(0xfbbf24, 1); g.fillCircle(x + w * 0.25, y + h * 0.5, 3);
        g.fillStyle(col, 1); g.fillCircle(x + w * 0.75, y + h * 0.5, 3);
        // Mixer strip
        g.fillStyle(0x374151, 1); g.fillRoundedRect(x + w * 0.42, y + 4, w * 0.16, h - 8, 3);
        g.lineStyle(1, col, 0.5); g.strokeRoundedRect(x, y, w, h, 5);
        if (f.label) this.addSmallLabel(x + w / 2, y - 4, f.label);
        break;
      }
      default: {
        // Generic fallback
        g.fillStyle(col, 1); g.fillRoundedRect(x, y, w, h, 5);
        g.fillStyle(0xffffff, 0.1); g.fillRoundedRect(x + 2, y + 2, w - 4, h * 0.35, 3);
        g.lineStyle(1.5, 0xffffff, 0.2); g.strokeRoundedRect(x, y, w, h, 5);
        if (f.label) this.addSmallLabel(x + w / 2, y + h / 2, f.label);
        break;
      }
    }
  }

  // ── Label helpers ────────────────────────────────────────────────────────────

  private addLabel(
    x: number, y: number,
    text: string,
    color: number,
    isPrivate?: boolean
  ): void {
    const hex = "#" + color.toString(16).padStart(6, "0");
    const txt = this.add.text(x, y, (isPrivate ? "🔒 " : "") + text, {
      fontSize: "10px",
      fontFamily: "'Inter', system-ui, sans-serif",
      fontStyle: "bold",
      color: "#ffffff",
    }).setDepth(5);
    txt.setBackgroundColor(hex + "cc");
    txt.setPadding(5, 2, 5, 2);
    this.mapLabels.add(txt);
  }

  private addSmallLabel(x: number, y: number, text: string): void {
    const txt = this.add.text(x, y, text, {
      fontSize: "9px",
      fontFamily: "'Inter', system-ui, sans-serif",
      fontStyle: "bold",
      color: "#ffffff",
      backgroundColor: "#0f172acc",
    })
      .setOrigin(0.5, 0.5)
      .setPadding(4, 1, 4, 1)
      .setDepth(5);
    this.mapLabels.add(txt);
  }

  // ── Zoom helper ──────────────────────────────────────────────────────────────

  private applyAutoZoom(W: number, H: number): void {
    const cW = this.scale.width, cH = this.scale.height;
    if (!cW || !cH) return;
    // "Fit" zoom: shrink until the entire world is visible in the viewport
    // Multiply by 0.82 for comfortable breathing room around the map edges.
    // Clamped so tiny maps don't over-zoom and huge maps stay legible.
    const fitZoom = Math.min(cW / W, cH / H) * 0.82;
    this.cameras.main.setZoom(Phaser.Math.Clamp(fitZoom, 0.35, 1.0));
    this.cameras.main.setViewport(0, 0, cW, cH);
  }

  // ── Per-frame update ──────────────────────────────────────────────────────────

  update(_t: number, delta: number): void {
    if (!this.playerContainer?.body) return;
    const body = this.playerContainer.body as Phaser.Physics.Arcade.Body;

    const activeEl = document.activeElement;
    const isTyping = !!(activeEl && (
      activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA" ||
      (activeEl as HTMLElement).isContentEditable
    ));

    const touch = gameBridge.getTouchInput();
    const kbOk  = !isTyping;

    const left  = (kbOk && (this.cursors.left.isDown  || this.wasd.left.isDown))  || touch.left;
    const right = (kbOk && (this.cursors.right.isDown || this.wasd.right.isDown)) || touch.right;
    const up    = (kbOk && (this.cursors.up.isDown    || this.wasd.up.isDown))    || touch.up;
    const down  = (kbOk && (this.cursors.down.isDown  || this.wasd.down.isDown))  || touch.down;

    let vx = 0, vy = 0;
    if (left)  vx -= SPEED;
    if (right) vx += SPEED;
    if (up)    vy -= SPEED;
    if (down)  vy += SPEED;
    if (vx && vy) { vx *= 0.707; vy *= 0.707; }
    body.setVelocity(vx, vy);

    const moving = vx !== 0 || vy !== 0;

    // Direction
    if (moving) {
      if (Math.abs(vx) >= Math.abs(vy)) this.localDir = vx > 0 ? "right" : "left";
      else this.localDir = vy > 0 ? "down" : "up";
    }
    this.localIsMoving = moving;

    // Walk frame cycle (every ~120 ms)
    if (moving) {
      this.localWalkTimer += delta;
      if (this.localWalkTimer > 120) {
        this.localWalkTimer = 0;
        this.localWalkPhase = (this.localWalkPhase === 0) ? 1 : (this.localWalkPhase === 1) ? 2 : 1;
      }
    } else {
      this.localWalkPhase = 0;
      this.localWalkTimer = 0;
    }

    // Update local sprite frame
    this.playerSprite?.setFrame(`${this.localDir}_${this.localWalkPhase}`);

    // Slight bob when moving
    if (moving) {
      this.playerSprite?.setY(Math.sin(this.localWalkTimer * 0.05) * 1.5);
    } else {
      this.playerSprite?.setY(0);
    }

    this.predictedX = this.playerContainer.x;
    this.predictedY = this.playerContainer.y;

    // Emit input if changed
    const newInput: BooleanInput = { left, right, up, down };
    if (
      newInput.left  !== this.lastInput.left  ||
      newInput.right !== this.lastInput.right ||
      newInput.up    !== this.lastInput.up    ||
      newInput.down  !== this.lastInput.down
    ) {
      gameBridge.emitInput(newInput);
      this.lastInput = { ...newInput };
    }

    this.frameCount++;
    if (this.frameCount % 10 === 0) this.checkProximity();

    // Interpolate remote avatars + animate walk
    this.remoteAvatars.forEach((av) => {
      const dX = Math.abs(av.container.x - av.serverX);
      const dY = Math.abs(av.container.y - av.serverY);
      if (dX < 0.5 && dY < 0.5) {
        // Idle
        av.sprite.setFrame(`${av.dir}_0`);
        return;
      }

      const prevX = av.container.x;
      const prevY = av.container.y;
      av.container.x = Phaser.Math.Linear(av.container.x, av.serverX, 0.15);
      av.container.y = Phaser.Math.Linear(av.container.y, av.serverY, 0.15);

      const dx = av.container.x - prevX;
      const dy = av.container.y - prevY;

      // Update direction
      if (Math.abs(dx) >= Math.abs(dy)) av.dir = dx > 0 ? "right" : "left";
      else av.dir = dy > 0 ? "down" : "up";

      // Walk frame
      av.walkTimer += delta;
      if (av.walkTimer > 120) {
        av.walkTimer = 0;
        av.walkPhase = av.walkPhase === 0 ? 1 : av.walkPhase === 1 ? 2 : 1;
      }
      av.sprite.setFrame(`${av.dir}_${av.walkPhase}`);

      // Bob
      av.sprite.setY(Math.sin(av.walkTimer * 0.05) * 1.5);
    });
  }

  // ── State reconciliation ──────────────────────────────────────────────────────

  private reconcileState(players: PlayerState[]): void {
    const seen = new Set<string>();

    players.forEach((p) => {
      if (p.sessionId === this.localSessionId) {
        const dx = p.x - this.predictedX, dy = p.y - this.predictedY;
        const drift = Math.sqrt(dx * dx + dy * dy);
        if (drift > 50) {
          this.playerContainer.setPosition(p.x, p.y);
          this.predictedX = p.x; this.predictedY = p.y;
        } else if (drift > 5) {
          const cx = this.predictedX + dx * 0.3, cy = this.predictedY + dy * 0.3;
          this.playerContainer.setPosition(cx, cy);
          this.predictedX = cx; this.predictedY = cy;
        }
        return;
      }

      seen.add(p.sessionId);

      if (!this.remoteAvatars.has(p.sessionId)) {
        const name    = p.username ?? p.sessionId.slice(0, 6);
        const colors  = usernameToColors(name);
        const tKey    = `av_${name}_${p.sessionId.slice(0, 4)}`;
        generateAvatarTexture(this, tKey, colors);

        const container = this.createAvatarContainer(p.x, p.y, name, tKey, false);
        const sprite    = this.getAvatarSprite(container)!;

        this.remoteAvatars.set(p.sessionId, {
          sessionId: p.sessionId,
          container,
          sprite,
          serverX: p.x,
          serverY: p.y,
          dir: "down",
          walkPhase: 0,
          walkTimer: 0,
          textureKey: tKey,
        });
      } else {
        const av = this.remoteAvatars.get(p.sessionId)!;
        av.serverX = p.x;
        av.serverY = p.y;
      }
    });

    this.remoteAvatars.forEach((av, id) => {
      if (!seen.has(id)) {
        av.container.destroy();
        this.remoteAvatars.delete(id);
        if (this.proximityActive.has(id)) {
          gameBridge.emitProximityEnd(id);
          this.proximityActive.delete(id);
        }
      }
    });
  }

  // ── Proximity ────────────────────────────────────────────────────────────────

  private checkProximity(): void {
    this.remoteAvatars.forEach((av, id) => {
      const dx   = this.playerContainer.x - av.container.x;
      const dy   = this.playerContainer.y - av.container.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < PROXIMITY_RADIUS && !this.proximityActive.has(id)) {
        this.proximityActive.add(id);
        gameBridge.emitProximityStart(id);
      } else if (dist >= PROXIMITY_RADIUS && this.proximityActive.has(id)) {
        this.proximityActive.delete(id);
        gameBridge.emitProximityEnd(id);
      }
    });
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  setLocalSessionId(id: string): void {
    this.localSessionId = id;
    if (this.remoteAvatars.has(id)) {
      this.remoteAvatars.get(id)?.container.destroy();
      this.remoteAvatars.delete(id);
    }
  }

  onGameResize(w: number, h: number): void {
    this.cameras.main.setViewport(0, 0, w, h);
    this.applyAutoZoom(this.currentMap.width || 960, this.currentMap.height || 832);
  }
}
