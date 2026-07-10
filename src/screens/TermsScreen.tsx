import { LegalDocsLayout } from '../components/LegalPage';

export function TermsScreen({ onBack }: { onBack: () => void }) {
  return <LegalDocsLayout kind="terms" onBackToLogin={onBack} />;
}
