import { LegalDocsLayout } from '../components/LegalPage';

export function ContactScreen({ onBack }: { onBack: () => void }) {
  return <LegalDocsLayout kind="contact" onBackToLogin={onBack} />;
}
