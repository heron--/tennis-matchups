import { useLocation } from 'react-router-dom';

const PAGE_LABELS: Record<string, string> = {
  '/': 'Player Manager',
  '/tournaments': 'Tournaments',
  '/ranked': 'Ranked Match',
};

interface TopBarProps {
  onMenuOpen: () => void;
}

export function TopBar({ onMenuOpen }: TopBarProps) {
  const { pathname } = useLocation();
  const pageLabel = PAGE_LABELS[pathname] ?? '';

  return (
    <header className="fixed top-0 left-0 right-0 z-30 flex items-center gap-3 px-4 h-14 bg-[#1a1d27]/95 backdrop-blur border-b border-[#2e3350]">
      <button
        onClick={onMenuOpen}
        className="p-2 rounded-lg text-slate-300 active:bg-[#22263a] min-h-[44px] min-w-[44px] flex items-center justify-center"
        aria-label="Open menu"
      >
        <HamburgerIcon />
      </button>

      <div className="flex items-baseline gap-2">
        <span className="font-black text-white tracking-tight text-lg">COURT</span>
        <span className="font-black text-indigo-400 tracking-tight text-lg">IQ</span>
      </div>

      {pageLabel && (
        <div className="ml-auto">
          <span className="text-xs font-bold tracking-widest uppercase text-slate-600">
            {pageLabel}
          </span>
        </div>
      )}
    </header>
  );
}

function HamburgerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="2" y="4" width="16" height="2" rx="1" fill="currentColor" />
      <rect x="2" y="9" width="16" height="2" rx="1" fill="currentColor" />
      <rect x="2" y="14" width="16" height="2" rx="1" fill="currentColor" />
    </svg>
  );
}
