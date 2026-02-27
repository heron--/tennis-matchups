import { useState } from 'react';
import { useApp } from '../AppContext';
import { showToast } from '../components/Toast';
import { ConfirmModal } from '../components/ConfirmModal';
import { createCalibrationSession, generateCalibrationPairings } from '../calibration';
import type { CalibrationSession, CalibrationMatchup, Player } from '../types';

export function CalibrationManager() {
  const {
    state,
    addCalibrationSession,
    updateCalibrationSession,
    deleteCalibrationSession,
    recordMatch,
  } = useApp();
  const [view, setView] = useState<'list' | 'create' | { sessionId: string }>('list');
  const [deleteTarget, setDeleteTarget] = useState<CalibrationSession | null>(null);

  if (view === 'create') {
    return (
      <CreateCalibration
        onCancel={() => setView('list')}
        onCreate={(session) => {
          addCalibrationSession(session);
          showToast('Calibration session started!');
          setView({ sessionId: session.id });
        }}
      />
    );
  }

  if (typeof view === 'object') {
    const session = state.calibrationSessions.find(s => s.id === view.sessionId);
    if (!session) {
      setView('list');
      return null;
    }
    return (
      <SessionView
        session={session}
        players={state.players}
        onBack={() => setView('list')}
        onRecordMatch={(matchupId, p1Score, p2Score, winnerId) => {
          const round = session.rounds[session.currentRound - 1];
          const matchup = round.matchups.find(m => m.id === matchupId)!;

          recordMatch(
            matchup.player1Id,
            matchup.player2Id,
            p1Score,
            p2Score,
            winnerId,
            'calibration',
            undefined,
            session.id
          );

          // Update the matchup within the round
          const updatedMatchups = round.matchups.map(m =>
            m.id === matchupId
              ? { ...m, winnerId, player1Score: p1Score, player2Score: p2Score }
              : m
          );
          const updatedRound = { ...round, matchups: updatedMatchups };

          // Check if round is complete (all matchups have a winner)
          const roundComplete = updatedMatchups.every(m => m.winnerId !== null);
          const updatedRoundWithFlag = { ...updatedRound, completed: roundComplete };

          let updatedRounds = session.rounds.map((r, i) =>
            i === session.currentRound - 1 ? updatedRoundWithFlag : r
          );

          let newCurrentRound = session.currentRound;
          let newStatus: CalibrationSession['status'] = session.status;

          if (roundComplete) {
            if (session.currentRound < session.totalRounds) {
              // Get current player state to generate next round with updated ELOs
              // We use the session's playerIds to find current players
              const sessionPlayers = state.players.filter(p => session.playerIds.includes(p.id));
              // Apply the just-recorded ELO change to find the winner's new ELO
              // (state hasn't updated yet — we'll re-read on next render via session)
              const nextRound = generateCalibrationPairings(sessionPlayers, updatedRounds);
              updatedRounds = [...updatedRounds, nextRound];
              newCurrentRound = session.currentRound + 1;
            } else {
              newStatus = 'completed';
              showToast('Calibration complete! 🎯');
            }
          }

          updateCalibrationSession(session.id, {
            rounds: updatedRounds,
            currentRound: newCurrentRound,
            status: newStatus,
          });
        }}
      />
    );
  }

  // List view
  return (
    <div className="px-4 pt-5 pb-24">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">CALIBRATION</h1>
          <p className="text-xs text-slate-500 tracking-widest uppercase mt-0.5">
            Diversity-First Rounds
          </p>
        </div>
        <button
          onClick={() => setView('create')}
          className="bg-indigo-600 active:bg-indigo-700 text-white font-bold px-4 py-3 rounded-xl text-sm transition-colors min-h-[44px]"
        >
          + Create
        </button>
      </div>

      {state.calibrationSessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <div className="text-5xl">🎯</div>
          <div>
            <h2 className="text-lg font-bold text-white mb-1">No Calibration Sessions</h2>
            <p className="text-slate-500 text-sm">Run rounds to quickly establish accurate ELOs.</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {state.calibrationSessions.map(session => {
            const date = new Date(session.createdAt).toLocaleDateString(undefined, {
              month: 'short', day: 'numeric', year: 'numeric',
            });
            return (
              <div
                key={session.id}
                className="bg-[#1a1d27] border border-[#2e3350] rounded-2xl flex items-center"
              >
                <button
                  onClick={() => setView({ sessionId: session.id })}
                  className="flex-1 min-w-0 px-4 py-4 flex items-center gap-4 active:bg-[#22263a] rounded-l-2xl transition-colors text-left"
                >
                  <div className="text-2xl">{session.status === 'completed' ? '🎯' : '⚡'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-white truncate">
                      {session.playerIds.length} Players · {session.totalRounds} Rounds
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Round {Math.min(session.currentRound, session.totalRounds)} of {session.totalRounds} · {date}
                    </div>
                  </div>
                  <span className={`text-xs font-bold tracking-widest uppercase px-2 py-1 rounded-md shrink-0 ${
                    session.status === 'completed'
                      ? 'bg-green-900/40 text-green-400'
                      : 'bg-indigo-900/40 text-indigo-400'
                  }`}>
                    {session.status === 'completed' ? 'Done' : 'Live'}
                  </span>
                </button>
                <button
                  onClick={() => setDeleteTarget(session)}
                  className="px-4 py-4 text-slate-600 active:text-red-400 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center border-l border-[#2e3350]"
                  aria-label="Delete session"
                >
                  🗑️
                </button>
              </div>
            );
          })}
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete Calibration Session"
          message="Delete this calibration session? This cannot be undone."
          confirmLabel="Delete"
          danger
          onConfirm={() => {
            deleteCalibrationSession(deleteTarget.id);
            showToast('Session deleted', 'error');
            setDeleteTarget(null);
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

function CreateCalibration({
  onCancel,
  onCreate,
}: {
  onCancel: () => void;
  onCreate: (session: CalibrationSession) => void;
}) {
  const { state } = useApp();
  const [totalRounds, setTotalRounds] = useState(5);
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
    const session = createCalibrationSession(selected, totalRounds);
    onCreate(session);
  }

  return (
    <div className="px-4 pt-5 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onCancel} className="p-2 text-slate-400 active:text-white min-h-[44px] min-w-[44px] flex items-center justify-center">
          ←
        </button>
        <h1 className="text-xl font-black text-white tracking-tight">NEW CALIBRATION</h1>
      </div>

      <div className="bg-[#1a1d27] border border-[#2e3350] rounded-2xl p-4 mb-4">
        <label className="block text-xs font-bold tracking-widest uppercase text-slate-500 mb-2">
          Number of Rounds
        </label>
        <div className="flex gap-2">
          {[3, 5, 7, 10].map(n => (
            <button
              key={n}
              onClick={() => setTotalRounds(n)}
              className={`flex-1 py-3 rounded-xl font-bold text-sm transition-colors min-h-[48px] ${
                totalRounds === n
                  ? 'bg-indigo-600 text-white border border-indigo-400'
                  : 'bg-[#22263a] text-slate-400 border border-[#2e3350] active:bg-[#2e3350]'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-600 mt-2">
          More rounds = more accurate ELOs. Recommend {Math.ceil(state.players.filter(p => selectedIds.has(p.id)).length / 2) + 1}+ for {selectedIds.size} players.
        </p>
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
        Start Calibration
      </button>
    </div>
  );
}

function SessionView({
  session,
  players,
  onBack,
  onRecordMatch,
}: {
  session: CalibrationSession;
  players: Player[];
  onBack: () => void;
  onRecordMatch: (matchupId: string, p1Score: number, p2Score: number, winnerId: string) => void;
}) {
  const [recordingMatchup, setRecordingMatchup] = useState<CalibrationMatchup | null>(null);

  const playerMap = new Map(players.map(p => [p.id, p]));
  const sessionPlayers = session.playerIds
    .map(id => playerMap.get(id))
    .filter((p): p is Player => p !== undefined);

  const currentRoundIndex = session.currentRound - 1;
  const currentRound = session.rounds[currentRoundIndex];

  function getPlayerName(id: string): string {
    return playerMap.get(id)?.name ?? 'Unknown';
  }

  // Build W-L record for this session
  const wlRecord = new Map<string, { wins: number; losses: number }>(
    session.playerIds.map(id => [id, { wins: 0, losses: 0 }])
  );
  for (const round of session.rounds) {
    for (const m of round.matchups) {
      if (m.winnerId) {
        const loserId = m.winnerId === m.player1Id ? m.player2Id : m.player1Id;
        const w = wlRecord.get(m.winnerId);
        const l = wlRecord.get(loserId);
        if (w) w.wins++;
        if (l) l.losses++;
      }
    }
  }

  // Build standings sorted by current ELO
  const standings = sessionPlayers
    .map(p => ({
      player: p,
      eloChange: p.elo - (session.startingElos[p.id] ?? p.elo),
      record: wlRecord.get(p.id) ?? { wins: 0, losses: 0 },
    }))
    .sort((a, b) => b.player.elo - a.player.elo);

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="sticky top-14 z-10 bg-[#0f1117] border-b border-[#2e3350] px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="p-2 text-slate-400 active:text-white min-h-[44px] min-w-[44px] flex items-center justify-center">
          ←
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-black text-white text-base">
            Round {Math.min(session.currentRound, session.totalRounds)} of {session.totalRounds}
          </h1>
          <span className={`text-xs font-bold tracking-widest uppercase ${
            session.status === 'completed' ? 'text-green-400' : 'text-indigo-400'
          }`}>
            {session.status === 'completed' ? 'Completed' : 'In Progress'}
          </span>
        </div>
      </div>

      <div className="px-4 pt-5">
        {/* Current round matchups */}
        {session.status === 'in_progress' && currentRound && (
          <div className="mb-6">
            <SectionHeader label={`Round ${currentRound.roundNumber} Matchups`} />

            {currentRound.byePlayerId && (
              <div className="mb-3 px-4 py-3 bg-[#1a1d27] border border-[#2e3350] rounded-xl">
                <span className="text-xs text-slate-500 font-bold tracking-widest uppercase">Bye: </span>
                <span className="text-sm text-slate-400">{getPlayerName(currentRound.byePlayerId)}</span>
              </div>
            )}

            <div className="flex flex-col gap-2">
              {currentRound.matchups.map(matchup => (
                <CalibrationMatchupCard
                  key={matchup.id}
                  matchup={matchup}
                  getPlayerName={getPlayerName}
                  onTap={matchup.winnerId ? undefined : () => setRecordingMatchup(matchup)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Past rounds (collapsed summary) */}
        {session.rounds.filter(r => r.completed).length > 0 && (
          <div className="mb-6">
            <SectionHeader label="Completed Rounds" />
            <div className="flex flex-col gap-2">
              {session.rounds.filter(r => r.completed).map(round => (
                <div key={round.roundNumber} className="bg-[#1a1d27] border border-[#2e3350] rounded-xl px-4 py-3">
                  <p className="text-xs font-bold text-slate-500 tracking-widest uppercase mb-2">
                    Round {round.roundNumber}
                  </p>
                  {round.byePlayerId && (
                    <p className="text-xs text-slate-600 mb-1">Bye: {getPlayerName(round.byePlayerId)}</p>
                  )}
                  <div className="flex flex-col gap-1">
                    {round.matchups.map(m => (
                      <div key={m.id} className="flex items-center gap-2 text-sm">
                        <span className={m.winnerId === m.player1Id ? 'text-white font-semibold' : 'text-slate-500'}>
                          {getPlayerName(m.player1Id)}
                        </span>
                        <span className="text-slate-600 text-xs">{m.player1Score}–{m.player2Score}</span>
                        <span className={m.winnerId === m.player2Id ? 'text-white font-semibold' : 'text-slate-500'}>
                          {getPlayerName(m.player2Id)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Standings */}
        <SectionHeader label="Standings" />
        <div className="bg-[#1a1d27] border border-[#2e3350] rounded-2xl overflow-hidden">
          <div className="grid grid-cols-[auto_1fr_auto_auto] gap-x-3 px-4 py-2 border-b border-[#2e3350]">
            <span className="text-xs font-bold text-slate-600 tracking-widest uppercase">#</span>
            <span className="text-xs font-bold text-slate-600 tracking-widest uppercase">Player</span>
            <span className="text-xs font-bold text-slate-600 tracking-widest uppercase text-right">ELO</span>
            <span className="text-xs font-bold text-slate-600 tracking-widest uppercase text-right">W-L</span>
          </div>
          {standings.map((entry, idx) => (
            <div
              key={entry.player.id}
              className={`grid grid-cols-[auto_1fr_auto_auto] gap-x-3 px-4 py-3 items-center ${
                idx < standings.length - 1 ? 'border-b border-[#2e3350]' : ''
              }`}
            >
              <span className="text-sm text-slate-500 font-bold w-5">{idx + 1}</span>
              <span className="text-sm text-white font-semibold truncate">{entry.player.name}</span>
              <div className="text-right">
                <span className="text-sm text-white font-bold">{entry.player.elo}</span>
                {entry.eloChange !== 0 && (
                  <span className={`text-xs ml-1 font-semibold ${
                    entry.eloChange > 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {entry.eloChange > 0 ? '+' : ''}{entry.eloChange}
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-500 text-right shrink-0">
                {entry.record.wins}–{entry.record.losses}
              </span>
            </div>
          ))}
        </div>
      </div>

      {recordingMatchup && (
        <RecordCalibrationMatchModal
          matchup={recordingMatchup}
          getPlayerName={getPlayerName}
          onClose={() => setRecordingMatchup(null)}
          onSave={(p1Score, p2Score, winnerId) => {
            onRecordMatch(recordingMatchup.id, p1Score, p2Score, winnerId);
            setRecordingMatchup(null);
            showToast('Match recorded!');
          }}
        />
      )}
    </div>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3 mt-2">
      <h2 className="text-xs font-bold tracking-widest uppercase text-slate-400">{label}</h2>
      <div className="flex-1 h-px bg-[#2e3350]" />
    </div>
  );
}

function CalibrationMatchupCard({
  matchup,
  getPlayerName,
  onTap,
}: {
  matchup: CalibrationMatchup;
  getPlayerName: (id: string) => string;
  onTap?: () => void;
}) {
  const isComplete = matchup.winnerId !== null;

  return (
    <button
      onClick={onTap}
      disabled={!onTap}
      className={`
        w-full bg-[#1a1d27] border rounded-xl px-4 py-3 text-left transition-colors
        ${!isComplete && onTap ? 'border-indigo-500/40 active:bg-[#22263a]' : 'border-[#2e3350]'}
        ${!onTap ? 'cursor-default' : ''}
      `}
    >
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold truncate ${
              matchup.winnerId === matchup.player1Id ? 'text-white' :
              matchup.winnerId ? 'text-slate-500 line-through' :
              'text-white'
            }`}>
              {getPlayerName(matchup.player1Id)}
            </span>
            {matchup.winnerId === matchup.player1Id && (
              <span className="text-xs text-green-400 font-bold shrink-0">WIN</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold truncate ${
              matchup.winnerId === matchup.player2Id ? 'text-white' :
              matchup.winnerId ? 'text-slate-500 line-through' :
              'text-white'
            }`}>
              {getPlayerName(matchup.player2Id)}
            </span>
            {matchup.winnerId === matchup.player2Id && (
              <span className="text-xs text-green-400 font-bold shrink-0">WIN</span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          {matchup.player1Score !== null ? (
            <div className="text-sm font-bold text-slate-300">
              {matchup.player1Score} – {matchup.player2Score}
            </div>
          ) : (
            <span className="text-xs text-indigo-400">Tap to record →</span>
          )}
        </div>
      </div>
    </button>
  );
}

function RecordCalibrationMatchModal({
  matchup,
  getPlayerName,
  onClose,
  onSave,
}: {
  matchup: CalibrationMatchup;
  getPlayerName: (id: string) => string;
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

        <p className="text-xs text-slate-500 font-bold tracking-widest uppercase mb-2">Declare Winner</p>
        <div className="flex gap-3 mb-5">
          <button
            onClick={() => setWinnerId(matchup.player1Id)}
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-colors min-h-[52px] ${
              winnerId === matchup.player1Id
                ? 'bg-indigo-600 text-white border border-indigo-400'
                : 'bg-[#22263a] text-slate-400 border border-[#2e3350] active:bg-[#2e3350]'
            }`}
          >
            {winnerId === matchup.player1Id && '🏆 '}{p1Name}
          </button>
          <button
            onClick={() => setWinnerId(matchup.player2Id)}
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
        <p className="text-xs text-slate-600 text-center mt-3">
          Results are permanent and cannot be edited after saving.
        </p>
      </div>
    </div>
  );
}
