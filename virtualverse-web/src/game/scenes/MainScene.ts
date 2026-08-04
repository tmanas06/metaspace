import Phaser from "phaser";
import { gameBridge, BooleanInput, PlayerState } from "../GameBridge";

// Tile size in pixels
const TILE_SIZE = 32;
// Map dimensions in tiles
const MAP_COLS = 20;
const MAP_ROWS = 20;
// World pixel dimensions
const WORLD_W = MAP_COLS * TILE_SIZE;
const WORLD_H = MAP_ROWS * TILE_SIZE;
// Proximity radius in pixels — triggers LiveKit
const PROXIMITY_RADIUS = TILE_SIZE * 2.5;

interface RemoteAvatar {
  sessionId: string;
  sprite: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  serverX: number;
  serverY: number;
}

export class MainScene extends Phaser.Scene {
  // Local player — Rectangle with a physics body attached
  private player!: Phaser.GameObjects.Rectangle;
  private localSessionId = "";

  // Predicted position (client-side prediction)
  private predictedX = 0;
  private predictedY = 0;

  // Static walls group
  private walls!: Phaser.Physics.Arcade.StaticGroup;

  // Input keys
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };

  // Remote players
  private remoteAvatars: Map<string, RemoteAvatar> = new Map();

  // Proximity tracking
  private proximityActive: Set<string> = new Set();

  // Last input sent
  private lastInput: BooleanInput = {
    left: false,
    right: false,
    up: false,
    down: false,
  };

  // Speed pixels/second
  private readonly SPEED = TILE_SIZE * 5;

  constructor() {
    super({ key: "MainScene" });
  }

  private mapGraphics!: Phaser.GameObjects.Graphics;
  private currentThemeName = "Event Hall & Main Stage";

  create() {
    this.mapGraphics = this.add.graphics();
    this.drawMapTheme(this.currentThemeName);

    // Register theme listener
    gameBridge.registerMapThemeListener((themeName: string) => {
      this.currentThemeName = themeName;
      this.drawMapTheme(themeName);
    });

    // ── Physics world bounds ────────────────────────────────────────────────
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);

    // ── Wall physics bodies ─────────────────────────────────────────────────
    // Use a StaticGroup of invisible Zones for collision
    this.walls = this.physics.add.staticGroup();

    const addWall = (col: number, row: number) => {
      const cx = col * TILE_SIZE + TILE_SIZE / 2;
      const cy = row * TILE_SIZE + TILE_SIZE / 2;
      const zone = this.add.zone(cx, cy, TILE_SIZE, TILE_SIZE);
      this.physics.add.existing(zone, true);
      (zone.body as Phaser.Physics.Arcade.StaticBody).setSize(TILE_SIZE, TILE_SIZE);
      this.walls.add(zone as unknown as Phaser.GameObjects.GameObject);
    };

    for (let col = 0; col < MAP_COLS; col++) {
      addWall(col, 0);
      addWall(col, MAP_ROWS - 1);
    }
    for (let row = 1; row < MAP_ROWS - 1; row++) {
      addWall(0, row);
      addWall(MAP_COLS - 1, row);
    }

    // ── Local player ────────────────────────────────────────────────────────
    const startX = Math.floor(MAP_COLS / 2) * TILE_SIZE + TILE_SIZE / 2;
    const startY = Math.floor(MAP_ROWS / 2) * TILE_SIZE + TILE_SIZE / 2;
    this.predictedX = startX;
    this.predictedY = startY;

    // Rectangle with physics body — bright indigo, clearly visible
    this.player = this.add.rectangle(startX, startY, 26, 26, 0x818cf8);
    this.player.setStrokeStyle(2, 0xffffff);
    this.physics.add.existing(this.player);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setSize(24, 24);

    // Wall collision
    this.physics.add.collider(this.player, this.walls);

    // Camera
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(1);

    // Input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      up: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    // Register state applier on bridge
    gameBridge.registerStateApplier((players: PlayerState[]) => {
      this.reconcileState(players);
    });

    // Debug: verify scene started (visible in dev console)
    console.log("[MainScene] created — player at", startX, startY);
  }

  // ─── Per-frame update ─────────────────────────────────────────────────────

  update(_time: number, _delta: number) {
    if (!this.player?.body) return;
    const body = this.player.body as Phaser.Physics.Arcade.Body;

    const left = this.cursors.left.isDown || this.wasd.left.isDown;
    const right = this.cursors.right.isDown || this.wasd.right.isDown;
    const up = this.cursors.up.isDown || this.wasd.up.isDown;
    const down = this.cursors.down.isDown || this.wasd.down.isDown;

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

    this.predictedX = this.player.x;
    this.predictedY = this.player.y;

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

    this.checkProximity();

    this.remoteAvatars.forEach((avatar) => {
      avatar.sprite.x = Phaser.Math.Linear(avatar.sprite.x, avatar.serverX, 0.15);
      avatar.sprite.y = Phaser.Math.Linear(avatar.sprite.y, avatar.serverY, 0.15);
      avatar.label.setPosition(avatar.sprite.x, avatar.sprite.y - 20);
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
          this.player.setPosition(p.x, p.y);
          this.predictedX = p.x;
          this.predictedY = p.y;
        } else if (drift > 5) {
          const corrX = this.predictedX + dx * 0.3;
          const corrY = this.predictedY + dy * 0.3;
          this.player.setPosition(corrX, corrY);
          this.predictedX = corrX;
          this.predictedY = corrY;
        }
        return;
      }

      seenIds.add(p.sessionId);

      if (!this.remoteAvatars.has(p.sessionId)) {
        const sprite = this.add.rectangle(p.x, p.y, 24, 24, 0xe11d48);
        const label = this.add
          .text(p.x, p.y - 20, p.username ?? p.sessionId.slice(0, 6), {
            fontSize: "10px",
            color: "#ffffff",
          })
          .setOrigin(0.5, 0.5);
        this.remoteAvatars.set(p.sessionId, {
          sessionId: p.sessionId,
          sprite,
          label,
          serverX: p.x,
          serverY: p.y,
        });
      } else {
        const avatar = this.remoteAvatars.get(p.sessionId)!;
        avatar.serverX = p.x;
        avatar.serverY = p.y;
        if (p.username) avatar.label.setText(p.username);
      }
    });

    this.remoteAvatars.forEach((avatar, id) => {
      if (!seenIds.has(id)) {
        avatar.sprite.destroy();
        avatar.label.destroy();
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
      const dx = this.player.x - avatar.sprite.x;
      const dy = this.player.y - avatar.sprite.y;
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
  }

  private drawMapTheme(themeName: string) {
    if (!this.mapGraphics) return;
    this.mapGraphics.clear();

    const gfx = this.mapGraphics;
    let colorA = 0x1e2a4a;
    let colorB = 0x2a3d6e;
    let gridColor = 0x4a6ba8;
    let wallColor = 0x1565c0;

    if (themeName.includes("Cyberpunk")) {
      colorA = 0x2e1065;
      colorB = 0x4c1d95;
      gridColor = 0xa855f7;
      wallColor = 0x06b6d4;
    } else if (themeName.includes("Sci-Fi")) {
      colorA = 0x0f172a;
      colorB = 0x1e293b;
      gridColor = 0x38bdf8;
      wallColor = 0x0284c7;
    } else if (themeName.includes("Zen Garden")) {
      colorA = 0x134e4a;
      colorB = 0x0f766e;
      gridColor = 0x2dd4bf;
      wallColor = 0xd97706;
    } else if (themeName.includes("Classroom")) {
      colorA = 0x261c14;
      colorB = 0x3b2b1e;
      gridColor = 0xb45309;
      wallColor = 0x059669;
    } else if (themeName.includes("Playground")) {
      colorA = 0x064e3b;
      colorB = 0x047857;
      gridColor = 0x34d399;
      wallColor = 0x2563eb;
    } else if (themeName.includes("Startup Office")) {
      colorA = 0x1e293b;
      colorB = 0x334155;
      gridColor = 0x64748b;
      wallColor = 0x6366f1;
    }

    // Draw floor tiles
    for (let row = 0; row < MAP_ROWS; row++) {
      for (let col = 0; col < MAP_COLS; col++) {
        const color = (row + col) % 2 === 0 ? colorA : colorB;
        gfx.fillStyle(color, 1);
        gfx.fillRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }

    // Grid lines
    gfx.lineStyle(1, gridColor, 0.3);
    for (let col = 0; col <= MAP_COLS; col++) {
      gfx.lineBetween(col * TILE_SIZE, 0, col * TILE_SIZE, WORLD_H);
    }
    for (let row = 0; row <= MAP_ROWS; row++) {
      gfx.lineBetween(0, row * TILE_SIZE, WORLD_W, row * TILE_SIZE);
    }

    // Border wall tiles
    gfx.fillStyle(wallColor, 1);
    for (let col = 0; col < MAP_COLS; col++) {
      gfx.fillRect(col * TILE_SIZE, 0, TILE_SIZE, TILE_SIZE);
      gfx.fillRect(col * TILE_SIZE, (MAP_ROWS - 1) * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
    for (let row = 1; row < MAP_ROWS - 1; row++) {
      gfx.fillRect(0, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      gfx.fillRect((MAP_COLS - 1) * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
  }
}
