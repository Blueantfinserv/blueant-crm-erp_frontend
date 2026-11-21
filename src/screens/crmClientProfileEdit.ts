// UpdateClientRequest fields from the backend schema. Assignment/family names and
// document metadata use separate workflows and must not appear editable here.
export const CRM_CLIENT_EDIT_FIELDS = new Set([
  'clientStatus', 'clientName', 'mobileNumber', 'email', 'panNumber', 'amc', 'scheme',
  'investmentType', 'clientSince', 'relationshipManagerId', 'crmOwnerId', 'speciality',
  'location', 'clinicAddress', 'alternateMobileNumber', 'dateOfBirth', 'actualDateOfBirth',
  'occupation', 'motherName', 'placeOfBirth', 'residentialAddress', 'correspondenceAddress',
  'officeAddress', 'city', 'state', 'pinCode', 'clientSource', 'sourceDescription',
  'expectedMaxSIP', 'firstInvestmentAmount', 'investwellId', 'bestTimeToMeet', 'assignmentDate',
  'remarks', 'familyHeadName', 'familyDetails', 'applicationReceivedDate', 'applicationMode',
  'investmentTypes', 'clientReportDate', 'paymentStatus', 'paymentAmount', 'paymentDate',
  'paymentReference', 'nominees', 'familyCode',
]);

export function crmClientEditPayload(draft: Record<string, string>, profile: Record<string, unknown>) {
  const payload: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(draft)) {
    if (!CRM_CLIENT_EDIT_FIELDS.has(key)) continue;
    const value = raw.trim();
    const previous = Array.isArray(profile[key]) ? (profile[key] as unknown[]).join(', ') : String(profile[key] ?? '');
    if (value === previous.trim()) continue;
    if (['expectedMaxSIP', 'firstInvestmentAmount', 'paymentAmount', 'relationshipManagerId', 'crmOwnerId'].includes(key)) {
      if (!value || !Number.isFinite(Number(value)) || Number(value) < 0) throw new Error(`Enter a valid number for ${key}.`);
      payload[key] = Number(value);
    } else if (key === 'investmentTypes') payload[key] = value.split(',').map(item => item.trim()).filter(Boolean);
    else payload[key] = value;
  }
  const nominees = profile.nominees as Record<string, unknown>[] | undefined;
  if (nominees?.length) {
    let changed = false;
    const updated = nominees.map((nominee, index) => {
      const result: Record<string, unknown> = { ...nominee };
      for (const field of ['nomineeName', 'relationship', 'dateOfBirth', 'contactNumber', 'isMinor', 'guardianName', 'guardianRelationship', 'guardianContact']) {
        const raw = draft[`nominee_${index}_${field}`];
        if (raw === undefined || raw.trim() === String(nominee[field] ?? '').trim()) continue;
        changed = true;
        if (field === 'isMinor' && !['true', 'false'].includes(raw.trim())) throw new Error('Minor must be true or false.');
        result[field] = field === 'isMinor' ? raw.trim() === 'true' : raw.trim();
      }
      return result;
    });
    if (changed) payload.nominees = updated;
  }
  return payload;
}
