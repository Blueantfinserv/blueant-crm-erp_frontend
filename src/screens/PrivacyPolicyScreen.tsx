import { LegalDocsLayout } from '../components/LegalPage';

export function PrivacyPolicyScreen({ onBack }: { onBack: () => void }) {
  return <LegalDocsLayout kind="privacyPolicy" onBackToLogin={onBack} />;
}
