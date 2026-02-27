import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useSearchParams } from 'react-router-dom';
import { AppContext } from './AppContext';
import { useAppState } from './useAppState';
import { decodeState } from './storage';
import { TopBar } from './components/TopBar';
import { SideNav } from './components/SideNav';
import { ToastContainer } from './components/Toast';
import { ConfirmModal } from './components/ConfirmModal';
import { PlayerManager } from './pages/PlayerManager';
import { TournamentManager } from './pages/TournamentManager';
import { RankedMatchManager } from './pages/RankedMatchManager';

function AppShell() {
  const appState = useAppState();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [importData, setImportData] = useState<Awaited<ReturnType<typeof decodeState>>>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showResetElosConfirm, setShowResetElosConfirm] = useState(false);

  // Handle ?data= import param on load
  useEffect(() => {
    const dataParam = searchParams.get('data');
    if (dataParam) {
      decodeState(dataParam).then(decoded => {
        if (decoded) {
          setImportData(decoded);
        }
      });
      setSearchParams({}, { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle ?clearData=1 from SideNav
  useEffect(() => {
    if (searchParams.get('clearData') === '1') {
      setShowClearConfirm(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Handle ?resetElos=1 from SideNav
  useEffect(() => {
    if (searchParams.get('resetElos') === '1') {
      setShowResetElosConfirm(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  function handleImportConfirm() {
    if (importData) {
      appState.importState(importData);
      setImportData(null);
    }
  }

  function handleClearConfirm() {
    appState.resetState();
    setShowClearConfirm(false);
  }

  function handleResetElosConfirm() {
    appState.resetElos();
    setShowResetElosConfirm(false);
  }

  return (
    <AppContext.Provider value={appState}>
      <TopBar onMenuOpen={() => setMenuOpen(true)} />
      <SideNav open={menuOpen} onClose={() => setMenuOpen(false)} />

      <main className="flex-1 pt-14">
        <Routes>
          <Route path="/" element={<PlayerManager />} />
          <Route path="/tournaments" element={<TournamentManager />} />
          <Route path="/ranked" element={<RankedMatchManager />} />
        </Routes>
      </main>

      <ToastContainer />

      {importData && (
        <ConfirmModal
          title="Import Data"
          message="This will replace all existing players, matches, and tournaments with the imported data. This cannot be undone."
          confirmLabel="Yes, Import"
          danger
          onConfirm={handleImportConfirm}
          onCancel={() => setImportData(null)}
        />
      )}

      {showClearConfirm && (
        <ConfirmModal
          title="Clear All Data"
          message="This will permanently delete all players, matches, and tournaments. This cannot be undone. Are you absolutely sure?"
          confirmLabel="Yes, Delete Everything"
          danger
          onConfirm={handleClearConfirm}
          onCancel={() => setShowClearConfirm(false)}
        />
      )}

      {showResetElosConfirm && (
        <ConfirmModal
          title="Reset ELOs & Records"
          message="This will reset all player ELOs to 1200 and clear all wins, losses, and match history. Players will remain on the roster. This cannot be undone."
          confirmLabel="Yes, Reset Everything"
          danger
          onConfirm={handleResetElosConfirm}
          onCancel={() => setShowResetElosConfirm(false)}
        />
      )}
    </AppContext.Provider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
