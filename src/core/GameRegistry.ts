import type { IGameEnvironment } from '../games/base/IGameEnvironment';
import type { GameType } from '../types';

import { MermaidGame } from '../games/mermaid/MermaidGame';
import { QinGame } from '../games/qin/QinGame';
import { BattleSet2Game } from '../games/battle_set2/BattleSet2Game';
import { LuxeGame } from '../games/luxe/LuxeGame';
import { ClassicLineGame } from '../games/linegame/ClassicLineGame';
import { ClassicPayAnywhere } from '../games/payanywhere/ClassicPayAnywhere';

import { RoyalElephantGame } from '../games/royal_elephant/RoyalElephantGame';

export class GameRegistry {
  private static games = new Map<GameType, IGameEnvironment>();
  private static initialized = false;

  static init() {
    if (this.initialized) return;
    this.register(new MermaidGame());
    this.register(new QinGame());
    this.register(new BattleSet2Game());
    this.register(new LuxeGame());
    this.register(new ClassicLineGame());
    this.register(new ClassicPayAnywhere());
    this.register(new RoyalElephantGame());
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
