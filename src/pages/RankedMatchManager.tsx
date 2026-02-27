import { useState } from 'react';
import { useApp } from '../AppContext';
import { showToast } from '../components/Toast';
import type { Player } from '../types';

export function RankedMatchManager() {
  const { state, recordMatch } = useApp();
  const players = [...state.players].sort((a, b) => b.elo - a.elo);

  const [player1Id, setPlayer1Id] = useState('');
  const [player2Id, setPlayer2Id] = useState('');
  const [score1, setScore1] = useState('');
  const [score2, setScore2] = useState('');
  const [winnerId, setWinnerId] = useState('');

  const player1 = players.find(p => p.id === player1Id) ?? null;
  const player2 = players.find(p => p.id === player2Id) ?? null;

  const canSubmit =
    player1Id &&
    player2Id &&
    player1Id !== player2Id &&
    score1 !== '' &&
    score2 !== '' &&
    winnerId;

  function handleSubmit() {
    if (!canSubmit) return;
    recordMatch(
      player1Id,
      player2Id,
      Number(score1),
      Number(score2),
      winnerId,
      'ranked'
    );
    showToast('Match recorded!');
    setScore1('');
    setScore2('');
    setWinnerId('');
  }

  const rankedMatches = state.matches
    .filter(m => m.context === 'ranked')
    .slice(0, 20);

  return (
    <div className="px-4 pt-5 pb-24">
      <div className="mb-6">
        <h1 className="text-xl font-black text-white tracking-tight">RANKED MATCH</h1>
        <p className="text-xs text-slate-500 tracking-widest uppercase mt-0.5">
          Record a head-to-head clash
        </p>
      </div>

      {/* Player selectors */}
      <div className="bg-[#1a1d27] border border-[#2e3350] rounded-2xl p-4 mb-4">
        <h2 className="text-xs font-bold tracking-widest uppercase text-slate-500 mb-3">
          Select Players
        </h2>
        <div className="flex flex-col gap-3">
          <PlayerSelect
            label="Player 1"
            value={player1Id}
            onChange={v => { setPlayer1Id(v); setWinnerId(''); }}
            players={players}
            excludeId={player2Id}
          />
          <PlayerSelect
            label="Player 2"
            value={player2Id}
            onChange={v => { setPlayer2Id(v); setWinnerId(''); }}
            players={players}
            excludeId={player1Id}
          />
        </div>
      </div>

      {/* Score inputs */}
      <div className="bg-[#1a1d27] border border-[#2e3350] rounded-2xl p-4 mb-4">
        <h2 className="text-xs font-bold tracking-widest uppercase text-slate-500 mb-3">
          Score
        </h2>
        <div className="flex gap-4 items-center">
          <ScoreInput
            label={player1?.name ?? 'Player 1'}
            value={score1}
            onChange={setScore1}
          />
          <span className="text-slate-600 font-bold text-lg shrink-0">vs</span>
          <ScoreInput
            label={player2?.name ?? 'Player 2'}
            value={score2}
            onChange={setScore2}
          />
        </div>
      </div>

      {/* Winner declaration */}
      {player1 && player2 && (
        <div className="bg-[#1a1d27] border border-[#2e3350] rounded-2xl p-4 mb-6">
          <h2 className="text-xs font-bold tracking-widest uppercase text-slate-500 mb-3">
            Declare Winner
          </h2>
          <div className="flex gap-3">
            <WinnerButton
              player={player1}
              selected={winnerId === player1.id}
              onSelect={() => setWinnerId(player1.id)}
            />
            <WinnerButton
              player={player2}
              selected={winnerId === player2.id}
              onSelect={() => setWinnerId(player2.id)}
            />
          </div>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="w-full bg-indigo-600 active:bg-indigo-700 disabled:opacity-40 text-white font-bold py-4 rounded-2xl text-base transition-colors min-h-[56px] mb-8"
      >
        Record Match
      </button>

      {/* Match history */}
      {rankedMatches.length > 0 && (
        <div>
          <h2 className="text-xs font-bold tracking-widest uppercase text-slate-500 mb-3">
            Recent Matches
          </h2>
          <div className="flex flex-col gap-2">
            {rankedMatches.map(match => {
              const p1 = state.players.find(p => p.id === match.player1Id);
              const p2 = state.players.find(p => p.id === match.player2Id);
              if (!p1 || !p2) return null;
              const p1Won = match.winnerId === match.player1Id;
              const date = new Date(match.timestamp).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              });
              return (
                <div
                  key={match.id}
                  className="bg-[#1a1d27] border border-[#2e3350] rounded-xl px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <span className={`font-semibold text-sm ${p1Won ? 'text-white' : 'text-slate-500'}`}>
                        {p1.name}
                      </span>
                      <span className="text-slate-600 mx-2 text-xs">vs</span>
                      <span className={`font-semibold text-sm ${!p1Won ? 'text-white' : 'text-slate-500'}`}>
                        {p2.name}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-white">
                        {match.player1Score} – {match.player2Score}
                      </div>
                      <div className="text-xs text-slate-500">{date}</div>
                    </div>
                  </div>
                  <div className="mt-1 flex gap-2">
                    <span className={`text-xs font-semibold ${p1Won ? 'text-green-400' : 'text-red-400'}`}>
                      {p1.name}: {p1Won ? '+' : '-'}{match.eloChange}
                    </span>
                    <span className="text-xs text-slate-600">·</span>
                    <span className={`text-xs font-semibold ${!p1Won ? 'text-green-400' : 'text-red-400'}`}>
                      {p2.name}: {!p1Won ? '+' : '-'}{match.eloChange}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function PlayerSelect({
  label,
  value,
  onChange,
  players,
  excludeId,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  players: Player[];
  excludeId: string;
}) {
  return (
    <div>
      <label className="block text-xs text-slate-500 mb-1 font-semibold">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-[#22263a] border border-[#2e3350] rounded-xl px-4 py-3 text-white text-base focus:outline-none focus:border-indigo-500 min-h-[48px] appearance-none"
      >
        <option value="">Select player...</option>
        {players
          .filter(p => p.id !== excludeId)
          .map(p => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.elo} ELO)
            </option>
          ))}
      </select>
    </div>
  );
}

function ScoreInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex-1">
      <label className="block text-xs text-slate-500 mb-1 font-semibold truncate">{label}</label>
      <input
        type="number"
        inputMode="numeric"
        min="0"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="0"
        className="w-full bg-[#22263a] border border-[#2e3350] rounded-xl px-4 py-3 text-white text-base text-center focus:outline-none focus:border-indigo-500 min-h-[48px]"
      />
    </div>
  );
}

function WinnerButton({
  player,
  selected,
  onSelect,
}: {
  player: Player;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`
        flex-1 py-3 rounded-xl font-bold text-sm transition-colors min-h-[52px]
        ${selected
          ? 'bg-indigo-600 text-white border border-indigo-400'
          : 'bg-[#22263a] text-slate-400 border border-[#2e3350] active:bg-[#2e3350]'
        }
      `}
    >
      {selected && <span className="mr-1">🏆</span>}
      {player.name}
    </button>
  );
}
