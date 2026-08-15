import Phaser from "phaser";
import { gameBridge, BooleanInput, PlayerState } from "../GameBridge";
import { MapPresetData, FALLBACK_MAP_PRESETS } from "@/lib/api";

const PROXIMITY_RADIUS = 220;

interface RemoteAvatar {
  sessionId: string;
  container: Phaser.GameObjects.Container;
  serverX: number;
  serverY: number;
}

export class MainScene extends Phaser.Scene {
  private playerContainer!: Phaser.GameObjects.Container;
  private localSessionId = "";

  private predictedX = 400;
  private predictedY = 400;

  private walls!: Phaser.Physics.Arcade.StaticGroup;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  private remoteAvatars: Map<string, RemoteAvatar> = new Map();
  private proximityActive: Set<string> = new Set();

  // Frame counter for throttling proximity check (runs every N frames)
  private frameCounter = 0;
  private readonly PROXIMITY_CHECK_INTERVAL = 10; // check every 10 frames (~6Hz at 60fps)

  private lastInput: BooleanInput = {
    left: false,
    right: false,
    up: false,
    down: false,
  };

  private readonly SPEED = 160;

  // Render layers
  private mapGraphics!: Phaser.GameObjects.Graphics;
  private zoneLabelsGroup!: Phaser.GameObjects.Group;
  private currentMapData: MapPresetData = FALLBACK_MAP_PRESETS[0];

  constructor() {
    super({ key: "MainScene" });
  }

  create() {
    this.mapGraphics = this.add.graphics();
    this.zoneLabelsGroup = this.add.group();
    this.walls = this.physics.add.staticGroup();

    // Render initial map
    this.buildMap(this.currentMapData);

    // Register map data listener
    gameBridge.registerMapThemeListener((mapData: MapPresetData | string) => {
      if (typeof mapData === "string") {
        const found = FALLBACK_MAP_PRESETS.find((m) => m.name === mapData || m.id === mapData);
        if (found) {
          this.currentMapData = found;
          this.buildMap(found);
        }
      } else if (mapData && typeof mapData === "object") {
        this.currentMapData = mapData;
        this.buildMap(mapData);
      }
    });

    // ── Local player avatar creation (Gather.town style) ──────────────────────
    const startX = this.currentMapData.spawnPoint?.x ?? 400;
    const startY = this.currentMapData.spawnPoint?.y ?? 400;
    this.predictedX = startX;
    this.predictedY = startY;

    this.playerContainer = this.createAvatarContainer(startX, startY, "You", 0x6366f1, true);
    this.physics.add.existing(this.playerContainer);
    const body = this.playerContainer.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setSize(24, 24);
    body.setOffset(-12, -12);

    // Collide player with walls
    this.physics.add.collider(this.playerContainer, this.walls);

    // Camera settings — follow player, set viewport to full canvas
    this.cameras.main.startFollow(this.playerContainer, true, 0.1, 0.1);
    this.cameras.main.setZoom(1);
    // Ensure camera viewport covers the whole canvas (not just world bounds)
    this.cameras.main.setViewport(0, 0, this.scale.width, this.scale.height);

    // Input keys — Arrow keys for desktop movement (WASD and Spacebar disabled)
    this.cursors = this.input.keyboard!.createCursorKeys();

    // Register state applier on bridge
    gameBridge.registerStateApplier((players: PlayerState[]) => {
      this.reconcileState(players);
    });

    console.log("[MainScene] Gather.town-style spatial map created:", this.currentMapData.name);
  }

  // ─── Build Map with Zones, Obstacles & Furniture ─────────────────────────

  private buildMap(data: MapPresetData) {
    const width = data.width || 800;
    const height = data.height || 800;
    const tileSize = data.tileSize || 32;

    // Physics world bounds (player can't walk off the map)
    this.physics.world.setBounds(0, 0, width, height);

    // Clear old physics walls
    this.walls.clear(true, true);
    this.zoneLabelsGroup.clear(true, true);
    this.mapGraphics.clear();

    const gfx = this.mapGraphics;
    const style = data.style || {
      floorColor: "#1e293b",
      wallColor: "#0f172a",
      gridColor: "#334155",
      accentColor: "#6366f1",
    };

    const hexColor = (c: string) => parseInt(c.replace("#", "0x"), 16);
    const floorCol = hexColor(style.floorColor || "#1e293b");
    const wallCol = hexColor(style.wallColor || "#0f172a");
    const gridCol = hexColor(style.gridColor || "#334155");

    // Match camera background to floor color so the area outside the map world
    // blends seamlessly instead of showing a different colour.
    this.cameras.main.setBackgroundColor(floorCol);

    // 1. Draw base floor
    gfx.fillStyle(floorCol, 1);
    gfx.fillRect(0, 0, width, height);

    // Floor grid pattern
    gfx.lineStyle(1, gridCol, 0.25);
    for (let x = 0; x <= width; x += tileSize) {
      gfx.lineBetween(x, 0, x, height);
    }
    for (let y = 0; y <= height; y += tileSize) {
      gfx.lineBetween(0, y, width, y);
    }

    // 2. Draw Zones (Rooms / Lounges / Private Areas)
    if (Array.isArray(data.zones)) {
      data.zones.forEach((zone) => {
        const zoneCol = hexColor(zone.color || "#6366f1");

        // Fill zone with semi-transparent tint
        gfx.fillStyle(zoneCol, zone.isPrivate ? 0.25 : 0.15);
        gfx.fillRoundedRect(zone.x, zone.y, zone.width, zone.height, 8);

        // Border outline
        gfx.lineStyle(2, zoneCol, 0.8);
        gfx.strokeRoundedRect(zone.x, zone.y, zone.width, zone.height, 8);

        // Zone header label
        const txt = this.add.text(
          zone.x + 12,
          zone.y + 10,
          zone.name.toUpperCase(),
          {
            fontSize: "11px",
            fontStyle: "bold",
            color: "#ffffff",
            backgroundColor: "#0f172ab0",
            padding: { x: 6, y: 3 },
          }
        );
        this.zoneLabelsGroup.add(txt);
      });
    }

    // 3. Draw Furniture & Objects
    if (Array.isArray(data.furniture)) {
      data.furniture.forEach((f) => {
        const fCol = hexColor(f.color || "#6366f1");

        // Draw object fill & shadow
        gfx.fillStyle(0x000000, 0.2);
        gfx.fillRoundedRect(f.x + 3, f.y + 3, f.width, f.height, 6);

        gfx.fillStyle(fCol, 1);
        gfx.fillRoundedRect(f.x, f.y, f.width, f.height, 6);

        gfx.lineStyle(2, 0xffffff, 0.4);
        gfx.strokeRoundedRect(f.x, f.y, f.width, f.height, 6);

        // Furniture label if specified
        if (f.label) {
          const fLabel = this.add.text(
            f.x + f.width / 2,
            f.y + f.height / 2,
            f.label,
            {
              fontSize: "10px",
              fontStyle: "bold",
              color: "#ffffff",
            }
          ).setOrigin(0.5, 0.5);
          this.zoneLabelsGroup.add(fLabel);
        }

        // Add collision body if furniture collides
        if (f.collides !== false) {
          const zone = this.add.zone(f.x + f.width / 2, f.y + f.height / 2, f.width, f.height);
          this.physics.add.existing(zone, true);
          this.walls.add(zone as unknown as Phaser.GameObjects.GameObject);
        }
      });
    }

    // 4. Draw Obstacles & Outer Walls
    if (Array.isArray(data.obstacles)) {
      data.obstacles.forEach((obs) => {
        gfx.fillStyle(wallCol, 1);
        gfx.fillRect(obs.x, obs.y, obs.width, obs.height);

        gfx.lineStyle(2, hexColor(style.accentColor || "#6366f1"), 0.5);
        gfx.strokeRect(obs.x, obs.y, obs.width, obs.height);

        // Create static physics body for wall obstacle
        const zone = this.add.zone(obs.x + obs.width / 2, obs.y + obs.height / 2, obs.width, obs.height);
        this.physics.add.existing(zone, true);
        this.walls.add(zone as unknown as Phaser.GameObjects.GameObject);
      });
    }

    // Move spawn point if player exists
    if (this.playerContainer && data.spawnPoint) {
      this.playerContainer.setPosition(data.spawnPoint.x, data.spawnPoint.y);
      this.predictedX = data.spawnPoint.x;
      this.predictedY = data.spawnPoint.y;
    }

    // Auto-zoom so the map fills the full canvas viewport.
    // Calculate the zoom that makes the world fit the screen (scale-to-fill).
    this.applyAutoZoom(width, height);
  }

  /** Compute and apply zoom so the world fills the viewport. */
  private applyAutoZoom(worldWidth: number, worldHeight: number) {
    const canvasW = this.scale.width;
    const canvasH = this.scale.height;
    if (!canvasW || !canvasH) return;
    const zoomX = canvasW / worldWidth;
    const zoomY = canvasH / worldHeight;
    // Use the larger zoom so the map always covers the full viewport (cover, not contain)
    const zoom = Math.max(zoomX, zoomY);
    this.cameras.main.setZoom(Math.max(zoom, 1)); // never zoom out below 1:1
    this.cameras.main.setViewport(0, 0, canvasW, canvasH);
  }

  // ─── Avatar Factory (Gather.town style character container) ───────────────

  private createAvatarContainer(
    x: number,
    y: number,
    name: string,
    colorHex: number,
    isLocal: boolean
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    // Avatar body shadow
    const shadow = this.add.ellipse(0, 10, 20, 8, 0x000000, 0.3);

    // Avatar body circle
    const body = this.add.circle(0, 0, 12, colorHex);
    body.setStrokeStyle(2, 0xffffff);

    // Status indicator dot
    const statusDot = this.add.circle(8, -8, 4, 0x10b981);
    statusDot.setStrokeStyle(1, 0x000000);

    // Username label tag above avatar
    const labelText = isLocal ? `${name} (You)` : name;
    const label = this.add.text(0, -22, labelText, {
      fontSize: "10px",
      fontStyle: "bold",
      color: "#ffffff",
      backgroundColor: "#0f172ad0",
      padding: { x: 5, y: 2 },
    }).setOrigin(0.5, 0.5);

    container.add([shadow, body, statusDot, label]);
    return container;
  }

  // ─── Per-frame update ─────────────────────────────────────────────────────

  update(_time: number, _delta: number) {
    if (!this.playerContainer?.body) return;
    const body = this.playerContainer.body as Phaser.Physics.Arcade.Body;

    // Check if the user is currently typing in an input element or textarea (e.g. Chat or Search)
    const activeEl = typeof document !== "undefined" ? document.activeElement : null;
    const isTyping = Boolean(
      activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          (activeEl as HTMLElement).isContentEditable)
    );

    const keyboardAllowed = !isTyping;

    // Merge keyboard and touch (virtual joystick) input
    const touch = gameBridge.getTouchInput();

    const left  = (keyboardAllowed && this.cursors.left.isDown)  || touch.left;
    const right = (keyboardAllowed && this.cursors.right.isDown) || touch.right;
    const up    = (keyboardAllowed && this.cursors.up.isDown)    || touch.up;
    const down  = (keyboardAllowed && this.cursors.down.isDown)  || touch.down;

    let vx = 0;
    let vy = 0;
    if (left) vx -= this.SPEED;
    if (right) vx += this.SPEED;
    if (up) vy -= this.SPEED;
    if (down) vy += this.SPEED;

    if (vx !== 0 && vy !== 0) {
      vx *= 0.707;
      vy *= 0.707;
    }

    body.setVelocity(vx, vy);

    this.predictedX = this.playerContainer.x;
    this.predictedY = this.playerContainer.y;

    const newInput: BooleanInput = { left, right, up, down };
    if (
      newInput.left !== this.lastInput.left ||
      newInput.right !== this.lastInput.right ||
      newInput.up !== this.lastInput.up ||
      newInput.down !== this.lastInput.down
    ) {
      gameBridge.emitInput(newInput);
      this.lastInput = { ...newInput };
    }

    this.frameCounter++;

    // PERF FIX: Only run client-side proximity every 10 frames (~6Hz) not every frame (60Hz)
    if (this.frameCounter % this.PROXIMITY_CHECK_INTERVAL === 0) {
      this.checkProximity();
    }

    // Interpolate remote avatars smoothly toward server positions
    this.remoteAvatars.forEach((avatar) => {
      // PERF FIX: Skip interpolation when already within 0.5px — avoids unnecessary set calls
      const distX = Math.abs(avatar.container.x - avatar.serverX);
      const distY = Math.abs(avatar.container.y - avatar.serverY);
      if (distX < 0.5 && distY < 0.5) return;
      avatar.container.x = Phaser.Math.Linear(avatar.container.x, avatar.serverX, 0.15);
      avatar.container.y = Phaser.Math.Linear(avatar.container.y, avatar.serverY, 0.15);
    });
  }

  // ─── Server state reconciliation ─────────────────────────────────────────

  private reconcileState(players: PlayerState[]) {
    const seenIds = new Set<string>();

    players.forEach((p) => {
      if (p.sessionId === this.localSessionId) {
        const dx = p.x - this.predictedX;
        const dy = p.y - this.predictedY;
        const drift = Math.sqrt(dx * dx + dy * dy);

        if (drift > 50) {
          this.playerContainer.setPosition(p.x, p.y);
          this.predictedX = p.x;
          this.predictedY = p.y;
        } else if (drift > 5) {
          const corrX = this.predictedX + dx * 0.3;
          const corrY = this.predictedY + dy * 0.3;
          this.playerContainer.setPosition(corrX, corrY);
          this.predictedX = corrX;
          this.predictedY = corrY;
        }
        return;
      }

      seenIds.add(p.sessionId);

      if (!this.remoteAvatars.has(p.sessionId)) {
        // Create remote player avatar
        const container = this.createAvatarContainer(
          p.x,
          p.y,
          p.username ?? p.sessionId.slice(0, 6),
          0xe11d48,
          false
        );
        this.remoteAvatars.set(p.sessionId, {
          sessionId: p.sessionId,
          container,
          serverX: p.x,
          serverY: p.y,
        });
      } else {
        const avatar = this.remoteAvatars.get(p.sessionId)!;
        avatar.serverX = p.x;
        avatar.serverY = p.y;
      }
    });

    this.remoteAvatars.forEach((avatar, id) => {
      if (!seenIds.has(id)) {
        avatar.container.destroy();
        this.remoteAvatars.delete(id);
        if (this.proximityActive.has(id)) {
          gameBridge.emitProximityEnd(id);
          this.proximityActive.delete(id);
        }
      }
    });
  }

  // ─── Proximity detection ──────────────────────────────────────────────────

  private checkProximity() {
    this.remoteAvatars.forEach((avatar, id) => {
      const dx = this.playerContainer.x - avatar.container.x;
      const dy = this.playerContainer.y - avatar.container.y;
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

  setLocalSessionId(id: string) {
    this.localSessionId = id;
    if (this.remoteAvatars.has(id)) {
      const avatar = this.remoteAvatars.get(id);
      avatar?.container.destroy();
      this.remoteAvatars.delete(id);
    }
  }

  /**
   * Called by PhaserGame when the Scale Manager fires a resize event.
   * Updates the main camera viewport so it covers the full new canvas dimensions.
   */
  onGameResize(width: number, height: number) {
    this.cameras.main.setViewport(0, 0, width, height);
    const wd = this.currentMapData.width || 800;
    const ht = this.currentMapData.height || 800;
    this.applyAutoZoom(wd, ht);
  }
}
