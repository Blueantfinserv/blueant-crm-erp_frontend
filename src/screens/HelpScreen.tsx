import { LegalDocsLayout } from '../components/LegalPage';

export function HelpScreen({ onBack }: { onBack: () => void }) {
  return <LegalDocsLayout kind="help" onBackToLogin={onBack} />;
}
