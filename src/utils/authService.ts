export type ScreenKey =
  | 'splash'
  | 'welcome'
  | 'login'
  | 'createAccount'
  | 'forgotPassword'
  | 'resetPassword'
  | 'dashboard';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const createAuthService = () => ({
  simulateLogin: async () => {
    await delay(2000);
  },
  simulateRegister: async () => {
    await delay(2000);
  },
  simulatePasswordResetRequest: async () => {
    await delay(2000);
  },
  simulatePasswordUpdate: async () => {
    await delay(2000);
  },
});
