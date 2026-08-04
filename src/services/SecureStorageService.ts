import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { AuthTokens, AuthUser } from '../types/auth';

const memoryStore = new Map<string, string>();
const isWeb = Platform.OS === 'web';

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
  await SecureStore.setItemAsync(key, value);
};

const getItem = async (key: string) => {
  return SecureStore.getItemAsync(key);
};

const removeItem = async (key: string) => {
  await SecureStore.deleteItemAsync(key);
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
const DEVICE_ID_KEY = 'blueant.deviceId';

const createDeviceId = () => `blueant-${Platform.OS}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

export const SecureStorageService = {
  getOrCreateDeviceId: async () => {
    const storedDeviceId = isWeb
      ? getWebItem('localStorage', DEVICE_ID_KEY)
      : await getItem(DEVICE_ID_KEY);
    if (storedDeviceId) return storedDeviceId;

    const deviceId = createDeviceId();
    if (isWeb) {
      setWebItem('localStorage', DEVICE_ID_KEY, deviceId);
    } else {
      await setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  },
  saveToken: async (tokens: AuthTokens, user: AuthUser, remember = true) => {
    const rememberValue = remember ? 'true' : 'false';
    await SecureStorageService.removeToken();

    if (!isWeb && remember) {
      await Promise.all([
        setItem(TOKEN_KEY, tokens.accessToken),
        setItem(REFRESH_KEY, tokens.refreshToken),
        setItem(USER_KEY, JSON.stringify(user)),
        setItem(REMEMBER_ME_KEY, rememberValue),
        setItem(AUTH_KIND_KEY, 'secureStore'),
      ]);
      return;
    }

    if (!isWeb) {
      memoryStore.set(TOKEN_KEY, tokens.accessToken);
      memoryStore.set(REFRESH_KEY, tokens.refreshToken);
      memoryStore.set(USER_KEY, JSON.stringify(user));
      memoryStore.set(REMEMBER_ME_KEY, rememberValue);
      memoryStore.set(AUTH_KIND_KEY, 'memory');
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
  getToken: async () => isWeb
    ? getWebItem('localStorage', TOKEN_KEY) ?? getWebItem('sessionStorage', TOKEN_KEY)
    : memoryStore.get(TOKEN_KEY) ?? await getItem(TOKEN_KEY),
  getRefreshToken: async () => isWeb
    ? getWebItem('localStorage', REFRESH_KEY) ?? getWebItem('sessionStorage', REFRESH_KEY)
    : memoryStore.get(REFRESH_KEY) ?? await getItem(REFRESH_KEY),
  getUserData: async () => {
    const value = isWeb ? null : memoryStore.get(USER_KEY) ?? await getItem(USER_KEY);
    if (value) return JSON.parse(value) as AuthUser;
    const localValue = getWebItem('localStorage', USER_KEY) ?? getWebItem('sessionStorage', USER_KEY);
    return localValue ? (JSON.parse(localValue) as AuthUser) : null;
  },
  getRememberMe: async () => {
    const value = isWeb ? null : memoryStore.get(REMEMBER_ME_KEY) ?? await getItem(REMEMBER_ME_KEY);
    if (value !== null) return value === 'true';
    const localValue = getWebItem('localStorage', REMEMBER_ME_KEY) ?? getWebItem('sessionStorage', REMEMBER_ME_KEY);
    return localValue === 'true';
  },
  getStorageKind: async () => isWeb
    ? getWebItem('localStorage', AUTH_KIND_KEY) ?? getWebItem('sessionStorage', AUTH_KIND_KEY)
    : memoryStore.get(AUTH_KIND_KEY) ?? await getItem(AUTH_KIND_KEY),
  removeToken: async () => {
    if (!isWeb) {
      await Promise.all([
        removeItem(TOKEN_KEY),
        removeItem(REFRESH_KEY),
        removeItem(USER_KEY),
        removeItem(REMEMBER_ME_KEY),
        removeItem(AUTH_KIND_KEY),
      ]);
    }
    memoryStore.clear();
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
