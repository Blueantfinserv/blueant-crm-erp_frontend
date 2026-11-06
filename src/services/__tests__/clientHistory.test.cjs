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
  return compile('src/services/ClientHistoryService.ts', name => name.endsWith('/clientMeetingChanges') ? { subscribeClientMeetingChanges: () => () => {} } : name.endsWith('/AuthService')
    ? { authService: { subscribe: onAuth } } : { clientMeetingApi: { getByClientCode: fetcher } });
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
function taskLoader(source, queue, fetcher, store) {
  return compile('src/modules/salesManager/tasks/clientTaskData.ts', name => {
    if (name.endsWith('/clientWorkFollow')) return { clientWorkFollowApi: { getQueue: async ({ page }) => queue[page] } };
    if (name.endsWith('/clientMeeting')) return { clientMeetingApi: { getByClientCode: fetcher } };
    if (name.endsWith('/ClientHistoryService')) return { clientHistoryService: store };
    return local(name);
  }, {}, source).loadClientTaskQueue;
}

test('progressive queue publishes basic clients, deduplicates identities and enriches histories independently', async () => {
  const calls = [];
  const codes = ['C1', 'C2', 'C1', 'c1', ' C1', '', undefined];
  const clients = codes.map((clientCode, index) => ({ clientCode, clientId: index, clientName: `Person ${index}`, assignmentDate: '2026-11-01', activeMeetingDate: '2026-11-04', totalMeetings: index }));
  const queue = [ { content: clients.slice(0, 3), totalPages: 2 }, { content: clients.slice(3), totalPages: 2 } ];
  const rows = code => [meeting({ meetingNumber: 1, remarks: null }), meeting({ meetingCode: 'M2', meetingNumber: 2, meetingDate: '2026-11-02', remarks: code, nextPlanDate: '2026-11-06' }), meeting({ meetingCode: 'equal date', meetingDate: '2026-11-02', remarks: 'tie' })];
  const module = serviceModule(); const store = new module.ClientHistoryService(async code => { calls.push(code); return rows(code); }); store.setAccount('RM:1');
  const load = taskLoader(undefined, queue, null, store);
  const collect = async () => {
    const updates = new Map(), complete = deferred();
    const result = await load({
      onTaskUpdate: task => updates.set(task.id, task),
      onProgress: progress => { if (progress.queueComplete && progress.historyPending === 0) complete.resolve(); },
    });
    await complete.promise;
    return result.map(task => updates.get(task.id) ?? task);
  };
  const optimized = await collect();
  assert.deepEqual(calls, ['C1', 'C2', 'c1']);
  assert.equal(optimized.length, 5);
  assert.deepEqual(optimized.map(task => task.name), ['Person 0', 'Person 1', 'Person 3', 'Person 5', 'Person 6']);
  assert.equal(optimized[0].remarks, 'C1');
  const { filterSalesTasks, getTaskFilterCounts } = local('./taskFilters');
  const options = { tasks: optimized, allLeadTasks: [], allTaskMode: true, allTaskFilter: 'All Task', search: 'Person 6' };
  assert.deepEqual(filterSalesTasks(options).map(task => task.name), ['Person 6']);
  assert.deepEqual(getTaskFilterCounts(optimized, 'Person 6', 'All Tasks'), {
    todayLeads: 0, activeLeads: 0, removedLeads: 0, meetings: 0, meetingsByTitle: {},
  });
});

test('history failure leaves basic cards available and a later load retries', async () => {
  let fail = true, requests = 0; const module = serviceModule();
  const store = new module.ClientHistoryService(async () => { requests++; if (fail) throw new Error('history failed'); return []; }); store.setAccount('SC:1');
  const queue = [{ content: [{ clientCode: 'C1' }], totalPages: 1 }];
  const load = taskLoader(undefined, queue, null, store);
  const firstProgress = deferred();
  const first = await load({ onProgress: progress => {
    if (progress.queueComplete && progress.historyPending === 0) firstProgress.resolve(progress);
  } });
  const firstFinalProgress = await firstProgress.promise;
  assert.equal(first.length, 1); assert.equal(requests, 1);
  assert.equal(firstFinalProgress.historyFailed, 1);
  fail = false;
  const retryProgress = deferred();
  const retried = await load({ onProgress: progress => {
    if (progress.queueComplete && progress.historyPending === 0) retryProgress.resolve(progress);
  } });
  const retryFinalProgress = await retryProgress.promise;
  assert.equal(retried.length, 1); assert.equal(requests, 2);
  assert.equal(retryFinalProgress.historyCompleted, 1);
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


test('bounded batches fetch each exact code once and cap all network histories at six', async () => {
  const { ClientHistoryService } = serviceModule();
  let active = 0, peak = 0; const calls = [];
  const store = new ClientHistoryService(async code => {
    calls.push(code); peak = Math.max(peak, ++active); await flush(); active--; return [meeting({ remarks: code })];
  }); store.setAccount('RM:1');
  const codes = [...Array.from({ length: 100 }, (_, i) => `C${i}`), 'C1', 'C1', 'c1', ' C1', ''];
  const cycle = store.createReadCycle();
  const [a,b] = await Promise.all([store.loadMany(codes, cycle), store.loadMany(codes, cycle)]);
  assert.equal(peak, 6); assert.equal(calls.length, 102); assert.equal(new Set(calls).size, 102);
  assert.deepEqual(a,b);
  await store.loadMany(codes, cycle); assert.equal(calls.length, 102, 'same cycle reuses completed results');
  await store.loadMany(['C1'], store.createReadCycle()); assert.equal(calls.length, 103, 'new navigation reads fresh');
});

test('new navigation waits for old same-client read and does not use its stale result', async () => {
  const h = harness();
  const oldCycle = h.store.createReadCycle(); const old = h.store.refreshForCycle('C1', oldCycle); await flush();
  const newer = h.store.refreshForCycle('C1', h.store.createReadCycle()); await flush(); assert.equal(h.calls.length,1);
  h.calls[0].resolve([meeting({ nextPlanDate:'2026-11-01' })]); await old; await flush(); assert.equal(h.calls.length,2);
  h.calls[1].resolve([meeting({ nextPlanDate:'2026-12-01' })]);
  assert.equal((await newer)[0].nextPlanDate,'2026-12-01');
});

test('obsolete batches do not start remaining history calls', async () => {
  const h = harness(); let current = true;
  const load = h.store.loadMany(Array.from({length:100},(_,i)=>`C${i}`),h.store.createReadCycle(),()=>current);
  const rejected=assert.rejects(load,/cancelled|superseded/); await flush(); assert.equal(h.calls.length,6);
  current=false; h.calls.forEach(call=>call.resolve([])); await rejected; await flush(); assert.equal(h.calls.length,6);
});

test('queued obsolete clients are skipped but an active Details consumer keeps its shared request', async () => {
  const {ClientHistoryService}=serviceModule(); const calls=[];
  const store=new ClientHistoryService(code=>{const d=deferred();calls.push({code,...d});return d.promise;},{concurrency:1});store.setAccount('RM');
  const first=store.refresh('block'); await flush(); let current=true;
  const cycle=store.createReadCycle(); const queued=store.refreshForCycle('C1',cycle,()=>current);
  const shared=store.refreshForCycle('C1',cycle); current=false;
  calls[0].resolve([]);await first;await flush();assert.equal(calls[1].code,'C1');calls[1].resolve([meeting()]);
  assert.deepEqual(await queued,await shared);
  let live=true; const block=store.refresh('block');await flush();
  const discarded=store.refreshForCycle('discard',store.createReadCycle(),()=>live); const rejected=assert.rejects(discarded,/superseded/);
  live=false;calls.at(-1).resolve([]);await block;await rejected;assert.equal(calls.some(c=>c.code==='discard'),false);
});

test('account switching drops queued histories and does not publish old history', async () => {
  const {ClientHistoryService}=serviceModule();const calls=[];
  const store=new ClientHistoryService(code=>{const d=deferred();calls.push({code,...d});return d.promise;},{concurrency:1});store.setAccount('RM1');
  const first=store.refresh('C1');const firstRejected=assert.rejects(first,/superseded/);await flush();
  const queued=store.refresh('C2');const queuedRejected=assert.rejects(queued,/superseded/);
  store.setAccount('SC2');const fresh=store.refresh('C3');calls[0].resolve([]);await firstRejected;await queuedRejected;await flush();
  assert.deepEqual(calls.map(c=>c.code),['C1','C3']);calls[1].resolve([]);await fresh;
  assert.equal(store.getSnapshot('C1').history,undefined);
});

test('post-write cycle shares selected history and list reload but cannot be reused on later navigation', async () => {
  const h=harness();const old=h.store.refresh('C1');const oldRejected=assert.rejects(old,/superseded/);await flush();
  const finish=h.store.beginMutation('C1');assert.equal(finish(),true);
  const cycle=h.store.createReadCycle();const selected=h.store.refreshForCycle('C1',cycle);
  const claimed=h.store.claimReadCycle(cycle);assert.strictEqual(claimed,cycle);
  const list=h.store.loadMany(['C1','C1'],claimed);
  h.calls[0].resolve([meeting()]);await oldRejected;await flush();assert.equal(h.calls.length,2);
  h.calls[1].resolve([meeting({verificationStatus:'VERIFIED',verifiedByPc:true})]);await selected;await list;
  assert.equal(h.calls.length,2);
  const later=h.store.claimReadCycle(cycle);assert.notStrictEqual(later,cycle);
  const reread=h.store.loadMany(['C1'],later);await flush();assert.equal(h.calls.length,3);h.calls[2].resolve([]);await reread;
});

test('429 Retry-After is honored; retries are bounded and permanent errors do not retry', async () => {
  const {ClientHistoryService}=serviceModule();let calls=0;const times=[];
  const store=new ClientHistoryService(async()=>{times.push(Date.now());if(++calls===1)throw Object.assign(new Error('limited'),{status:429,retryAfterMs:30});return[];},{retryBaseMs:0});store.setAccount('RM');
  await store.refresh('C1');assert.equal(calls,2);assert.ok(times[1]-times[0]>=30);
  let failures=0;const denied=new ClientHistoryService(async()=>{failures++;throw Object.assign(new Error('denied'),{status:403});},{retryBaseMs:0});denied.setAccount('RM');
  await assert.rejects(denied.refresh('C1'),/denied/);assert.equal(failures,1);
  let limited=0;const failing=new ClientHistoryService(async()=>{limited++;throw Object.assign(new Error('limited'),{status:429});},{retryBaseMs:0});failing.setAccount('RM');
  await assert.rejects(failing.refresh('C1'),/limited/);assert.equal(limited,3);assert.equal(failing.getSnapshot('C1').history,undefined);
});

test('temporary network failures retry without discarding cached history', async () => {
  const {ClientHistoryService}=serviceModule();let failing=false,calls=0;
  const store=new ClientHistoryService(async()=>{calls++;if(failing)throw Object.assign(new Error('network'),{transientNetwork:true});return[meeting()];},{retryBaseMs:0});store.setAccount('RM');
  await store.refresh('C1');const history=store.getSnapshot('C1').history;failing=true;
  await assert.rejects(store.refresh('C1'),/network/);assert.equal(calls,4);assert.strictEqual(store.getSnapshot('C1').history,history);assert.equal(store.getSnapshot('C1').stale,true);
});

test('Details lifecycle events coalesce and disposed scheduled refreshes never start', async () => {
  const h=harness(),hook=hookHarness(h);hook.foreground();hook.documentListeners.get('visibilitychange')();hook.windowListeners.get('online')();
  await flush();assert.equal(h.calls.length,1);h.calls[0].resolve([]);await flush();hook.dispose();
  const second=hookHarness(h);second.dispose();await flush();assert.equal(h.calls.length,1);
});

test('older pending history still blocks when the latest record is verified', () => {
  const {hasPendingClientVerification}=serviceModule();
  assert.equal(hasPendingClientVerification([meeting({meetingNumber:1}),meeting({meetingNumber:2,verificationStatus:'VERIFIED',verifiedByPc:true})]),true);
  assert.equal(hasPendingClientVerification([]),false);
  assert.equal(hasPendingClientVerification([{verificationStatus:null,verifiedByPc:null}]),false);
});

test('All Clients task mapping remains exactly equal including date ties, fallbacks and duplicate records', () => {
  const original=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/clientWorkFollowMapping.before.json'),'utf8')).mapping;
  const file=fs.readFileSync(path.join(root,'src/screens/ClientWorkFollowScreen.tsx'),'utf8');
  const candidate=file.slice(file.indexOf('const formatDate ='),file.indexOf('export function ClientWorkFollowScreen'));
  // Supply the actual unchanged schedule function to both implementations.
  const mapper=source=>compile('mapping.ts',()=>local('./taskMeetingSelectors'),{latestClientMeeting:local('../../../utils/clientHistorySelectors').latestClientMeeting},`import { getTaskSchedule } from './taskMeetingSelectors'; ${source}; export {toClientTask};`).toClientTask;
  const a=mapper(original),b=mapper(candidate);
  const histories=[[],[meeting()],[meeting({remarks:'',nextPlanDate:null}),meeting({meetingCode:'tie',remarks:'second'})],[meeting({meetingDate:null,verifiedByPc:null,verificationStatus:null})]];
  for(const code of ['C1',' C1','',undefined])for(const history of histories)for(const active of [undefined,'2026-11-06','']) {
    const client={clientCode:code,clientName:'Test',assignmentDate:'2026-11-01',activeMeetingDate:active,activeMeetingCode:'ACTIVE',totalMeetings:history.length};
    assert.deepEqual(b(client,history,0),a(client,history,0));
  }
});


test('configured concurrency applies across batch loading and individual Details reads', async () => {
  const {ClientHistoryService}=serviceModule();let active=0,peak=0;
  const store=new ClientHistoryService(async()=>{peak=Math.max(peak,++active);await flush();active--;return[];},{concurrency:2});store.setAccount('SC');
  await Promise.all([store.loadMany(Array.from({length:20},(_,i)=>`C${i}`),store.createReadCycle()),store.refresh('DETAILS')]);
  assert.equal(peak,2);
});

test('client history API exposes retry metadata without changing endpoint, response or error messages', async () => {
  let mode='429';const paths=[];
  const api=compile('src/api/clientMeeting.ts',name=>name.includes('clientMeetingChanges') ? {publishClientMeetingChange:()=>{}} : name.includes('SecureStorageService')
    ? {SecureStorageService:{getToken:async()=> 'synthetic-token'}}
    : {requestWithSessionRefresh:async(token,request)=>request(token)},
    {fetch:async url=>{paths.push(url);if(mode==='network')throw new Error('transport');return{
      ok:mode==='ok',status:mode==='ok'?200:429,
      headers:{get:()=> '2'},json:async()=>mode==='ok'?{success:true,data:[]}:{success:false,message:'rate limited'}
    };}}).clientMeetingApi;
  await assert.rejects(api.getByClientCode('C 1'),error=>error.message==='rate limited'&&error.status===429&&error.retryAfterMs===2000);
  mode='network';await assert.rejects(api.getByClientCode('C 1'),error=>error.transientNetwork===true&&error.message==='Network unavailable. Please check your internet connection.');
  mode='ok';assert.deepEqual(await api.getByClientCode('C 1'),[]);
  assert.ok(paths.every(value=>value.endsWith('/v1/client-meetings/client/C%201')));
});


test('client queue pages use bounded workers and preserve complete page ordering', async () => {
  const h=harness();let active=0,peak=0;
  const pages=new Proxy({}, {get:(_,key)=>{
    const page=Number(key);if(!Number.isInteger(page))return undefined;
    if(page===0)return{content:[{clientId:0,clientName:'page0'}],totalPages:20};
    peak=Math.max(peak,++active);
    return flush().then(()=>{active--;return{content:[{clientId:page,clientName:`page${page}`}],totalPages:20};});
  }});
  const rows=await taskLoader(undefined,pages,null,h.store)();
  assert.equal(peak,6);assert.equal(rows.length,20);
  assert.deepEqual(rows.map(row=>row.name),Array.from({length:20},(_,i)=>`page${i}`));
  assert.equal(h.calls.length,0);
});


test('50-request authorized configuration respects the cap and deduplicates 800 client codes', async () => {
  const {ClientHistoryService,clientHistoryService}=serviceModule();
  assert.equal(clientHistoryService.concurrency,50);
  let active=0,peak=0,calls=0;
  const store=new ClientHistoryService(async()=>{calls++;peak=Math.max(peak,++active);await flush();active--;return[];},{concurrency:50});store.setAccount('RM');
  const codes=Array.from({length:800},(_,i)=>`C${i}`);
  const result=await store.loadMany([...codes,...codes],store.createReadCycle());
  assert.equal(peak,50);assert.equal(calls,800);assert.equal(result.size,800);
});


test('canonical client meeting ordering prioritizes sequence, date ties and stable input without mutation', () => {
  const {sortedClientHistory, latestClientMeeting}=local('../../../utils/clientHistorySelectors');
  const rows=[meeting({meetingCode:'old-number',meetingNumber:1,meetingDate:'2027-01-01'}),meeting({meetingCode:'highest',meetingNumber:9,meetingDate:'2026-01-01'}),meeting({meetingCode:'tie',meetingNumber:9,meetingDate:'2026-01-01'}),meeting({meetingCode:'missing',meetingNumber:undefined,meetingDate:'2029-01-01'})];
  const before=structuredClone(rows);
  assert.deepEqual(sortedClientHistory(rows).map(m=>m.meetingCode),['highest','tie','old-number','missing']);
  assert.equal(latestClientMeeting(rows).meetingCode,'highest');assert.deepEqual(rows,before);
  assert.equal(latestClientMeeting([]),undefined);
  assert.equal(latestClientMeeting([meeting({meetingNumber:NaN}),meeting({meetingNumber:2})]).meetingNumber,2);
});

test('targeted verification invalidation refreshes only loaded client and publishes fresh dependent state', async () => {
  const h=harness();await h.seed('C1',[meeting()]);await h.seed('C2',[]);
  const updates=[];h.store.subscribeInvalidatedHistory((code,history)=>updates.push({code,history}));
  h.store.invalidateAndRefresh('UNKNOWN');await flush();assert.equal(h.calls.length,2);
  h.store.invalidateAndRefresh('C1');assert.equal(h.store.getSnapshot('C1').stale,true);
  await flush();assert.equal(h.calls.length,3);assert.equal(h.calls[2].code,'C1');
  const verified=[meeting({verificationStatus:'VERIFIED',verifiedByPc:true})];h.calls[2].resolve(verified);await flush();
  assert.deepEqual(updates,[{code:'C1',history:verified}]);assert.equal(h.store.getSnapshot('C2').stale,false);
});

test('verification invalidation cannot publish an older read or cross an account switch', async () => {
  const h=harness();await h.seed('C1',[meeting()]);const updates=[];h.store.subscribeInvalidatedHistory((...x)=>updates.push(x));
  const old=h.store.refresh('C1');await flush();h.store.invalidateAndRefresh('C1');
  h.calls[1].resolve([meeting({remarks:'obsolete'})]);await assert.rejects(old,/superseded/);await flush();
  assert.equal(updates.length,0);assert.equal(h.calls.length,3);
  h.store.setAccount('SC:2');h.calls[2].resolve([]);await flush();assert.equal(updates.length,0);assert.equal(h.store.getSnapshot('C1').history,undefined);
});

test('failed invalidation retains old history as stale and never emits a successful replacement',async()=>{
 const h=harness();const rows=[meeting()];await h.seed('C1',rows);let updates=0;h.store.subscribeInvalidatedHistory(()=>updates++);
 h.store.invalidateAndRefresh('C1');await flush();h.calls[1].reject(new Error('denied'));await flush();
 assert.equal(updates,0);assert.strictEqual(h.store.getSnapshot('C1').history,rows);assert.equal(h.store.getSnapshot('C1').stale,true);
});

test('bounded jitter retries transient gateway failures but never permanent errors',async()=>{
 const {ClientHistoryService}=serviceModule();let calls=0;const started=[];
 const store=new ClientHistoryService(async()=>{started.push(Date.now());if(++calls<3)throw Object.assign(new Error('temporary'),{status:503});return[];},{retryBaseMs:8,random:()=>1});store.setAccount('RM');
 await store.refresh('C1');assert.equal(calls,3);assert.ok(started[1]-started[0]>=8);assert.ok(started[2]-started[1]>=16);
 for(const status of [400,401,403,404,422,500]){let n=0;const denied=new ClientHistoryService(async()=>{n++;throw Object.assign(new Error('permanent'),{status});},{retryBaseMs:0});denied.setAccount('SC');await assert.rejects(denied.refresh('C1'));assert.equal(n,1);}
});

test('successful API verify/update publish targeted invalidation; failed writes do not',async()=>{
 const changes=[];let ok=true;
 const api=compile('src/api/clientMeeting.ts',name=>name.includes('clientMeetingChanges')?{publishClientMeetingChange:code=>changes.push(code)}:name.includes('SecureStorageService')?{SecureStorageService:{getToken:async()=>'test'}}:{requestWithSessionRefresh:async(token,request)=>request(token)},
 {fetch:async url=>({ok,status:ok?200:403,json:async()=>({success:ok,data:url.endsWith('/M1')?{meetingCode:'M1',clientCode:'C1'}:{meetingCode:'M1'},message:'denied'})})}).clientMeetingApi;
 await api.getMeeting('M1');await api.verify('M1',{});await api.update('C2',{});assert.deepEqual(changes,['C1','C2']);
 ok=false;await assert.rejects(api.verify('M1',{}));await assert.rejects(api.update('C2',{}));assert.deepEqual(changes,['C1','C2']);
});


test('sequence-based latest mapping preserves active scheduled code and complete-history pending guard',()=>{
 const h=harness();
 const module=compile('src/modules/salesManager/tasks/clientTaskData.ts',name=>name.endsWith('/clientWorkFollow')?{clientWorkFollowApi:{}}:name.endsWith('/ClientHistoryService')?{clientHistoryService:h.store}:local(name));
 const client={clientCode:'C1',clientName:'Test',activeMeetingCode:'SCHEDULED',activeMeetingDate:'2026-12-01',assignmentDate:'2026-01-01',totalMeetings:3};
 const rows=[meeting({meetingCode:'PENDING-OLD',meetingNumber:1,meetingDate:'2027-01-01'}),meeting({meetingCode:'LATEST',meetingNumber:3,meetingDate:'2026-01-01',remarks:'latest sequence',nextPlanDate:'2026-11-10',verificationStatus:'VERIFIED',verifiedByPc:true})];
 const task=module.mapClientTaskWithHistory(client,0,rows);
 assert.equal(task.id,'C1');assert.equal(task.meetingCode,'SCHEDULED');assert.equal(task.meetingNumber,3);assert.equal(task.remarks,'latest sequence');assert.equal(task.nextPlanDate,'2026-11-10');assert.equal(task.verificationPending,true);assert.equal(task.historyLoadState,undefined);
});


test('exhausted 429 still delays queued clients according to Retry-After',async()=>{
 const {ClientHistoryService}=serviceModule();const started=[];
 const store=new ClientHistoryService(async code=>{started.push({code,time:Date.now()});if(code==='limited')throw Object.assign(new Error('limited'),{status:429,retryAfterMs:30});return[];},{concurrency:1,retries:0,retryBaseMs:0});store.setAccount('RM');
 const first=store.refresh('limited');const second=store.refresh('next');await assert.rejects(first,/limited/);await second;
 assert.equal(started.length,2);assert.ok(started[1].time-started[0].time>=29);
});
