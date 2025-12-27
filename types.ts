
export type CardType = '基础' | '武器' | '道具' | '效果' | '丹药';

export interface Card {
  id: string;
  name: string;
  cost: number;
  type: CardType;
  rank: number;
  description: string;
  pierceLevel?: number;
  color: string;
}

export interface Character {
  id: string;
  name: string;
  title: string;
  description: string;
  passiveName: string;
  passiveDesc: string;
  color: string;
  avatar: string; // Emoji or Icon
}

export interface Buff {
  type: '静默' | '无敌' | '地雷触发';
  level?: number; 
  duration: number;
}

export interface Player {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  shield: number;
  energy: number;
  lives: number;
  hand: Card[];
  isEliminated: boolean;
  color: string;
  buffs: Buff[];
  character?: Character; // 玩家选择的角色
}

export interface PlayerSnapshot {
  hp: number;
  shield: number;
  energy: number;
  lives: number;
  buffs: string;
}

export type GameStatus = '大厅' | '化身选择' | '设置' | '决斗中' | '结算';

export interface GameLog {
  id: string;
  message: string;
  timestamp: number;
  turn: number;
  color?: string;
}

export interface ClientSettings {
  bgVolume: number;
  uiScale: '精简' | '标准' | '宏大';
  theme: '浓墨' | '淡彩';
}

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  actionsLeft: number;
  status: GameStatus;
  logs: GameLog[];
  turnCount: number;
  winner?: Player;
  roundSnapshot?: Record<string, PlayerSnapshot>;
  settings: ClientSettings;
}
