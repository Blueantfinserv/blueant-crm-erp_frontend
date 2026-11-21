const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../conductedMeetingList.ts'), 'utf8');
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const exportedFunctions = {};
new Function('exports', output)(exportedFunctions);

test('conducted meetings remain visible regardless of verification status, but scheduled and not conducted are excluded', () => {
  const { mergeConductedMeetings, filterConductedMeetingsForEmployee } = exportedFunctions;
  const scoped = filterConductedMeetingsForEmployee([
    { meetingCode: 'own', employeeCode: 'E1', meetingConducted: 'CONDUCTED' },
    { meetingCode: 'other', employeeCode: 'E2', meetingConducted: 'CONDUCTED' },
  ], 'E1');
  assert.deepEqual(scoped.map(meeting => meeting.meetingCode), ['own']);
  assert.deepEqual(mergeConductedMeetings([
    { meetingCode: 'pending', meetingConducted: 'CONDUCTED', verificationStatus: 'PENDING' },
    { meetingCode: 'not-conducted', meetingConducted: 'NOT_CONDUCTED', meetingStatus: 'COMPLETED' },
    { meetingCode: 'conflict', meetingConducted: 'CONDUCTED', meetingStatus: 'NOT_CONDUCTED' },
    { meetingCode: 'scheduled', meetingStatus: 'SCHEDULED' },
    { meetingCode: 'completed', meetingStatus: 'COMPLETED' },
  ]).map(meeting => meeting.meetingCode), ['pending', 'completed']);
});

test('duplicate versions merge before eligibility so a later not-conducted correction removes the meeting', () => {
  const { mergeConductedMeetings } = exportedFunctions;
  const result = mergeConductedMeetings(
    [{ meetingCode: 'M1', meetingConducted: 'CONDUCTED', meetingStatus: 'COMPLETED', remarks: 'Earlier result' }],
    [{ meetingCode: 'M1', meetingConducted: 'NOT_CONDUCTED', meetingStatus: 'NOT_CONDUCTED', remarks: 'Corrected result' }],
  );
  assert.deepEqual(result, []);

  const included = mergeConductedMeetings(
    [{ meetingCode: 'M2', meetingConducted: 'CONDUCTED' }],
    [{ meetingCode: 'M2', meetingStatus: 'NOT_CONDUCTED' }],
  );
  assert.deepEqual(included, []);
});

test('client history is employee-scoped before it is merged into the conducted dashboard list', () => {
  const { filterConductedMeetingsForEmployee } = exportedFunctions;
  assert.deepEqual(filterConductedMeetingsForEmployee([
    { meetingCode: 'mine', assignedEmployeeCode: 'E1' },
    { meetingCode: 'other', assignedEmployeeCode: 'E2' },
  ], 'E1').map(meeting => meeting.meetingCode), ['mine']);
});

test('prospect and client history are deduplicated and retain correct client, actual date and remarks', () => {
  const { mergeConductedMeetings, toConductedMeetingListItem, getConductedMeetingPeriod, upsertClientMeetingHistory } = exportedFunctions;
  const client = { clientCode: 'C1', clientName: 'Client name' };
  const cachedHistory = [{ meetingCode: 'M1', meetingStatus: 'COMPLETED', meetingDate: '2026-11-18' }];
  const cachedEntries = upsertClientMeetingHistory([], client, cachedHistory);
  assert.equal(cachedEntries[0].history, cachedHistory);
  assert.equal(upsertClientMeetingHistory(cachedEntries, client, [{ meetingCode: 'M2' }]).length, 1);
  const records = mergeConductedMeetings(
    [{ meetingCode: 'M1', leadCode: 'L1', meetingConducted: 'CONDUCTED', meetingDate: '2026-11-18', remarks: 'Prospect remarks' }],
    [{ meetingCode: 'M1', clientCode: 'C1', meetingStatus: 'COMPLETED', meetingDate: '2026-11-18', clientName: 'Client name', meetingRemarks: 'Client remarks' }],
  );
  assert.equal(records.length, 1);
  const period = getConductedMeetingPeriod(records[0].meetingDate, new Date(2026, 10, 20));
  const item = toConductedMeetingListItem(records[0], period, '18 Nov 2026');
  assert.equal(item.primaryText, 'Client name');
  assert.equal(item.dateValue, '2026-11-18');
  assert.equal(item.remarks, 'Prospect remarks');
});

test('Today, This Week and Last Month periods use the meeting date calendar value', () => {
  const { getConductedMeetingPeriod } = exportedFunctions;
  const today = new Date(2026, 10, 20, 15, 30);
  assert.equal(getConductedMeetingPeriod('2026-11-20T09:00:00', today), 'today');
  assert.equal(getConductedMeetingPeriod('2026-11-16', today), 'thisWeek');
  assert.equal(getConductedMeetingPeriod('2026-10-31', today), 'lastMonth');
  assert.equal(getConductedMeetingPeriod('2026-09-30', today), null);
});

test('verified-list filtering was replaced by conducted rows from the scoped meeting and client-history sources', () => {
  const source = fs.readFileSync(path.join(__dirname, '../DashboardListScreen.tsx'), 'utf8');
  assert.match(source, /filterConductedMeetingsForEmployee\(meetingService\.getConductedMeetingSource\(\), employeeCode\)/);
  assert.match(source, /mergeConductedMeetings\(prospectMeetings, clientMeetings\)/);
  assert.match(source, /filterConductedMeetingsForEmployee\([\s\S]*flatMap\(\(\{ history \}\) => history\)[\s\S]*employeeCode/);
  assert.doesNotMatch(source, /meetingService\.getVerifiedMeetings\(\)\s*\.filter\(\(meeting\) => meeting\.verificationStatus/);
  assert.match(source, /loadClientTaskQueue\(/);
  assert.match(source, /clientHistoryService\.getSnapshot\(code\)\.history/);
  assert.match(source, /onProgress:\s*\(progress\)/);
  assert.match(source, /getConductedMeetingSource\(\)/);
});
