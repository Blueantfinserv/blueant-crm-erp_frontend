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

const TOKEN_KEY = 'blueant.accessToken';
const REFRESH_KEY = 'blueant.refreshToken';
const USER_KEY = 'blueant.user';

export const SecureStorageService = {
  saveToken: async (tokens: AuthTokens, user: AuthUser) => {
    await Promise.all([
      setItem(TOKEN_KEY, tokens.accessToken),
      setItem(REFRESH_KEY, tokens.refreshToken),
      setItem(USER_KEY, JSON.stringify(user)),
    ]);
  },
  getToken: async () => getItem(TOKEN_KEY),
  getRefreshToken: async () => getItem(REFRESH_KEY),
  getUserData: async () => {
    const value = await getItem(USER_KEY);
    return value ? (JSON.parse(value) as AuthUser) : null;
  },
  removeToken: async () => {
    await Promise.all([removeItem(TOKEN_KEY), removeItem(REFRESH_KEY), removeItem(USER_KEY)]);
  },
};
