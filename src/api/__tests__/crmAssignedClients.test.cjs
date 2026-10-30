const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function api(fetchResponse) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../crmAssignment.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const imports = name => name.includes('SecureStorageService') ? { SecureStorageService: { getToken: async () => 'test-session' } } : { requestWithSessionRefresh: async (token, callback) => callback(token) };
  new Function('require', 'exports', 'fetch', source)(imports, exports, fetchResponse);
  return exports.crmAssignmentApi;
}
test('CRM assigned clients read all backend pages and exclude unassigned clients', async () => {
  const calls = [];
  const clientApi = api(async (url, init) => {
    calls.push(url);
    assert.equal(init.headers.Authorization, 'Bearer test-session');
    return { ok: true, json: async () => ({ success: true, data: url.includes('page=0') ? { totalPages: 2, content: [{ clientCode: 'C1', assignedSalesPersonCode: 'MK1908' }, { clientCode: 'UNASSIGNED' }] } : { content: [{ clientCode: 'C2', assignedSalesPersonCode: 'SC1' }] } }) };
  });
  assert.deepEqual((await clientApi.getAssignedClients()).map(client => client.clientCode), ['C1', 'C2']);
  assert.equal(calls.length, 2);
});
test('CRM backend failure is surfaced instead of becoming an empty list', async () => {
  const clientApi = api(async () => ({ ok: false, status: 403, json: async () => ({ success: false, message: 'Access denied' }) }));
  await assert.rejects(clientApi.getAssignedClients(), /Access denied/);
});
