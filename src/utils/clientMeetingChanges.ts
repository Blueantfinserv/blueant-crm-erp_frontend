type Listener = (clientCode: string) => void;
const listeners = new Set<Listener>();
const notify = (code: string) => { listeners.forEach(listener => { try { listener(code); } catch { /* A UI listener must not fail an already committed write. */ } }); };
let channel: BroadcastChannel | undefined;
if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
  try {
    channel = new BroadcastChannel(`blueant-client-history:${process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://api.blueantfinserv.com/api'}`);
    channel.onmessage = event => {
      if (typeof event.data?.clientCode === 'string' && event.data.clientCode) notify(event.data.clientCode);
    };
  } catch { /* Local invalidation still works when cross-tab messaging is unavailable. */ }
}
export const subscribeClientMeetingChanges = (listener: Listener) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
export const publishClientMeetingChange = (clientCode?: string) => {
  if (!clientCode) return;
  notify(clientCode);
  // Invalidation hints only: no history, profile, PAN, credentials or authentication state.
  try { channel?.postMessage({ clientCode }); } catch { /* Existing refresh remains available. */ }
};
