import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../AppContext';
import { showToast } from './Toast';
import { encodeState } from '../storage';

interface SideNavProps {
  open: boolean;
  onClose: () => void;
}

export function SideNav({ open, onClose }: SideNavProps) {
  const { state } = useApp();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const hasEnoughPlayers = state.players.length >= 2;

  function handleNavClick(path: string, disabled: boolean) {
    if (disabled) return;
    onClose();
    navigate(path);
  }

  function handleExport() {
    const encoded = encodeState(state);
    const url = `${window.location.origin}${window.location.pathname}?data=${encoded}`;
    navigator.clipboard.writeText(url).then(() => {
      showToast('Share link copied!');
    }).catch(() => {
      window.prompt('Copy this link:', url);
    });
    onClose();
  }

  function handleClearData() {
    onClose();
    navigate('/?clearData=1');
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-40"
          onClick={onClose}
        />
      )}

      <div
        className={`
          fixed top-0 left-0 h-full w-72 z-50 flex flex-col
          bg-[#1a1d27] border-r border-[#2e3350]
          transition-transform duration-300 ease-in-out
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2e3350]">
          <div>
            <span className="font-black text-white tracking-tight text-lg">COURT</span>
            <span className="font-black text-indigo-400 tracking-tight text-lg ml-1">IQ</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 active:bg-[#22263a] min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-4 flex flex-col gap-1 px-3">
          <NavItem
            label="Player Manager"
            emoji="👤"
            onClick={() => handleNavClick('/', false)}
            active={pathname === '/'}
          />

          <NavItemDisableable
            label="Tournament Manager"
            emoji="🏆"
            disabled={!hasEnoughPlayers}
            disabledHint="Add at least 2 players first"
            onClick={() => handleNavClick('/tournaments', !hasEnoughPlayers)}
            active={pathname === '/tournaments'}
          />

          <NavItemDisableable
            label="Ranked Match"
            emoji="⚡"
            disabled={!hasEnoughPlayers}
            disabledHint="Add at least 2 players first"
            onClick={() => handleNavClick('/ranked', !hasEnoughPlayers)}
            active={pathname === '/ranked'}
          />

          <div className="my-3 border-t border-[#2e3350]" />

          <NavItem
            label="Export Data"
            emoji="🔗"
            onClick={handleExport}
          />
        </nav>

        {/* Danger zone */}
        <div className="px-3 pb-6 border-t border-[#2e3350] pt-4">
          <button
            onClick={handleClearData}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 active:bg-red-950/40 transition-colors min-h-[44px] text-left"
          >
            <span>🗑️</span>
            <span className="font-semibold text-sm">Clear All Data</span>
          </button>
        </div>
      </div>
    </>
  );
}

function NavItem({
  label,
  emoji,
  onClick,
  active,
}: {
  label: string;
  emoji: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors min-h-[44px] text-left
        ${active
          ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
          : 'text-slate-300 active:bg-[#22263a]'
        }
      `}
    >
      <span>{emoji}</span>
      <span className="font-semibold text-sm">{label}</span>
    </button>
  );
}

function NavItemDisableable({
  label,
  emoji,
  disabled,
  disabledHint,
  onClick,
  active,
}: {
  label: string;
  emoji: string;
  disabled: boolean;
  disabledHint: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <div>
      <button
        onClick={onClick}
        disabled={disabled}
        className={`
          w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors min-h-[44px] text-left
          ${disabled
            ? 'text-slate-600 cursor-default'
            : active
              ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
              : 'text-slate-300 active:bg-[#22263a]'
          }
        `}
      >
        <span className={disabled ? 'opacity-40' : ''}>{emoji}</span>
        <span className="font-semibold text-sm">{label}</span>
      </button>
      {disabled && (
        <p className="px-4 text-xs text-slate-600 mt-0.5">{disabledHint}</p>
      )}
    </div>
  );
}
