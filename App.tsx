
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  GameState, 
  Player, 
  Card, 
  Buff,
  GameLog,
  Character,
  ClientSettings,
  GameStatus
} from './types';
import { 
  INITIAL_HP, 
  INITIAL_LIVES,
  ACTIONS_PER_TURN, 
  CARD_POOL, 
  PLAYER_COLORS,
  CHARACTERS
} from './constants';

// --- UI 辅助组件 ---

const LogDisplay: React.FC<{ logs: GameLog[] }> = ({ logs }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="flex-1 border border-teal-900/30 bg-slate-950/80 rounded-xl font-sans text-[11px] relative shadow-inner jade-panel flex flex-col min-h-0 overflow-hidden">
      <div className="flex-none px-4 py-2 bg-slate-900/95 backdrop-blur border-b border-teal-500/10 flex justify-between items-center z-10 font-bold text-teal-400">
        <span className="font-classical tracking-widest text-sm">传讯灵简</span>
        <div className="flex gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-teal-500/40 animate-pulse"></div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide" ref={scrollRef}>
        {logs.length === 0 ? (
          <div className="text-teal-900/20 text-center py-10 font-classical">万籁俱寂</div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className={`border-l border-teal-800/20 pl-2 text-[10px] animate-in fade-in duration-300 ${log.color || 'text-slate-400'}`}>
               <span className="text-teal-700 mr-2 font-mono">[{log.turn}]</span> 
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
  const rankNames = ['凡', '灵', '宝', '仙', '神'];
  const rankBorders = ['border-slate-500/40', 'border-emerald-500/50', 'border-sky-500/60', 'border-purple-500/70', 'border-amber-500/80'][card.rank];

  // 计算扇形旋转角度，让它更像手牌
  const rotation = total > 1 ? (index - (total - 1) / 2) * 2 : 0;

  return (
    <div 
      onClick={(!isForbidden) ? onClick : undefined} 
      className={`relative w-28 sm:w-32 h-44 sm:h-52 p-3 rounded-lg border-2 flex flex-col justify-between transition-all duration-300 flex-shrink-0 flex-grow-0 group ${isFocused ? 'card-active-glow' : 'hover:-translate-y-8 hover:z-50 hover:scale-110'} ${isForbidden ? 'cursor-not-allowed opacity-60 grayscale-[0.5]' : 'cursor-pointer'} ${card.color} ${rankBorders} overflow-hidden shadow-xl`}
      style={{ 
        zIndex: isFocused ? 150 : index + 10,
        transform: isFocused ? undefined : `rotate(${rotation}deg)`
      }}
    >
      {isForbidden && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 pointer-events-none">
          <div className="ink-stamp text-xl font-classical scale-125 opacity-80">禁</div>
        </div>
      )}
      <div className="relative z-10 h-full flex flex-col">
        <div className="flex justify-between items-start mb-2">
          <div className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-white/10 bg-black/50 font-classical text-teal-100">{rankNames[card.rank]}</div>
          <div className={`w-6 h-6 rounded-full font-bold flex items-center justify-center text-[11px] shadow-lg transition-transform group-hover:scale-125 ${card.rank === 3 ? 'bg-amber-400 text-amber-950' : 'bg-slate-900/80 text-white border border-white/20'}`}>{card.cost}</div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center px-1">
          <h3 className="font-bold text-[13px] sm:text-[14px] leading-tight mb-2 border-b border-white/10 pb-1 w-full truncate font-classical text-white drop-shadow-sm">{card.name}</h3>
          <p className="text-[9px] sm:text-[10px] leading-relaxed opacity-90 line-clamp-3 overflow-hidden font-sans italic tracking-wider text-slate-200">{card.description}</p>
        </div>
        <div className="flex justify-between items-end mt-2 border-t pt-1 border-white/10">
          <div className="text-[8px] opacity-70 font-bold font-classical text-slate-300 uppercase tracking-tighter">{card.type}</div>
          {card.pierceLevel !== undefined && card.pierceLevel > 0 && (
            <div className={`text-[8px] font-bold px-1 py-0.5 rounded-sm bg-orange-600 text-white shadow-sm ring-1 ring-white/20 animate-pulse`}>破障{card.pierceLevel}</div>
          )}
        </div>
      </div>
      {/* 牌面纹理装饰 */}
      <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-white/5 rounded-full blur-xl pointer-events-none"></div>
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const checkScroll = useCallback(() => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 10);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  }, []);

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [cards, checkScroll]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const amount = direction === 'left' ? -200 : 200;
      scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  if (cards.length === 0) return null;

  return (
    <div className="mb-6 relative group/row">
      <div className="flex items-center gap-3 mb-3 px-4">
         <span className="text-teal-400/80 text-[10px] font-bold tracking-[0.4em] font-classical border-l-2 border-teal-500/50 pl-2">{title}</span>
         <div className="h-px flex-1 bg-gradient-to-r from-teal-900/60 to-transparent"></div>
      </div>
      
      <div className="relative px-8">
        {/* 左箭头 */}
        {showLeftArrow && (
          <button 
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-[60] w-8 h-20 bg-teal-950/60 border border-teal-500/20 text-teal-400 rounded-r-xl flex items-center justify-center hover:bg-teal-800 transition-colors backdrop-blur-sm"
          >
            <span className="text-xl font-bold">‹</span>
          </button>
        )}
        
        <div 
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex gap-2 sm:gap-4 overflow-x-auto pb-6 pt-4 scrollbar-hide px-4 mask-fade-edges items-end min-h-[160px]"
        >
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

        {/* 右箭头 */}
        {showRightArrow && (
          <button 
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-[60] w-8 h-20 bg-teal-950/60 border border-teal-500/20 text-teal-400 rounded-l-xl flex items-center justify-center hover:bg-teal-800 transition-colors backdrop-blur-sm"
          >
            <span className="text-xl font-bold">›</span>
          </button>
        )}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    players: [],
    currentPlayerIndex: 0,
    actionsLeft: ACTIONS_PER_TURN,
    status: '大厅',
    logs: [],
    turnCount: 1,
    settings: { bgVolume: 50, uiScale: '标准', theme: '淡彩' }
  });
  
  const [prevStatus, setPrevStatus] = useState<GameStatus | null>(null);
  const [playerCount, setPlayerCount] = useState(2);
  const [selectedCharacter, setSelectedCharacter] = useState<Character>(CHARACTERS[0]);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [isSelectingTarget, setIsSelectingTarget] = useState(false);
  const [shakingPlayerId, setShakingPlayerId] = useState<string | null>(null);
  const [floatTexts, setFloatTexts] = useState<{id: number, text: string, color: string, playerId: string}[]>([]);

  const effectQueueRef = useRef<{ text: string, playerId: string, color: string }[]>([]);
  const isProcessingQueue = useRef(false);

  const processQueue = useCallback(() => {
    if (effectQueueRef.current.length === 0) {
      isProcessingQueue.current = false;
      return;
    }
    isProcessingQueue.current = true;
    const { text, playerId, color } = effectQueueRef.current.shift()!;
    
    const id = Date.now() + Math.random();
    setFloatTexts(prev => [...prev, { id, text, color, playerId }]);
    
    setTimeout(() => {
      setFloatTexts(prev => prev.filter(ft => ft.id !== id));
    }, 2200);

    setTimeout(processQueue, 450);
  }, []);

  const addFloatText = useCallback((text: string, playerId: string, color: string = 'text-red-400') => {
    effectQueueRef.current.push({ text, playerId, color });
    if (!isProcessingQueue.current) {
      processQueue();
    }
  }, [processQueue]);

  const triggerShake = (playerId: string) => {
    setShakingPlayerId(playerId);
    setTimeout(() => setShakingPlayerId(null), 400);
  };

  const addLog = (message: string, color?: string) => {
    setGameState(prev => ({
      ...prev,
      logs: [...prev.logs, { id: Math.random().toString(36), message, timestamp: Date.now(), turn: prev.turnCount, color }]
    }));
  };

  const initGame = () => {
    const players: Player[] = Array.from({ length: playerCount }).map((_, i) => {
      const character = i === 0 ? selectedCharacter : CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
      return {
        id: `p${i}`,
        name: i === 0 ? `${selectedCharacter.name}` : `${character.name}`,
        hp: INITIAL_HP,
        maxHp: INITIAL_HP,
        shield: character.id === 'char_array' ? 2 : 0,
        energy: 0,
        lives: INITIAL_LIVES,
        hand: [...CARD_POOL],
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
    }));
    addLog(`诸天论道开启。`, "text-amber-300 font-bold font-classical");
  };

  const checkEliminations = (players: Player[]) => {
    return players.map(p => {
      if (p.hp <= 0 && !p.isEliminated) {
        if (p.lives > 1) {
          return { ...p, hp: INITIAL_HP, lives: p.lives - 1, buffs: [] };
        }
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
      const alivePlayers = prev.players.filter(p => !p.isEliminated);
      if (alivePlayers.length === 1) return { ...prev, status: '结算', winner: alivePlayers[0] };

      const updatedPlayers = prev.players.map(p => {
        if (p.id === prev.players[nextIndex].id) {
          const newShield = p.character?.id === 'char_array' ? p.shield + 1 : p.shield;
          return { 
            ...p, 
            energy: p.energy + 1,
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
      };
    });
    setIsSelectingTarget(false);
    setSelectedCard(null);
  }, []);

  useEffect(() => {
    if (gameState.status === '决斗中' && gameState.actionsLeft === 0 && !isSelectingTarget) {
      const timer = setTimeout(() => {
        nextTurn();
      }, 1200);
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
      items: h.filter(c => c.type === '道具'),
      effects: h.filter(c => c.type === '效果'),
    };
  }, [activeP]);

  const canUseOnTarget = useCallback((card: Card | null, target: Player) => {
    if (!card || target.isEliminated || !activeP) return false;
    if (card.type === '武器' || card.id === 'e_1_1') return target.id !== activeP.id;
    if (card.type === '基础' || card.type === '道具' || card.name.includes('金身')) return target.id === activeP.id;
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
        addFloatText(card.id === 'base_1' ? "能量+1" : "护盾+1", targetId, "text-sky-300");
      } else if (card.type === '武器') {
        if (goldBodyPrevents) {
          logMsg += ` (受阻于金身)`;
          addFloatText("金身不坏", targetId, "text-amber-400 font-bold font-classical");
        } else {
          const hasMine = target.buffs.some(b => b.type === '地雷触发');
          if (hasMine) {
            logMsg += ` (触发地雷!)`;
            addFloatText("触发雷阵", targetId, "text-rose-400 font-bold");
            addFloatText("反弹伤害 -2", sourceId, "text-rose-500 font-bold");
            triggerShake(sourceId);
            newState.players = newState.players.map(p => p.id === sourceId ? { ...p, hp: Math.max(0, p.hp - 2) } : p);
            newState.players = newState.players.map(p => p.id === targetId ? { ...p, buffs: p.buffs.filter(b => b.type !== '地雷触发') } : p);
          }

          let dmg = (card.rank === 3 ? 3 : (card.rank >= 1 ? 2 : 1)) + (source.character?.id === 'char_sword' ? 1 : 0);
          triggerShake(targetId);
          
          let finalDmg = dmg;
          let currentShield = target.shield;
          
          if (currentShield > 0) {
            if (finalDmg <= currentShield) {
              currentShield -= finalDmg;
              finalDmg = 0;
            } else {
              finalDmg -= currentShield;
              currentShield = 0;
            }
            addFloatText(`护盾抵消`, targetId, "text-sky-400 text-[10px]");
          }
          
          if (finalDmg > 0) {
            addFloatText(`-${finalDmg} 气血`, targetId, "text-rose-500 font-bold text-2xl");
          }

          newState.players = newState.players.map(p => p.id === targetId ? { 
              ...p, 
              shield: currentShield,
              hp: Math.max(0, p.hp - finalDmg) 
          } : p);
          
          if (source.character?.id === 'char_demon' && Math.random() > 0.5) {
            newState.players = newState.players.map(p => p.id === sourceId ? { ...p, energy: p.energy + 1 } : p);
            addFloatText("+1 灵力", sourceId, "text-fuchsia-400");
          }
        }
      } else if (card.type === '道具' || card.type === '丹药') {
        if (source.character?.id === 'char_pill') {
            newState.players = newState.players.map(p => p.id === sourceId ? { ...p, hp: Math.min(p.maxHp, p.hp + 1) } : p);
            addFloatText("+1 气血", sourceId, "text-emerald-400");
        }

        if (card.id === 'i_mine') {
          newState.players = newState.players.map(p => p.id === targetId ? { 
            ...p, 
            buffs: [
              ...p.buffs.filter(b => b.type !== '无敌' && b.type !== '地雷触发'), 
              { type: '无敌', level: 1, duration: 1 },
              { type: '地雷触发', duration: 99 }
            ] 
          } : p);
          addFloatText("1级金身", targetId, "text-amber-400 font-bold");
          addFloatText("埋伏地雷", targetId, "text-rose-400 font-bold");
        } else if (card.id === 'i_1_1') {
          newState.players = newState.players.map(p => p.id === targetId ? { ...p, buffs: [...p.buffs, { type: '无敌', level: 1, duration: 1 }] } : p);
          addFloatText("1级金身", targetId, "text-amber-400 font-bold");
        } else if (card.rank === 2) {
          newState.players = newState.players.map(p => p.id === targetId ? { ...p, lives: p.lives + 1 } : p);
          addFloatText("+1 寿元", targetId, "text-emerald-400");
        } else if (card.rank === 3) {
          newState.players = newState.players.map(p => p.id === targetId ? { ...p, hp: p.maxHp } : p);
          addFloatText("气血充盈", targetId, "text-emerald-400 font-bold");
        }
      } else if (card.type === '效果') {
        if (card.id === 'e_1_1') {
           newState.players = newState.players.map(p => p.id === targetId ? { ...p, buffs: [...p.buffs, { type: '静默', duration: 1 }] } : p);
           addFloatText("定身封印", targetId, "text-purple-400 font-bold");
        } else if (card.name.includes('金身')) {
           newState.players = newState.players.map(p => p.id === targetId ? { ...p, buffs: [...p.buffs.filter(b => b.type !== '无敌'), { type: '无敌', level: card.rank, duration: 1 }] } : p);
           addFloatText(`${card.rank}级金身`, targetId, "text-amber-400 font-bold");
        }
      }

      newState.players = checkEliminations(newState.players);
      newState.actionsLeft -= 1;
      newState.logs = [...newState.logs, { id: Math.random().toString(36), message: logMsg, timestamp: Date.now(), turn: newState.turnCount }];
      
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
    setGameState(p => ({ ...p, status: '设置' }));
  };

  const closeSettings = () => {
    if (prevStatus) {
      setGameState(p => ({ ...p, status: prevStatus }));
      setPrevStatus(null);
    } else {
      setGameState(p => ({ ...p, status: '大厅' }));
    }
  };

  if (gameState.status === '大厅') {
    return (
      <div className="h-screen flex items-center justify-center p-6 relative z-[999] overflow-hidden">
        <div className="jade-panel p-10 rounded-2xl text-center w-full max-sm:max-w-xs max-w-sm border border-teal-500/30 relative shadow-2xl">
          <h1 className="text-6xl font-classical font-bold text-white mb-6 tracking-[0.2em] drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">诸天论道</h1>
          <p className="text-teal-500/80 mb-10 text-lg italic font-classical tracking-[0.4em]">仙途争命</p>
          
          <div className="flex flex-col gap-4">
             <button onClick={() => setGameState(p => ({ ...p, status: '化身选择' }))} className="py-4 bg-teal-900/60 text-white font-bold rounded-lg border border-teal-400/30 hover:bg-teal-700 transition-all font-sans text-xl shadow-[0_0_20px_rgba(20,184,166,0.2)]">开启修行</button>
             <button onClick={openSettings} className="py-3 bg-slate-800/40 text-slate-300 rounded-lg border border-white/5 hover:bg-slate-700 transition-all font-sans">设置</button>
             <div className="flex items-center justify-between bg-black/40 rounded-lg border border-white/5 p-4">
                <span className="text-sm text-teal-700/80 font-classical tracking-widest">人数</span>
                <div className="flex gap-3">
                  {[2, 3, 4].map(n => (
                    <button key={n} onClick={() => setPlayerCount(n)} className={`w-10 h-10 rounded-full text-lg border-2 transition-all ${playerCount === n ? 'bg-teal-500 text-slate-950 border-teal-300 font-bold scale-110' : 'text-teal-800 border-teal-900/40'}`}>{n}</button>
                  ))}
                </div>
             </div>
          </div>
        </div>
      </div>
    );
  }

  if (gameState.status === '化身选择') {
    return (
      <div className="h-screen flex items-center justify-center p-6 relative z-[999] overflow-hidden">
        <div className="jade-panel p-8 rounded-2xl w-full max-w-4xl border border-teal-500/20 flex flex-col md:flex-row gap-8 shadow-[0_0_50px_rgba(0,0,0,0.8)]">
           <div className="flex-1 space-y-6">
              <h2 className="text-3xl font-bold text-teal-400 pb-2 border-b border-teal-500/10 font-classical tracking-widest">化身抉择</h2>
              <div className="grid grid-cols-2 gap-4">
                 {CHARACTERS.map(char => (
                   <div key={char.id} onClick={() => setSelectedCharacter(char)} className={`p-5 rounded-xl border-2 transition-all cursor-pointer ${selectedCharacter.id === char.id ? 'border-teal-400 bg-teal-900/40 scale-105 shadow-[0_0_25px_rgba(45,212,191,0.2)]' : 'border-white/5 bg-black/40 opacity-50 hover:opacity-100'}`}>
                      <div className="text-3xl mb-2">{char.avatar}</div>
                      <div className="text-lg font-bold text-white font-classical">{char.name}</div>
                   </div>
                 ))}
              </div>
              <button onClick={initGame} className="w-full py-4 bg-teal-600 text-white font-bold rounded-lg hover:bg-teal-500 transition-all shadow-lg mt-2 font-classical text-2xl tracking-widest">确认</button>
           </div>
           <div className="w-full md:w-80 bg-slate-900/60 rounded-xl p-6 border border-white/5 flex flex-col justify-between">
              <div>
                 <div className="text-7xl text-center mb-6 opacity-90 drop-shadow-md">{selectedCharacter.avatar}</div>
                 <h3 className={`text-2xl font-bold mb-2 font-classical ${selectedCharacter.color} tracking-widest`}>{selectedCharacter.title}</h3>
                 <p className="text-xs text-slate-400 leading-relaxed mb-6 italic font-sans">{selectedCharacter.description}</p>
                 <div className="bg-teal-950/30 p-4 rounded-lg border border-teal-500/20 font-sans shadow-inner">
                    <div className="text-teal-300 font-bold text-sm mb-2 font-classical tracking-widest">天赋：{selectedCharacter.passiveName}</div>
                    <div className="text-[11px] text-slate-200 leading-relaxed">{selectedCharacter.passiveDesc}</div>
                 </div>
              </div>
              <button onClick={() => setGameState(p => ({ ...p, status: '大厅' }))} className="mt-6 text-sm text-slate-500 hover:text-white transition-colors font-classical">← 返回</button>
           </div>
        </div>
      </div>
    );
  }

  if (gameState.status === '设置') {
    return (
      <div className="h-screen flex items-center justify-center p-6 relative z-[999] overflow-hidden">
        <div className="jade-panel p-8 rounded-2xl w-full max-w-xs border border-slate-700/50">
           <h2 className="text-3xl font-bold text-slate-200 mb-8 text-center font-classical tracking-widest">修行设置</h2>
           <div className="space-y-8">
              <div className="space-y-3">
                 <div className="flex justify-between text-xs text-slate-400 font-sans tracking-widest"><span>音律</span><span>{gameState.settings.bgVolume}%</span></div>
                 <input type="range" className="w-full h-1 bg-slate-800 rounded-lg accent-teal-500 appearance-none cursor-pointer" value={gameState.settings.bgVolume} onChange={(e) => setGameState(p => ({ ...p, settings: { ...p.settings, bgVolume: parseInt(e.target.value) } }))} />
              </div>
              <div className="flex justify-between items-center text-xs font-sans">
                 <span className="text-slate-400 tracking-widest">画境</span>
                 <div className="flex gap-2">
                    {['浓墨', '淡彩'].map(t => (
                      <button key={t} onClick={() => setGameState(p => ({ ...p, settings: { ...p.settings, theme: t as any } }))} className={`px-4 py-1.5 rounded-full border-2 transition-all ${gameState.settings.theme === t ? 'bg-teal-500 text-slate-950 border-teal-300 font-bold' : 'text-slate-500 border-slate-800'}`}>{t}</button>
                    ))}
                 </div>
              </div>
           </div>
           <button onClick={closeSettings} className="mt-10 w-full py-3 bg-slate-800 text-slate-200 rounded-lg border border-white/5 hover:bg-slate-700 transition-all text-sm font-classical tracking-widest">确认</button>
        </div>
      </div>
    );
  }

  if (gameState.status === '结算') {
    return (
      <div className="h-screen flex items-center justify-center p-4 relative z-[999]">
        <div className="jade-panel p-12 rounded-2xl text-center border-2 border-amber-500/50 max-sm:max-w-xs max-w-sm w-full animate-in zoom-in-95 shadow-[0_0_100px_rgba(245,158,11,0.2)]">
          <h2 className="text-3xl font-bold text-amber-200 mb-8 font-classical tracking-[0.5em]">因果止歇</h2>
          <div className="text-6xl mb-6 animate-bounce">🏆</div>
          <p className="text-3xl text-amber-400 mb-2 font-bold font-classical tracking-widest">{gameState.winner?.name}</p>
          <p className="text-sm text-amber-900/80 mb-10 font-sans italic">诸天共主</p>
          <button onClick={() => setGameState(p => ({ ...p, status: '大厅' }))} className="w-full py-4 bg-slate-900 text-white rounded-lg border border-teal-900/30 hover:bg-teal-950 transition-all text-lg font-classical tracking-[0.3em]">重入轮回</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen flex flex-col overflow-hidden relative font-sans ${gameState.settings.theme === '浓墨' ? 'grayscale opacity-90' : ''}`}>
      <header className="flex-none flex justify-between items-center px-6 py-4 bg-slate-950/80 border-b border-teal-500/20 z-30 backdrop-blur-2xl">
        <div className="flex gap-5 items-center">
          <div className="text-3xl drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">{activeP.character?.avatar}</div>
          <div className="flex flex-col">
            <span className={`text-lg font-bold font-classical tracking-widest ${activeP.color.split(' ')[0].replace('border', 'text')}`}>{activeP.name} <span className="opacity-40 text-[10px] font-normal ml-2 font-sans">轮次</span></span>
            <div className="flex gap-2 mt-1.5">
              {Array.from({ length: ACTIONS_PER_TURN }).map((_, i) => (
                <div key={i} className={`w-2.5 h-2.5 rounded-full border border-white/10 transition-all duration-700 ${i < gameState.actionsLeft ? 'bg-teal-400 shadow-[0_0_12px_rgba(45,212,191,0.6)]' : 'bg-slate-900'}`} />
              ))}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="text-right flex flex-col items-end pr-4 border-r border-teal-500/10 font-sans">
             <span className="text-[10px] text-teal-800 font-bold uppercase tracking-widest">灵力</span>
             <span className="text-2xl font-bold text-teal-400 drop-shadow-[0_0_5px_rgba(45,212,191,0.3)]">{activeP.energy}</span>
          </div>
          <div className="flex gap-3 font-classical">
            <button onClick={openSettings} className="px-4 py-2 bg-slate-900/60 text-slate-300 rounded-lg border border-white/5 text-sm hover:bg-slate-800 transition-all tracking-widest">设置</button>
            <button disabled={isSilenced} onClick={nextTurn} className="px-5 py-2 bg-teal-900/40 text-teal-100 rounded-lg border border-teal-500/30 text-sm hover:bg-teal-700 transition-all disabled:opacity-30 font-bold tracking-widest shadow-lg">结轮</button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative min-h-0 z-20">
        <div className="flex-none flex lg:flex-col gap-4 p-5 overflow-x-auto lg:overflow-y-auto lg:w-72 scrollbar-hide lg:border-r border-teal-900/20 bg-black/40 backdrop-blur-lg z-20 shadow-[20px_0_40px_rgba(0,0,0,0.5)]">
          {gameState.players.map((p, i) => {
            const isActive = i === gameState.currentPlayerIndex;
            const pInv = p.buffs.find(b => b.type === '无敌')?.level || 0;
            const canTargetThisPlayer = isSelectingTarget && canUseOnTarget(selectedCard, p);
            return (
              <div key={p.id} className={`p-4 rounded-xl border-2 transition-all duration-500 relative flex-shrink-0 w-44 sm:w-60 ${isActive ? 'bg-slate-900/80 border-teal-500/50 scale-[1.03] shadow-2xl z-10' : 'bg-black/60 border-transparent opacity-40'} ${p.color} ${shakingPlayerId === p.id ? 'shake-anim' : ''} ${p.isEliminated ? 'opacity-10 grayscale scale-95' : ''} ${pInv ? `invincible-lv${pInv}` : ''} ${canTargetThisPlayer ? 'cursor-pointer ring-4 ring-teal-400 ring-offset-4 ring-offset-black animate-pulse' : ''}`} onClick={() => canTargetThisPlayer && onTargetSelect(p)}>
                {floatTexts.filter(ft => ft.playerId === p.id).map(ft => (<div key={ft.id} className={`float-text ${ft.color} font-bold text-2xl font-classical drop-shadow-lg`}>{ft.text}</div>))}
                
                <div className="flex justify-between items-center mb-3">
                   <div className="flex items-center gap-2">
                      <span className="text-xl">{p.character?.avatar}</span>
                      <span className="text-sm font-bold truncate font-classical tracking-widest text-white">{p.name}</span>
                   </div>
                   {p.buffs.length > 0 && <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse shadow-[0_0_12px_rgba(245,158,11,0.8)]" />}
                </div>
                <div className="space-y-3">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-[9px] text-slate-400 font-sans font-bold tracking-tighter uppercase"><span>气血</span><span>{p.hp} / {p.maxHp}</span></div>
                    <div className="h-2 w-full bg-black/60 rounded-full overflow-hidden shadow-inner border border-white/5"><div className="h-full bg-gradient-to-r from-rose-900 to-rose-600 transition-all duration-700 shadow-[0_0_10px_rgba(225,29,72,0.4)]" style={{ width: `${(p.hp/p.maxHp)*100}%` }} /></div>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-classical tracking-widest pt-1 border-t border-white/5">
                     <span className="text-sky-300 bg-sky-950/60 px-2 py-0.5 rounded border border-sky-500/20 shadow-sm">盾 {p.shield}</span> 
                     <span className="text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/20 shadow-sm">寿 {p.lives}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex-1 p-6 flex flex-col overflow-hidden min-h-0 z-10 relative">
            <div className="absolute top-0 left-0 w-full h-12 bg-gradient-to-b from-slate-950/40 to-transparent pointer-events-none z-20"></div>
            <LogDisplay logs={gameState.logs} />
        </div>
      </main>

      <footer className="flex-none max-h-[46vh] bg-slate-950/98 border-t border-teal-900/40 px-4 py-6 relative z-40 overflow-y-auto scrollbar-hide flex flex-col gap-4 shadow-[0_-25px_60px_rgba(0,0,0,0.9)] min-h-[160px]">
        {isSilenced && (
           <div className="absolute inset-0 bg-black/95 backdrop-blur-xl z-[200] flex flex-col items-center justify-center">
              <span className="text-purple-400 text-4xl font-bold mb-2 font-classical tracking-[0.8em] animate-pulse">禁</span>
              <p className="text-slate-500 text-xs font-sans tracking-widest uppercase">Spirit Suppressed</p>
           </div>
        )}
        <div className="pb-16 max-w-7xl mx-auto w-full">
          <CardRow title="入门入门" cards={groupedHand.basic} energy={activeP.energy} actionsLeft={gameState.actionsLeft} isSelectingTarget={isSelectingTarget} selectedCardId={selectedCard?.id} onCardClick={onCardClick} isSilenced={isSilenced} />
          <CardRow title="斗法斗法" cards={groupedHand.weapons} energy={activeP.energy} actionsLeft={gameState.actionsLeft} isSelectingTarget={isSelectingTarget} selectedCardId={selectedCard?.id} onCardClick={onCardClick} isSilenced={isSilenced} />
          <CardRow title="造化造化" cards={groupedHand.items} energy={activeP.energy} actionsLeft={gameState.actionsLeft} isSelectingTarget={isSelectingTarget} selectedCardId={selectedCard?.id} onCardClick={onCardClick} isSilenced={isSilenced} />
          <CardRow title="秘录秘录" cards={groupedHand.effects} energy={activeP.energy} actionsLeft={gameState.actionsLeft} isSelectingTarget={isSelectingTarget} selectedCardId={selectedCard?.id} onCardClick={onCardClick} isSilenced={isSilenced} />
        </div>
        
        {isSelectingTarget && (
          <div className="fixed bottom-8 left-0 right-0 flex justify-center z-[500] animate-in slide-in-from-bottom-12 duration-500">
            <div className="jade-panel px-10 py-5 rounded-full shadow-[0_0_80px_rgba(45,212,191,0.4)] flex items-center gap-12 border-2 border-teal-400/50 backdrop-blur-3xl ring-1 ring-white/10">
               <span className="text-xl font-bold text-teal-100 font-classical tracking-[0.6em] animate-pulse">祭出此法</span>
               <button onClick={() => { setIsSelectingTarget(false); setSelectedCard(null); }} className="px-8 py-2 rounded-full text-rose-100 text-sm border-2 border-rose-500/40 hover:bg-rose-900/60 transition-all bg-rose-950/40 font-classical tracking-widest shadow-inner">收回</button>
            </div>
          </div>
        )}
      </footer>
    </div>
  );
};

export default App;
