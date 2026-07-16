import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useLocalStorage } from './useLocalStorage';

export interface VisitedPage {
  path: string;
  name: string;
  timestamp: number;
}

export function useRecentlyVisited() {
  const [location] = useLocation();
  const [visited, setVisited] = useLocalStorage<VisitedPage[]>('alphex-recent-pages', []);
  const [totalVisits, setTotalVisits] = useLocalStorage<number>('alphex-total-visits', 0);

  useEffect(() => {
    let name = 'Home';
    if (location.includes('/discover')) name = 'Discover';
    else if (location.includes('/profile')) name = 'Profile';

    setVisited(prev => {
      const newVisit = { path: location, name, timestamp: Date.now() };
      const filtered = prev.filter(p => p.path !== location);
      return [newVisit, ...filtered].slice(0, 3);
    });
    
    setTotalVisits(prev => prev + 1);
  }, [location]); // deliberately omitting setVisited and setTotalVisits to avoid unnecessary triggers

  return { visited, totalVisits };
}