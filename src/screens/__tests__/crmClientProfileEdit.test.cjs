const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const path = require('node:path');
const mod = {};
new Function('exports', ts.transpileModule(fs.readFileSync(path.join(__dirname, '../crmClientProfileEdit.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(mod);
test('CRM saves supported profile edits instead of silently dropping address and personal fields', () => {
  const payload = mod.crmClientEditPayload({ city: 'Delhi', occupation: 'Doctor', paymentAmount: '500', clientCode: 'illegal', email: '', investmentTypes: 'SIP, LOAN' }, { email: 'old@example.com' });
  assert.deepEqual(payload, { city: 'Delhi', occupation: 'Doctor', paymentAmount: 500, email: '', investmentTypes: ['SIP', 'LOAN'] });
});
test('CRM preserves unchanged fields and validates numeric edits', () => {
  assert.deepEqual(mod.crmClientEditPayload({ city: 'Delhi' }, { city: 'Delhi' }), {});
  assert.throws(() => mod.crmClientEditPayload({ paymentAmount: 'abc' }, {}), /valid number/);
});
test('CRM includes nominee edits in the supported nested request', () => {
  assert.deepEqual(mod.crmClientEditPayload({ nominee_0_nomineeName: 'New' }, { nominees: [{ nomineeName: 'Old', relationship: 'SON' }] }), { nominees: [{ nomineeName: 'New', relationship: 'SON' }] });
});
