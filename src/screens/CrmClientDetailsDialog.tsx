import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { Icon } from 'react-native-paper';
import { crmAssignmentApi } from '../api/crmAssignment';
import type { ClientProfileResponse } from '../types/crm';
import type { ClientHistorySnapshot } from '../services/ClientHistoryService';
import { SalesManagerLeadDetailScreen } from '../modules/salesManager/tasks/SalesManagerLeadDetailScreen';
import { crmClientDetailTask, mergeCrmClientProfile } from './crmClientDetailData';
import { crmClientEditPayload } from './crmClientProfileEdit';

type EditField = {
  key: string;
  label: string;
  multiline?: boolean;
  numeric?: boolean;
};

const profileEditSections: Array<{ title: string; fields: EditField[] }> = [
  {
    title: 'Basic Information',
    fields: [
      { key: 'clientName', label: 'Client Name' },
      { key: 'mobileNumber', label: 'Mobile Number' },
      { key: 'alternateMobileNumber', label: 'Alternate Mobile' },
      { key: 'email', label: 'Email' },
      { key: 'speciality', label: 'Speciality' },
      { key: 'location', label: 'Location' },
      { key: 'clinicAddress', label: 'Clinic Address', multiline: true },
      { key: 'clientStatus', label: 'Client Status' },
      { key: 'bestTimeToMeet', label: 'Best Time to Meet' },
      { key: 'remarks', label: 'Remarks', multiline: true },
    ],
  },
  {
    title: 'Personal & Address',
    fields: [
      { key: 'panNumber', label: 'PAN Number' },
      { key: 'dateOfBirth', label: 'Date of Birth' },
      { key: 'motherName', label: 'Mother Name' },
      { key: 'placeOfBirth', label: 'Place of Birth' },
      { key: 'occupation', label: 'Occupation' },
      { key: 'residentialAddress', label: 'Residential Address', multiline: true },
      { key: 'correspondenceAddress', label: 'Correspondence Address', multiline: true },
      { key: 'officeAddress', label: 'Office Address', multiline: true },
      { key: 'city', label: 'City' },
      { key: 'state', label: 'State' },
      { key: 'pinCode', label: 'PIN Code' },
    ],
  },
  {
    title: 'Source & Application',
    fields: [
      { key: 'clientSource', label: 'Client Source' },
      { key: 'sourceDescription', label: 'Source Description', multiline: true },
      { key: 'applicationReceivedDate', label: 'Application Received Date' },
      { key: 'applicationMode', label: 'Application Mode' },
      { key: 'clientReportDate', label: 'Client Report Date' },
    ],
  },
  {
    title: 'Investment Details',
    fields: [
      { key: 'investmentType', label: 'Investment Type' },
      { key: 'investmentTypes', label: 'Investment Types (comma separated)' },
      { key: 'firstInvestmentAmount', label: 'First Investment Amount', numeric: true },
      { key: 'expectedMaxSIP', label: 'Expected Max SIP', numeric: true },
      { key: 'investwellId', label: 'Investwell ID' },
      { key: 'paymentStatus', label: 'Payment Status' },
      { key: 'paymentAmount', label: 'Payment Amount', numeric: true },
      { key: 'paymentDate', label: 'Payment Date' },
      { key: 'paymentReference', label: 'Payment Reference' },
    ],
  },
  {
    title: 'Family & Assignment',
    fields: [
      { key: 'familyName', label: 'Family Name' },
      { key: 'familyCode', label: 'Family Code' },
      { key: 'relationshipToHead', label: 'Relationship to Head' },
      { key: 'familyHeadName', label: 'Family Head' },
      { key: 'familyDetails', label: 'Family Details', multiline: true },
    ],
  },
];

function valueAsText(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (Array.isArray(value)) return value.join(', ');
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? String(value) : '';
}

function CrmProfileEditModal({ profile, visible, onClose, onSaved }: {
  profile: ClientProfileResponse;
  visible: boolean;
  onClose: () => void;
  onSaved: (profile: ClientProfileResponse) => void;
}) {
  const { width, height } = useWindowDimensions();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [nominees, setNominees] = useState<Array<Record<string, string>>>([]);
  const [documents, setDocuments] = useState<Array<Record<string, string>>>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    setDraft(Object.fromEntries([
      ...profileEditSections.flatMap(section => section.fields),
      ...[],
    ].map(field => [field.key, valueAsText(profile[field.key as keyof ClientProfileResponse])])));
    setNominees((profile.nominees ?? []).map(nominee => ({
      nomineeName: nominee.nomineeName ?? '',
      relationship: nominee.relationship ?? '',
      dateOfBirth: nominee.dateOfBirth ?? '',
      contactNumber: nominee.contactNumber ?? '',
      isMinor: nominee.isMinor === true ? 'true' : nominee.isMinor === false ? 'false' : '',
      guardianName: nominee.guardianName ?? '',
      guardianRelationship: nominee.guardianRelationship ?? '',
      guardianContact: nominee.guardianContact ?? '',
    })));
    setDocuments((profile.documents ?? []).map(document => ({
      documentType: document.documentType ?? '',
      documentName: document.documentName ?? '',
      received: document.received === true ? 'true' : document.received === false ? 'false' : '',
      receivedDate: document.receivedDate ?? '',
      verificationStatus: document.verificationStatus ?? '',
      documentReference: document.documentReference ?? '',
      remarks: document.remarks ?? '',
    })));
  }, [profile, visible]);

  const save = async () => {
    if (!profile.id) {
      setError('Client ID is unavailable. This profile cannot be edited.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {};
      profileEditSections.flatMap(section => section.fields).forEach(field => {
        const value = draft[field.key]?.trim() ?? '';
        if (!value) return;
        if (field.numeric) payload[field.key] = Number(value);
        else if (field.key === 'investmentTypes') payload[field.key] = value.split(',').map(item => item.trim()).filter(Boolean);
        else payload[field.key] = value;
      });
      if (nominees.length) payload.nominees = nominees.map(nominee => Object.fromEntries(Object.entries(nominee).map(([key, value]) => [
        key,
        key === 'isMinor' ? (value === '' ? undefined : value === 'true') : (value.trim() || undefined),
      ]).filter(([, value]) => value !== undefined)));
      if (documents.length) payload.documents = documents.map(document => Object.fromEntries(Object.entries(document).map(([key, value]) => [
        key,
        key === 'received' ? (value === '' ? undefined : value === 'true') : (value.trim() || undefined),
      ]).filter(([, value]) => value !== undefined)));
      const result = await crmAssignmentApi.updateClientProfile(profile.id, payload);
      onSaved(result);
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Client profile could not be updated.');
    } finally {
      setSaving(false);
    }
  };

  const updateNested = (kind: 'nominees' | 'documents', index: number, key: string, value: string) => {
    const setter = kind === 'nominees' ? setNominees : setDocuments;
    setter(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
  };

  return <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
    <View style={editStyles.backdrop}>
      <Pressable accessibilityLabel="Close profile editor" style={StyleSheet.absoluteFillObject} onPress={onClose} />
      <View style={[editStyles.card, { width: Math.max(0, Math.min(width - 24, 980)), height: Math.max(0, Math.min(height - 24, 820)) }]}>
        <View style={editStyles.header}>
          <View><Text style={editStyles.eyebrow}>CRM CLIENT</Text><Text style={editStyles.title}>Edit Client Profile</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Close edit client profile" onPress={onClose} style={editStyles.closeButton}><Icon source="close" size={18} color="#475569" /></Pressable>
        </View>
        <ScrollView style={editStyles.scroll} contentContainerStyle={editStyles.content} keyboardShouldPersistTaps="handled">
          {profileEditSections.map(section => <View key={section.title} style={editStyles.section}>
            <Text style={editStyles.sectionTitle}>{section.title}</Text>
            <View style={editStyles.fieldGrid}>
              {section.fields.map(field => <View key={field.key} style={[editStyles.field, field.multiline && editStyles.fullField]}>
                <Text style={editStyles.label}>{field.label}</Text>
                <TextInput
                  value={draft[field.key] ?? ''}
                  onChangeText={value => setDraft(current => ({ ...current, [field.key]: value }))}
                  style={[editStyles.input, field.multiline && editStyles.multilineInput]}
                  multiline={field.multiline}
                  keyboardType={field.numeric ? 'decimal-pad' : 'default'}
                  placeholder={field.label}
                  placeholderTextColor="#94A3B8"
                />
              </View>)}
            </View>
          </View>)}
          {nominees.length ? <View style={editStyles.section}>
            <Text style={editStyles.sectionTitle}>Nominee Details</Text>
            {nominees.map((nominee, index) => <View key={index} style={editStyles.nestedCard}>
              <Text style={editStyles.nestedTitle}>Nominee {index + 1}</Text>
              <View style={editStyles.fieldGrid}>
                {[
                  ['nomineeName', 'Nominee Name'], ['relationship', 'Relationship'], ['dateOfBirth', 'Date of Birth'], ['contactNumber', 'Contact Number'],
                  ['isMinor', 'Minor (true/false)'], ['guardianName', 'Guardian Name'], ['guardianRelationship', 'Guardian Relationship'], ['guardianContact', 'Guardian Contact'],
                ].map(([key, label]) => <View key={key} style={editStyles.field}>
                  <Text style={editStyles.label}>{label}</Text>
                  <TextInput value={nominee[key]} onChangeText={value => updateNested('nominees', index, key, value)} style={editStyles.input} placeholder={label} placeholderTextColor="#94A3B8" />
                </View>)}
              </View>
            </View>)}
          </View> : null}
          {documents.length ? <View style={editStyles.section}>
            <Text style={editStyles.sectionTitle}>Document Metadata</Text>
            {documents.map((document, index) => <View key={index} style={editStyles.nestedCard}>
              <Text style={editStyles.nestedTitle}>Document {index + 1}</Text>
              <View style={editStyles.fieldGrid}>
                {[
                  ['documentType', 'Document Type'], ['documentName', 'Document Name'], ['received', 'Received (true/false)'], ['receivedDate', 'Received Date'],
                  ['verificationStatus', 'Verification Status'], ['documentReference', 'Document Reference'], ['remarks', 'Remarks'],
                ].map(([key, label]) => <View key={key} style={editStyles.field}>
                  <Text style={editStyles.label}>{label}</Text>
                  <TextInput value={document[key]} onChangeText={value => updateNested('documents', index, key, value)} style={editStyles.input} placeholder={label} placeholderTextColor="#94A3B8" />
                </View>)}
              </View>
            </View>)}
          </View> : null}
        </ScrollView>
        {error ? <Text accessibilityRole="alert" style={editStyles.error}>{error}</Text> : null}
        <View style={editStyles.footer}>
          <Pressable accessibilityRole="button" onPress={onClose} disabled={saving} style={[editStyles.footerButton, editStyles.cancelButton]}><Text style={editStyles.cancelText}>Cancel</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={() => void save()} disabled={saving} style={[editStyles.footerButton, editStyles.saveButton]}>
            <Text style={editStyles.saveText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  </Modal>;
}

export function CrmClientDetailsDialog({ client, onClose, onManageFamily }: {
  client: ClientProfileResponse; onClose: () => void; onManageFamily: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const [profile, setProfile] = useState(client);
  const [editOpen, setEditOpen] = useState(false);
  const [editDraft, setEditDraft] = useState<Record<string, string>>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const history: ClientHistorySnapshot = { history: [], loading: false, error: null, stale: false };
  const code = client.clientCode?.trim();
  useEffect(() => {
    let active = true;
    if (!code) {
      const error = 'Client code is unavailable. Full details cannot be loaded.';
      setProfileLoading(false); setProfileError(error);
      return;
    }
    // CRM reads stay separate from the RM/SC-only shared history account/cache.
    void crmAssignmentApi.getAssignedClientProfile(code).then(result => {
      if (active) setProfile(current => mergeCrmClientProfile(current, result));
    }).catch(error => {
      if (active) setProfileError(error instanceof Error ? error.message : 'Client profile could not be loaded.');
    }).finally(() => { if (active) setProfileLoading(false); });
    return () => { active = false; };
  }, [code]);

  useEffect(() => {
    if (!editOpen) return;
    const next: Record<string, string> = Object.fromEntries(
      profileEditSections.flatMap(section => section.fields)
        .map(field => [field.key, valueAsText(profile[field.key as keyof ClientProfileResponse])])
    );
    (profile.nominees ?? []).forEach((nominee, index) => {
      next[`nominee_${index}_nomineeName`] = nominee.nomineeName ?? '';
      next[`nominee_${index}_relationship`] = nominee.relationship ?? '';
      next[`nominee_${index}_dateOfBirth`] = nominee.dateOfBirth ?? '';
      next[`nominee_${index}_contactNumber`] = nominee.contactNumber ?? '';
      next[`nominee_${index}_isMinor`] = nominee.isMinor === true ? 'true' : nominee.isMinor === false ? 'false' : '';
      next[`nominee_${index}_guardianName`] = nominee.guardianName ?? '';
      next[`nominee_${index}_guardianRelationship`] = nominee.guardianRelationship ?? '';
      next[`nominee_${index}_guardianContact`] = nominee.guardianContact ?? '';
    });
    (profile.documents ?? []).forEach((document, index) => {
      next[`document_${index}_documentType`] = document.documentType ?? '';
      next[`document_${index}_documentName`] = document.documentName ?? '';
      next[`document_${index}_received`] = document.received === true ? 'true' : document.received === false ? 'false' : '';
      next[`document_${index}_receivedDate`] = document.receivedDate ?? '';
      next[`document_${index}_verificationStatus`] = document.verificationStatus ?? '';
      next[`document_${index}_documentReference`] = document.documentReference ?? '';
      next[`document_${index}_remarks`] = document.remarks ?? '';
    });
    setEditDraft(next);
  }, [editOpen, profile]);

  const startEditing = () => {
    setEditError(null);
    setEditOpen(true);
  };

  const cancelEditing = () => {
    setEditError(null);
    setEditOpen(false);
  };

  const saveEditing = async () => {
    if (!profile.id) {
      setEditError('Client ID is unavailable. This profile cannot be edited.');
      return;
    }
    setSavingEdit(true);
    setEditError(null);
    try {
      const payload = crmClientEditPayload(editDraft, profile as unknown as Record<string, unknown>);
      if (!Object.keys(payload).length) { setEditOpen(false); return; }
      const saved = await crmAssignmentApi.updateClientProfile(profile.id, payload);
      setProfile(current => mergeCrmClientProfile(current, saved));
      setProfileError(null);
      setEditOpen(false);
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'Client profile could not be updated.');
    } finally {
      setSavingEdit(false);
    }
  };

  const lead = useMemo(() => crmClientDetailTask(profile, history.history ?? []), [profile, history.history]);
  return <Modal transparent visible animationType="fade" onRequestClose={onClose}>
    <View style={styles.backdrop}>
      <Pressable accessibilityLabel="Close client details backdrop" style={StyleSheet.absoluteFillObject} onPress={onClose} />
      <View style={[styles.card, { width: Math.max(0, Math.min(width - 24, 1180)), height: Math.max(0, Math.min(height - 32, 900)) }]}>
        <SalesManagerLeadDetailScreen lead={lead} embedded onBack={onClose}
          clientDetails={{ profile, profileLoading, profileError, history }}
          crmEdit={editOpen ? {
            draft: editDraft,
            onChange: (key, value) => setEditDraft(current => ({ ...current, [key]: value })),
          } : undefined}
          headerAction={<View style={styles.headerActions}>
            {editOpen ? <>
              <Pressable accessibilityRole="button" accessibilityLabel="Cancel editing client profile" onPress={cancelEditing} disabled={savingEdit} style={styles.cancelEditButton}>
                <Text style={styles.cancelEditText}>Cancel</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Save client profile changes" onPress={() => void saveEditing()} disabled={savingEdit} style={styles.editButton}>
                <Icon source="content-save-outline" size={15} color="#FFFFFF" /><Text style={styles.familyText}>{savingEdit ? 'Saving...' : 'Save'}</Text>
              </Pressable>
            </> : <Pressable accessibilityRole="button" accessibilityLabel="Edit client profile" onPress={startEditing} style={styles.editButton}>
              <Icon source="pencil-outline" size={15} color="#FFFFFF" /><Text style={styles.familyText}>Edit</Text>
            </Pressable>}
            <Pressable accessibilityRole="button" accessibilityLabel="Manage client family" onPress={onManageFamily} style={styles.familyButton}>
              <Icon source="account-group-outline" size={15} color="#FFFFFF" /><Text style={styles.familyText}>Manage Family</Text>
            </Pressable>
          </View>} />
      </View>
      {editError ? <Text accessibilityRole="alert" style={styles.editError}>{editError}</Text> : null}
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.6)' },
  card: { padding: 12, borderRadius: 20, backgroundColor: '#F5F7FB', overflow: 'hidden' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editButton: { minHeight: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  cancelEditButton: { minHeight: 32, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1' },
  cancelEditText: { color: '#475569', fontSize: 10, fontWeight: '800' },
  familyButton: { minHeight: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  familyText: { fontSize: 10, color: '#FFFFFF', fontWeight: '800' },
  editError: { position: 'absolute', bottom: 12, left: 24, right: 24, textAlign: 'center', color: '#FFFFFF', backgroundColor: '#B91C1C', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 11, fontWeight: '800', overflow: 'hidden' },
});

const editStyles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.72)' },
  card: { borderRadius: 18, backgroundColor: '#FFFFFF', overflow: 'hidden' },
  header: { minHeight: 68, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  eyebrow: { color: '#6366F1', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  title: { marginTop: 3, color: '#0F172A', fontSize: 18, fontWeight: '900' },
  closeButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: '#E2E8F0' },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 12 },
  section: { padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF', gap: 10 },
  sectionTitle: { color: '#334155', fontSize: 12, fontWeight: '900' },
  fieldGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  field: { flexBasis: '48%', minWidth: 220, gap: 5 },
  fullField: { flexBasis: '100%' },
  label: { color: '#64748B', fontSize: 10, fontWeight: '800' },
  input: { minHeight: 40, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, color: '#0F172A', backgroundColor: '#F8FAFC', fontSize: 12 },
  multilineInput: { minHeight: 70, textAlignVertical: 'top' },
  nestedCard: { gap: 8, padding: 10, borderRadius: 10, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
  nestedTitle: { color: '#475569', fontSize: 11, fontWeight: '900' },
  error: { marginHorizontal: 16, marginBottom: 8, color: '#B91C1C', fontSize: 11, fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: '#E2E8F0', backgroundColor: '#FFFFFF' },
  footerButton: { minWidth: 110, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  cancelButton: { borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#FFFFFF' },
  cancelText: { color: '#475569', fontSize: 12, fontWeight: '800' },
  saveButton: { backgroundColor: '#4F46E5' },
  saveText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
});
