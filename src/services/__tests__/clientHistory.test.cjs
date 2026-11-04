const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '../../..');
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const flush = () => new Promise(resolve => setImmediate(resolve));
function compile(file, imports, globals = {}, source) {
  const exports = {};
  const code = ts.transpileModule(source ?? fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  new Function('require', 'exports', ...Object.keys(globals), code)(imports, exports, ...Object.values(globals));
  return exports;
}
function serviceModule(fetcher = async () => [], onAuth = () => {}) {
  const result = compile('src/services/ClientHistoryService.ts', name => name.endsWith('/AuthService')
    ? { authService: { subscribe: onAuth } } : { clientMeetingApi: { getByClientCode: fetcher } });
  const Service = result.ClientHistoryService;
  result.ClientHistoryService = class extends Service {
    constructor(fetchHistory) { super(fetchHistory, new result.ClientHistoryRequestQueue(2, 0, 0)); }
  };
  return result;
}
function harness() {
  const calls = [], api = code => { const call = { code, ...deferred() }; calls.push(call); return call.promise; };
  const module = serviceModule();
  const store = new module.ClientHistoryService(api); store.setAccount('RM:1');
  return { store, calls, module, async seed(code, rows) { const request = store.refresh(code); await flush(); calls.at(-1).resolve(rows); await request; } };
}
const meeting = extra => ({ meetingCode: 'M1', meetingDate: '2026-11-01', nextPlanDate: '2026-11-04', verificationStatus: 'PENDING', verifiedByPc: false, ...extra });

test('history distinguishes missing from successful empty and always revalidates completed data', async () => {
  const h = harness(); assert.equal(h.store.getSnapshot('C1').history, undefined);
  await h.seed('C1', []); assert.deepEqual(h.store.getSnapshot('C1').history, []);
  const next = h.store.refresh('C1'); await flush(); assert.equal(h.calls.length, 2);
  assert.deepEqual(h.store.getSnapshot('C1').history, []);
  h.calls[1].resolve([meeting()]); await next;
  assert.equal(h.store.getSnapshot('C1').stale, false);
});

test('identical concurrent background refreshes share one request; a manual read queues fresh data', async () => {
  const h = harness(); const a = h.store.refresh('C1'), b = h.store.refresh('C1');
  assert.strictEqual(a, b); await flush(); assert.equal(h.calls.length, 1);
  const manual = h.store.refresh('C1', true); assert.equal(h.calls.length, 1);
  h.calls[0].resolve([meeting()]); await a; await flush(); assert.equal(h.calls.length, 2);
  h.calls[1].resolve([meeting({ nextPlanDate: '2026-12-01' })]); await manual;
  assert.equal(h.store.getSnapshot('C1').history[0].nextPlanDate, '2026-12-01');
});

test('cached history is retained during refresh and failure; retry never treats failure as fresh', async () => {
  const h = harness(), old = [meeting()]; await h.seed('C1', old);
  const next = h.store.refresh('C1'); await flush();
  assert.strictEqual(h.store.getSnapshot('C1').history, old); assert.equal(h.store.getSnapshot('C1').loading, true);
  h.calls[1].reject(new Error('server failed')); await assert.rejects(next, /server failed/);
  assert.deepEqual(h.store.getSnapshot('C1'), { history: old, loading: false, stale: true, error: 'server failed' });
  const retry = h.store.refresh('C1'); await flush(); h.calls[2].resolve([]); await retry;
  assert.deepEqual(h.store.getSnapshot('C1'), { history: [], loading: false, stale: false, error: null });
});

test('PC verification and external remarks/dates update subscribers without navigation', async () => {
  const h = harness(); await h.seed('C1', [meeting()]); let visible = h.store.getSnapshot('C1');
  const unsubscribe = h.store.subscribe(() => { visible = h.store.getSnapshot('C1'); });
  assert.equal(h.module.hasPendingClientVerification(visible.history), true);
  const refresh = h.store.refresh('C1'); await flush();
  h.calls[1].resolve([meeting({ verificationStatus: 'VERIFIED', verifiedByPc: true, remarks: 'PC changed', nextPlanDate: '2026-12-02' })]); await refresh;
  assert.equal(h.module.hasPendingClientVerification(visible.history), false);
  assert.equal(visible.history[0].remarks, 'PC changed'); assert.equal(visible.history[0].nextPlanDate, '2026-12-02'); unsubscribe();
});

test('submission invalidates old reads, pauses polling and serializes the fresh post-write read', async () => {
  const h = harness(); await h.seed('C1', [meeting()]);
  const old = h.store.refresh('C1'); const oldResult = assert.rejects(old, /superseded/); await flush();
  const finish = h.store.beginMutation('C1');
  const background = h.store.refresh('C1'); const manual = h.store.refresh('C1', true);
  await flush(); assert.equal(h.calls.length, 2);
  h.calls[1].resolve([meeting({ remarks: 'outdated' })]); await oldResult;
  assert.notEqual(h.store.getSnapshot('C1').history[0].remarks, 'outdated');
  assert.equal(finish(), true); await flush();
  // Both pending readers share a post-write request if it has not started yet,
  // or the explicit fresh reader queues one further read; neither overlaps.
  const postWrite = h.calls[2]; assert.ok(postWrite); postWrite.resolve([meeting({ remarks: 'submitted' })]);
  await background; await flush();
  if (h.calls[3]) h.calls[3].resolve([meeting({ remarks: 'submitted' })]);
  await manual;
  assert.equal(h.store.getSnapshot('C1').history[0].remarks, 'submitted');
});

test('account switching clears cached history and rejects old responses and queued refreshes', async () => {
  const h = harness(); await h.seed('C1', [meeting()]);
  const old = h.store.refresh('C1'); const rejected = assert.rejects(old, /superseded/); await flush();
  const queued = h.store.refresh('C1', true); const queuedRejected = assert.rejects(queued, /account changed/);
  h.store.setAccount('SC:2'); assert.equal(h.store.getSnapshot('C1').history, undefined);
  const current = h.store.refresh('C1'); await flush();
  h.calls[2].resolve([meeting({ clientName: 'new account' })]); await current;
  h.calls[1].resolve([meeting({ clientName: 'old account' })]); await rejected; await queuedRejected;
  assert.equal(h.store.getSnapshot('C1').history[0].clientName, 'new account');
});

test('logout clears the same account cache and releases mutation waiters without new requests', async () => {
  const h = harness(); const finish = h.store.beginMutation('C1');
  const waiting = h.store.refresh('C1'); const rejected = assert.rejects(waiting, /account changed/);
  h.store.setAccount(null); await rejected; assert.equal(finish(), false); assert.equal(h.calls.length, 0);
  await assert.rejects(h.store.refresh('C1'), /account is unavailable/);
  h.store.setAccount('RM:1'); assert.equal(h.store.getSnapshot('C1').history, undefined);
});

test('auth binding enables only RM/SC and isolates IDs, roles, employee codes and logout', async () => {
  let notify; const module = serviceModule(async () => [meeting()], listener => { notify = listener; });
  const auth = (id, role = 'RELATIONSHIP_MANAGER', employeeId = 'RM1') => ({ isAuthenticated: true, user: { id, role, employeeId } });
  notify(auth(1)); await module.clientHistoryService.refresh('C1');
  notify(auth(2)); assert.equal(module.clientHistoryService.getSnapshot('C1').history, undefined);
  await module.clientHistoryService.refresh('C1'); notify(auth(2, 'SALES_COORDINATOR', 'SC2'));
  assert.equal(module.clientHistoryService.getSnapshot('C1').history, undefined);
  notify(auth(2, 'SALES_MANAGER')); await assert.rejects(module.clientHistoryService.refresh('C1'));
  notify({ isAuthenticated: false, user: null }); assert.equal(module.clientHistoryService.getSnapshot('C1').history, undefined);
});

// The exact original task mapper/filter modules are used for output equivalence.
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, filename);
const local = createRequire(path.join(root, 'src/modules/salesManager/tasks/clientTaskData.ts'));
const originalTaskSource = fs.readFileSync(path.join(__dirname, 'fixtures/clientTaskData.before.txt'), 'utf8');
function taskLoader(source, queue, fetcher, store) {
  return compile('src/modules/salesManager/tasks/clientTaskData.ts', name => {
    if (name.endsWith('/clientWorkFollow')) return { clientWorkFollowApi: { getQueue: async ({ page }) => queue[page] } };
    if (name.endsWith('/clientMeeting')) return { clientMeetingApi: { getByClientCode: fetcher } };
    if (name.endsWith('/ClientHistoryService')) return { clientHistoryService: store };
    return local(name);
  }, {}, source).loadClientTaskQueue;
}

test('duplicate exact codes across pages preserve every full task object, count, order and classification', async () => {
  const calls = [];
  const codes = ['C1', 'C2', 'C1', 'c1', ' C1', '', undefined];
  const clients = codes.map((clientCode, index) => ({ clientCode, clientId: index, clientName: `Person ${index}`, assignmentDate: '2026-11-01', activeMeetingDate: '2026-11-04', totalMeetings: index }));
  const queue = [ { content: clients.slice(0, 3), totalPages: 2 }, { content: clients.slice(3), totalPages: 2 } ];
  const rows = code => [meeting({ meetingNumber: 1, remarks: null }), meeting({ meetingCode: 'M2', meetingNumber: 2, meetingDate: '2026-11-02', remarks: code, nextPlanDate: '2026-11-06' }), meeting({ meetingCode: 'equal date', meetingDate: '2026-11-02', remarks: 'tie' })];
  const module = serviceModule(); const store = new module.ClientHistoryService(async code => { calls.push(code); return rows(code); }); store.setAccount('RM:1');
  const original = await taskLoader(originalTaskSource, queue, async code => rows(code))();
  const optimized = await taskLoader(undefined, queue, null, store)();
  assert.deepEqual(calls, ['C1', 'C2', 'c1', ' C1']); assert.deepEqual(optimized, original);
  const { filterSalesTasks, getTaskFilterCounts } = local('./taskFilters');
  for (const search of ['', 'person', 'Person 6']) for (const taskType of ['All Tasks', 'Today', 'Pending', 'Future 3 Days']) {
    assert.deepEqual(getTaskFilterCounts(optimized, search, taskType), getTaskFilterCounts(original, search, taskType));
    for (const mode of ['allTaskMode', 'taskToDoMode', 'todaysTaskMode', 'pendingTaskMode', 'future3DaysTaskMode']) {
      const options = { tasks: original, allLeadTasks: [], search, taskType, taskStage: 'Clients', leadFilter: 'All Prospects', meetingFilter: 'All Meetings', allTaskFilter: 'All Task', futureDayFilter: 'Tomorrow', [mode]: true };
      assert.deepEqual(filterSalesTasks({ ...options, tasks: optimized }), filterSalesTasks(options));
    }
  }
  calls.length = 0; assert.deepEqual(await taskLoader(undefined, queue, null, store)(), original);
  assert.deepEqual(calls, ['C1', 'C2', 'c1', ' C1']);
});

test('task history failure is not converted to an empty success; next load retries', async () => {
  let fail = true, requests = 0; const module = serviceModule();
  const store = new module.ClientHistoryService(async () => { requests++; if (fail) throw new Error('history failed'); return []; }); store.setAccount('SC:1');
  const queue = [{ content: [{ clientCode: 'C1' }, { clientCode: 'C1' }], totalPages: 1 }];
  const load = taskLoader(undefined, queue, null, store);
  await assert.rejects(load(), /history failed/); assert.equal(requests, 1);
  fail = false; assert.equal((await load()).length, 2); assert.equal(requests, 2);
});


function hookHarness(h, code = 'C1') {
  const timers = new Map(), appListeners = new Set(), documentListeners = new Map(), windowListeners = new Map();
  const states = [], cleanup = []; let timerId = 0;
  const AppState = { currentState: 'active', addEventListener: (_, callback) => { appListeners.add(callback); return { remove: () => appListeners.delete(callback) }; } };
  const document = { visibilityState: 'visible', addEventListener: (name, callback) => documentListeners.set(name, callback), removeEventListener: name => documentListeners.delete(name) };
  const window = { addEventListener: (name, callback) => windowListeners.set(name, callback), removeEventListener: name => windowListeners.delete(name) };
  const navigator = { onLine: true };
  const hook = compile('src/modules/salesManager/tasks/hooks/useClientHistory.ts', name => {
    if (name === 'react') return { useState: initial => { const value = initial(); states.push(value); return [value, next => states.push(next)]; }, useEffect: effect => { const dispose = effect(); if (dispose) cleanup.push(dispose); } };
    if (name === 'react-native') return { AppState };
    return { clientHistoryService: h.store };
  }, { document, window, navigator, setInterval: (callback, ms) => { assert.equal(ms, 30_000); timers.set(++timerId, callback); return timerId; }, clearInterval: id => timers.delete(id) }).useClientHistory;
  const initial = hook(code);
  return { initial, states, timers, AppState, document, navigator, appListeners, documentListeners, windowListeners,
    tick: () => [...timers.values()].forEach(callback => callback()),
    foreground: () => { AppState.currentState = 'active'; appListeners.forEach(callback => callback('active')); },
    dispose: () => cleanup.forEach(callback => callback()),
  };
}

test('Details hook displays cached history immediately, polls every 30s and cleans up on leave', async () => {
  const h = harness(), cached = [meeting()]; await h.seed('C1', cached);
  const hook = hookHarness(h); assert.strictEqual(hook.initial.history, cached); assert.equal(hook.timers.size, 1);
  await flush(); assert.equal(h.calls.length, 2);
  hook.tick(); hook.tick(); await flush(); assert.equal(h.calls.length, 2, 'no overlapping requests');
  h.calls[1].resolve([meeting({ verifiedByPc: true, verificationStatus: 'VERIFIED', nextPlanDate: '2026-12-03' })]); await flush();
  assert.equal(hook.states.at(-1).history[0].nextPlanDate, '2026-12-03');
  hook.tick(); await flush(); assert.equal(h.calls.length, 3);
  const stateCount = hook.states.length; hook.dispose();
  assert.equal(hook.timers.size, 0); assert.equal(hook.appListeners.size, 0);
  assert.equal(hook.documentListeners.size, 0); assert.equal(hook.windowListeners.size, 0);
  h.calls[2].resolve([]); await flush(); assert.equal(hook.states.length, stateCount);
});

test('Details hook skips inactive/hidden/offline reads and revalidates immediately on foreground/reconnect', async () => {
  const h = harness(), hook = hookHarness(h); await flush(); h.calls[0].resolve([]); await flush();
  hook.AppState.currentState = 'background'; hook.tick(); await flush(); assert.equal(h.calls.length, 1);
  hook.foreground(); await flush(); assert.equal(h.calls.length, 2); h.calls[1].resolve([]); await flush();
  hook.document.visibilityState = 'hidden'; hook.tick(); await flush(); assert.equal(h.calls.length, 2);
  hook.document.visibilityState = 'visible'; hook.documentListeners.get('visibilitychange')(); await flush();
  assert.equal(h.calls.length, 3); h.calls[2].resolve([]); await flush();
  hook.navigator.onLine = false; hook.tick(); await flush(); assert.equal(h.calls.length, 3);
  hook.navigator.onLine = true; hook.windowListeners.get('online')(); await flush(); assert.equal(h.calls.length, 4);
  h.calls[3].reject(new Error('Network unavailable.')); await flush(); hook.tick(); await flush();
  assert.equal(h.calls.length, 5, 'unknown connectivity must retry rather than freeze freshness');
  h.calls[4].resolve([]); await flush(); hook.foreground(); await flush();
  assert.equal(h.calls.length, 6); h.calls[5].resolve([]); await flush(); hook.dispose();
});

test('SM prospect hook never subscribes, polls or fetches client history; prospect effects remain unchanged', async () => {
  const h = harness();
  const noClient = hookHarness(h, null); assert.equal(noClient.timers.size, 0); assert.equal(noClient.appListeners.size, 0);
  const before = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/prospectDetails.before.json'), 'utf8'));
  const after = fs.readFileSync(path.join(root, 'src/modules/salesManager/tasks/SalesManagerLeadDetailScreen.tsx'), 'utf8');
  const historyBlock = source => { const text = source.replace(/\r\n/g, '\n'); return text.slice(text.indexOf('    const leadIdentifier ='), text.indexOf('  }, [isClient, lead.clientCode, lead.leadId, lead.uniqueLeadId]);')); };
  const verificationBlock = source => { const text = source.replace(/\r\n/g, '\n'); return text.slice(text.indexOf('  useEffect(() => {\n    if (isClient) {\n      setVerifiedMeeting'), text.indexOf('  }, [isClient, lead.leadCode, lead.leadId, lead.meetingCode]);')); };
  assert.equal(historyBlock(after).replace(/\r\n/g, '\n'), before.history); assert.ok(historyBlock(after).length > 500);
  assert.equal(verificationBlock(after).replace(/\r\n/g, '\n'), before.verification); assert.ok(verificationBlock(after).length > 500);
  noClient.dispose();
});

test('Details verification and App form guard consume the same current client history', async () => {
  const h = harness(); await h.seed('C1', [meeting()]);
  const details = fs.readFileSync(path.join(root, 'src/modules/salesManager/tasks/SalesManagerLeadDetailScreen.tsx'), 'utf8');
  const expression = details.slice(details.indexOf('  const isVerificationPending ='), details.indexOf(';', details.indexOf('  const isVerificationPending =')) + 1);
  const buttonPending = new Function('lead', 'clientHistory', 'isClient', 'hasPendingClientVerification', `${expression}; return isVerificationPending;`);
  const app = fs.readFileSync(path.join(root, 'App.tsx'), 'utf8');
  const start = app.indexOf("    if (task.taskKind === 'CLIENT') {");
  const end = app.indexOf('    if (task.verificationPending)', start + 1);
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  const guardBody = ts.transpileModule(app.slice(start, end), { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  const guard = new AsyncFunction('task', 'clientHistoryService', 'hasPendingClientVerification', 'setMessage', 'setClientMeetingTask', guardBody);
  const task = { taskKind: 'CLIENT', clientCode: 'C1', verificationPending: false };
  const evaluate = async () => {
    let opened = null, message = null;
    const pending = buttonPending(task, h.store.getSnapshot('C1'), true, h.module.hasPendingClientVerification);
    await guard(task, { captureScope: () => h.store.captureScope(), isCurrentScope: scope => h.store.isCurrentScope(scope), refresh: async code => h.store.getSnapshot(code).history }, h.module.hasPendingClientVerification, value => { message = value; }, value => { opened = value; });
    assert.equal(opened === null, pending); return { pending, opened, message };
  };
  assert.equal((await evaluate()).pending, true);
  const refresh = h.store.refresh('C1'); await flush(); h.calls[1].resolve([meeting({ verificationStatus: 'VERIFIED', verifiedByPc: true })]); await refresh;
  task.verificationPending = true; assert.equal((await evaluate()).pending, false); assert.equal((await evaluate()).opened.verificationPending, false);
  const external = h.store.refresh('C1'); await flush(); h.calls[2].resolve([meeting({ verificationStatus: 'VERIFIED', verifiedByPc: false })]); await external;
  assert.equal((await evaluate()).pending, true, 'client OR rule remains unchanged');
});


test('account change while client queue loads cannot start histories in the new account', async () => {
  const h = harness(), queue = deferred();
  const load = taskLoader(undefined, [queue.promise], null, h.store);
  const pending = load(); const rejected = assert.rejects(pending, /account changed/);
  h.store.setAccount('SC:2');
  queue.resolve({ content: [{ clientCode: 'OLD-CLIENT' }], totalPages: 1 });
  await rejected; assert.equal(h.calls.length, 0);
  assert.equal(h.store.getSnapshot('OLD-CLIENT').history, undefined);
});


test('history request queue bounds concurrent unique requests and preserves output', async () => {
  const { ClientHistoryRequestQueue } = serviceModule();
  const queue = new ClientHistoryRequestQueue(2, 0, 0);
  let active = 0, peak = 0;
  const results = await Promise.all(Array.from({ length: 12 }, (_, id) => queue.run(async () => {
    peak = Math.max(peak, ++active); await flush(); active--; return id;
  })));
  assert.equal(peak, 2);
  assert.deepEqual(results, Array.from({ length: 12 }, (_, id) => id));
});

test('history queue retries 429 only, bounds retries and releases failed slots', async () => {
  const { ClientHistoryRequestQueue } = serviceModule();
  const queue = new ClientHistoryRequestQueue(1, 0, 0);
  let attempts = 0;
  assert.equal(await queue.run(async () => {
    if (++attempts < 3) throw Object.assign(new Error('limited'), { status: 429 });
    return 'fresh';
  }), 'fresh');
  assert.equal(attempts, 3);
  attempts = 0;
  await assert.rejects(queue.run(async () => { attempts++; throw Object.assign(new Error('limited'), { status: 429 }); }), /limited/);
  assert.equal(attempts, 4);
  attempts = 0;
  await assert.rejects(queue.run(async () => { attempts++; throw new Error('denied'); }), /denied/);
  assert.equal(attempts, 1);
  assert.equal(await queue.run(async () => 'retry works'), 'retry works');
});


test('history queue spaces starts and honors server Retry-After cooldown', async () => {
  const { ClientHistoryRequestQueue } = serviceModule();
  const queue = new ClientHistoryRequestQueue(1, 25, 0);
  const starts = [];
  let attempt = 0;
  await queue.run(async () => {
    starts.push(Date.now());
    if (++attempt === 1) throw Object.assign(new Error('limited'), { status: 429, retryAfterMs: 50 });
    return [];
  });
  await queue.run(async () => { starts.push(Date.now()); return []; });
  assert.ok(starts[1] - starts[0] >= 50);
  assert.ok(starts[2] - starts[1] >= 25);
});
