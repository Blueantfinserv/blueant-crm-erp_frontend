const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
function loadClass(name, api, source) {
  const filename = path.join(__dirname, `../${name}.ts`);
  const output = ts.transpileModule(source ?? fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const exports = {};
  new Function('require', 'exports', output)(() => name === 'LeadSearchService'
    ? { leadSearchApi: api } : { meetingApi: api }, exports);
  return exports[name];
}
function harness(kind) {
  const cycles = [];
  const submissions = [];
  const api = kind === 'leads' ? {
    search: request => {
      const main = deferred(); cycles.push({ main, request }); return main.promise;
    },
  } : {
    getMeetings: () => {
      const cycle = { main: deferred(), pending: deferred(), verified: deferred() };
      cycles.push(cycle); return cycle.main.promise;
    },
    getByVerificationStatus: status => cycles.at(-1)[status.toLowerCase()].promise,
    submitWorkflowUpdate: () => { const result = deferred(); submissions.push(result); return result.promise; },
  };
  const Class = loadClass(kind === 'leads' ? 'LeadSearchService' : 'MeetingService', api);
  const service = new Class();
  return {
    service, cycles, submissions,
    load: token => kind === 'leads' ? service.loadLeads(token) : service.loadMeetings(token),
    records: () => kind === 'leads' ? service.getState().leads : service.getState().meetings,
    scope: (id, code) => kind === 'leads' ? service.setAssignedUserScope(id, code) : service.setEmployeeScope(code),
    settle(index, records, pending = [], verified = []) {
      const cycle = cycles[index];
      cycle.main.resolve({ data: kind === 'leads' ? { content: records, totalPages: 1 } : records, timestamp: `time-${index}` });
      cycle.pending?.resolve({ data: pending }); cycle.verified?.resolve({ data: verified });
    },
    fail(index) {
      cycles[index].main.reject(new Error('server unavailable'));
      cycles[index].pending?.resolve({ data: [] }); cycles[index].verified?.resolve({ data: [] });
    },
  };
}
const record = (id, extra = {}) => ({ assignedAt: undefined, leadId: id, leadCode: `L${id}`, meetingCode: `M${id}`, employeeCode: 'RM1', assignedUserId: 1, assignedEmployeeCode: 'RM1', ...extra });

for (const kind of ['leads', 'meetings']) {
  test(`${kind}: simultaneous same-cycle calls share only the in-flight promise`, async () => {
    const h = harness(kind), token = Symbol('navigation');
    const first = h.load(token), duplicate = h.load(token);
    assert.strictEqual(first, duplicate); assert.equal(h.cycles.length, 1);
    const records = [record(1), record(2)]; h.settle(0, records);
    await Promise.all([first, duplicate]);
    assert.deepEqual(h.records(), records);
    // Even the same token cannot reuse a completed response.
    const next = h.load(token); assert.equal(h.cycles.length, 2);
    h.settle(1, []); await next; assert.deepEqual(h.records(), []);
  });
  test(`${kind}: newer navigation starts fresh and older success cannot overwrite it`, async () => {
    const h = harness(kind);
    const old = h.load(Symbol('navigation A')), next = h.load(Symbol('navigation B'));
    assert.equal(h.cycles.length, 2);
    const fresh = [record(7, { nextMeetingDate: '2026-11-09', clientName: 'External assignment' })];
    h.settle(1, fresh); await next;
    h.settle(0, [record(1)]); await old;
    assert.deepEqual(h.records(), fresh); assert.equal(h.service.getState().timestamp, 'time-1');
  });
  test(`${kind}: tokenless manual/forced refresh does not join an older request`, async () => {
    const h = harness(kind);
    const old = h.load(Symbol('old')), forced = h.load();
    assert.notStrictEqual(old, forced); assert.equal(h.cycles.length, 2);
    h.settle(1, [record(2)]); await forced;
    h.fail(0); await old;
    assert.deepEqual(h.records(), [record(2)]); assert.equal(h.service.getState().error, null);
  });
  test(`${kind}: old completion cannot clear newer loading or newer errors`, async () => {
    const h = harness(kind);
    const old = h.load(Symbol('old')), next = h.load(Symbol('new'));
    h.settle(0, [record(1)]); await old;
    assert.equal(h.service.getState().isLoading, true);
    h.fail(1); await next;
    assert.deepEqual(h.records(), []); assert.equal(h.service.getState().error, 'server unavailable');
  });
  test(`${kind}: failed shared request is evicted and same-cycle retry works`, async () => {
    const h = harness(kind), token = Symbol('retry');
    const first = h.load(token), duplicate = h.load(token);
    h.fail(0); await Promise.all([first, duplicate]);
    assert.equal(h.service.getState().isLoading, false);
    assert.equal(h.service.getState().error, 'server unavailable');
    const retry = h.load(token); assert.equal(h.cycles.length, 2);
    h.settle(1, [record(3)]); await retry;
    assert.equal(h.service.getState().error, null); assert.deepEqual(h.records(), [record(3)]);
  });
  test(`${kind}: account scope change clears state and excludes old in-flight results`, async () => {
    const h = harness(kind), token = Symbol('shared token');
    h.scope(1, 'RM1'); const old = h.load(token);
    h.scope(2, 'SC2'); assert.deepEqual(h.records(), []);
    const current = h.load(token); assert.equal(h.cycles.length, 2);
    const fresh = [record(2, { employeeCode: 'SC2', assignedUserId: 2, assignedEmployeeCode: 'SC2' })];
    h.settle(1, [...fresh, record(1)]); await current;
    h.settle(0, [record(1)], [record(1)], [record(1)]); await old;
    assert.deepEqual(h.records(), fresh);
    if (kind === 'meetings') assert.deepEqual(h.service.getPendingVerificationMeetings(), []);
  });
  test(`${kind}: logout/reset detaches old promise even for the same employee scope`, async () => {
    const h = harness(kind), token = Symbol('reset');
    const old = h.load(token); h.service.reset();
    const current = h.load(token); assert.equal(h.cycles.length, 2);
    h.settle(1, [record(2)]); await current; h.fail(0); await old;
    assert.deepEqual(h.records(), [record(2)]); assert.equal(h.service.getState().error, null);
  });
}

test('meetings: fresh navigation observes PC verification and external next-plan changes', async () => {
  const h = harness('meetings');
  const initial = h.load(Symbol('before verification'));
  h.settle(0, [record(1)], [record(1)]); await initial;
  assert.equal(h.records()[0].verificationStatus, 'PENDING');
  const next = h.load(Symbol('after verification'));
  const verified = record(1, { verificationStatus: 'VERIFIED', verifiedBy: 'PC1', nextMeetingDate: '2026-11-12' });
  h.settle(1, [verified], [], [verified]); await next;
  assert.deepEqual(h.records(), [verified]);
  assert.deepEqual(h.service.getPendingVerificationMeetings(), []);
  assert.deepEqual(h.service.getVerifiedMeetings(), [verified]);
});

test('meetings: submission starts a post-write read while an older request is pending', async () => {
  const h = harness('meetings');
  const old = h.load(Symbol('pre-submit'));
  const submission = h.service.submitWorkflow('M1', {});
  h.submissions[0].resolve({ data: record(2), timestamp: 'submitted' });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.cycles.length, 2);
  h.settle(1, [record(2)]); await submission;
  h.settle(0, [record(1)]); await old;
  assert.deepEqual(h.records(), [record(2, { workflowUpdatedAt: 'submitted' })]);
});

test('meetings: submission from a logged-out account cannot refresh or populate the new account', async () => {
  const h = harness('meetings'); h.scope(1, 'RM1');
  const submission = h.service.submitWorkflow('M1', {});
  h.service.reset(); h.scope(2, 'SC2');
  const current = h.load(Symbol('new account'));
  h.submissions[0].resolve({ data: record(1), timestamp: 'old account' }); await submission;
  assert.equal(h.cycles.length, 1);
  const fresh = record(2, { employeeCode: 'SC2', assignedUserId: 2, assignedEmployeeCode: 'SC2' });
  h.settle(0, [fresh]); await current;
  assert.deepEqual(h.records(), [fresh]);
});


for (const kind of ['leads', 'meetings']) test(`${kind}: complete output and error events match original services for RM SC SM`, async () => {
  const name = kind === 'leads' ? 'LeadSearchService' : 'MeetingService';
  const root = path.resolve(__dirname, '../../..');
  const originalSource = fs.readFileSync(path.join(__dirname, `fixtures/${name}.before.txt`), 'utf8');
  for (const role of ['RELATIONSHIP_MANAGER', 'SALES_COORDINATOR', 'SALES_MANAGER']) {
    for (const fail of [false, true]) {
      const rows = [record(1, { employeeRole: role, assignmentDate: '2026-11-03', remarks: null }),
        record(1, { clientName: 'duplicate', employeeRole: role }), record(2, { employeeCode: 'OTHER', assignedUserId: 9, assignedEmployeeCode: 'OTHER' }),
        { clientName: '', mobileNumber: undefined, assignedUserId: 1, employeeCode: 'RM1' }];
      const api = {
        search: async () => { if (fail) throw new Error('failure'); return { data: { content: rows, totalPages: 1 }, timestamp: null }; },
        getMeetings: async () => { if (fail) throw new Error('failure'); return { data: rows, timestamp: null }; },
        getByVerificationStatus: async status => ({ data: status === 'PENDING' ? [record(1)] : [record(1, { verifiedBy: 'PC1' })] }),
      };
      const original = new (loadClass(name, api, originalSource))();
      const candidate = new (loadClass(name, api))();
      const histories = [];
      for (const service of [original, candidate]) {
        if (kind === 'leads') service.setAssignedUserScope(1, 'RM1'); else service.setEmployeeScope('RM1');
        const events = [];
        service.subscribe(state => events.push(structuredClone(state)));
        await (kind === 'leads' ? service.loadLeads() : service.loadMeetings());
        histories.push({ state: service.getState(), events,
          pending: kind === 'meetings' ? service.getPendingVerificationMeetings() : [],
          verified: kind === 'meetings' ? service.getVerifiedMeetings() : [] });
      }
      assert.deepEqual(histories[1], histories[0], `${role}, failure=${fail}`);
    }
  }
});

test('leads: same cycle shares all pages and publishes only after the complete response', async () => {
  const first = deferred(), second = deferred(), calls = [];
  const Service = loadClass('LeadSearchService', { search: request => {
    calls.push(request); return request.page === 0 ? first.promise : second.promise;
  } });
  const service = new Service(), token = Symbol('all pages');
  const a = service.loadLeads(token), b = service.loadLeads(token);
  first.resolve({ data: { content: [record(1)], totalPages: 2 } });
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(calls.map(request => request.page), [0, 1]);
  assert.equal(service.getState().isLoading, true); assert.deepEqual(service.getState().leads, []);
  second.resolve({ data: { content: [record(1), record(2)], totalPages: 2 } });
  await Promise.all([a, b]);
  assert.deepEqual(service.getState().leads, [record(1), record(2)]);
});

test('meetings: optional verification failure retains existing fallback and retries on the next read', async () => {
  const h = harness('meetings'), token = Symbol('optional failure');
  const initial = h.load(token);
  h.cycles[0].main.resolve({ data: [record(1)] });
  h.cycles[0].pending.reject(new Error('pending failed'));
  h.cycles[0].verified.reject(new Error('verified failed'));
  await initial;
  assert.equal(h.service.getState().error, null);
  assert.deepEqual(h.records(), [record(1)]);
  const retry = h.load(token); assert.equal(h.cycles.length, 2);
  h.settle(1, [record(1)], [record(1)], []); await retry;
  assert.equal(h.records()[0].verificationStatus, 'PENDING');
});
