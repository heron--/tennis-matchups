import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext';
import { buildEloTimeline } from '../eloHistory';
import { EloChart } from '../components/EloChart';
import { ConfirmModal } from '../components/ConfirmModal';
import { showToast } from '../components/Toast';
import type { MatchRecord, Player } from '../types';

export function PlayerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state, updatePlayer, deletePlayer, nudgeElo } = useApp();
  const [showRename, setShowRename] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showNudge, setShowNudge] = useState(false);

  const player = state.players.find(p => p.id === id);
  if (!player) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-8 text-center gap-4">
        <p className="text-slate-400">Player not found</p>
        <button
          onClick={() => navigate('/')}
          className="text-indigo-400 font-semibold"
        >
          Back to Roster
        </button>
      </div>
    );
  }

  const timeline = buildEloTimeline(player.id, state.matches);
  const playerMatches = state.matches
    .filter(m => m.player1Id === player.id || m.player2Id === player.id)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const total = player.wins + player.losses;
  const winRate = total > 0 ? Math.round((player.wins / total) * 100) : null;

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-5 pb-2">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1 text-sm text-slate-400 active:text-slate-200 mb-4 min-h-[44px]"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Roster
        </button>

        {/* Player header */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-2xl font-black text-white tracking-tight truncate">{player.name}</h1>
            <button
              onClick={() => setShowRename(true)}
              className="shrink-0 p-1.5 rounded-lg text-slate-500 active:text-slate-300 active:bg-[#22263a]"
              aria-label="Rename player"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M17 3a2.85 2.85 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
              </svg>
            </button>
            <button
              onClick={() => setShowNudge(true)}
              className="shrink-0 p-1.5 rounded-lg text-slate-500 active:text-slate-300 active:bg-[#22263a]"
              aria-label="Adjust ELO"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-black text-indigo-400">{player.elo}</div>
            <div className="text-xs text-slate-600 tracking-widest uppercase">ELO</div>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 mb-6">
          {total === 0 ? (
            <span className="text-xs font-bold tracking-widest text-slate-500 uppercase">Unranked</span>
          ) : (
            <>
              <span className="text-sm text-green-400 font-semibold">{player.wins}W</span>
              <span className="text-sm text-slate-600">·</span>
              <span className="text-sm text-red-400 font-semibold">{player.losses}L</span>
              {winRate !== null && (
                <>
                  <span className="text-sm text-slate-600">·</span>
                  <span className="text-sm text-slate-400">{winRate}% win rate</span>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="px-4 mb-6">
        <h2 className="text-xs font-bold tracking-widest uppercase text-slate-500 mb-3">ELO History</h2>
        <EloChart data={timeline} />
      </div>

      {/* Match history */}
      <div className="px-4 pb-4 flex-1">
        <h2 className="text-xs font-bold tracking-widest uppercase text-slate-500 mb-3">
          Recent Matches
        </h2>
        {playerMatches.length === 0 ? (
          <p className="text-slate-500 text-sm">No matches played yet</p>
        ) : (
          <div className="flex flex-col gap-2">
            {playerMatches.map(match => (
              <MatchRow key={match.id} match={match} player={player} players={state.players} />
            ))}
          </div>
        )}
      </div>

      {/* Delete */}
      <div className="px-4 pb-8">
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="w-full py-3 rounded-xl bg-red-950/40 text-red-400 font-semibold text-sm active:bg-red-950/60 transition-colors border border-red-900/30 min-h-[44px]"
        >
          Delete Player
        </button>
      </div>

      {/* Rename modal */}
      {showRename && (
        <RenameModal
          player={player}
          onClose={() => setShowRename(false)}
          onRename={(name) => {
            updatePlayer(player.id, { name });
            showToast(`Renamed to ${name}`);
            setShowRename(false);
          }}
        />
      )}

      {/* Nudge modal */}
      {showNudge && (
        <NudgeModal
          player={player}
          onClose={() => setShowNudge(false)}
          onNudge={(delta) => {
            nudgeElo(player.id, delta);
            showToast(`ELO ${delta > 0 ? '+' : ''}${delta}`);
            setShowNudge(false);
          }}
        />
      )}

      {/* Delete confirm */}
      {showDeleteConfirm && (
        <ConfirmModal
          title="Delete Player"
          message={`Remove ${player.name} from the roster? Their match history will remain, but their record will be orphaned.`}
          confirmLabel="Delete"
          danger
          onConfirm={() => {
            const name = player.name;
            deletePlayer(player.id);
            showToast(`${name} removed`, 'error');
            navigate('/');
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}

function RenameModal({
  player,
  onClose,
  onRename,
}: {
  player: Player;
  onClose: () => void;
  onRename: (name: string) => void;
}) {
  const [name, setName] = useState(player.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);
  }, []);

  function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === player.name) {
      onClose();
      return;
    }
    onRename(trimmed);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-[#1a1d27] rounded-2xl border border-[#2e3350] p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-white mb-4">Rename Player</h2>
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          className="w-full bg-[#22263a] border border-[#2e3350] rounded-xl px-4 py-3 text-white text-base focus:outline-none focus:border-indigo-500 min-h-[48px] mb-4"
        />
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-[#2e3350] text-slate-300 font-semibold text-sm active:bg-[#22263a] transition-colors min-h-[44px]"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-3 rounded-xl bg-indigo-600 active:bg-indigo-700 text-white font-semibold text-sm transition-colors min-h-[44px]"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function NudgeModal({
  player,
  onClose,
  onNudge,
}: {
  player: Player;
  onClose: () => void;
  onNudge: (delta: number) => void;
}) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const delta = Number(value);
  const canSubmit = value !== '' && delta !== 0 && !isNaN(delta);

  function handleSubmit() {
    if (!canSubmit) return;
    onNudge(delta);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-[#1a1d27] rounded-2xl border border-[#2e3350] p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-white mb-1">Adjust ELO</h2>
        <p className="text-xs text-slate-500 mb-4">
          Current: <span className="text-indigo-400 font-semibold">{player.elo}</span>
          {canSubmit && (
            <span className="text-slate-400">
              {' → '}<span className="text-white font-semibold">{player.elo + delta}</span>
            </span>
          )}
        </p>
        <input
          ref={inputRef}
          type="number"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="e.g. +50 or -25"
          className="w-full bg-[#22263a] border border-[#2e3350] rounded-xl px-4 py-3 text-white text-base text-center focus:outline-none focus:border-indigo-500 min-h-[48px] mb-4"
        />
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-[#2e3350] text-slate-300 font-semibold text-sm active:bg-[#22263a] transition-colors min-h-[44px]"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 py-3 rounded-xl bg-amber-600 active:bg-amber-700 disabled:opacity-40 text-white font-semibold text-sm transition-colors min-h-[44px]"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

function MatchRow({
  match,
  player,
  players,
}: {
  match: MatchRecord;
  player: Player;
  players: Player[];
}) {
  const date = new Date(match.timestamp);
  const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;

  if (match.context === 'adjustment') {
    const isPositive = match.winnerId === player.id;
    return (
      <div className="bg-[#1a1d27] border border-dashed border-amber-900/40 rounded-xl px-4 py-3 flex items-center gap-3">
        <div className="w-1.5 h-8 rounded-full shrink-0 bg-amber-400/60" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-400">ADJ</span>
            <span className="text-sm text-slate-400 font-semibold">ELO Adjustment</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-slate-500">{dateStr}</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className={`text-sm font-bold ${isPositive ? 'text-amber-400' : 'text-amber-400'}`}>
            {isPositive ? '+' : '-'}{match.eloChange}
          </div>
        </div>
      </div>
    );
  }

  const isWinner = match.winnerId === player.id;
  const opponentId = match.player1Id === player.id ? match.player2Id : match.player1Id;
  const opponent = players.find(p => p.id === opponentId);
  const opponentName = opponent?.name ?? 'Unknown';

  const playerScore = match.player1Id === player.id ? match.player1Score : match.player2Score;
  const opponentScore = match.player1Id === player.id ? match.player2Score : match.player1Score;

  return (
    <div className="bg-[#1a1d27] border border-[#2e3350] rounded-xl px-4 py-3 flex items-center gap-3">
      {/* Result indicator */}
      <div className={`w-1.5 h-8 rounded-full shrink-0 ${isWinner ? 'bg-green-400' : 'bg-red-400'}`} />

      {/* Match info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold ${isWinner ? 'text-green-400' : 'text-red-400'}`}>
            {isWinner ? 'W' : 'L'}
          </span>
          <span className="text-sm text-white font-semibold truncate">vs {opponentName}</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-slate-500">{dateStr}</span>
          <span className="text-xs text-slate-600">·</span>
          <span className="text-xs text-slate-500 capitalize">{match.context}</span>
        </div>
      </div>

      {/* Score */}
      <div className="text-right shrink-0">
        <div className="text-sm font-bold text-white">{playerScore}–{opponentScore}</div>
        <div className={`text-xs font-semibold ${isWinner ? 'text-green-400' : 'text-red-400'}`}>
          {isWinner ? '+' : '-'}{match.eloChange}
        </div>
      </div>
    </div>
  );
}
