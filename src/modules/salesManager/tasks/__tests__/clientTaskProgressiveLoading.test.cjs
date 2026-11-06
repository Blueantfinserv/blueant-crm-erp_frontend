const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const ts = require('typescript');

const root = path.resolve(__dirname, '../../../../..');
const local = createRequire(path.join(root, 'src/modules/salesManager/tasks/clientTaskData.ts'));
const flush = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, filename);

function historyStore(fetchHistory, options = {}) {
  const filename = path.join(root, 'src/services/ClientHistoryService.ts');
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const exports = {};
  new Function('require', 'exports', code)(name => name.endsWith('/clientMeetingChanges') ? { subscribeClientMeetingChanges: () => () => {} } : name.endsWith('/AuthService')
    ? { authService: { subscribe: () => undefined } }
    : { clientMeetingApi: { getByClientCode: fetchHistory } }, exports);
  const store = new exports.ClientHistoryService(fetchHistory, options);
  store.setAccount('RM:1:AP2605');
  return store;
}

function taskLoader(queueApi, store) {
  const filename = path.join(root, 'src/modules/salesManager/tasks/clientTaskData.ts');
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const exports = {};
  new Function('require', 'exports', code)(name => {
    if (name.endsWith('/clientWorkFollow')) return { clientWorkFollowApi: { getQueue: queueApi } };
    if (name.endsWith('/ClientHistoryService')) return { clientHistoryService: store };
    return local(name);
  }, exports);
  return exports.loadClientTaskQueue;
}

const client = (clientCode, clientId) => ({
  clientCode, clientId, clientName: `Client ${clientCode}`, assignmentDate: '2026-11-01',
  activeMeetingDate: '2026-11-05', totalMeetings: 1,
});

test('basic client pages publish before histories and each history is deduplicated and bounded', async () => {
  const historyRequests = [];
  let active = 0, peak = 0;
  const store = historyStore(code => {
    const request = deferred();
    active += 1;
    peak = Math.max(peak, active);
    historyRequests.push({ code, request, finish: () => { active -= 1; } });
    return request.promise;
  }, { concurrency: 50, retries: 0 });
  const pages = [];
  const queueRequests = [];
  const queueApi = async ({ page, size }) => {
    queueRequests.push({ page, size });
    if (page === 0) return { content: Array.from({ length: 100 }, (_, index) => client(`C${index}`, index)), totalPages: 2, totalElements: 120 };
    return { content: [client('C0', 0), ...Array.from({ length: 19 }, (_, index) => client(`C${100 + index}`, 100 + index))], totalPages: 2, totalElements: 120 };
  };
  const updates = [];
  const progress = [];
  const load = taskLoader(queueApi, store);
  const started = Date.now();
  await load({
    onPage: (tasks, state) => pages.push({ count: tasks.length, visibleAt: Date.now() - started, progress: state }),
    onTaskUpdate: task => updates.push(task),
    onProgress: state => progress.push(state),
  });

  assert.deepEqual(queueRequests, [{ page: 0, size: 100 }, { page: 1, size: 100 }]);
  assert.equal(pages[0].count, 100);
  assert.equal(pages[0].progress.loadedClients, 100);
  assert.equal(pages[1].count, 19, 'duplicate clientCode on the second page is discarded');
  assert.equal(progress.at(-1).queueComplete, true);
  assert.equal(historyRequests.length, 50, 'history workers start immediately but stay capped');
  assert.equal(peak, 50);

  while (updates.length < 119) {
    await flush();
    historyRequests.splice(0).forEach(({ request, finish }) => { finish(); request.resolve([]); });
    await flush();
    if (!historyRequests.length && updates.length < 119) await flush();
  }
  assert.equal(updates.length, 119);
  assert.equal(new Set(updates.map(task => task.clientCode)).size, 119);
  assert.equal(peak, 50);
  assert.equal(progress.at(-1).historyCompleted, 119);
  assert.equal(progress.at(-1).historyPending, 0);
});

test('history failure is isolated; basic card and other client histories still complete', async () => {
  let failedCodes = [];
  const store = historyStore(async code => {
    if (code === 'C1') throw Object.assign(new Error('rate limited'), { status: 429 });
    return [];
  }, { concurrency: 2, retries: 0 });
  const updates = [];
  const errors = [];
  const progress = [];
  const load = taskLoader(async () => ({ content: [client('C1', 1), client('C2', 2)], totalPages: 1, totalElements: 2 }), store);
  const basic = [];
  await load({
    onPage: tasks => basic.push(...tasks),
    onTaskUpdate: task => updates.push(task),
    onHistoryError: (code, error) => { failedCodes.push(code); errors.push(error.message); },
    onProgress: state => progress.push(state),
  });
  await flush();
  assert.equal(basic.length, 2);
  assert.deepEqual(failedCodes, ['C1']);
  assert.deepEqual(errors, ['rate limited']);
  assert.deepEqual(updates.map(task => task.clientCode), ['C1', 'C2']);
  assert.equal(updates[0].historyLoadState, 'error');
  assert.equal(updates[0].verificationPending, true);
  assert.equal(progress.at(-1).historyFailed, 1);
  assert.equal(progress.at(-1).historyPending, 0);
});

test('a later queue page failure preserves already published clients', async () => {
  const store = historyStore(async () => []);
  const pages = [];
  const load = taskLoader(async ({ page }) => {
    if (page === 0) return { content: [{ clientName: 'Visible client' }], totalPages: 2, totalElements: 101 };
    throw new Error('page unavailable');
  }, store);
  await assert.rejects(load({ onPage: tasks => pages.push(...tasks) }), /page unavailable/);
  assert.equal(pages.length, 1);
  assert.equal(pages[0].name, 'Visible client');
});

test('account changes and navigation cancellation suppress stale history updates', async () => {
  const history = deferred();
  const store = historyStore(() => history.promise);
  const updates = [];
  const load = taskLoader(async () => ({ content: [client('OLD', 1)], totalPages: 1 }), store);
  await load({ onTaskUpdate: task => updates.push(task) });
  store.setAccount('SC:2:DV0101');
  history.resolve([]);
  await flush();
  assert.deepEqual(updates, []);

  let active = true;
  const nextStore = historyStore(async () => []);
  const nextLoad = taskLoader(async () => ({ content: [client('CANCELLED', 2)], totalPages: 1 }), nextStore);
  const pages = [];
  await nextLoad({ valid: () => active, onPage: tasks => pages.push(...tasks) });
  active = false;
  await flush();
  assert.equal(pages.length, 1, 'data received before navigation may be rendered');
});
