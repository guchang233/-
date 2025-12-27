import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  GameState, 
  Player, 
  Card, 
  Buff,
  GameLog,
  Character,
  ClientSettings,
  GameStatus,
  PlayerSnapshot
} from './types';
import { 
  INITIAL_HP, 
  INITIAL_LIVES,
  ACTIONS_PER_TURN, 
  CARD_POOL, 
  PLAYER_COLORS,
  CHARACTERS
} from './constants';

// 矢量图标组件
const Icon: React.FC<{ name: string; className?: string; size?: number }> = ({ name, className = "", size }) => {
  return <i data-lucide={name} style={size ? {width: size, height: size} : {}} className={`lucide inline-block ${className}`}></i>;
};

const useLucide = () => {
  useEffect(() => {
    // @ts-ignore
    if (window.lucide) {
      // @ts-ignore
      window.lucide.createIcons();
    }
  });
};

// --- UI 辅助组件 ---

const LogDisplay: React.FC<{ logs: GameLog[]; verbosity: '简略' | '详细' }> = ({ logs, verbosity }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const filteredLogs = useMemo(() => {
    if (verbosity === '详细') return logs;
    return logs.filter(log => log.isSummary);
  }, [logs, verbosity]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [filteredLogs]);

  return (
    <div className="flex flex-col h-full bg-slate-950/80 border border-teal-900/30 rounded-xl overflow-hidden backdrop-blur-md shadow-2xl">
      <div className="flex-none px-4 py-2 bg-slate-900/90 border-b border-teal-500/10 flex justify-between items-center">
        <div className="flex items-center gap-2">
           <span className="font-classical tracking-widest text-teal-400 text-xs sm:text-sm">修行志</span>
           <span className="text-[8px] sm:text-[10px] px-1.5 py-0.5 rounded bg-teal-900/30 text-teal-500/80 font-bold border border-teal-500/10">{verbosity}</span>
        </div>
        <Icon name="history" className="text-teal-700 opacity-60" size={14} />
      </div>
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-1.5 scrollbar-hide" ref={scrollRef}>
        {filteredLogs.length === 0 ? (
          <div className="h-full flex items-center justify-center opacity-10 pointer-events-none">
             <span className="font-classical text-xl italic">万法皆空</span>
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div key={log.id} className={`border-l-2 border-teal-800/40 pl-2 py-0.5 text-[10px] sm:text-[11px] leading-relaxed transition-all duration-300 ${log.color || 'text-slate-400'} ${log.isSummary ? 'bg-teal-500/5' : ''}`}>
               <span className="text-teal-900/60 mr-1 font-mono text-[8px]">[{log.turn}]</span> 
               <span>{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const CardComponent: React.FC<{ 
  card: Card; 
  onClick: () => void; 
  disabled: boolean; 
  energy: number;
  isFocused?: boolean;
  index: number;
  total: number;
}> = ({ card, onClick, disabled, energy, isFocused, index, total }) => {
  const canAfford = energy >= card.cost;
  const isForbidden = disabled || !canAfford;
  
  const mid = (total - 1) / 2;
  const offset = index - mid;
  const rotation = total > 1 ? offset * 2 : 0;
  const translateY = total > 1 ? Math.abs(offset) * 4 : 0;

  return (
    <div 
      onClick={(!isForbidden) ? onClick : undefined} 
      className={`relative w-24 sm:w-32 h-36 sm:h-48 p-2 sm:p-4 rounded-xl border-2 flex flex-col justify-between transition-all duration-300 flex-shrink-0 card-saturate ${isFocused ? 'card-active-glow' : 'hover:-translate-y-8 hover:z-50 hover:scale-105'} ${isForbidden ? 'cursor-not-allowed opacity-60 grayscale-[0.2]' : 'cursor-pointer shadow-2xl'} ${card.color} border-white/10 shadow-lg`}
      style={{ 
        zIndex: isFocused ? 200 : index + 10, 
        transform: isFocused ? 'translateY(-20px) scale(1.08)' : `rotate(${rotation}deg) translateY(${translateY}px)` 
      }}
    >
      {isForbidden && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/30 pointer-events-none rounded-xl">
          <div className="ink-stamp">禁</div>
        </div>
      )}
      <div className="relative z-10 h-full flex flex-col">
        <div className="flex justify-between items-start mb-1 sm:mb-2">
          <div className="text-[8px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded border border-white/20 bg-black/60 font-classical text-teal-100">#{card.rank}</div>
          <div className={`w-5 h-5 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[9px] sm:text-[11px] font-bold shadow-xl border border-white/20 ${card.rank === 3 ? 'bg-amber-400 text-amber-950 ring-2 ring-amber-200' : 'bg-slate-900/95 text-white'}`}>{card.cost}</div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center px-0.5">
          <h3 className="font-bold text-[12px] sm:text-[15px] leading-tight mb-1 sm:mb-2 font-classical text-white drop-shadow-lg">{card.name}</h3>
          <p className="text-[9px] sm:text-[11px] leading-snug opacity-95 font-sans italic text-white drop-shadow-sm">{card.description}</p>
        </div>
        <div className="flex justify-between items-end mt-1 sm:mt-2 border-t pt-1 sm:pt-2 border-white/20">
           <div className="text-[7px] sm:text-[9px] font-bold uppercase tracking-widest text-white/60">{card.type}</div>
           {card.pierceLevel !== undefined && card.pierceLevel > 0 && (
             <div className="text-[7px] sm:text-[9px] font-bold px-1.5 bg-rose-600 text-white rounded-sm">破{card.pierceLevel}</div>
           )}
        </div>
      </div>
    </div>
  );
};

const CardRow: React.FC<{ 
  title: string; 
  cards: Card[]; 
  energy: number; 
  actionsLeft: number; 
  isSelectingTarget: boolean; 
  selectedCardId?: string; 
  onCardClick: (card: Card) => void; 
  isSilenced: boolean;
}> = ({ title, cards, energy, actionsLeft, isSelectingTarget, selectedCardId, onCardClick, isSilenced }) => {
  if (cards.length === 0) return null;
  return (
    <div className="mb-4 sm:mb-6">
      <div className="flex items-center gap-3 mb-1 px-4 sm:px-10">
         <span className="text-teal-500 text-[10px] sm:text-xs font-bold tracking-[0.2em] font-classical border-l-4 border-teal-500/50 pl-3">{title}</span>
         <div className="h-px flex-1 bg-gradient-to-r from-teal-500/20 to-transparent"></div>
      </div>
      <div className="flex gap-3 sm:gap-6 overflow-x-auto pb-8 pt-4 scrollbar-hide px-8 sm:px-12 items-end min-h-[160px] sm:min-h-[220px] mask-fade-edges">
        {cards.map((card, idx) => (
          <CardComponent 
            key={card.id} 
            card={card} 
            energy={energy} 
            disabled={actionsLeft <= 0 || isSilenced || (isSelectingTarget && selectedCardId !== card.id)} 
            onClick={() => onCardClick(card)} 
            isFocused={selectedCardId === card.id} 
            index={idx} 
            total={cards.length} 
          />
        ))}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  useLucide();
  const [gameState, setGameState] = useState<GameState>({
    players: [],
    currentPlayerIndex: 0,
    actionsLeft: ACTIONS_PER_TURN,
    status: '大厅',
    logs: [],
    turnCount: 1,
    roundCount: 1,
    settings: { bgVolume: 50, uiScale: '标准', theme: '淡彩', logVerbosity: '简略' },
    customCardPool: [...CARD_POOL],
    customCharacters: [...CHARACTERS]
  });
  
  const [prevStatus, setPrevStatus] = useState<GameStatus | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<Character>(gameState.customCharacters[0]);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [isSelectingTarget, setIsSelectingTarget] = useState(false);
  const [shakingPlayerId, setShakingPlayerId] = useState<string | null>(null);
  const [floatTexts, setFloatTexts] = useState<{id: number, text: string, color: string, playerId: string}[]>([]);

  const addFloatText = useCallback((text: string, playerId: string, color: string = 'text-red-400') => {
    const id = Date.now() + Math.random();
    setFloatTexts(prev => [...prev, { id, text, color, playerId }]);
    setTimeout(() => setFloatTexts(prev => prev.filter(ft => ft.id !== id)), 1500);
  }, []);

  const triggerShake = (playerId: string) => {
    setShakingPlayerId(playerId);
    setTimeout(() => setShakingPlayerId(null), 250);
  };

  const addLog = useCallback((message: string, color?: string, isSummary: boolean = false) => {
    setGameState(prev => ({
      ...prev,
      logs: [...prev.logs, { id: Math.random().toString(36), message, timestamp: Date.now(), turn: prev.turnCount, color, isSummary }]
    }));
  }, []);

  const createSnapshot = (players: Player[]): PlayerSnapshot[] => {
    return players.map(p => ({
      id: p.id,
      name: p.name,
      hp: p.hp,
      shield: p.shield,
      energy: p.energy,
      lives: p.lives
    }));
  };

  const initGame = () => {
    const players: Player[] = Array.from({ length: 2 }).map((_, i) => {
      const character = i === 0 ? selectedCharacter : gameState.customCharacters[Math.floor(Math.random() * gameState.customCharacters.length)];
      return {
        id: `p${i}`,
        name: i === 0 ? `${selectedCharacter.name}` : `${character.name}`,
        hp: INITIAL_HP,
        maxHp: INITIAL_HP,
        shield: character.id === 'char_array' ? 2 : 0,
        energy: 0,
        lives: INITIAL_LIVES,
        hand: [...gameState.customCardPool],
        isEliminated: false,
        color: PLAYER_COLORS[i],
        buffs: [],
        character
      };
    });

    setGameState(prev => ({
      ...prev,
      players,
      currentPlayerIndex: 0,
      actionsLeft: ACTIONS_PER_TURN,
      status: '决斗中',
      logs: [],
      turnCount: 1,
      roundCount: 1,
      roundStartSnapshot: createSnapshot(players),
    }));
    addLog(`诸天论道开启。`, "text-amber-300 font-classical tracking-widest", true);
  };

  const checkEliminations = (players: Player[]) => {
    return players.map(p => {
      if (p.hp <= 0 && !p.isEliminated) {
        if (p.lives > 1) return { ...p, hp: INITIAL_HP, lives: p.lives - 1, buffs: [] };
        return { ...p, hp: 0, isEliminated: true };
      }
      return p;
    });
  };

  const nextTurn = useCallback(() => {
    setGameState(prev => {
      let nextIndex = (prev.currentPlayerIndex + 1) % prev.players.length;
      while (prev.players[nextIndex].isEliminated) {
        nextIndex = (nextIndex + 1) % prev.players.length;
      }

      const roundEnded = nextIndex <= prev.currentPlayerIndex;
      const alivePlayers = prev.players.filter(p => !p.isEliminated);
      if (alivePlayers.length === 1) return { ...prev, status: '结算', winner: alivePlayers[0] };

      let nextRoundCount = prev.roundCount;
      let nextSnapshot = prev.roundStartSnapshot;
      let newLogs = [...prev.logs];

      if (roundEnded) {
        const summary = prev.players.map(p => {
          const start = prev.roundStartSnapshot?.find(s => s.id === p.id);
          const hpDiff = p.hp - (start?.hp || p.hp);
          return `${p.name}: ${hpDiff >= 0 ? '+' : ''}${hpDiff}`;
        }).join(" | ");
        
        newLogs.push({
          id: Math.random().toString(36),
          message: `【${prev.roundCount}轮终】${summary}`,
          timestamp: Date.now(),
          turn: prev.turnCount,
          color: "text-teal-400 font-bold opacity-90 border-y border-teal-900/10 py-1",
          isSummary: true
        });

        nextRoundCount = prev.roundCount + 1;
        nextSnapshot = createSnapshot(prev.players);
      }

      const updatedPlayers = prev.players.map(p => {
        if (p.id === prev.players[nextIndex].id) {
          const newShield = p.character?.id === 'char_array' ? p.shield + 1 : p.shield;
          return { 
            ...p, 
            shield: newShield,
            buffs: p.buffs.map(b => ({ ...b, duration: b.duration - 1 })).filter(b => b.duration > 0)
          };
        }
        return p;
      });

      return {
        ...prev,
        players: updatedPlayers,
        currentPlayerIndex: nextIndex,
        actionsLeft: ACTIONS_PER_TURN,
        turnCount: prev.turnCount + 1,
        roundCount: nextRoundCount,
        roundStartSnapshot: nextSnapshot,
        logs: newLogs
      };
    });
    setIsSelectingTarget(false);
    setSelectedCard(null);
  }, []);

  useEffect(() => {
    if (gameState.status === '决斗中' && gameState.actionsLeft === 0 && !isSelectingTarget) {
      const timer = setTimeout(() => nextTurn(), 800);
      return () => clearTimeout(timer);
    }
  }, [gameState.actionsLeft, gameState.status, isSelectingTarget, nextTurn]);

  const activeP = gameState.players[gameState.currentPlayerIndex];
  const isSilenced = activeP?.buffs.some(b => b.type === '静默');

  const groupedHand = useMemo(() => {
    if (!activeP) return { basic: [], weapons: [], items: [], effects: [] };
    const h = activeP.hand;
    return {
      basic: h.filter(c => c.type === '基础'),
      weapons: h.filter(c => c.type === '武器'),
      items: h.filter(c => c.type === '道具' || c.type === '丹药'),
      effects: h.filter(c => c.type === '效果'),
    };
  }, [activeP]);

  const canUseOnTarget = useCallback((card: Card | null, target: Player) => {
    if (!card || target.isEliminated || !activeP) return false;
    if (card.type === '武器' || card.id === 'e_1_1') return target.id !== activeP.id;
    if (card.type === '基础' || card.type === '道具' || card.type === '丹药' || card.name.includes('金身')) return target.id === activeP.id;
    return true;
  }, [activeP]);

  const applyCardEffect = (card: Card, sourceId: string, targetId: string) => {
    setGameState(prev => {
      let newState = { ...prev };
      let source = newState.players.find(p => p.id === sourceId)!;
      let target = newState.players.find(p => p.id === targetId)!;
      if (source.energy < card.cost) return prev;
      newState.players = newState.players.map(p => p.id === sourceId ? { ...p, energy: p.energy - card.cost } : p);
      const targetInvLevel = target.buffs.find(b => b.type === '无敌')?.level || 0;
      const pierce = card.pierceLevel || 0;
      const goldBodyPrevents = targetInvLevel > 0 && targetInvLevel > pierce;
      let logMsg = `【${source.name}】祭出《${card.name}》`;

      if (card.type === '基础') {
        newState.players = newState.players.map(p => p.id === targetId ? (card.id === 'base_1' ? { ...p, energy: p.energy + 1 } : { ...p, shield: p.shield + 1 }) : p);
        addFloatText(card.id === 'base_1' ? "+1灵" : "+1盾", targetId, "text-sky-300");
      } else if (card.type === '武器') {
        if (goldBodyPrevents) {
          logMsg += ` (受阻于金身)`;
          addFloatText("金身抵挡", targetId, "text-amber-400 font-classical");
        } else {
          const hasMine = target.buffs.some(b => b.type === '地雷触发');
          if (hasMine) {
            addFloatText("触发雷阵", targetId, "text-rose-500 font-bold");
            addFloatText("-2气血", sourceId, "text-orange-500");
            triggerShake(sourceId);
            newState.players = newState.players.map(p => p.id === sourceId ? { ...p, hp: Math.max(0, p.hp - 2) } : p);
            newState.players = newState.players.map(p => p.id === targetId ? { ...p, buffs: p.buffs.filter(b => b.type !== '地雷触发') } : p);
          }
          let dmg = (card.rank === 3 ? 3 : (card.rank >= 1 ? 2 : 1)) + (source.character?.id === 'char_sword' ? 1 : 0);
          triggerShake(targetId);
          let currentShield = target.shield;
          if (currentShield > 0) {
            if (dmg <= currentShield) { currentShield -= dmg; dmg = 0; }
            else { dmg -= currentShield; currentShield = 0; }
          }
          if (dmg > 0) addFloatText(`-${dmg}`, targetId, "text-rose-600 font-bold text-xl");
          newState.players = newState.players.map(p => p.id === targetId ? { ...p, shield: currentShield, hp: Math.max(0, p.hp - dmg) } : p);
        }
      } else if (card.type === '道具' || card.type === '丹药') {
        if (source.character?.id === 'char_pill') {
            newState.players = newState.players.map(p => p.id === sourceId ? { ...p, hp: Math.min(p.maxHp, p.hp + 1) } : p);
            addFloatText("+1气血", sourceId, "text-emerald-400 font-bold");
        }
        if (card.id === 'i_mine') {
          newState.players = newState.players.map(p => p.id === targetId ? { ...p, buffs: [...p.buffs.filter(b => b.type !== '无敌'), { type: '无敌', level: 1, duration: 1 }, { type: '地雷触发', duration: 99 }] } : p);
          addFloatText("埋伏玄雷", targetId, "text-amber-500 font-classical");
        } else if (card.id === 'i_1_1') {
          newState.players = newState.players.map(p => p.id === targetId ? { ...p, buffs: [...p.buffs, { type: '无敌', level: 1, duration: 1 }] } : p);
          addFloatText("金身I", targetId, "text-amber-400");
        } else if (card.rank === 2) {
          newState.players = newState.players.map(p => p.id === targetId ? { ...p, lives: p.lives + 1 } : p);
          addFloatText("+1寿", targetId, "text-emerald-500");
        } else if (card.rank === 3) {
          newState.players = newState.players.map(p => p.id === targetId ? { ...p, hp: p.maxHp } : p);
          addFloatText("满状态", targetId, "text-emerald-300");
        }
      } else if (card.type === '效果') {
        if (card.id === 'e_1_1') {
           newState.players = newState.players.map(p => p.id === targetId ? { ...p, buffs: [...p.buffs, { type: '静默', duration: 1 }] } : p);
           addFloatText("定身", targetId, "text-purple-500 font-bold");
        } else if (card.name.includes('金身')) {
           newState.players = newState.players.map(p => p.id === targetId ? { ...p, buffs: [...p.buffs.filter(b => b.type !== '无敌'), { type: '无敌', level: card.rank, duration: 1 }] } : p);
           addFloatText(`金身${card.rank}`, targetId, "text-amber-300 font-bold");
        }
      }
      newState.players = checkEliminations(newState.players);
      newState.actionsLeft -= 1;
      newState.logs = [...newState.logs, { id: Math.random().toString(36), message: logMsg, timestamp: Date.now(), turn: newState.turnCount, isSummary: false }];
      return newState;
    });
    setSelectedCard(null); setIsSelectingTarget(false);
  };

  const onCardClick = (card: Card) => {
    if (gameState.actionsLeft <= 0 || isSilenced) return;
    if (activeP.energy < card.cost) return;
    setSelectedCard(card);
    setIsSelectingTarget(true);
  };

  const onTargetSelect = (target: Player) => {
    if (selectedCard && canUseOnTarget(selectedCard, target)) {
      applyCardEffect(selectedCard, activeP.id, target.id);
    }
  };

  const openSettings = () => {
    setPrevStatus(gameState.status);
    setGameState(prev => ({ ...prev, status: '设置' }));
  };

  if (gameState.status === '大厅') {
    return (
      <div className="h-screen flex items-center justify-center p-6 relative z-[999]">
        <div className="jade-panel p-10 sm:p-12 rounded-[2rem] text-center w-full max-w-sm border border-teal-500/20 shadow-2xl">
          <h1 className="text-5xl sm:text-6xl font-classical text-white mb-6 tracking-widest drop-shadow-lg">诸天论道</h1>
          <p className="text-teal-500/50 mb-10 text-sm sm:text-base font-classical tracking-[0.5em] italic">一念登仙 · 万古长空</p>
          <div className="flex flex-col gap-4 sm:gap-5">
             <button onClick={() => setGameState(p => ({ ...p, status: '化身选择' }))} className="py-4 sm:py-5 bg-teal-900/50 text-white rounded-2xl border border-teal-500/20 hover:bg-teal-700 transition-all font-classical text-2xl sm:text-3xl tracking-widest active:scale-95 shadow-lg">开启修行</button>
             <button onClick={openSettings} className="py-2 sm:py-3 bg-slate-800/40 text-slate-300 rounded-xl border border-white/5 hover:bg-slate-700 transition-all text-xs sm:text-sm font-classical tracking-widest flex items-center justify-center gap-2 active:scale-95">
               <Icon name="settings" size={14} /> 修行设置
             </button>
          </div>
        </div>
      </div>
    );
  }

  if (gameState.status === '化身选择') {
    return (
      <div className="h-screen flex items-center justify-center p-4 sm:p-6 relative z-[999]">
        <div className="jade-panel p-6 sm:p-10 rounded-[2rem] w-full max-w-4xl border border-teal-500/10 flex flex-col md:flex-row gap-6 sm:gap-8 shadow-2xl overflow-y-auto max-h-[90vh] scrollbar-hide">
           <div className="flex-1 space-y-6 sm:space-y-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-teal-400 font-classical tracking-widest">化身抉择</h2>
              <div className="grid grid-cols-2 gap-3 sm:gap-5">
                 {gameState.customCharacters.map(char => (
                   <div key={char.id} onClick={() => setSelectedCharacter(char)} className={`group p-3 sm:p-5 rounded-2xl border-2 transition-all cursor-pointer flex gap-3 sm:gap-5 items-center ${selectedCharacter.id === char.id ? 'border-teal-400 bg-teal-900/30 ring-2 ring-teal-400/20 shadow-lg' : 'border-white/5 bg-black/40 opacity-50 hover:opacity-100'}`}>
                        <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full overflow-hidden border border-white/10 flex-shrink-0 bg-slate-900 flex items-center justify-center">
                          <span className="text-xl sm:text-3xl">{char.avatar}</span>
                        </div>
                        <div className="text-sm sm:text-xl font-bold text-white font-classical">{char.name}</div>
                   </div>
                 ))}
              </div>
              <button onClick={initGame} className="w-full py-4 sm:py-5 bg-teal-600 text-white rounded-2xl hover:bg-teal-500 font-classical text-2xl sm:text-3xl tracking-widest active:scale-95 shadow-xl">踏 入 仙 途</button>
           </div>
           <div className="w-full md:w-80 bg-slate-950/60 rounded-3xl p-6 sm:p-8 border border-white/5 flex flex-col justify-between">
              <div className="text-center">
                 <div className="text-6xl sm:text-8xl mb-4 sm:mb-8 drop-shadow-2xl">{selectedCharacter.avatar}</div>
                 <h3 className={`text-2xl sm:text-3xl font-bold mb-2 sm:mb-3 font-classical ${selectedCharacter.color} tracking-widest`}>{selectedCharacter.title}</h3>
                 <p className="text-[10px] sm:text-sm text-slate-500 leading-relaxed mb-4 sm:mb-8 italic opacity-80">{selectedCharacter.description}</p>
                 <div className="bg-teal-950/30 p-4 sm:p-5 rounded-2xl border border-teal-500/10 text-left">
                    <div className="text-teal-300 font-bold text-xs sm:text-sm mb-1 sm:mb-2 font-classical border-b border-teal-500/10 pb-1">天赋：{selectedCharacter.passiveName}</div>
                    <div className="text-[9px] sm:text-[11px] text-slate-300 leading-relaxed">{selectedCharacter.passiveDesc}</div>
                 </div>
              </div>
              <button onClick={() => setGameState(p => ({ ...p, status: '大厅' }))} className="mt-6 sm:mt-8 text-[10px] sm:text-xs text-slate-600 hover:text-white font-classical tracking-widest text-center flex items-center justify-center gap-2 active:scale-95">
                <Icon name="arrow-left" size={12} /> 返回前尘
              </button>
           </div>
        </div>
      </div>
    );
  }

  if (gameState.status === '设置') {
    return (
      <div className="h-screen flex items-center justify-center p-6 relative z-[1000]">
        <div className="jade-panel p-10 rounded-[2.5rem] w-full max-w-sm border border-slate-700/40 shadow-2xl">
           <h2 className="text-2xl sm:text-3xl font-bold text-slate-200 mb-8 sm:mb-10 text-center font-classical tracking-widest">修行设置</h2>
           <div className="space-y-6 sm:space-y-8">
              <div className="space-y-3">
                 <div className="flex justify-between text-[10px] sm:text-[11px] text-slate-500 font-sans tracking-widest uppercase font-bold">
                    <span className="flex items-center gap-2"><Icon name="volume-2" size={12} /> 灵韵音量</span>
                    <span>{gameState.settings.bgVolume}%</span>
                 </div>
                 <input type="range" className="w-full h-1.5 sm:h-2 bg-slate-800 rounded-lg accent-teal-500 appearance-none cursor-pointer" value={gameState.settings.bgVolume} onChange={(e) => setGameState(p => ({ ...p, settings: { ...p.settings, bgVolume: parseInt(e.target.value) } }))} />
              </div>
              <div className="flex justify-between items-center text-xs sm:text-sm">
                 <span className="text-slate-400 font-classical tracking-widest flex items-center gap-2"><Icon name="palette" size={12} /> 画境偏好</span>
                 <div className="flex gap-2">
                    {['浓墨', '淡彩'].map(t => (
                      <button key={t} onClick={() => setGameState(p => ({ ...p, settings: { ...p.settings, theme: t as any } }))} className={`px-4 py-1.5 sm:px-5 sm:py-2 rounded-xl border transition-all ${gameState.settings.theme === t ? 'bg-teal-500 text-slate-950 border-teal-300 font-bold' : 'text-slate-500 border-slate-800 hover:border-slate-600'}`}>{t}</button>
                    ))}
                 </div>
              </div>
              <div className="flex justify-between items-center text-xs sm:text-sm">
                 <span className="text-slate-400 font-classical tracking-widest flex items-center gap-2"><Icon name="file-text" size={12} /> 日志输出</span>
                 <div className="flex gap-2">
                    {['简略', '详细'].map(v => (
                      <button key={v} onClick={() => setGameState(p => ({ ...p, settings: { ...p.settings, logVerbosity: v as any } }))} className={`px-4 py-1.5 sm:px-5 sm:py-2 rounded-xl border transition-all ${gameState.settings.logVerbosity === v ? 'bg-sky-600 text-white border-sky-400 font-bold' : 'text-slate-500 border-slate-800 hover:border-slate-600'}`}>{v}</button>
                    ))}
                 </div>
              </div>
           </div>
           <button onClick={() => setGameState(p => ({ ...p, status: prevStatus || '大厅' }))} className="mt-10 sm:mt-12 w-full py-4 bg-slate-800 text-slate-200 rounded-2xl border border-white/10 hover:bg-slate-700 font-classical text-lg sm:text-xl tracking-widest active:scale-95 shadow-xl">确认修行</button>
        </div>
      </div>
    );
  }

  if (gameState.status === '结算') {
    return (
      <div className="h-screen flex items-center justify-center p-4 relative z-[999]">
        <div className="jade-panel p-12 sm:p-16 rounded-[3rem] text-center border-4 border-amber-500/20 max-w-md w-full shadow-2xl">
          <h2 className="text-3xl sm:text-4xl font-classical text-amber-200 mb-6 sm:mb-8 tracking-widest">因 果 止 歇</h2>
          <div className="text-7xl sm:text-8xl mb-8 sm:mb-10 drop-shadow-xl animate-bounce">🏆</div>
          <p className="text-4xl sm:text-5xl text-amber-400 mb-2 sm:mb-3 font-bold font-classical">{gameState.winner?.name}</p>
          <p className="text-base sm:text-lg text-amber-800/60 mb-10 sm:mb-12 font-classical italic">道极巅峰 · 诸天之主</p>
          <button onClick={() => setGameState(p => ({ ...p, status: '大厅' }))} className="w-full py-4 sm:py-5 bg-slate-900 text-white rounded-2xl border border-teal-900/20 hover:bg-teal-950 font-classical text-xl sm:text-2xl tracking-widest flex items-center justify-center gap-4 active:scale-95 shadow-xl">
            <Icon name="rotate-ccw" /> 重入轮回
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen flex flex-col overflow-hidden relative font-sans ${gameState.settings.theme === '浓墨' ? 'grayscale opacity-90' : ''}`}>
      <header className="flex-none flex justify-between items-center px-4 sm:px-10 py-3 sm:py-5 bg-slate-950/95 border-b border-teal-500/10 z-50 backdrop-blur-3xl shadow-xl">
        <div className="flex gap-3 sm:gap-5 items-center">
          <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full border border-teal-500/40 flex items-center justify-center bg-black shadow-xl ring-2 ring-teal-500/10">
             <span className="text-2xl sm:text-4xl">{activeP.character?.avatar}</span>
          </div>
          <div className="flex flex-col">
            <span className={`text-sm sm:text-xl font-bold font-classical tracking-widest ${activeP.color.split(' ')[0].replace('border', 'text')}`}>{activeP.name}</span>
            <div className="flex gap-1.5 sm:gap-2.5 mt-1 sm:mt-2">
              {Array.from({ length: ACTIONS_PER_TURN }).map((_, i) => (
                <div key={i} className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full border border-white/20 transition-all duration-500 ${i < gameState.actionsLeft ? 'bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.6)]' : 'bg-slate-900 opacity-20'}`} />
              ))}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4 sm:gap-12">
          <div className="hidden sm:flex flex-col items-center px-8 border-x border-teal-500/10">
             <span className="text-[10px] text-teal-900 font-bold uppercase tracking-widest mb-0.5">灵力强度</span>
             <span className="text-3xl font-bold text-teal-400 font-mono tracking-tighter">{activeP.energy}</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-6">
             <button onClick={openSettings} className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-slate-900/80 text-slate-300 rounded-xl sm:rounded-2xl border border-white/10 hover:bg-slate-800 transition-all active:scale-90 shadow-lg" title="设置">
               <Icon name="settings" size={18} />
             </button>
             <button disabled={isSilenced} onClick={nextTurn} className="px-4 sm:px-8 py-2 sm:py-3 bg-teal-900/50 text-teal-100 rounded-xl sm:rounded-2xl border border-teal-500/30 text-[10px] sm:text-sm hover:bg-teal-700 font-classical tracking-widest transition-transform disabled:opacity-30 shadow-xl flex items-center gap-2 active:scale-95">
               结轮 <Icon name="fast-forward" size={12} />
             </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative min-h-0 z-20">
        <aside className="flex-none flex lg:flex-col gap-3 sm:gap-5 p-4 sm:p-6 overflow-x-auto lg:overflow-y-auto lg:w-72 scrollbar-hide lg:border-r border-teal-900/10 bg-black/40 backdrop-blur-2xl z-30 shadow-2xl">
          {gameState.players.map((p, i) => {
            const isActive = i === gameState.currentPlayerIndex;
            const pInv = p.buffs.find(b => b.type === '无敌')?.level || 0;
            const canTarget = isSelectingTarget && canUseOnTarget(selectedCard, p);
            return (
              <div key={p.id} 
                className={`p-3 sm:p-5 rounded-[1.5rem] sm:rounded-3xl border-2 transition-all duration-500 relative flex-shrink-0 w-48 sm:w-60 lg:w-full overflow-hidden ${isActive ? 'bg-slate-900/80 border-teal-500/50 scale-[1.02] shadow-2xl' : 'bg-black/20 border-white/5 opacity-50'} ${p.color} ${shakingPlayerId === p.id ? 'shake-anim' : ''} ${p.isEliminated ? 'opacity-10 grayscale' : ''} ${pInv ? `invincible-lv${pInv}` : ''} ${canTarget ? 'ring-4 ring-teal-400 ring-offset-4 ring-offset-black cursor-pointer scale-105 shadow-[0_0_20px_rgba(45,212,191,0.3)]' : ''}`} 
                onClick={() => canTarget && onTargetSelect(p)}
              >
                {floatTexts.filter(ft => ft.playerId === p.id).map(ft => (<div key={ft.id} className={`float-text ${ft.color} font-bold font-classical text-2xl sm:text-3xl`}>{ft.text}</div>))}
                <div className="relative z-10">
                  <div className="flex justify-between items-center mb-2 sm:mb-4">
                     <div className="flex items-center gap-2 sm:gap-4">
                        <span className="text-2xl sm:text-4xl drop-shadow-md">{p.character?.avatar}</span>
                        <span className="text-xs sm:text-base font-bold truncate font-classical tracking-widest text-white">{p.name}</span>
                     </div>
                     <div className="flex sm:hidden flex-col items-center">
                        <span className="text-[9px] font-mono text-teal-400 font-bold leading-none">{p.energy}</span>
                        <span className="text-[7px] text-teal-900 font-bold uppercase">灵力</span>
                     </div>
                  </div>
                  <div className="space-y-2 sm:space-y-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-[8px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-widest"><span>气血</span><span>{p.hp}/{p.maxHp}</span></div>
                      <div className="h-1 sm:h-2 w-full bg-black/90 rounded-full overflow-hidden border border-white/5"><div className="h-full bg-gradient-to-r from-rose-900 to-rose-600 transition-all duration-700" style={{ width: `${(p.hp/p.maxHp)*100}%` }} /></div>
                    </div>
                    <div className="flex justify-between items-center text-[9px] sm:text-[11px] font-classical tracking-widest pt-1 opacity-90 border-t border-white/5 mt-1">
                       <span className="text-sky-400 font-bold flex items-center gap-1"><Icon name="shield" size={10} /> {p.shield}</span> 
                       <span className="text-emerald-400 font-bold flex items-center gap-1"><Icon name="hourglass" size={10} /> {p.lives}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </aside>

        <section className="flex-1 p-3 sm:p-6 flex flex-col overflow-hidden min-h-0 z-20 relative bg-slate-950/20 lg:flex-row gap-6">
            <div className="hidden lg:block lg:w-80 lg:flex-none">
              <LogDisplay logs={gameState.logs} verbosity={gameState.settings.logVerbosity} />
            </div>
            
            <div className="flex-1 flex flex-col justify-center items-center text-center p-4 relative">
               {!isSelectingTarget ? (
                 <div className="opacity-10 flex flex-col items-center gap-4 transition-opacity duration-500">
                    <Icon name="sword" size={80} className="text-teal-900" />
                    <span className="font-classical text-3xl sm:text-4xl tracking-[1.5em] text-teal-900 ml-[1.5em]">论道中</span>
                 </div>
               ) : (
                 <div className="animate-in zoom-in-95 duration-300 flex flex-col items-center gap-6">
                    <div className="relative">
                      <Icon name="crosshair" size={96} className="text-teal-400 opacity-60" />
                      <div className="absolute inset-0 flex items-center justify-center">
                         <div className="w-16 h-16 border-2 border-teal-400/20 rounded-full animate-ping" />
                      </div>
                    </div>
                    <span className="font-classical text-5xl sm:text-6xl tracking-[0.5em] text-teal-100 drop-shadow-[0_0_15px_rgba(45,212,191,0.3)]">选择目标</span>
                 </div>
               )}
            </div>

            <div className="block lg:hidden h-40 flex-none animate-in slide-in-from-bottom-4">
               <LogDisplay logs={gameState.logs} verbosity={gameState.settings.logVerbosity} />
            </div>
        </section>
      </main>

      <footer className="flex-none bg-slate-950 border-t border-teal-900/20 p-2 sm:p-4 relative z-40 shadow-[0_-20px_60px_rgba(0,0,0,0.9)]">
        {isSilenced && (
           <div className="absolute inset-0 bg-black/95 backdrop-blur-3xl z-[300] flex flex-col items-center justify-center animate-in fade-in duration-500">
              <span className="text-purple-500 text-5xl sm:text-7xl font-bold font-classical tracking-[1em] opacity-80 animate-pulse">封</span>
              <p className="text-slate-800 text-[9px] sm:text-[11px] font-sans tracking-[0.8em] mt-4 opacity-40 uppercase font-bold">气血运行受阻</p>
           </div>
        )}
        
        <div className="max-h-[38vh] sm:max-h-[45vh] overflow-y-auto scrollbar-hide py-3 sm:py-6">
          <div className="max-w-[1400px] mx-auto space-y-2 sm:space-y-4">
            <CardRow title="入门基础" cards={groupedHand.basic} energy={activeP.energy} actionsLeft={gameState.actionsLeft} isSelectingTarget={isSelectingTarget} selectedCardId={selectedCard?.id} onCardClick={onCardClick} isSilenced={isSilenced} />
            <CardRow title="斗法神技" cards={groupedHand.weapons} energy={activeP.energy} actionsLeft={gameState.actionsLeft} isSelectingTarget={isSelectingTarget} selectedCardId={selectedCard?.id} onCardClick={onCardClick} isSilenced={isSilenced} />
            <CardRow title="造化灵物" cards={groupedHand.items} energy={activeP.energy} actionsLeft={gameState.actionsLeft} isSelectingTarget={isSelectingTarget} selectedCardId={selectedCard?.id} onCardClick={onCardClick} isSilenced={isSilenced} />
            <CardRow title="秘法禁卷" cards={groupedHand.effects} energy={activeP.energy} actionsLeft={gameState.actionsLeft} isSelectingTarget={isSelectingTarget} selectedCardId={selectedCard?.id} onCardClick={onCardClick} isSilenced={isSilenced} />
          </div>
        </div>

        {isSelectingTarget && (
          <div className="fixed inset-0 pointer-events-none z-[499] flex flex-col items-center justify-end pb-20 sm:pb-32 px-6">
             <div className="pointer-events-auto jade-panel px-10 sm:px-20 py-4 sm:py-7 rounded-3xl shadow-2xl flex items-center gap-12 sm:gap-24 border border-teal-400/40 backdrop-blur-2xl ring-2 ring-white/5 active:scale-98 transition-transform">
               <button onClick={() => { setIsSelectingTarget(false); setSelectedCard(null); }} className="w-14 h-14 sm:w-20 sm:h-20 flex items-center justify-center rounded-2xl text-rose-200 border-2 border-rose-500/30 bg-rose-950/30 hover:bg-rose-900/50 active:scale-90 transition-all shadow-xl group" title="取消">
                 <Icon name="undo-2" size={28} className="group-hover:-translate-x-1 transition-transform" />
               </button>
               <div className="text-center">
                  <span className="text-3xl sm:text-5xl font-bold text-teal-100 font-classical tracking-[0.6em] ml-[0.6em]">选择目标</span>
               </div>
               <div className="w-14 sm:w-20 opacity-0 pointer-events-none" />
            </div>
          </div>
        )}
      </footer>
    </div>
  );
};

export default App;