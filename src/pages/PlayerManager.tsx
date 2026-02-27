import { useState, useRef, useEffect } from 'react';
import { useApp } from '../AppContext';
import { showToast } from '../components/Toast';
import { ConfirmModal } from '../components/ConfirmModal';
import type { Player } from '../types';

export function PlayerManager() {
  const { state, addPlayer, updatePlayer, deletePlayer } = useApp();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [actionPlayer, setActionPlayer] = useState<Player | null>(null);
  const [renamePlayer, setRenamePlayer] = useState<Player | null>(null);
  const [deleteConfirmPlayer, setDeleteConfirmPlayer] = useState<Player | null>(null);

  const sorted = [...state.players].sort((a, b) => b.elo - a.elo);

  return (
    <div className="flex flex-col h-full">
      {sorted.length === 0 ? (
        <EmptyState onAdd={() => setAddModalOpen(true)} />
      ) : (
        <PlayerList
          players={sorted}
          onPlayerTap={setActionPlayer}
          onAddTap={() => setAddModalOpen(true)}
        />
      )}

      {addModalOpen && (
        <AddPlayerModal
          onClose={() => setAddModalOpen(false)}
          onAdd={(name) => {
            addPlayer(name);
            showToast(`${name} added!`);
          }}
        />
      )}

      {actionPlayer && (
        <PlayerActionSheet
          player={actionPlayer}
          onClose={() => setActionPlayer(null)}
          onRename={() => {
            setRenamePlayer(actionPlayer);
            setActionPlayer(null);
          }}
          onDelete={() => {
            setDeleteConfirmPlayer(actionPlayer);
            setActionPlayer(null);
          }}
        />
      )}

      {renamePlayer && (
        <RenameModal
          player={renamePlayer}
          onClose={() => setRenamePlayer(null)}
          onRename={(name) => {
            updatePlayer(renamePlayer.id, { name });
            showToast(`Renamed to ${name}`);
            setRenamePlayer(null);
          }}
        />
      )}

      {deleteConfirmPlayer && (
        <ConfirmModal
          title="Delete Player"
          message={`Remove ${deleteConfirmPlayer.name} from the roster? Their match history will remain, but their record will be orphaned.`}
          confirmLabel="Delete"
          danger
          onConfirm={() => {
            const name = deleteConfirmPlayer.name;
            deletePlayer(deleteConfirmPlayer.id);
            showToast(`${name} removed`, 'error');
            setDeleteConfirmPlayer(null);
          }}
          onCancel={() => setDeleteConfirmPlayer(null)}
        />
      )}
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-8">
      <div className="text-6xl mt-8">🎾</div>
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight mb-2">
          No Players Yet
        </h1>
        <p className="text-slate-400 text-sm leading-relaxed">
          The roster is empty. Every dynasty starts somewhere.
          <br />Add your first players to get started.
        </p>
      </div>
      <button
        onClick={onAdd}
        className="bg-indigo-600 active:bg-indigo-700 text-white font-bold px-8 py-4 rounded-2xl text-base transition-colors min-h-[56px]"
      >
        + Add Players
      </button>
    </div>
  );
}

function PlayerList({
  players,
  onPlayerTap,
  onAddTap,
}: {
  players: Player[];
  onPlayerTap: (p: Player) => void;
  onAddTap: () => void;
}) {
  return (
    <div className="flex-1 relative">
      <div className="px-4 pt-5 pb-2 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">ROSTER</h1>
          <p className="text-xs text-slate-500 tracking-widest uppercase mt-0.5">
            {players.length} {players.length === 1 ? 'Competitor' : 'Competitors'} Ranked
          </p>
        </div>
      </div>

      <div className="px-4 pb-24 flex flex-col gap-2">
        {players.map((player, index) => (
          <PlayerCard
            key={player.id}
            player={player}
            rank={index + 1}
            onTap={() => onPlayerTap(player)}
          />
        ))}
      </div>

      {/* FAB */}
      <button
        onClick={onAddTap}
        className="fixed bottom-6 right-6 bg-indigo-600 active:bg-indigo-700 text-white font-bold rounded-full w-14 h-14 flex items-center justify-center shadow-xl transition-colors z-20"
        aria-label="Add player"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-6 h-6" aria-hidden>
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </div>
  );
}

function PlayerCard({
  player,
  rank,
  onTap,
}: {
  player: Player;
  rank: number;
  onTap: () => void;
}) {
  const total = player.wins + player.losses;
  const winRate = total > 0 ? Math.round((player.wins / total) * 100) : null;
  const isUnranked = total === 0;

  return (
    <button
      onClick={onTap}
      className="w-full bg-[#1a1d27] border border-[#2e3350] rounded-2xl px-4 py-4 flex items-center gap-4 active:bg-[#22263a] transition-colors text-left min-h-[72px]"
    >
      {/* Rank */}
      <div className="w-8 text-center shrink-0">
        {rank <= 3 ? (
          <span className="text-lg">{rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}</span>
        ) : (
          <span className="text-sm font-bold text-slate-500">#{rank}</span>
        )}
      </div>

      {/* Name + record */}
      <div className="flex-1 min-w-0">
        <div className="font-bold text-white truncate">{player.name}</div>
        <div className="flex items-center gap-2 mt-0.5">
          {isUnranked ? (
            <span className="text-xs font-bold tracking-widest text-slate-500 uppercase">
              Unranked
            </span>
          ) : (
            <>
              <span className="text-xs text-green-400 font-semibold">{player.wins}W</span>
              <span className="text-xs text-slate-600">·</span>
              <span className="text-xs text-red-400 font-semibold">{player.losses}L</span>
              {winRate !== null && (
                <>
                  <span className="text-xs text-slate-600">·</span>
                  <span className="text-xs text-slate-400">{winRate}%</span>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Elo */}
      <div className="text-right shrink-0">
        <div className="text-lg font-black text-indigo-400">{player.elo}</div>
        <div className="text-xs text-slate-600 tracking-widest uppercase">ELO</div>
      </div>
    </button>
  );
}

function AddPlayerModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (name: string) => void;
}) {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setName('');
    inputRef.current?.focus();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#1a1d27] rounded-t-3xl border-t border-x border-[#2e3350] px-6 pt-6 pb-10 shadow-2xl">
        {/* Handle */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-[#2e3350]" />

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-black text-white">Add Players</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 active:bg-[#22263a] min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        <div className="flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="Player name..."
            className="flex-1 bg-[#22263a] border border-[#2e3350] rounded-xl px-4 py-3 text-white placeholder-slate-600 text-base focus:outline-none focus:border-indigo-500 min-h-[48px]"
          />
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="bg-indigo-600 active:bg-indigo-700 disabled:opacity-40 text-white font-bold px-5 rounded-xl transition-colors min-h-[48px]"
          >
            Add
          </button>
        </div>

        <p className="text-xs text-slate-600 mt-3 text-center">
          Keep adding — the window stays open. Tap ✕ when done.
        </p>
      </div>
    </div>
  );
}

function PlayerActionSheet({
  player,
  onClose,
  onRename,
  onDelete,
}: {
  player: Player;
  onClose: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#1a1d27] rounded-t-3xl border-t border-x border-[#2e3350] px-4 pt-6 pb-10 shadow-2xl">
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-[#2e3350]" />

        <p className="text-center text-sm text-slate-400 mb-4 font-semibold">{player.name}</p>

        <div className="flex flex-col gap-2">
          <button
            onClick={onRename}
            className="w-full py-4 rounded-xl bg-[#22263a] text-white font-semibold active:bg-[#2e3350] transition-colors min-h-[56px]"
          >
            Rename
          </button>
          <button
            onClick={onDelete}
            className="w-full py-4 rounded-xl bg-red-950/40 text-red-400 font-semibold active:bg-red-950/60 transition-colors border border-red-900/30 min-h-[56px]"
          >
            Delete Player
          </button>
          <button
            onClick={onClose}
            className="w-full py-4 rounded-xl text-slate-500 font-semibold active:bg-[#22263a] transition-colors min-h-[56px]"
          >
            Cancel
          </button>
        </div>
      </div>
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
