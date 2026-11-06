import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { clientHistoryService } from '../../../../services/ClientHistoryService';

export const canRefreshClientHistory = () =>
  (AppState.currentState === null || AppState.currentState === 'active') &&
  (typeof document === 'undefined' || document.visibilityState !== 'hidden') &&
  (typeof navigator === 'undefined' || navigator.onLine !== false);

export function useClientHistory(code?: string) {
  const [snapshot, setSnapshot] = useState(() => clientHistoryService.getSnapshot(code ?? ''));
  useEffect(() => {
    if (!code) return;
    const publish = () => setSnapshot(clientHistoryService.getSnapshot(code));
    let disposed = false;
    let scheduled = false;
    const refresh = () => {
      if (scheduled || disposed) return;
      scheduled = true;
      void Promise.resolve().then(() => {
        scheduled = false;
        if (!disposed && canRefreshClientHistory()) void clientHistoryService.refresh(code, false, () => !disposed).catch(() => undefined);
      });
    };
    const resume = refresh;
    const unsubscribe = clientHistoryService.subscribe(publish);
    publish();
    refresh();
    const timer = setInterval(refresh, 30_000);
    const appState = AppState.addEventListener('change', state => { if (state === 'active') resume(); });
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', resume);
    if (typeof window !== 'undefined') window.addEventListener('online', resume);
    return () => {
      disposed = true;
      clearInterval(timer);
      unsubscribe();
      appState.remove();
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', resume);
      if (typeof window !== 'undefined') window.removeEventListener('online', resume);
    };
  }, [code]);
  return snapshot;
}
