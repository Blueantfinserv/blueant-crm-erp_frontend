import { AuthTokens, AuthUser } from '../types/auth';

type SecureStoreModule = {
  setItemAsync: (key: string, value: string) => Promise<void>;
  getItemAsync: (key: string) => Promise<string | null>;
  deleteItemAsync: (key: string) => Promise<void>;
};

const memoryStore = new Map<string, string>();

const getSecureStore = (): SecureStoreModule | null => {
  try {
    // Optional runtime dependency: falls back to memory when unavailable.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('expo-secure-store') as SecureStoreModule;
  } catch {
    return null;
  }
};

const storage = getSecureStore();

type WebStorageLike = {
  setItem: (key: string, value: string) => void;
  getItem: (key: string) => string | null;
  removeItem: (key: string) => void;
};

const getWebStorage = (kind: 'localStorage' | 'sessionStorage'): WebStorageLike | null => {
  try {
    if (typeof window === 'undefined') return null;
    const storageImpl = window[kind];
    return storageImpl ? storageImpl : null;
  } catch {
    return null;
  }
};

const localStorageImpl = getWebStorage('localStorage');
const sessionStorageImpl = getWebStorage('sessionStorage');

const setItem = async (key: string, value: string) => {
  if (storage) {
    await storage.setItemAsync(key, value);
    return;
  }
  memoryStore.set(key, value);
};

const getItem = async (key: string) => {
  if (storage) {
    return storage.getItemAsync(key);
  }
  return memoryStore.get(key) ?? null;
};

const removeItem = async (key: string) => {
  if (storage) {
    await storage.deleteItemAsync(key);
    return;
  }
  memoryStore.delete(key);
};

const setWebItem = (kind: 'localStorage' | 'sessionStorage', key: string, value: string) => {
  const impl = kind === 'localStorage' ? localStorageImpl : sessionStorageImpl;
  if (impl) {
    impl.setItem(key, value);
    return;
  }
  memoryStore.set(`${kind}:${key}`, value);
};

const getWebItem = (kind: 'localStorage' | 'sessionStorage', key: string) => {
  const impl = kind === 'localStorage' ? localStorageImpl : sessionStorageImpl;
  if (impl) {
    return impl.getItem(key);
  }
  return memoryStore.get(`${kind}:${key}`) ?? null;
};

const removeWebItem = (kind: 'localStorage' | 'sessionStorage', key: string) => {
  const impl = kind === 'localStorage' ? localStorageImpl : sessionStorageImpl;
  if (impl) {
    impl.removeItem(key);
    return;
  }
  memoryStore.delete(`${kind}:${key}`);
};

const TOKEN_KEY = 'blueant.accessToken';
const REFRESH_KEY = 'blueant.refreshToken';
const USER_KEY = 'blueant.user';
const REMEMBER_ME_KEY = 'blueant.rememberMe';
const AUTH_KIND_KEY = 'blueant.storageKind';

export const SecureStorageService = {
  saveToken: async (tokens: AuthTokens, user: AuthUser, remember = true) => {
    const rememberValue = remember ? 'true' : 'false';
    if (storage && !remember) {
      await Promise.all([
        setItem(TOKEN_KEY, tokens.accessToken),
        setItem(REFRESH_KEY, tokens.refreshToken),
        setItem(USER_KEY, JSON.stringify(user)),
        setItem(REMEMBER_ME_KEY, rememberValue),
      ]);
      return;
    }

    const kind = remember ? 'localStorage' : 'sessionStorage';
    await Promise.resolve();
    setWebItem(kind, TOKEN_KEY, tokens.accessToken);
    setWebItem(kind, REFRESH_KEY, tokens.refreshToken);
    setWebItem(kind, USER_KEY, JSON.stringify(user));
    setWebItem(kind, REMEMBER_ME_KEY, rememberValue);
    setWebItem(kind, AUTH_KIND_KEY, kind);
  },
  getToken: async () => getItem(TOKEN_KEY) ?? getWebItem('localStorage', TOKEN_KEY) ?? getWebItem('sessionStorage', TOKEN_KEY),
  getRefreshToken: async () => getItem(REFRESH_KEY) ?? getWebItem('localStorage', REFRESH_KEY) ?? getWebItem('sessionStorage', REFRESH_KEY),
  getUserData: async () => {
    const value = await getItem(USER_KEY);
    if (value) return JSON.parse(value) as AuthUser;
    const localValue = getWebItem('localStorage', USER_KEY) ?? getWebItem('sessionStorage', USER_KEY);
    return localValue ? (JSON.parse(localValue) as AuthUser) : null;
  },
  getRememberMe: async () => {
    const value = await getItem(REMEMBER_ME_KEY);
    if (value !== null) return value === 'true';
    const localValue = getWebItem('localStorage', REMEMBER_ME_KEY) ?? getWebItem('sessionStorage', REMEMBER_ME_KEY);
    return localValue === 'true';
  },
  getStorageKind: async () => getItem(AUTH_KIND_KEY) ?? getWebItem('localStorage', AUTH_KIND_KEY) ?? getWebItem('sessionStorage', AUTH_KIND_KEY),
  removeToken: async () => {
    await Promise.all([
      removeItem(TOKEN_KEY),
      removeItem(REFRESH_KEY),
      removeItem(USER_KEY),
      removeItem(REMEMBER_ME_KEY),
      removeItem(AUTH_KIND_KEY),
    ]);
    removeWebItem('localStorage', TOKEN_KEY);
    removeWebItem('localStorage', REFRESH_KEY);
    removeWebItem('localStorage', USER_KEY);
    removeWebItem('localStorage', REMEMBER_ME_KEY);
    removeWebItem('localStorage', AUTH_KIND_KEY);
    removeWebItem('sessionStorage', TOKEN_KEY);
    removeWebItem('sessionStorage', REFRESH_KEY);
    removeWebItem('sessionStorage', USER_KEY);
    removeWebItem('sessionStorage', REMEMBER_ME_KEY);
    removeWebItem('sessionStorage', AUTH_KIND_KEY);
  },
};
