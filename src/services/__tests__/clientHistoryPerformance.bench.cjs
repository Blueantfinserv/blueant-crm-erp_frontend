// Synthetic history-transport benchmark only; no HTTP requests or production data.
// Run: node src/services/__tests__/clientHistoryPerformance.bench.cjs
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');
const { performance } = require('node:perf_hooks');
function service(source, fetcher) {
  const exports = {};
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  new Function('require', 'exports', js)(name => name.includes('clientMeetingChanges') ? { subscribeClientMeetingChanges: () => () => {} } : name.includes('AuthService') ? { authService: { subscribe() {} } } : { clientMeetingApi: { getByClientCode: fetcher } }, exports);
  const store = new exports.ClientHistoryService(fetcher, { retryBaseMs: 0 });
  store.setAccount('synthetic-RM');
  return store;
}
const before = fs.readFileSync(path.join(__dirname, 'fixtures/ClientHistoryService.before.txt'), 'utf8');
const after = fs.readFileSync(path.join(__dirname, '../ClientHistoryService.ts'), 'utf8');
async function run(source, optimized, codes, capacity) {
  let active = 0, peak = 0, requests = 0, simulated429 = 0;
  const fetcher = async code => {
    requests++; active++; peak = Math.max(peak, active);
    const rejected = active > capacity;
    await new Promise(resolve => setTimeout(resolve, 2));
    active--;
    if (rejected) { simulated429++; throw Object.assign(new Error('simulated 429'), { status: 429 }); }
    return [{ meetingCode: `M-${code}`, meetingDate: '2026-11-05', verificationStatus: 'VERIFIED', verifiedByPc: true }];
  };
  const store = service(source, fetcher);
  const start = performance.now();
  let failures = 0;
  if (optimized) {
    try { await store.loadMany(codes, store.createReadCycle()); } catch { failures++; }
  } else {
    const results = await Promise.allSettled(codes.map(code => store.refresh(code, true)));
    failures = results.filter(result => result.status === 'rejected').length;
  }
  return { requests, duplicateReads: requests - new Set(codes).size, peak, simulated429, failedResults: failures, historyOnlyMs: Number((performance.now() - start).toFixed(1)) };
}
(async () => {
  console.log('SYNTHETIC: 2ms mock transport; excludes HTTP, queue pages, prospect APIs, rendering and production rate limits.');
  for (const size of [100, 300, 500]) {
    const codes = Array.from({ length: size }, (_, i) => `C${i}`);
    for (const scenario of ['no-rate-limit', 'mock-capacity-12', 'duplicate-records']) {
      const input = scenario === 'duplicate-records' ? codes.flatMap(code => [code, code]) : codes;
      const capacity = scenario === 'mock-capacity-12' ? 12 : Infinity;
      const old = await run(before, false, input, capacity);
      const next = await run(after, true, input, capacity);
      assert.ok(next.peak <= 6); assert.equal(next.requests, size); assert.equal(next.simulated429, 0);
      console.log(JSON.stringify({ clients: size, scenario, before: old, after: next }));
    }
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
