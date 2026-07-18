import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { useEffect } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { Navbar } from './components/Navbar';
import HomePage from './pages/HomePage';
import DiscoverPage from './pages/DiscoverPage';
import ProfilePage from './pages/ProfilePage';
import NotFound from './pages/not-found';
import { getOrCreatePlayerId } from './lib/playerProfile';

const queryClient = new QueryClient();

// ─────────────────────────────────────────────────────────────────────────────
// SessionTracker
// Runs once per browser tab.  On first mount it:
//   1. Increments the local session counter (unchanged from before).
//   2. Fires POST /api/players/:id/session/start — this starts the HIDDEN
//      server-side engagement timer.  The returned opaque token is stored in
//      sessionStorage so ProfilePage can claim the XP reward later.
// The user never sees any timer or countdown.
// ─────────────────────────────────────────────────────────────────────────────
const SESSION_COUNTED_KEY = 'alphex-session-counted';
const SESSION_TOKEN_KEY   = 'alphex-session-token';

function SessionTracker() {
  const [, setSessions] = useLocalStorage('alphex-total-sessions', 0);

  useEffect(() => {
    const isNewTab = !sessionStorage.getItem(SESSION_COUNTED_KEY);
    if (!isNewTab) return;

    // Mark tab as counted
    setSessions((prev: number) => prev + 1);
    sessionStorage.setItem(SESSION_COUNTED_KEY, 'true');

    // Start the hidden engagement timer on the server
    const playerId = getOrCreatePlayerId();
    fetch(`/api/players/${playerId}/session/start`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
    })
      .then(r => r.ok ? r.json() : null)
      .then((data: { token?: string } | null) => {
        if (data?.token) {
          sessionStorage.setItem(SESSION_TOKEN_KEY, data.token);
        }
      })
      .catch(() => { /* silent — local fallback handled in ProfilePage */ });
  }, []);           // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

function Router() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground">
      <Navbar />
      <main className="flex-1">
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/discover" component={DiscoverPage} />
          <Route path="/profile" component={ProfilePage} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <SessionTracker />
        <Router />
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
