import { useState, useEffect, useCallback } from 'react';

const CHANNEL_NAME = 'alphex-active-tabs';

export function useActiveUsers() {
  const [activeUsers, setActiveUsersState] = useState(1);

  useEffect(() => {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    const tabId = Math.random().toString(36).substring(2, 9);
    const allTabs = new Set([tabId]);

    const syncCount = () => {
      setActiveUsersState(allTabs.size);
    };

    channel.onmessage = (event) => {
      const { type, id, tabs } = event.data;
      if (type === 'hello') {
        allTabs.add(id);
        channel.postMessage({ type: 'welcome', tabs: Array.from(allTabs) });
        syncCount();
      } else if (type === 'welcome' || type === 'update') {
        tabs.forEach((t: string) => allTabs.add(t));
        syncCount();
      } else if (type === 'bye') {
        allTabs.delete(id);
        syncCount();
      }
    };

    // Delay hello slightly so we don't miss replies while setting up
    setTimeout(() => {
      channel.postMessage({ type: 'hello', id: tabId });
    }, 100);

    const handleUnload = () => {
      channel.postMessage({ type: 'bye', id: tabId });
    };

    window.addEventListener('beforeunload', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      handleUnload();
      channel.close();
    };
  }, []);

  const setActiveUsers = useCallback((n: number) => {
    setActiveUsersState(n);
  }, []);

  return { activeUsers, setActiveUsers };
}