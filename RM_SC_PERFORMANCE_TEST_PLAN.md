# RM/SC local performance validation

Runtime history concurrency remains **50**. Candidate settings 2/4/6/8 are recorded in `src/services/__tests__/clientHistoryBenchmark.config.json`; they do not alter runtime configuration.

Actual before/after measurements are PENDING. No authorized TEST HAR or authenticated TEST dataset was available. Synthetic tests prove request caps and correctness; their duration is not an application performance claim.

Use the same TEST account, dataset (100/300/500 clients), network conditions and build for each run. Record three cold and three warm runs. Never use production for this experiment. Export a sanitized HAR with credentials and customer bodies removed.

Record total Fetch/XHR, history requests and unique client codes, repeated requests (separating retries after failed responses from duplicate successful reads), 429 count, mean/P95 latency and maximum simultaneous history requests. Separately timestamp first usable card and final required-history completion; HAR alone cannot establish UI timings. Retain failed requests in measurements.

Cold runs start with a new session; warm runs use the existing account and navigate away/back. Include a manual refresh, a successful update, PC verification, an older pending meeting beneath a verified meeting, account switch, navigation cancellation and a failed history request. Compare IDs, ordering, final counts, filters, active scheduling and pending restrictions.

Client cards can appear before histories. Their history-dependent actions remain disabled until checks succeed. Global task classifications retain the previous complete snapshot during refresh; first-load counts are provisional until queue and history completion. Failed histories remain failures, never successful empty arrays.

PC invalidation hints work locally and, where BroadcastChannel exists, across same-origin tabs using the same backend configuration. They do not deliver updates across devices or browser origins. Existing fresh action guards and lifecycle/manual refreshes remain necessary. Creation/rejection/resubmission endpoints that do not exist in this frontend have not been invented or added.

## Implementation record

### Files changed in this implementation

| File | Change |
| --- | --- |
| `src/api/clientMeeting.ts` | Successful verification/update emits a client-specific invalidation hint; meeting details provide the client-code fallback. Read endpoints and write payloads unchanged. |
| `src/services/ClientHistoryService.ts` | Targeted invalidation/revalidation, guarded dependent-state notifications, bounded jitter retries for 429/network/502/503/504; shared cooldown even after retry exhaustion. Runtime cap 50. |
| `src/utils/clientMeetingChanges.ts` (new) | Local invalidation subscribers and optional same-origin BroadcastChannel hints containing only client code. |
| `src/utils/clientHistorySelectors.ts` (new) | Canonical sequence DESC selection. Missing/nonfinite sequences rank last; equal sequences use date DESC then stable input order. Does not mutate raw history. |
| `src/modules/salesManager/tasks/clientTaskData.ts` | Canonical latest selection; progressive loading/failure markers; preserve cached history on failure; never authorize unknown history. |
| `src/modules/salesManager/tasks/hooks/useSalesManagerTasks.ts` | Targeted refreshed-history remapping; retain complete global task inputs during refresh; incomplete records cannot finalize classification. Client modules remain conditional on RM/SC. |
| `src/screens/ClientWorkFollowScreen.tsx` | Canonical selection, targeted remapping, progressive unknown/error states, cached-history retention. |
| `src/modules/salesManager/tasks/SalesManagerLeadDetailScreen.tsx` | Client-only sequence ordering and fail-closed update eligibility during history revalidation/error. Prospect ordering unchanged. |
| `src/modules/salesManager/tasks/components/SalesTaskCard.tsx` | Existing badge slots distinguish loading/error; restrict updates while history is unknown. No layout redesign. |
| `src/modules/salesManager/tasks/SalesManagerTasksScreen.tsx` | Incomplete history is an error state, never a definitive empty result. |
| `src/modules/salesManager/tasks/types/tasks.ts` | Optional raw-history loading/error marker. |
| `src/services/__tests__/clientHistory.test.cjs` | Invalidation, ordering, retry exhaustion, scheduled/history distinction and account isolation regressions. |
| `src/modules/salesManager/tasks/__tests__/clientTaskProgressiveLoading.test.cjs` | Adapt harness and require failed-history cards to remain restricted. |
| `src/modules/salesManager/tasks/__tests__/taskNavigationPerformance.test.cjs` | Check previous complete task inputs survive partial enrichment. |
| `src/modules/salesManager/tasks/__tests__/smTaskLoading.test.cjs` | Mock only the conditional RM/SC history dependency; prove SM skips it. |
| `src/services/__tests__/clientHistoryPerformance.bench.cjs` | Adapt existing synthetic harness to the invalidation dependency. Not used as real performance evidence. |
| `src/services/__tests__/clientHistoryBenchmark.config.json` (new) | TEST candidate matrix only. |
| `RM_SC_PERFORMANCE_TEST_PLAN.md` (new) | Validation steps, evidence status and limitations. |

Pre-existing uncommitted changes in App.tsx, ClientMeetingScheduleForm.tsx, useClientHistory.ts and types/screen.ts were retained. They were not newly rewritten in this implementation. Existing Verified By behavior was not changed.

### Validation

- Existing 111-test baseline passed after harness adaptation; expanded suite: **120 tests passed**, no skipped tests.
- TypeScript `tsc --noEmit`: passed.
- Expo web export to the system temporary directory: passed.
- `git diff --check`: passed.
- No lint script is configured.
- Actual authenticated TEST timing, HAR, browser interaction and cross-tab verification exercise: PENDING. No production requests, commit, push or deployment performed.

### Reused mechanisms and limitations

The existing account-scoped raw-history store, single-flight/queued fresh reads, cycle boundaries, revision guards, mutation gate, semaphore and lifecycle refreshes remain the basis. Derived task objects are still owned by each screen. Cached failures do not become successful empty results. Full-history pending verification remains an independent scan.

Successful local client update uses the existing mutation gate and post-write read cycle; the notification does not start a duplicate refresh while that mutation is active. Successful PC verification invalidates only an already-loaded matching client and triggers a fresh read. Failed writes do not publish success hints. No separate create/reject/resubmit frontend API methods were found; no new endpoints were invented. Any future write path must publish the same targeted invalidation signal.

Canonical ordering is an explicitly authorized behavior correction: a higher meetingNumber wins over a newer meetingDate. Active scheduled meeting code/date remain distinct from historical latest selection. Equal-number/date ties retain source order. Raw history records are preserved.

First-page requests enter the bounded FIFO queue before subsequent pages, providing initial-client priority. Actual viewport-based reprioritization was not added because no measured benefit or viewport scheduling contract was available.

The number of required unique history calls remains proportional to clients. Deduplication removes repeated codes/overlapping eligible reads, not required fresh navigation reads. Cap 50 can still meet server rate limits; backoff reduces pressure but cannot guarantee absence of 429. Real TEST measurements must determine any future cap change.


## Subsequent release preparation ? 6 November 2026

The user explicitly authorized pushing the remaining progressive-loading implementation after the earlier PC-only export release. Runtime concurrency stays at 50. This publication approval does not authorize load tests against api.blueantfinserv.com; comparable TEST performance measurements remain pending.

The implementation audit additionally established these limits: a previous list-card button can remain enabled-looking while its history snapshot revalidates, although normal activation performs a fresh App-level check; a missing-code direct handler call can open the form but submission explicitly blocks missing client codes; verification is checked on form opening, not read again immediately before submission. No claim of universal submit-time frontend verification or cross-device push invalidation is made. Backend enforcement remains authoritative.
