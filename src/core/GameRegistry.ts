import type { IGameEnvironment } from '../games/base/IGameEnvironment';
import type { GameType } from '../types';

export class GameRegistry {
  private static games = new Map<GameType, IGameEnvironment>();

  static register(game: IGameEnvironment) {
    this.games.set(game.id, game);
  }

  static getGame(id: GameType): IGameEnvironment {
    const game = this.games.get(id);
    if (!game) {
      throw new Error(`Game environment for ${id} not found.`);
    }
    return game;
  }

  static getAllGames(): IGameEnvironment[] {
    return Array.from(this.games.values());
  }
}
