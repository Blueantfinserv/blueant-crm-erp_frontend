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

for (const includeClientTasks of [false, true]) test(includeClientTasks ? 'RM mount and refresh load client tasks' : 'SM mount and refresh skip client APIs', async () => {
  const filename = path.join(__dirname, '../hooks/useSalesManagerTasks.ts');
  const localRequire = createRequire(filename);
  const calls = { leads: 0, meetings: 0, unsubscribed: 0 };
  const cleanup = [];
  let clientCalls = 0;
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
    if (name === '../clientTaskData') { assert.ok(includeClientTasks); return { loadClientTaskQueue: async () => { clientCalls++; return []; } }; }
    if (name === 'react') return {
      useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}],
      useRef: initial => ({ current: initial }),
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
  const result = exportsObject.useSalesManagerTasks({ allTaskMode: true, includeClientTasks });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(clientCalls, includeClientTasks ? 1 : 0);
  assert.deepEqual(calls, { leads: 1, meetings: 1, unsubscribed: 0 });
  assert.equal(result.allTaskFilterOptions.includes('Clients'), includeClientTasks);
  await result.refreshTasks();
  assert.equal(clientCalls, includeClientTasks ? 2 : 0);
  assert.deepEqual(calls, { leads: 2, meetings: 2, unsubscribed: 0 });
  cleanup.forEach(dispose => dispose());
  assert.equal(calls.unsubscribed, 3);
});
