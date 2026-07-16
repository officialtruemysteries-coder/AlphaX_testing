import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { useEffect } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { Navbar } from './components/Navbar';
import HomePage from './pages/HomePage';
import DiscoverPage from './pages/DiscoverPage';
import ProfilePage from './pages/ProfilePage';
import NotFound from './pages/not-found';

const queryClient = new QueryClient();

// Session tracker component that lives at the root
function SessionTracker() {
  const [sessions, setSessions] = useLocalStorage('alphex-total-sessions', 0);
  
  useEffect(() => {
    // Only increment once per session load (on mount)
    // using sessionStorage to ensure it only happens once per tab lifecycle
    const isNewSessionInTab = !sessionStorage.getItem('alphex-session-counted');
    if (isNewSessionInTab) {
      setSessions(prev => prev + 1);
      sessionStorage.setItem('alphex-session-counted', 'true');
    }
  }, []);

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