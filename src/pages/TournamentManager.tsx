import { useState } from 'react';
import { useApp } from '../AppContext';
import { showToast } from '../components/Toast';
import { generateBracket, advanceWinnersBracket, advanceLosersBracket, isTournamentComplete } from '../bracket';
import type { Tournament, Matchup, Player } from '../types';

export function TournamentManager() {
  const { state, addTournament, updateTournament, recordMatch } = useApp();
  const [view, setView] = useState<'list' | 'create' | { tournamentId: string }>('list');

  if (view === 'create') {
    return (
      <CreateTournament
        onCancel={() => setView('list')}
        onCreate={(t) => {
          addTournament(t);
          showToast(`${t.name} created!`);
          setView({ tournamentId: t.id });
        }}
      />
    );
  }

  if (typeof view === 'object') {
    const tournament = state.tournaments.find(t => t.id === view.tournamentId);
    if (!tournament) {
      setView('list');
      return null;
    }
    return (
      <BracketView
        tournament={tournament}
        players={state.players}
        onBack={() => setView('list')}
        onRecordMatch={(matchup, bracket, roundIndex, matchupIndex, p1Score, p2Score, winnerId) => {
          const loserId = winnerId === matchup.player1Id ? matchup.player2Id! : matchup.player1Id!;

          // Update Elo
          recordMatch(
            matchup.player1Id!,
            matchup.player2Id!,
            p1Score,
            p2Score,
            winnerId,
            'tournament',
            tournament.id
          );

          // Advance bracket
          let updated: Tournament;
          if (bracket === 'winners') {
            updated = advanceWinnersBracket(tournament, roundIndex, matchupIndex, winnerId, loserId);
          } else if (bracket === 'losers') {
            updated = advanceLosersBracket(tournament, roundIndex, matchupIndex, winnerId);
          } else {
            // Grand final
            updated = { ...tournament, grandFinal: { ...tournament.grandFinal!, winnerId } };
          }

          if (isTournamentComplete(updated)) {
            updated = { ...updated, status: 'completed' };
            showToast('Tournament complete! 🏆');
          }

          updateTournament(tournament.id, updated);
        }}
      />
    );
  }

  // List view
  return (
    <div className="px-4 pt-5 pb-24">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">TOURNAMENTS</h1>
          <p className="text-xs text-slate-500 tracking-widest uppercase mt-0.5">
            Double Elimination
          </p>
        </div>
        <button
          onClick={() => setView('create')}
          className="bg-indigo-600 active:bg-indigo-700 text-white font-bold px-4 py-3 rounded-xl text-sm transition-colors min-h-[44px]"
        >
          + Create
        </button>
      </div>

      {state.tournaments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <div className="text-5xl">🏆</div>
          <div>
            <h2 className="text-lg font-bold text-white mb-1">No Tournaments Yet</h2>
            <p className="text-slate-500 text-sm">The bracket awaits. Create one to begin.</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {state.tournaments.map(t => {
            const date = new Date(t.createdAt).toLocaleDateString(undefined, {
              month: 'short', day: 'numeric', year: 'numeric',
            });
            return (
              <button
                key={t.id}
                onClick={() => setView({ tournamentId: t.id })}
                className="w-full bg-[#1a1d27] border border-[#2e3350] rounded-2xl px-4 py-4 flex items-center gap-4 active:bg-[#22263a] transition-colors text-left"
              >
                <div className="text-2xl">{t.status === 'completed' ? '🏆' : '⚔️'}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-white truncate">{t.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {t.playerIds.length} players · {date}
                  </div>
                </div>
                <span className={`text-xs font-bold tracking-widest uppercase px-2 py-1 rounded-md ${
                  t.status === 'completed'
                    ? 'bg-green-900/40 text-green-400'
                    : 'bg-indigo-900/40 text-indigo-400'
                }`}>
                  {t.status === 'completed' ? 'Done' : 'Live'}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CreateTournament({
  onCancel,
  onCreate,
}: {
  onCancel: () => void;
  onCreate: (t: Tournament) => void;
}) {
  const { state } = useApp();
  const tournamentNumber = state.tournaments.length + 1;
  const [name, setName] = useState(`Tournament #${tournamentNumber}`);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(state.players.map(p => p.id))
  );

  const sorted = [...state.players].sort((a, b) => b.elo - a.elo);

  function togglePlayer(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleCreate() {
    if (selectedIds.size < 2) {
      showToast('Select at least 2 players', 'error');
      return;
    }
    const selected = state.players.filter(p => selectedIds.has(p.id));
    const tournament = generateBracket(crypto.randomUUID(), name.trim() || `Tournament #${tournamentNumber}`, selected);
    onCreate(tournament);
  }

  return (
    <div className="px-4 pt-5 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onCancel} className="p-2 text-slate-400 active:text-white min-h-[44px] min-w-[44px] flex items-center justify-center">
          ←
        </button>
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">NEW TOURNAMENT</h1>
        </div>
      </div>

      <div className="bg-[#1a1d27] border border-[#2e3350] rounded-2xl p-4 mb-4">
        <label className="block text-xs font-bold tracking-widest uppercase text-slate-500 mb-2">
          Tournament Name
        </label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full bg-[#22263a] border border-[#2e3350] rounded-xl px-4 py-3 text-white text-base focus:outline-none focus:border-indigo-500 min-h-[48px]"
        />
      </div>

      <div className="bg-[#1a1d27] border border-[#2e3350] rounded-2xl p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-bold tracking-widest uppercase text-slate-500">
            Players ({selectedIds.size} selected)
          </label>
          <button
            onClick={() => setSelectedIds(new Set(state.players.map(p => p.id)))}
            className="text-xs text-indigo-400 active:text-indigo-300"
          >
            Select all
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {sorted.map(p => (
            <button
              key={p.id}
              onClick={() => togglePlayer(p.id)}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-colors min-h-[48px] ${
                selectedIds.has(p.id)
                  ? 'bg-indigo-600/20 border border-indigo-500/40'
                  : 'bg-[#22263a] border border-[#2e3350] opacity-50'
              }`}
            >
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                selectedIds.has(p.id) ? 'border-indigo-400 bg-indigo-600' : 'border-slate-600'
              }`}>
                {selectedIds.has(p.id) && <span className="text-white text-xs">✓</span>}
              </div>
              <span className="font-semibold text-sm text-white truncate">{p.name}</span>
              <span className="ml-auto text-xs text-slate-500 shrink-0">{p.elo} ELO</span>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleCreate}
        className="w-full bg-indigo-600 active:bg-indigo-700 text-white font-bold py-4 rounded-2xl text-base transition-colors min-h-[56px]"
      >
        Generate Bracket
      </button>
    </div>
  );
}

type BracketType = 'winners' | 'losers' | 'grand';

function BracketView({
  tournament,
  players,
  onBack,
  onRecordMatch,
}: {
  tournament: Tournament;
  players: Player[];
  onBack: () => void;
  onRecordMatch: (
    matchup: Matchup,
    bracket: BracketType,
    roundIndex: number,
    matchupIndex: number,
    p1Score: number,
    p2Score: number,
    winnerId: string
  ) => void;
}) {
  const [recordingMatchup, setRecordingMatchup] = useState<{
    matchup: Matchup;
    bracket: BracketType;
    roundIndex: number;
    matchupIndex: number;
  } | null>(null);

  const playerMap = new Map(players.map(p => [p.id, p]));

  function getPlayerName(id: string | null): string {
    if (!id) return 'TBD';
    return playerMap.get(id)?.name ?? 'Unknown';
  }

  return (
    <div className="pb-24">
      <div className="sticky top-14 z-10 bg-[#0f1117] border-b border-[#2e3350] px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="p-2 text-slate-400 active:text-white min-h-[44px] min-w-[44px] flex items-center justify-center">
          ←
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-black text-white text-base truncate">{tournament.name}</h1>
          <span className={`text-xs font-bold tracking-widest uppercase ${
            tournament.status === 'completed' ? 'text-green-400' : 'text-indigo-400'
          }`}>
            {tournament.status === 'completed' ? 'Completed' : 'In Progress'}
          </span>
        </div>
      </div>

      <div className="px-4 pt-5">
        {/* Winners bracket */}
        <SectionHeader label="Winners Bracket" emoji="🏆" />
        {tournament.winnersRounds.map((round, ri) => (
          <div key={ri} className="mb-4">
            <p className="text-xs text-slate-600 tracking-widest uppercase mb-2 ml-1">
              {ri === 0 ? 'Round 1' : ri === tournament.winnersRounds.length - 1 ? 'Winners Final' : `Round ${ri + 1}`}
            </p>
            <div className="flex flex-col gap-2">
              {round.map((matchup, mi) => (
                <MatchupCard
                  key={matchup.id}
                  matchup={matchup}
                  getPlayerName={getPlayerName}
                  onTap={matchup.isBye || matchup.winnerId ? undefined : () =>
                    setRecordingMatchup({ matchup, bracket: 'winners', roundIndex: ri, matchupIndex: mi })
                  }
                />
              ))}
            </div>
          </div>
        ))}

        {/* Losers bracket */}
        {tournament.losersRounds.length > 0 && (
          <>
            <SectionHeader label="Losers Bracket" emoji="⚔️" />
            {tournament.losersRounds.map((round, ri) => (
              <div key={ri} className="mb-4">
                <p className="text-xs text-slate-600 tracking-widest uppercase mb-2 ml-1">
                  LB Round {ri + 1}
                </p>
                <div className="flex flex-col gap-2">
                  {round.map((matchup, mi) => (
                    <MatchupCard
                      key={matchup.id}
                      matchup={matchup}
                      getPlayerName={getPlayerName}
                      onTap={
                        matchup.isBye ||
                        matchup.winnerId ||
                        !matchup.player1Id ||
                        !matchup.player2Id
                          ? undefined
                          : () => setRecordingMatchup({ matchup, bracket: 'losers', roundIndex: ri, matchupIndex: mi })
                      }
                    />
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        {/* Grand final */}
        {tournament.grandFinal && (
          <>
            <SectionHeader label="Grand Final" emoji="👑" />
            <MatchupCard
              matchup={tournament.grandFinal}
              getPlayerName={getPlayerName}
              onTap={
                tournament.grandFinal.winnerId ||
                !tournament.grandFinal.player1Id ||
                !tournament.grandFinal.player2Id
                  ? undefined
                  : () => setRecordingMatchup({
                      matchup: tournament.grandFinal!,
                      bracket: 'grand',
                      roundIndex: 0,
                      matchupIndex: 0,
                    })
              }
            />
          </>
        )}
      </div>

      {recordingMatchup && (
        <RecordMatchModal
          matchup={recordingMatchup.matchup}
          getPlayerName={getPlayerName}
          onClose={() => setRecordingMatchup(null)}
          onSave={(p1Score, p2Score, winnerId) => {
            onRecordMatch(
              recordingMatchup.matchup,
              recordingMatchup.bracket,
              recordingMatchup.roundIndex,
              recordingMatchup.matchupIndex,
              p1Score,
              p2Score,
              winnerId
            );
            setRecordingMatchup(null);
            showToast('Match recorded!');
          }}
        />
      )}
    </div>
  );
}

function SectionHeader({ label, emoji }: { label: string; emoji: string }) {
  return (
    <div className="flex items-center gap-2 mb-3 mt-2">
      <span>{emoji}</span>
      <h2 className="text-xs font-bold tracking-widest uppercase text-slate-400">{label}</h2>
      <div className="flex-1 h-px bg-[#2e3350]" />
    </div>
  );
}

function MatchupCard({
  matchup,
  getPlayerName,
  onTap,
}: {
  matchup: Matchup;
  getPlayerName: (id: string | null) => string;
  onTap?: () => void;
}) {
  const p1Name = getPlayerName(matchup.player1Id);
  const p2Name = getPlayerName(matchup.player2Id);
  const isComplete = matchup.winnerId !== null;
  const isBye = matchup.isBye;
  const isReady = matchup.player1Id && matchup.player2Id && !isComplete && !isBye;

  return (
    <button
      onClick={onTap}
      disabled={!onTap}
      className={`
        w-full bg-[#1a1d27] border rounded-xl px-4 py-3 text-left transition-colors
        ${isReady ? 'border-indigo-500/40 active:bg-[#22263a]' : 'border-[#2e3350]'}
        ${!onTap ? 'cursor-default' : ''}
      `}
    >
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold truncate ${
              matchup.winnerId === matchup.player1Id ? 'text-white' :
              matchup.winnerId ? 'text-slate-500 line-through' :
              matchup.player1Id ? 'text-white' : 'text-slate-600'
            }`}>
              {p1Name}
            </span>
            {matchup.winnerId === matchup.player1Id && (
              <span className="text-xs text-green-400 font-bold shrink-0">WIN</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold truncate ${
              matchup.winnerId === matchup.player2Id ? 'text-white' :
              matchup.winnerId ? 'text-slate-500 line-through' :
              matchup.player2Id ? 'text-white' : 'text-slate-600'
            }`}>
              {isBye ? 'BYE' : p2Name}
            </span>
            {matchup.winnerId === matchup.player2Id && (
              <span className="text-xs text-green-400 font-bold shrink-0">WIN</span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          {matchup.player1Score !== null && (
            <div className="text-sm font-bold text-slate-300">
              {matchup.player1Score} – {matchup.player2Score}
            </div>
          )}
          {isBye && <span className="text-xs text-slate-600 italic">bye</span>}
          {isReady && <span className="text-xs text-indigo-400">Tap to record →</span>}
          {!matchup.player1Id && !matchup.player2Id && (
            <span className="text-xs text-slate-700">TBD</span>
          )}
        </div>
      </div>
    </button>
  );
}

function RecordMatchModal({
  matchup,
  getPlayerName,
  onClose,
  onSave,
}: {
  matchup: Matchup;
  getPlayerName: (id: string | null) => string;
  onClose: () => void;
  onSave: (p1Score: number, p2Score: number, winnerId: string) => void;
}) {
  const [score1, setScore1] = useState('');
  const [score2, setScore2] = useState('');
  const [winnerId, setWinnerId] = useState('');

  const p1Name = getPlayerName(matchup.player1Id);
  const p2Name = getPlayerName(matchup.player2Id);

  const canSave = score1 !== '' && score2 !== '' && winnerId;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#1a1d27] rounded-t-3xl border-t border-x border-[#2e3350] px-6 pt-6 pb-10 shadow-2xl">
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-[#2e3350]" />

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black text-white">Record Match</h2>
          <button onClick={onClose} className="p-2 text-slate-400 active:text-white min-h-[44px] min-w-[44px] flex items-center justify-center">✕</button>
        </div>

        {/* Score */}
        <div className="flex gap-4 items-center mb-5">
          <div className="flex-1">
            <label className="block text-xs text-slate-500 mb-1 font-semibold truncate">{p1Name}</label>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              value={score1}
              onChange={e => setScore1(e.target.value)}
              placeholder="0"
              className="w-full bg-[#22263a] border border-[#2e3350] rounded-xl px-4 py-3 text-white text-base text-center focus:outline-none focus:border-indigo-500 min-h-[48px]"
            />
          </div>
          <span className="text-slate-600 font-bold shrink-0">vs</span>
          <div className="flex-1">
            <label className="block text-xs text-slate-500 mb-1 font-semibold truncate">{p2Name}</label>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              value={score2}
              onChange={e => setScore2(e.target.value)}
              placeholder="0"
              className="w-full bg-[#22263a] border border-[#2e3350] rounded-xl px-4 py-3 text-white text-base text-center focus:outline-none focus:border-indigo-500 min-h-[48px]"
            />
          </div>
        </div>

        {/* Winner */}
        <p className="text-xs text-slate-500 font-bold tracking-widest uppercase mb-2">Declare Winner</p>
        <div className="flex gap-3 mb-5">
          <button
            onClick={() => setWinnerId(matchup.player1Id!)}
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-colors min-h-[52px] ${
              winnerId === matchup.player1Id
                ? 'bg-indigo-600 text-white border border-indigo-400'
                : 'bg-[#22263a] text-slate-400 border border-[#2e3350] active:bg-[#2e3350]'
            }`}
          >
            {winnerId === matchup.player1Id && '🏆 '}{p1Name}
          </button>
          <button
            onClick={() => setWinnerId(matchup.player2Id!)}
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-colors min-h-[52px] ${
              winnerId === matchup.player2Id
                ? 'bg-indigo-600 text-white border border-indigo-400'
                : 'bg-[#22263a] text-slate-400 border border-[#2e3350] active:bg-[#2e3350]'
            }`}
          >
            {winnerId === matchup.player2Id && '🏆 '}{p2Name}
          </button>
        </div>

        <button
          onClick={() => canSave && onSave(Number(score1), Number(score2), winnerId)}
          disabled={!canSave}
          className="w-full bg-indigo-600 active:bg-indigo-700 disabled:opacity-40 text-white font-bold py-4 rounded-2xl text-base transition-colors min-h-[56px]"
        >
          Save Result
        </button>
      </div>
    </div>
  );
}
