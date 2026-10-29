// Run: node --test src/screens/salesCoordinator/__tests__/coordinatorLogic.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Load TypeScript helpers with isolated backend/storage doubles; no live requests.
function createLoader(doubles = {}) {
  const cache = new Map();
  const load = filename => {
    filename = path.resolve(filename);
    if (cache.has(filename)) return cache.get(filename);
    const exported = {};
    cache.set(filename, exported);
    const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    const imports = name => {
      for (const [suffix, value] of Object.entries(doubles)) if (name.endsWith(suffix)) return value;
      if (!name.startsWith('.')) return require(name);
      return load(path.resolve(path.dirname(filename), name + '.ts'));
    };
    new Function('require', 'exports', source)(imports, exported);
    return exported;
  };
  return name => load(path.join(__dirname, '..', name + '.ts'));
}
const pure = createLoader();
const utils = pure('coordinatorUtils');
const forms = pure('coordinatorForms');
const filters = pure('coordinatorFilters');

test('conducted filter matches exact status and supports multiple choices', () => {
  const rows = [{ meetingCode: 'yes', meetingConducted: 'CONDUCTED' }, { meetingCode: 'no', meetingConducted: 'NOT_CONDUCTED' }];
  assert.deepEqual(filters.filterMeetingRecords(rows, { meetingConducted: 'CONDUCTED' }).map(r => r.meetingCode), ['yes']);
  assert.equal(filters.filterMeetingRecords(rows, { meetingConducted: 'CONDUCTED|NOT_CONDUCTED' }).length, 2);
});
test('date range, employee name and role filters keep existing boundaries', () => {
  const rows = [{ meetingCode: 'a', meetingDate: '2026-10-01', employeeName: 'Rajat Gupta', employeeRole: 'SALES_MANAGER' },
    { meetingCode: 'b', meetingDate: '2026-10-31', employeeName: 'Divya', employeeCode: 'DV0101' },
    { meetingCode: 'c', meetingDate: '2026-11-01' }];
  assert.equal(filters.filterMeetingRecords(rows, { meetingDate: 'range:2026-10-01,2026-10-31' }).length, 2);
  assert.equal(filters.filterMeetingRecords(rows, { employeeName: 'Rajat' })[0].meetingCode, 'a');
  assert.equal(filters.filterMeetingRecords(rows, { employeeRole: 'SC' })[0].meetingCode, 'b');
  assert.equal(utils.matchesAssignedDate(undefined, { from: '', to: '' }), true);
  assert.equal(utils.matchesAssignedDate(undefined, { from: '2026-10-01', to: '' }), false);
});
test('employee role and verification field rules retain fallbacks', () => {
  assert.equal(utils.employeeRole('relationship-manager'), 'RM');
  assert.equal(utils.employeeRole(undefined, 'DV0101'), 'SC');
  assert.equal(utils.employeeRole(undefined, 'AP0101'), 'RM');
  assert.equal(utils.isVerificationFieldVisible('personName', 'SELF'), false);
  assert.equal(utils.isVerificationFieldVisible('personName', 'with someone'), true);
  assert.equal(utils.isNotConductedMeeting({ meetingStatus: 'NOT_CONDUCTED' }), true);
});
test('verification forms keep PC remarks separate and calculate investments', () => {
  const form = forms.emptyClientVerificationForm({ meetingDate: '2026-10-20', meetingTime: { hour: 9, minute: 30 }, remarks: 'RM remark', nextMeetingDate: '2026-11-02', aloneWith: 'SOMEONE' });
  assert.equal(form.remarks, '');
  assert.equal(form.meetingTime, '09:30:00');
  assert.equal(form.nextFollowupDate, '2026-11-02');
  assert.equal(form.aloneWith, 'SOMEONE');
  form.businessGenerated = 'YES';
  form.businessItems = [{ businessType: 'SIP', amount: '1000' }, { businessType: 'LUMP_SUM', amount: '2000' }];
  assert.equal(forms.clientInvestmentTotal(form), 3000);
  assert.deepEqual(forms.clientBusinessTypes(form), ['SIP', 'LUMP_SUM']);
  for (const invalid of ['', '-1', 'Infinity', 'abc']) assert.equal(utils.isValidAmount(invalid), false);
  assert.equal(utils.isValidAmount('0'), true);
});
test('verified meeting storage merges without erasing profile fields', async () => {
  const saved = new Map();
  const load = createLoader({ '/SecureStorageService': { SecureStorageService: {
    getPersistentItem: async key => saved.get(key) ?? null,
    setPersistentItem: async (key, value) => saved.set(key, value),
  } } });
  const storage = load('verifiedMeetingStorage');
  const merged = storage.mergeVerifiedMeetings([{ meetingCode: 'M1', clientName: 'Alice', mobileNumber: '1234', isClientMeeting: true }], [{ meetingCode: 'M1', clientName: '', mobileNumber: undefined, verifiedBy: 'PC1' }]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].clientName, 'Alice');
  assert.equal(merged[0].mobileNumber, '1234');
  assert.equal(merged[0].verifiedBy, 'PC1');
  assert.deepEqual(storage.parseStoredVerifiedClientMeetings('broken json'), []);
  await storage.saveStoredVerifiedClientMeetings(merged, 'PC1');
  assert.deepEqual(await storage.loadStoredVerifiedClientMeetings('PC1'), merged);
});
test('client loading visits all pages, filters pending and tolerates profile failure', async () => {
  const requested = [];
  const pages = [];
  const data = createLoader({ '/clientMeeting': { clientMeetingApi: {
    getMeeting: async code => { requested.push(code); return { meetingCode: code, clientCode: 'C1', meetingDate: '2026-10-20', assignedEmployeeCode: 'DV0101' }; },
    getProfile: async () => { throw Error('profile unavailable'); },
  } }, '/leadSearch': { leadSearchApi: {} }, '/lead': { leadApi: {} } })('coordinatorData');
  const result = await data.loadClientMeetings(async (page = 0) => {
    pages.push(page);
    return page === 0 ? { totalPages: 2, content: [{ meetingCode: ' M1 ', verificationStatus: 'PENDING' }, { meetingCode: 'M2', verificationStatus: 'VERIFIED' }] } : { content: [{ meetingCode: 'M3' }] };
  }, { pendingOnly: true });
  assert.deepEqual(pages, [0, 1]);
  assert.deepEqual(requested, ['M1', 'M3']);
  assert.equal(result.length, 2);
  assert.equal(result[0].employeeRole, 'SALES_COORDINATOR');
  assert.equal(result[0].isClientMeeting, true);
  const verified = await data.loadClientMeetings(async () => ({ content: [{ meetingCode: 'M4' }] }), { markVerified: true });
  assert.equal(verified[0].verificationStatus, 'VERIFIED');
});
test('assigned leads retain coordinator ownership and assignment-date precedence', async () => {
  const pages = [];
  const data = createLoader({ '/leadSearch': { leadSearchApi: { search: async ({ page }) => {
    pages.push(page);
    return { data: { totalPages: 2, content: page === 0 ? [
      { leadId: 1, assignmentSource: 'SALES_COORDINATOR', assignmentDate: '2026-10-01', assignedAt: '2026-09-01' },
      { leadId: 2, assignmentSource: 'DIRECT' },
    ] : [{ leadId: 3, assignedByCoordinator: true }] } };
  } } }, '/lead': { leadApi: {} }, '/clientMeeting': { clientMeetingApi: {} } })('coordinatorData');
  const result = await data.loadCoordinatorAssignedLeads();
  assert.deepEqual(pages, [0, 1]);
  assert.deepEqual(result.map(r => r.leadId), [1, 3]);
  assert.equal(result[0].assignedAt, '2026-10-01');
});
test('CSV escaping and phone masking preserve exported/displayed values', () => {
  const csv = pure('coordinatorExport');
  assert.equal(csv.csvCell('A,"B"'), '"A,""B"""');
  assert.equal(csv.exportNamePart(' Aarti Kumari '), 'Aarti-Kumari');
  assert.equal(utils.maskedMobile('9876543210'), '98******10');
});
