import { useWindowDimensions } from 'react-native';
import { MobileLogin } from './login/MobileLogin';
import { DesktopLogin } from './login/DesktopLogin';
import { TabletLogin } from './login/TabletLogin';
import { LoginFormValues } from '../../utils/authValidation';
import type { ForgotPasswordCredentials, ResetPasswordCredentials } from '../../types/auth';

type Props = {
  onLogin: (credentials: LoginFormValues) => Promise<void> | void;
  onCreateAccount: (credentials: { email: string; password: string; confirmPassword: string }) => Promise<void> | void;
  onForgotPassword: (credentials: ForgotPasswordCredentials) => Promise<{ success: boolean; message: string }>;
  onResetPassword: (credentials: ResetPasswordCredentials) => Promise<{ success: boolean; message: string }>;
  onHelp: () => void;
  onContact: () => void;
  onPrivacyPolicy: () => void;
  onTerms: () => void;
  loading: boolean;
  errorMessage: string | null;
  successMessage: string | null;
};

export function LoginScreen(props: Props) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;
  if (isMobile) {
    return <MobileLogin {...props} />;
  }

  if (isTablet) {
    return <TabletLogin {...props} />;
  }

  if (isDesktop) {
    return <DesktopLogin {...props} />;
  }

  return <DesktopLogin {...props} />;
}
