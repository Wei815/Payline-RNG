import type { IGameEnvironment } from '../games/base/IGameEnvironment';
import type { GameType } from '../types';
import { GAMES } from '../games/registry';

export class GameRegistry {
  private static games = new Map<GameType, IGameEnvironment>();
  private static initialized = false;

  static init() {
    if (this.initialized) return;
    for (const manifest of GAMES) {
      this.register(manifest.create());
    }
    this.initialized = true;
  }

  static register(game: IGameEnvironment) {
    this.games.set(game.id, game);
  }

  static getGame(id: GameType): IGameEnvironment {
    this.init();
    const game = this.games.get(id);
    if (!game) {
      throw new Error(`Game environment for ${id} not found.`);
    }
    return game;
  }

  static getAllGames(): IGameEnvironment[] {
    this.init();
    return Array.from(this.games.values());
  }
}
