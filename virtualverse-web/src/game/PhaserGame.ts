import Phaser from "phaser";
import { MainScene } from "./scenes/MainScene";

export interface GameConfig {
  parentElementId: string;
  width: number;
  height: number;
}

let gameInstance: Phaser.Game | null = null;

export function createGame(config: GameConfig): Phaser.Game {
  if (gameInstance) {
    gameInstance.destroy(true);
    gameInstance = null;
  }

  gameInstance = new Phaser.Game({
    type: Phaser.AUTO,
    parent: config.parentElementId,
    // Don't pass fixed width/height — let Phaser derive from the parent div
    backgroundColor: "#1e293b",
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.NO_CENTER,
      // Tell Phaser to size the canvas to 100% of the parent div
      width: "100%",
      height: "100%",
    },
    physics: {
      default: "arcade",
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: process.env.NODE_ENV === "development",
      },
    },
    scene: [MainScene],
    banner: false,
  });

  // When the Scale Manager fires a resize, update the camera viewport so it
  // covers the new canvas dimensions (not just the world bounds).
  gameInstance.scale.on("resize", (gameSize: Phaser.Structs.Size) => {
    const scene = gameInstance?.scene.getScene("MainScene") as MainScene | null;
    scene?.onGameResize(gameSize.width, gameSize.height);
  });

  return gameInstance;
}

export function destroyGame() {
  if (gameInstance) {
    gameInstance.destroy(true);
    gameInstance = null;
  }
}

export function getMainScene(): MainScene | null {
  if (!gameInstance) return null;
  return gameInstance.scene.getScene("MainScene") as MainScene | null;
}
