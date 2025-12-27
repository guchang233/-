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

const SVG_PATHS: Record<string, React.ReactNode> = {
  'history': <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
  'settings': <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />,
  'fast-forward': <path d="M13 5l7 7-7 7M5 5l7 7-7 7" />,
  'shield': <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-9.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />,
  'hourglass': <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
  'sword': <path d="M21 3L11.5 12.5M16 8L18 6M11.5 12.5L5 19L3 21L5 19L11.5 12.5Z" strokeWidth="2" />,
  'crosshair': <path d="M12 3v3m0 12v3M3 12h3m12 0h3m-9-7a7 7 0 100 14 7 7 0 000-14z" />,
  'undo-2': <path d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />,
  'rotate-ccw': <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />,
  'arrow-left': <path d="M10 19l-7-7m0 0l7-7m-7 7h18" />,
  'palette': <path d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />,
  'file-text': <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
  'volume-2': <path d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M12 18.503l-3.632-3.628a1 1 0 00-.707-.293H5a1 1 0 01-1-1V10.42a1 1 0 011-1h2.66a1 1 0 00.708-.293L12 5.498v13.005z" />
};

const Icon: React.FC<{ name: string; className?: string; size?: number }> = ({ name, className = "", size = 20 }) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`inline-block ${className}`}>
      {SVG_PATHS[name] || <circle cx="12" cy="12" r="10" />}
    </svg>
  );
};

const LogDisplay: React.FC<{ logs: GameLog[]; verbosity: '简略' | '详细' }> = ({ logs, verbosity }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    if (verbosity === '简略') {
      return logs.filter(log => log.isSummary || log.message.includes('祭出') || log.message.includes('开启') || log.message.includes('结'));
    }
    return logs;
  }, [logs, verbosity]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredLogs]);

  return (
    <div className="flex flex-col h-full bg-slate-950/90 border border-teal-900/30 rounded-lg overflow-hidden backdrop-blur-md shadow-2xl">
      <div className="flex-none px-3 py-1.5 bg-slate-900/90 border-b border-teal-500/10 flex justify-between items-center">
        <div className="flex items-center gap-1.5">
           <span className="font-classical tracking-widest text-teal-400 text-[10px] sm:text-xs">修行志</span>
           <span className="text-[8px] px-1 py-0.5 rounded bg-teal-900/40 text-teal-500/80 font-bold border border-teal-500/10 uppercase">{verbosity}</span>
        </div>
        <Icon name="history" className="text-teal-700 opacity-60" size={12} />
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-hide font-classical" ref={scrollRef}>
        {filteredLogs.length === 0 ? (
          <div className="h-full flex items-center justify-center opacity-10 pointer-events-none">
             <span className="text-sm italic tracking-[0.5em]">静待因果</span>
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div key={log.id} className={`border-l pl-2 py-0.5 text-[10px] sm:text-[12px] leading-snug transition-all duration-300 ${log.color || 'text-slate-400'} ${log.isSummary ? 'bg-teal-500/10 font-bold my-1 border-teal-500' : 'border-teal-800/40'}`}>
               <span className="text-teal-900/60 mr-1.5 font-mono text-[8px]">[{log.turn}]</span> 
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
  const translateY = total > 1 ? Math.abs(offset) * 2 : 0;

  return (
    <div 
      onClick={(!isForbidden) ? onClick : undefined} 
      className={`relative w-20 sm:w-36 h-28 sm:h-52 p-2 sm:p-5 rounded-lg sm:rounded-2xl border flex flex-col justify-between transition-all duration-300 flex-shrink-0 ${isFocused ? 'ring-2 sm:ring-4 ring-teal-400 -translate-y-8 sm:-translate-y-12 scale-110' : 'hover:-translate-y-6 sm:hover:-translate-y-10 hover:scale-105'} ${isForbidden ? 'cursor-not-allowed opacity-60 grayscale-[0.2]' : 'cursor-pointer shadow-2xl'} ${card.color} border-white/10 shadow-lg`}
      style={{ 
        zIndex: isFocused ? 500 : index + 10, 
        transform: isFocused ? 'translateY(-20px) scale(1.15)' : `rotate(${rotation}deg) translateY(${translateY}px)` 
      }}
    >
      {isForbidden && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 pointer-events-none rounded-lg sm:rounded-2xl">
          <div className="ink-stamp text-xs sm:text-lg">禁</div>
        </div>
      )}
      <div className="relative z-10 h-full flex flex-col font-classical">
        <div className="flex justify-between items-start mb-0.5 sm:mb-2">
          <div className="text-[7px] sm:text-[10px] font-bold px-1 py-0.5 rounded border border-white/20 bg-black/60 text-teal-100">#{card.rank}</div>
          <div className={`w-4 h-4 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[9px] sm:text-[12px] font-bold shadow-xl border border-white/20 ${card.rank === 3 ? 'bg-amber-400 text-amber-950 ring-1 ring-amber-200' : 'bg-slate-900/95 text-white'}`}>{card.cost}</div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center px-0.5">
          <h3 className="font-bold text-[10px] sm:text-[17px] leading-tight mb-1 sm:mb-2 text-white drop-shadow-lg">{card.name}</h3>
          <p className="hidden sm:block text-[11px] sm:text-[12px] leading-snug opacity-95 italic text-white drop-shadow-sm">{card.description}</p>
          <p className="sm:hidden text-[7px] leading-none opacity-80 text-white truncate max-w-full">{card.description.substring(0, 6)}</p>
        </div>
        <div className="flex justify-between items-end mt-0.5 sm:mt-2 border-t pt-0.5 sm:pt-2 border-white/20">
           <div className="text-[6px] sm:text-[10px] font-bold uppercase tracking-tight sm:tracking-widest text-white/60">{card.type}</div>
           {card.pierceLevel !== undefined && card.pierceLevel > 0 && (
             <div className="text-[7px] sm:text-[10px] font-bold px-1 bg-rose-600 text-white rounded-sm">破{card.pierceLevel}</div>
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
    <div className="mb-3 sm:mb-10">
      <div className="flex items-center gap-2 mb-1 px-4 sm:px-10">
         <span className="text-teal-500 text-[9px] sm:text-sm font-bold tracking-[0.2em] font-classical border-l-2 border-teal-500/50 pl-2 uppercase">{title}</span>
         <div className="h-px flex-1 bg-gradient-to-r from-teal-500/10 to-transparent"></div>
      </div>
      <div className="flex gap-2 sm:gap-8 overflow-x-auto pb-4 pt-8 sm:pt-16 scrollbar-hide px-6 sm:px-16 items-end min-h-[120px] sm:min-h-[250px] mask-fade-edges">
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
    setTimeout(() => {
      setFloatTexts(curr => curr.filter(ft => ft.id !== id));
    }, 1200);
  }, []);

  const triggerShake = useCallback((playerId: string) => {
    setShakingPlayerId(playerId);
    setTimeout(() => setShakingPlayerId(null), 250);
  }, []);

  const addLog = useCallback((message: string, color?: string, isSummary: boolean = false) => {
    setGameState(prev => ({
      ...prev,
      logs: [...prev.logs, { id: Math.random().toString(36), message, timestamp: Date.now(), turn: prev.turnCount, color, isSummary }]
    }));
  }, []);

  const initGame = () => {
    const players: Player[] = Array.from({ length: 2 }).map((_, i) => {
      const char = i === 0 ? selectedCharacter : gameState.customCharacters[Math.floor(Math.random() * gameState.customCharacters.length)];
      return {
        id: `p${i}`,
        name: i === 0 ? `${selectedCharacter.name}` : `${char.name}`,
        hp: INITIAL_HP,
        maxHp: INITIAL_HP,
        shield: char.id === 'char_array' ? 2 : 0,
        energy: 0,
        lives: INITIAL_LIVES,
        hand: [...gameState.customCardPool],
        isEliminated: false,
        color: PLAYER_COLORS[i],
        buffs: [],
        character: char
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
    }));
    addLog(`诸天论道开启。`, "text-amber-300", true);
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
      if (prev.players.length === 0) return prev;
      let nextIndex = (prev.currentPlayerIndex + 1) % prev.players.length;
      while (prev.players[nextIndex] && prev.players[nextIndex].isEliminated) {
        nextIndex = (nextIndex + 1) % prev.players.length;
      }
      const roundEnded = nextIndex <= prev.currentPlayerIndex;
      const alivePlayers = prev.players.filter(p => !p.isEliminated);
      if (alivePlayers.length === 1) return { ...prev, status: '结算', winner: alivePlayers[0] };
      
      let nextRoundCount = prev.roundCount;
      if (roundEnded) nextRoundCount = prev.roundCount + 1;

      const updatedPlayers = prev.players.map(p => {
        if (p.id === prev.players[nextIndex]?.id) {
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
    const h = activeP.hand || [];
    return {
      basic: h.filter(c => c.type === '基础'),
      weapons: h.filter(c => c.type === '武器'),
      items: h.filter(c => c.type === '道具' || c.type === '丹药'),
      effects: h.filter(c => c.type === '效果'),
    };
  }, [activeP]);

  const canUseOnTarget = useCallback((card: Card | null, target: Player) => {
    if (!card || !target || target.isEliminated || !activeP) return false;
    if (card.type === '武器' || card.id === 'e_1_1') return target.id !== activeP.id;
    if (card.type === '基础' || card.type === '道具' || card.type === '丹药' || card.name.includes('金身')) return target.id === activeP.id;
    return true;
  }, [activeP]);

  const applyCardEffect = (card: Card, sourceId: string, targetId: string) => {
    const source = gameState.players.find(p => p.id === sourceId);
    const target = gameState.players.find(p => p.id === targetId);
    if (!source || !target || source.energy < card.cost) return;

    setGameState(prev => {
      const players = [...prev.players];
      const sIdx = players.findIndex(p => p.id === sourceId);
      const tIdx = players.findIndex(p => p.id === targetId);
      if (sIdx === -1 || tIdx === -1) return prev;

      const s = { ...players[sIdx] };
      const t = { ...players[tIdx] };

      s.energy -= card.cost;
      const targetInvLevel = t.buffs.find(b => b.type === '无敌')?.level || 0;
      const pierce = card.pierceLevel || 0;
      const goldBodyPrevents = targetInvLevel > 0 && targetInvLevel > pierce;
      let logMsg = `【${s.name}】祭出《${card.name}》`;

      if (card.type === '基础') {
        if (card.id === 'base_1') t.energy += 1;
        else t.shield += 1;
      } else if (card.type === '武器') {
        if (goldBodyPrevents) logMsg += ` (受阻于金身)`;
        else {
          const hasMine = t.buffs.some(b => b.type === '地雷触发');
          if (hasMine) {
            s.hp = Math.max(0, s.hp - 2);
            t.buffs = t.buffs.filter(b => b.type !== '地雷触发');
          }
          let dmg = (card.rank === 3 ? 3 : (card.rank >= 1 ? 2 : 1)) + (s.character?.id === 'char_sword' ? 1 : 0);
          let sh = t.shield;
          if (sh > 0) {
            if (dmg <= sh) { sh -= dmg; dmg = 0; }
            else { dmg -= sh; sh = 0; }
          }
          t.shield = sh;
          t.hp = Math.max(0, t.hp - dmg);
        }
      } else if (card.type === '道具' || card.type === '丹药') {
        if (s.character?.id === 'char_pill') s.hp = Math.min(s.maxHp, s.hp + 1);
        if (card.id === 'i_mine') t.buffs = [...t.buffs.filter(b => b.type !== '无敌'), { type: '无敌', level: 1, duration: 1 }, { type: '地雷触发', duration: 99 }];
        else if (card.id === 'i_1_1') t.buffs = [...t.buffs, { type: '无敌', level: 1, duration: 1 }];
        else if (card.rank === 2) t.lives += 1;
        else if (card.rank === 3) t.hp = t.maxHp;
      } else if (card.type === '效果') {
        if (card.id === 'e_1_1') t.buffs = [...t.buffs, { type: '静默', duration: 1 }];
        else if (card.name.includes('金身')) t.buffs = [...t.buffs.filter(b => b.type !== '无敌'), { type: '无敌', level: card.rank, duration: 1 }];
      }

      players[sIdx] = s;
      players[tIdx] = t;

      return {
        ...prev,
        players: checkEliminations(players),
        actionsLeft: prev.actionsLeft - 1,
        logs: [...prev.logs, { id: Math.random().toString(36), message: logMsg, timestamp: Date.now(), turn: prev.turnCount, isSummary: false }]
      };
    });

    queueMicrotask(() => {
      if (card.type === '基础') addFloatText(card.id === 'base_1' ? "+1灵" : "+1盾", targetId, "text-sky-300");
      else if (card.type === '武器') {
        triggerShake(targetId);
        const inv = target.buffs.find(b => b.type === '无敌')?.level || 0;
        if (inv > 0 && inv > (card.pierceLevel || 0)) addFloatText("金身抵挡", targetId, "text-amber-400 font-classical");
        else {
           let d = (card.rank === 3 ? 3 : (card.rank >= 1 ? 2 : 1)) + (source.character?.id === 'char_sword' ? 1 : 0);
           if (target.shield > 0) d = Math.max(0, d - target.shield);
           if (d > 0) addFloatText(`-${d}`, targetId, "text-rose-500 font-bold text-lg sm:text-xl");
        }
      } else if (card.type === '效果') {
        if (card.id === 'e_1_1') addFloatText("封印", targetId, "text-purple-500 font-bold");
      }
    });

    setSelectedCard(null); 
    setIsSelectingTarget(false);
  };

  const onCardClick = (card: Card) => {
    if (!activeP || gameState.actionsLeft <= 0 || isSilenced) return;
    if (activeP.energy < card.cost) return;
    setSelectedCard(card);
    setIsSelectingTarget(true);
  };

  const onTargetSelect = (target: Player) => {
    if (!activeP || !target || target.isEliminated) return;
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
      <div className="h-screen flex items-center justify-center p-4 relative z-[999]">
        <div className="jade-panel p-8 sm:p-12 rounded-[1.5rem] sm:rounded-[2rem] text-center w-full max-w-xs sm:max-w-sm border border-teal-500/20 shadow-2xl">
          <h1 className="text-4xl sm:text-6xl font-classical text-white mb-4 sm:mb-6 tracking-widest drop-shadow-lg">诸天论道</h1>
          <p className="text-teal-500/50 mb-8 sm:mb-10 text-[10px] sm:text-xs tracking-[0.5em] italic font-classical">一念登仙 · 万古长空</p>
          <div className="flex flex-col gap-3 sm:gap-5">
             <button onClick={() => setGameState(p => ({ ...p, status: '化身选择' }))} className="py-3 sm:py-5 bg-teal-900/50 text-white rounded-xl sm:rounded-2xl border border-teal-500/20 hover:bg-teal-700 transition-all font-classical text-xl sm:text-3xl tracking-widest active:scale-95">开启修行</button>
             <button onClick={openSettings} className="py-2 bg-slate-800/40 text-slate-300 rounded-lg border border-white/5 hover:bg-slate-700 transition-all text-[10px] sm:text-sm tracking-widest flex items-center justify-center gap-2 active:scale-95 font-classical">
               <Icon name="settings" size={12} /> 修行设置
             </button>
          </div>
        </div>
      </div>
    );
  }

  if (gameState.status === '化身选择') {
    return (
      <div className="h-screen flex items-center justify-center p-4 relative z-[999]">
        <div className="jade-panel p-4 sm:p-10 rounded-[1.5rem] sm:rounded-[2rem] w-full max-w-4xl border border-teal-500/10 flex flex-col md:flex-row gap-4 sm:gap-8 shadow-2xl overflow-y-auto max-h-[95vh] scrollbar-hide">
           <div className="flex-1 space-y-4 sm:space-y-8 font-classical">
              <h2 className="text-xl sm:text-3xl font-bold text-teal-400 tracking-widest">化身抉择</h2>
              <div className="grid grid-cols-2 gap-2 sm:gap-5">
                 {gameState.customCharacters.map(char => (
                   <div key={char.id} onClick={() => setSelectedCharacter(char)} className={`group p-2 sm:p-5 rounded-xl sm:rounded-2xl border transition-all cursor-pointer flex gap-2 sm:gap-5 items-center ${selectedCharacter.id === char.id ? 'border-teal-400 bg-teal-900/30 ring-1 ring-teal-400/20 shadow-lg' : 'border-white/5 bg-black/40 opacity-50 hover:opacity-100'}`}>
                        <div className="w-8 h-8 sm:w-14 sm:h-14 rounded-full border border-white/10 flex-shrink-0 bg-slate-900 flex items-center justify-center">
                          <span className="text-base sm:text-3xl">{char.avatar}</span>
                        </div>
                        <div className="text-[10px] sm:text-xl font-bold text-white tracking-widest">{char.name}</div>
                   </div>
                 ))}
              </div>
              <button onClick={initGame} className="w-full py-3 sm:py-5 bg-teal-600 text-white rounded-xl sm:rounded-2xl hover:bg-teal-500 text-lg sm:text-3xl tracking-widest active:scale-95">踏 入 仙 途</button>
           </div>
           <div className="w-full md:w-80 bg-slate-950/60 rounded-xl sm:rounded-3xl p-4 sm:p-8 border border-white/5 flex flex-col justify-between font-classical">
              <div className="text-center">
                 <div className="text-4xl sm:text-8xl mb-2 sm:mb-8 drop-shadow-2xl">{selectedCharacter.avatar}</div>
                 <h3 className={`text-xl sm:text-3xl font-bold mb-1 sm:mb-3 ${selectedCharacter.color} tracking-widest`}>{selectedCharacter.title}</h3>
                 <p className="text-[9px] sm:text-sm text-slate-500 leading-tight sm:leading-relaxed mb-3 sm:mb-8 italic opacity-80">{selectedCharacter.description}</p>
                 <div className="bg-teal-950/30 p-2 sm:p-5 rounded-xl border border-teal-500/10 text-left">
                    <div className="text-teal-300 font-bold text-[10px] sm:text-sm mb-1 border-b border-teal-500/10 pb-1">天赋：{selectedCharacter.passiveName}</div>
                    <div className="text-[8px] sm:text-[11px] text-slate-300 leading-tight">{selectedCharacter.passiveDesc}</div>
                 </div>
              </div>
              <button onClick={() => setGameState(p => ({ ...p, status: '大厅' }))} className="mt-4 sm:mt-8 text-[9px] sm:text-[12px] text-slate-600 hover:text-white tracking-widest text-center flex items-center justify-center gap-1 active:scale-95">
                <Icon name="arrow-left" size={10} /> 返回前尘
              </button>
           </div>
        </div>
      </div>
    );
  }

  if (gameState.status === '设置') {
    return (
      <div className="h-screen flex items-center justify-center p-4 relative z-[1000]">
        <div className="jade-panel p-6 sm:p-10 rounded-[1.5rem] w-full max-w-xs border border-slate-700/40 shadow-2xl font-classical">
           <h2 className="text-xl sm:text-3xl font-bold text-slate-200 mb-6 sm:mb-10 text-center tracking-widest">修行设置</h2>
           <div className="space-y-4 sm:space-y-8">
              <div className="space-y-2">
                 <div className="flex justify-between text-[10px] sm:text-[12px] text-slate-500 tracking-widest uppercase font-bold">
                    <span className="flex items-center gap-1"><Icon name="volume-2" size={10} /> 灵韵</span>
                    <span>{gameState.settings.bgVolume}%</span>
                 </div>
                 <input type="range" className="w-full h-1 bg-slate-800 rounded-lg accent-teal-500 appearance-none cursor-pointer" value={gameState.settings.bgVolume} onChange={(e) => setGameState(p => ({ ...p, settings: { ...p.settings, bgVolume: parseInt(e.target.value) } }))} />
              </div>
              <div className="flex justify-between items-center text-[10px] sm:text-sm">
                 <span className="text-slate-400 tracking-widest flex items-center gap-1"><Icon name="palette" size={10} /> 画境</span>
                 <div className="flex gap-1.5">
                    {['浓墨', '淡彩'].map(t => (
                      <button key={t} onClick={() => setGameState(p => ({ ...p, settings: { ...p.settings, theme: t as any } }))} className={`px-2 py-1 rounded-lg border transition-all ${gameState.settings.theme === t ? 'bg-teal-500 text-slate-950 border-teal-300 font-bold' : 'text-slate-500 border-slate-800'}`}>{t}</button>
                    ))}
                 </div>
              </div>
              <div className="flex justify-between items-center text-[10px] sm:text-sm">
                 <span className="text-slate-400 tracking-widest flex items-center gap-1"><Icon name="file-text" size={10} /> 志书</span>
                 <div className="flex gap-1.5">
                    {['简略', '详细'].map(v => (
                      <button key={v} onClick={() => setGameState(p => ({ ...p, settings: { ...p.settings, logVerbosity: v as any } }))} className={`px-2 py-1 rounded-lg border transition-all ${gameState.settings.logVerbosity === v ? 'bg-sky-600 text-white border-sky-400 font-bold' : 'text-slate-500 border-slate-800'}`}>{v}</button>
                    ))}
                 </div>
              </div>
           </div>
           <button onClick={() => setGameState(p => ({ ...p, status: prevStatus || '大厅' }))} className="mt-8 sm:mt-12 w-full py-3 bg-slate-800 text-slate-200 rounded-xl border border-white/10 text-sm sm:text-xl tracking-widest active:scale-95">确认修行</button>
        </div>
      </div>
    );
  }

  if (gameState.status === '结算') {
    return (
      <div className="h-screen flex items-center justify-center p-4 relative z-[999]">
        <div className="jade-panel p-8 sm:p-16 rounded-[1.5rem] sm:rounded-[3rem] text-center border-2 border-amber-500/20 max-w-xs sm:max-w-md w-full shadow-2xl font-classical">
          <h2 className="text-xl sm:text-4xl text-amber-200 mb-4 sm:mb-8 tracking-widest">因 果 止 歇</h2>
          <div className="text-5xl sm:text-8xl mb-6 sm:mb-10 drop-shadow-xl animate-bounce">🏆</div>
          <p className="text-2xl sm:text-5xl text-amber-400 mb-1 sm:mb-3 font-bold">{gameState.winner?.name}</p>
          <p className="text-[10px] sm:text-lg text-amber-800/60 mb-8 sm:mb-12 italic">道极巅峰 · 诸天之主</p>
          <button onClick={() => setGameState(p => ({ ...p, status: '大厅' }))} className="w-full py-3 sm:py-5 bg-slate-900 text-white rounded-xl sm:rounded-2xl border border-teal-900/20 text-sm sm:text-2xl tracking-widest flex items-center justify-center gap-2 active:scale-95 shadow-xl">
            <Icon name="rotate-ccw" size={16} /> 重入轮回
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen flex flex-col overflow-hidden relative ${gameState.settings.theme === '浓墨' ? 'grayscale opacity-90' : ''}`}>
      <header className="flex-none flex justify-between items-center px-3 sm:px-10 py-2 sm:py-3 bg-slate-950 border-b border-teal-500/10 z-[60] backdrop-blur-3xl shadow-xl font-classical">
        <div className="flex gap-2 sm:gap-5 items-center">
          <div className="w-8 h-8 sm:w-14 sm:h-14 rounded-full border border-teal-500/40 flex items-center justify-center bg-black shadow-xl ring-2 ring-teal-500/10">
             <span className="text-lg sm:text-4xl">{activeP?.character?.avatar || '👤'}</span>
          </div>
          <div className="flex flex-col">
            <span className={`text-[10px] sm:text-xl font-bold tracking-wider ${activeP?.color.split(' ')[0].replace('border', 'text') || 'text-white'}`}>{activeP?.name || '修行者'}</span>
            <div className="flex gap-1 mt-0.5">
              {Array.from({ length: ACTIONS_PER_TURN }).map((_, i) => (
                <div key={i} className={`w-1.5 h-1.5 sm:w-2.5 sm:h-2.5 rounded-full border border-white/10 transition-all duration-500 ${i < gameState.actionsLeft ? 'bg-teal-400 shadow-[0_0_4px_rgba(45,212,191,0.6)]' : 'bg-slate-900 opacity-20'}`} />
              ))}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3 sm:gap-12">
          <div className="hidden sm:flex flex-col items-center px-6 border-x border-teal-500/10">
             <span className="text-[10px] text-teal-900 font-bold uppercase tracking-widest">灵力</span>
             <span className="text-2xl font-bold text-teal-400 font-mono">{activeP?.energy || 0}</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-6">
             <button onClick={openSettings} className="w-8 h-8 sm:w-12 sm:h-12 flex items-center justify-center bg-slate-900/80 text-slate-300 rounded-lg sm:rounded-2xl border border-white/10 active:scale-90">
               <Icon name="settings" size={14} />
             </button>
             <button disabled={isSilenced} onClick={nextTurn} className="px-3 sm:px-8 py-1.5 sm:py-3 bg-teal-900/40 text-teal-100 rounded-lg sm:rounded-2xl border border-teal-500/20 text-[9px] sm:text-sm tracking-widest transition-transform disabled:opacity-20 flex items-center gap-1 active:scale-95">
               结轮 <Icon name="fast-forward" size={10} />
             </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0 z-20">
        <aside className="flex-none flex lg:flex-col gap-2 sm:gap-5 p-2 sm:p-6 overflow-x-auto lg:overflow-y-auto lg:w-80 scrollbar-hide lg:border-r border-teal-900/10 bg-black/40 backdrop-blur-2xl z-30 shadow-2xl">
          {gameState.players.map((p, i) => {
            const isActive = i === gameState.currentPlayerIndex;
            const pInv = p.buffs.find(b => b.type === '无敌')?.level || 0;
            const canTarget = isSelectingTarget && canUseOnTarget(selectedCard, p);
            return (
              <div key={p.id} 
                className={`p-2.5 sm:p-6 rounded-xl sm:rounded-3xl border transition-all duration-500 relative flex-shrink-0 w-40 sm:w-64 lg:w-full overflow-hidden ${isActive ? 'bg-slate-900/80 border-teal-500/50 scale-[1.02]' : 'bg-black/20 border-white/5 opacity-40'} ${p.color} ${shakingPlayerId === p.id ? 'shake-anim' : ''} ${p.isEliminated ? 'opacity-5 grayscale' : ''} ${pInv ? `border-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.3)]` : ''} ${canTarget ? 'target-selectable-active ring-2 sm:ring-4 ring-teal-400 scale-105' : ''}`} 
                onClick={() => canTarget && onTargetSelect(p)}
              >
                {floatTexts.filter(ft => ft.playerId === p.id).map(ft => (<div key={ft.id} className={`float-text ${ft.color} font-bold font-classical text-base sm:text-4xl`}>{ft.text}</div>))}
                <div className="relative z-10 font-classical">
                  <div className="flex justify-between items-center mb-1.5 sm:mb-5">
                     <div className="flex items-center gap-1.5 sm:gap-5">
                        <span className="text-xl sm:text-5xl drop-shadow-md">{p.character?.avatar}</span>
                        <div className="flex flex-col">
                           <span className="text-[9px] sm:text-base font-bold truncate tracking-wider text-white">{p.name}</span>
                           <span className="text-[8px] text-teal-400 font-mono lg:hidden">灵: {p.energy}</span>
                        </div>
                     </div>
                  </div>
                  <div className="space-y-1.5 sm:space-y-5">
                    <div className="flex flex-col gap-0.5 sm:gap-1.5">
                      <div className="flex justify-between text-[8px] sm:text-[11px] text-slate-500 font-bold uppercase tracking-widest"><span>血</span><span>{p.hp}/{p.maxHp}</span></div>
                      <div className="h-1 sm:h-2 w-full bg-black/90 rounded-full overflow-hidden border border-white/5"><div className="h-full bg-gradient-to-r from-rose-900 to-rose-500 transition-all duration-1000" style={{ width: `${(p.hp/p.maxHp)*100}%` }} /></div>
                    </div>
                    <div className="flex justify-between items-center text-[9px] sm:text-[12px] tracking-widest pt-1 sm:pt-2 opacity-95 border-t border-white/10 mt-0.5 font-classical">
                       <span className="text-sky-300 font-bold flex items-center gap-1"><Icon name="shield" size={10} /> {p.shield}</span> 
                       <span className="text-emerald-300 font-bold flex items-center gap-1"><Icon name="hourglass" size={10} /> {p.lives}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </aside>

        <section className="flex-1 p-2 flex flex-col overflow-hidden min-h-0 z-20 relative bg-slate-950/20 lg:flex-row gap-4">
            <div className="hidden lg:flex lg:w-80 lg:flex-none flex-col h-full min-h-0 max-h-full">
              <LogDisplay logs={gameState.logs} verbosity={gameState.settings.logVerbosity} />
            </div>
            
            <div className="flex-1 flex flex-col justify-center items-center text-center p-2 relative min-h-0">
               {!isSelectingTarget ? (
                 <div className="opacity-5 flex flex-col items-center gap-2 sm:gap-6 transition-opacity duration-700">
                    <Icon name="sword" size={64} className="text-teal-900" />
                    <span className="font-classical text-xl sm:text-4xl tracking-[1em] text-teal-900 ml-[1em]">论道中</span>
                 </div>
               ) : (
                 <div className="animate-in zoom-in-90 duration-500 flex flex-col items-center gap-4 sm:gap-8 z-50">
                    <div className="relative">
                      <Icon name="crosshair" size={80} className="text-teal-400 opacity-60 animate-pulse" />
                      <div className="absolute inset-0 flex items-center justify-center">
                         <div className="w-20 h-20 border-2 border-teal-400/20 rounded-full animate-ping" />
                      </div>
                    </div>
                    <span className="font-classical text-3xl sm:text-7xl tracking-[0.4em] text-teal-100 drop-shadow-[0_0_20px_rgba(45,212,191,0.6)]">请择目标</span>
                    <p className="text-[10px] sm:text-2xl text-teal-400/60 font-classical tracking-widest">点击上方或左侧化身确认《{selectedCard?.name}》</p>
                 </div>
               )}
               {isSelectingTarget && <div className="absolute inset-0 target-overlay z-10 transition-opacity duration-1000 animate-in fade-in" />}
            </div>

            <div className="block lg:hidden flex-none min-h-[140px] h-[25vh] animate-in slide-in-from-bottom-4 border-t border-teal-900/10 pt-2">
               <LogDisplay logs={gameState.logs} verbosity={gameState.settings.logVerbosity} />
            </div>
        </section>
      </main>

      <footer className="flex-none bg-slate-950/98 border-t border-teal-900/30 p-2 sm:p-6 relative z-[70] shadow-[0_-20px_60px_rgba(0,0,0,0.95)]">
        {isSilenced && (
           <div className="absolute inset-0 bg-black/98 backdrop-blur-3xl z-[300] flex flex-col items-center justify-center animate-in fade-in duration-500">
              <span className="text-purple-600 text-4xl sm:text-9xl font-bold font-classical tracking-[0.8em] opacity-80 animate-pulse">封</span>
              <p className="text-slate-800 text-[10px] tracking-[0.5em] mt-2 sm:mt-8 opacity-50 uppercase font-bold font-classical">气血运行受阻</p>
           </div>
        )}
        
        <div className="max-h-[30vh] sm:max-h-[45vh] overflow-y-auto scrollbar-hide py-2">
          <div className="max-w-[1500px] mx-auto space-y-3">
            <CardRow title="基础" cards={groupedHand.basic} energy={activeP?.energy || 0} actionsLeft={gameState.actionsLeft} isSelectingTarget={isSelectingTarget} selectedCardId={selectedCard?.id} onCardClick={onCardClick} isSilenced={isSilenced} />
            <CardRow title="武器" cards={groupedHand.weapons} energy={activeP?.energy || 0} actionsLeft={gameState.actionsLeft} isSelectingTarget={isSelectingTarget} selectedCardId={selectedCard?.id} onCardClick={onCardClick} isSilenced={isSilenced} />
            <CardRow title="丹药" cards={groupedHand.items} energy={activeP?.energy || 0} actionsLeft={gameState.actionsLeft} isSelectingTarget={isSelectingTarget} selectedCardId={selectedCard?.id} onCardClick={onCardClick} isSilenced={isSilenced} />
            <CardRow title="禁法" cards={groupedHand.effects} energy={activeP?.energy || 0} actionsLeft={gameState.actionsLeft} isSelectingTarget={isSelectingTarget} selectedCardId={selectedCard?.id} onCardClick={onCardClick} isSilenced={isSilenced} />
          </div>
        </div>

        {isSelectingTarget && (
          <div className="fixed inset-0 pointer-events-none z-[499] flex flex-col items-center justify-end pb-16 sm:pb-36 px-6">
             <div className="pointer-events-auto jade-panel px-4 sm:px-20 py-3 sm:py-8 rounded-2xl sm:rounded-[2.5rem] shadow-[0_0_60px_rgba(0,0,0,0.9)] flex items-center gap-4 sm:gap-10 border border-teal-400/60 backdrop-blur-3xl animate-in slide-in-from-bottom-8 duration-500">
               <button onClick={() => { setIsSelectingTarget(false); setSelectedCard(null); }} className="w-10 h-10 sm:w-20 sm:h-20 flex items-center justify-center rounded-xl sm:rounded-3xl text-rose-200 border border-rose-500/30 bg-rose-950/50 active:scale-90 shadow-2xl group">
                 <Icon name="undo-2" size={20} className="sm:size-32 group-hover:-translate-x-1 transition-transform" />
               </button>
               <div className="text-left flex-1 font-classical">
                  <span className="text-sm sm:text-3xl font-bold text-teal-500 block">祭出</span>
                  <div className="flex items-center gap-2 sm:gap-4">
                    <span className="px-2 py-0.5 sm:px-5 sm:py-2 bg-teal-900/60 rounded-lg text-teal-300 font-bold border border-teal-500/20 text-xs sm:text-xl shadow-[0_0_10px_rgba(45,212,191,0.2)]">《{selectedCard?.name}》</span>
                    <span className="text-[8px] sm:text-base text-teal-500/50 italic tracking-widest hidden sm:inline">请选择对手化身确认</span>
                  </div>
               </div>
            </div>
          </div>
        )}
      </footer>
    </div>
  );
};

export default App;