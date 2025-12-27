
import { Card, Character } from './types';

export const INITIAL_HP = 20;
export const INITIAL_LIVES = 1;
export const ACTIONS_PER_TURN = 3;

export const CHARACTERS: Character[] = [
  {
    id: 'char_sword',
    name: '叶辰',
    title: '青云剑修',
    description: '一心唯剑，锋芒执着。擅长以迅雷之势击溃敌手。',
    passiveName: '天生剑体',
    passiveDesc: '所有“武器”牌伤害增加 1 点。',
    color: 'text-sky-300',
    avatar: '⚔️'
  },
  {
    id: 'char_pill',
    name: '苏灵儿',
    title: '妙手丹师',
    description: '精通草木药理，在绝境中亦能寻得一线生机。',
    passiveName: '药香萦绕',
    passiveDesc: '使用“道具”或“丹药”牌时，额外回复 1 点气血。',
    color: 'text-emerald-300',
    avatar: '🍃'
  },
  {
    id: 'char_array',
    name: '诸葛青',
    title: '阵法宗师',
    description: '以天地为局，化灵气为障，算无遗策。',
    passiveName: '不动如山',
    passiveDesc: '每回合开始时，自动获得 1 点护盾。',
    color: 'text-indigo-300',
    avatar: '⛩️'
  },
  {
    id: 'char_demon',
    name: '幽冥子',
    title: '九幽魔尊',
    description: '掌握掠夺生机的禁忌之术，以战养战。',
    passiveName: '以战养战',
    passiveDesc: '击伤对手时，有 50% 概率回复 1 点灵力。',
    color: 'text-fuchsia-400',
    avatar: '💀'
  }
];

export const CARD_POOL: Card[] = [
  { id: 'base_1', name: '聚气术', cost: 0, type: '基础', rank: 0, description: '灵力+1', color: 'bg-slate-800 text-slate-200 border-slate-600' },
  { id: 'base_2', name: '灵气罩', cost: 0, type: '基础', rank: 0, description: '护盾+1', color: 'bg-slate-800 text-slate-200 border-slate-600' },
  { id: 'w_0_1', name: '木剑术', cost: 1, type: '武器', rank: 0, pierceLevel: 0, description: '1伤害', color: 'bg-slate-700 text-slate-100 border-slate-500' },
  { id: 'w_1_1', name: '玄铁飞剑', cost: 2, type: '武器', rank: 1, pierceLevel: 0, description: '1伤害。质地坚硬', color: 'bg-emerald-900 text-emerald-100 border-emerald-700' },
  { id: 'w_1_2', name: '五雷正法', cost: 3, type: '武器', rank: 1, pierceLevel: 0, description: '2伤害。雷霆万钧', color: 'bg-emerald-900 text-emerald-100 border-emerald-700' },
  { id: 'w_2_1', name: '青索神剑', cost: 4, type: '武器', rank: 2, pierceLevel: 1, description: '2伤害。可破1级金身', color: 'bg-blue-900 text-blue-100 border-blue-700' },
  { id: 'w_3_1', name: '诛仙残剑', cost: 7, type: '武器', rank: 3, pierceLevel: 2, description: '3伤害。可破2级金身', color: 'bg-purple-900 text-purple-100 border-purple-700' },
  { id: 'i_mine', name: '玄天地雷', cost: 3, type: '道具', rank: 1, description: '获得1级金身。下次受伤反弹2伤害', color: 'bg-rose-950 text-rose-100 border-rose-800' },
  { id: 'i_1_1', name: '八卦镜', cost: 3, type: '道具', rank: 1, description: '1级金身1回合', color: 'bg-emerald-900 text-emerald-100 border-emerald-700' },
  { id: 'i_2_1', name: '乾坤鼎', cost: 4, type: '道具', rank: 2, description: '寿元+1', color: 'bg-blue-900 text-blue-100 border-blue-700' },
  { id: 'i_3_1', name: '混沌珠', cost: 8, type: '道具', rank: 3, description: '气血全满', color: 'bg-purple-900 text-purple-100 border-purple-700' },
  { id: 'e_1_1', name: '定身符', cost: 3, type: '效果', rank: 1, description: '封印对手1回合', color: 'bg-emerald-900 text-emerald-100 border-emerald-700' },
  { id: 'e_1_2', name: '金身符[壹]', cost: 2, type: '效果', rank: 1, description: '获得1级金身', color: 'bg-emerald-900 text-emerald-100 border-emerald-700' },
  { id: 'e_2_2', name: '金身符[贰]', cost: 4, type: '效果', rank: 2, description: '获得2级金身', color: 'bg-blue-900 text-blue-100 border-blue-700' },
  { id: 'e_3_2', name: '金身符[叁]', cost: 6, type: '效果', rank: 3, description: '获得3级金身', color: 'bg-purple-900 text-purple-100 border-purple-700' }
];

export const PLAYER_COLORS = [
  'border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.15)] bg-emerald-950/10',
  'border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.15)] bg-rose-950/10',
  'border-sky-500/50 shadow-[0_0_20px_rgba(14,165,233,0.15)] bg-sky-950/10',
  'border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.15)] bg-amber-950/10'
];
