// Run: node --test src/modules/salesManager/tasks/__tests__/smTaskLoading.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, filename);

test('SM mount and refresh load prospects and meetings without client APIs', async () => {
  const filename = path.join(__dirname, '../hooks/useSalesManagerTasks.ts');
  const localRequire = createRequire(filename);
  const calls = { leads: 0, meetings: 0, unsubscribed: 0 };
  const cleanup = [];
  const leadSearchService = {
    getState: () => ({ leads: [], isLoading: false, error: null }),
    subscribe: () => () => calls.unsubscribed++,
    loadLeads: async () => { calls.leads++; },
  };
  const meetingService = {
    getState: () => ({ meetings: [], isLoading: false, error: null }),
    subscribe: () => () => calls.unsubscribed++,
    loadMeetings: async () => { calls.meetings++; },
    getPendingVerificationMeetings: () => [], getVerifiedMeetings: () => [],
  };
  const imports = name => {
    assert.ok(!name.includes('/api/client'), 'SM must not import client APIs');
    if (name === 'react') return {
      useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}],
      useMemo: callback => callback(),
      useEffect: callback => { const dispose = callback(); if (dispose) cleanup.push(dispose); },
    };
    if (name.endsWith('/LeadSearchService')) return { leadSearchService };
    if (name.endsWith('/MeetingService')) return { meetingService };
    if (name.endsWith('/LeadService')) return { leadService: { getState: () => ({}), subscribe: () => () => calls.unsubscribed++ } };
    return localRequire(name);
  };
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const exportsObject = {};
  new Function('require', 'exports', output)(imports, exportsObject);
  const result = exportsObject.useSalesManagerTasks({ allTaskMode: true });
  assert.deepEqual(calls, { leads: 1, meetings: 1, unsubscribed: 0 });
  assert.ok(!result.allTaskFilterOptions.includes('Clients'));
  await result.refreshTasks();
  assert.deepEqual(calls, { leads: 2, meetings: 2, unsubscribed: 0 });
  cleanup.forEach(dispose => dispose());
  assert.equal(calls.unsubscribed, 3);
});
