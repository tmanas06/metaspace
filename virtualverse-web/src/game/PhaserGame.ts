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
    width: config.width,
    height: config.height,
    backgroundColor: "#1a1a2e",
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
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
