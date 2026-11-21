const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '../../../..');

const compile = (file, modules = {}) => {
  const exportedFunctions = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  new Function('require', 'exports', code)(name => modules[name], exportedFunctions);
  return exportedFunctions;
};

test('PC export schemas preserve their original active columns and value counts', () => {
  const assigned = compile('src/screens/salesCoordinator/assignedLeadExport.ts', {
    './coordinatorUtils': {
      digitsOnly: value => String(value ?? '').replace(/\D/g, ''),
      timeText: value => typeof value === 'string' ? value : value?.hour === undefined ? '—' : `${value.hour}:${value.minute ?? 0}`,
    },
  });
  const verified = compile('src/screens/salesCoordinator/verifiedMeetingExport.ts');
  const lead = { leadId: 7, clientName: 'Client', mobileNumber: '123', speciality: 'Cardiology', location: 'Pune', clinicAddress: 'Clinic', assignedEmployeeName: 'Sales', assignedByEmployeeName: 'PC', assignedAt: '2026-01-01', leadStatus: 'WORK_IN_PROGRESS' };
  const rows = assigned.assignedLeadExportRows([lead], [], [], []);
  assert.equal(assigned.ASSIGNED_LEAD_EXPORT_HEADERS.length, 27);
  assert.equal(rows[0].length, 27);
  assert.deepEqual(rows[0].slice(0, 9), ['Client', '123', 'Cardiology', 'Pune', 'Clinic', 'Sales', 'PC', '2026-01-01', 'WORK IN PROGRESS']);

  const verifiedRows = verified.verifiedMeetingExportRows([{ clientName: 'Client' }]);
  assert.equal(verified.VERIFIED_MEETING_EXPORT_HEADERS.length, 9);
  assert.equal(verifiedRows[0].length, 9);
  assert.equal(verifiedRows[0][0], 'Client');
});

test('optional export fields have matching commented headers and value expressions', () => {
  const cases = [
    ['src/screens/salesCoordinator/assignedLeadExport.ts', ['// \'Lead Code\',', '// lead.leadCode ?? \'\','], ['// \'Email\',', '// lead.email ?? \'\',']],
    ['src/screens/salesCoordinator/verifiedMeetingExport.ts', ['// \'Mobile Number\',', '// meeting.mobileNumber ?? \'\','], ['// \'Meeting Code\',', '// meeting.meetingCode ?? \'\',']],
  ];
  for (const [file, ...pairs] of cases) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    pairs.forEach(([header, value]) => {
      assert.ok(source.includes(header), `${file} should retain ${header}`);
      assert.ok(source.includes(value), `${file} should retain ${value}`);
    });
  }
});
