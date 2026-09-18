# BLUEANT ERP — Complete Frontend Engineering Audit

**Audit date:** 18 September 2026  
**Scope:** Frontend repository audit only. No application source, configuration, or API behavior was changed while preparing this report.

## Executive assessment

Blueant ERP is a functional, production-capable Expo application with substantial Sales Person and Sales Coordinator workflows. Its strongest parts are typed API contracts, role-aware authentication, secure native storage, meeting workflow submission, validation, privacy masking, list pagination, and feature delivery.

The primary risks are large screen components, no automated tests, repeated transport code, client-side data fanout, inconsistent date logic, incomplete live data integration in a few modules, and no lint/CI gate.

**Overall engineering score: 5.6 / 10**  
**Maturity level: Level 3 — Production-capable, requiring consolidation before safe scale-up.**

## Project profile

| Area | Finding |
|---|---|
| Platform | Expo React Native for Android, iOS and web |
| Expo | `~54.0.34` |
| React / RN | React `19.1.x`, React Native `0.81.5` |
| Language | TypeScript strict mode, plus selected JavaScript screens |
| State | Context, hooks, and service classes |
| Roles | Sales Person, Sales Coordinator, Sales Manager, Admin, Super Admin |
| Backend | REST API via `src/api` and `src/services` |
| Tests | No test suite or test script found |
| Delivery tooling | No ESLint, Prettier, or CI workflow found |

## Scorecard

| Area | Score | Assessment |
|---|---:|---|
| Architecture | 5.5 | Good base layering, oversized screens |
| Folder structure | 6.5 | Logical organization |
| Components | 5.5 | Reuse exists, duplication remains |
| API layer | 6.5 | Typed, but transport is repeated |
| TypeScript | 6.5 | Strict configuration, some JS/casts remain |
| State management | 6.0 | Functional, complex screen state |
| Authentication | 7.0 | Refresh/bootstrap/native storage are strong |
| Error handling | 6.0 | Local handling, no global standard |
| Loading UX | 6.0 | Common states exist |
| UI consistency | 5.5 | Good visual base, token drift |
| Performance | 5.0 | Pagination helps, fanout/list rendering hurt |
| Security | 6.0 | Native storage good, web storage needs review |
| Navigation | 5.5 | Custom state machine limits growth |
| Forms / validation | 6.5 | Strong workflow validation |
| Dates / timezones | 5.5 | Multiple date implementations |
| Scalability | 4.5 | Client-side aggregation will not scale |
| Tests | 1.0 | No automated coverage |
| Configuration | 5.0 | Environment workflow incomplete |
| Documentation | 4.0 | Improved, but not yet complete system documentation |
| Git history | 5.0 | Incremental commits, cleanup required |

## Architecture and code organization

The repository separates API modules, services, screens, components, hooks, theme, navigation, and utilities. `AuthProvider`, service classes, role-experience configuration, and typed request/response models form a workable base.

The weakness is inside feature screens. `SalesManagerTasksScreen.tsx`, `SalesCoordinatorScreen.tsx`, `LeadWorkflowForm.jsx`, dashboard/report sections, and navigation components mix data loading, data transformation, filters, exports, modal state, and UI rendering. That raises regression risk for routine UI changes.

### Large-file hotspots

- `SalesManagerTasksScreen.tsx` — about 970 lines
- `SalesCoordinatorScreen.tsx` — about 820 lines
- `LeadWorkflowForm.jsx` — about 765 lines
- `AdditionalPerformanceSection.tsx` — about 675 lines
- `BackgroundCurves.tsx` — about 673 lines
- `CurrentWeekPerformanceSection.tsx` — about 664 lines
- `ReportPreview.tsx` — about 565 lines
- `TopNavigation.tsx` — about 497 lines

`SalesCoordinatorScreen.tsx` also contains several historical lead-history variants while only one is rendered. These should be removed after confirming they are unused.

### Recommended structure

Keep screens as orchestration shells. Move list queries, export builders, filter state, calendar logic, and repeated row/table components into dedicated feature modules. Use one shared list header/table shell for Today Meetings, Verified Meetings, Sales Person Tasks, and Assigned Leads.

## API and services

### Strengths

- API requests and responses are generally typed.
- Service classes provide a useful abstraction above raw API calls.
- Existing meeting updates correctly use `POST /api/v1/meetings/{meetingCode}/workflow-update`.
- The frontend does not generate follow-up meeting codes.
- Meeting submission includes duplicate-submit protection.

### Weaknesses

- API base URL and request setup are duplicated across API files.
- No shared HTTP interceptor was found for 401 handling and token-refresh retry.
- Lead search can load pages and then request details for each lead.
- Export paths can request lead details/history and meeting details one row at a time.
- Some employee codes and mappings are hardcoded.

### Backend contract requirements

The backend should provide compact list DTOs containing all card/table fields, server-side filter/search/date-range support, stable pagination, authorization at record level, bulk/server-side export, and idempotent workflow handling.

## Duplicate meeting-code incident

The captured request was:

```text
POST /api/v1/meetings/BA-MTG-2026-000126/workflow-update
```

The server returned a unique-key duplicate for `BA-MTG-2026-000536`. This proves the frontend called the expected workflow-update endpoint. The client is not generating the meeting code; therefore backend workflow code must repair its follow-up meeting-code generation, sequence state, or clone/backup database state.

`400 Bad Request` only classifies the response. It does not itself prove that the frontend sent a bad payload.

## Authentication and authorization

Authentication is one of the better subsystems. `AuthProvider` and `AuthService` bootstrap sessions, schedule refresh, and use SecureStore on native platforms. Role mapping is explicit.

Improvements:

- Web fallback to `localStorage` / `sessionStorage` needs an XSS-risk decision.
- Centralize 401/retry logic in the HTTP client.
- Keep backend authorization authoritative; UI role visibility is not sufficient access control.
- Unsupported roles must remain explicitly product-approved.

## Sales Person workflow

### Implemented strengths

- Existing meetings use the workflow update endpoint rather than create-meeting.
- Original meeting identity is preserved.
- Meeting-code sequencing stays with backend.
- Meeting date in the update form is read-only.
- Meeting-with conditional questions follow the salesperson response.
- Location, validation, and required workflow fields are handled.

### Risks

- `LeadWorkflowForm.jsx` is a large JavaScript file and should migrate to TypeScript in smaller components.
- Reverse geocoding is invoked directly in the UI via BigDataCloud.
- Date construction is distributed between form and related screens.

## Sales Coordinator workflow

### Implemented strengths

- Tasks combine active leads and active meetings.
- Leads with active meetings are de-duplicated.
- Phone values are masked in Sales Coordinator UI.
- Verification can preload suitable prior values while retaining conditional inputs for the coordinator.
- Filters, date ranges, clear actions, calendar close behavior, exports, sticky headers, and visible list scrolling are implemented.

### Risks

- The coordinator screen mixes aggregation, rendering, filters, exports, modals, and calendar state.
- Exports can generate a large amount of network traffic.
- Employee codes should come from backend data rather than constants.
- A ten-second refresh can unnecessarily load backend and interrupt user work.

## Performance assessment

### Main bottlenecks

1. N+1 detail calls after list retrieval.
2. Export fanout: multiple calls per exported record.
3. Repeated `find`, `filter`, and `sort` work in mapping paths.
4. Manual list rendering instead of `FlatList`, `SectionList`, or web virtualization.
5. Short auto-refresh intervals.

### Recommended fixes

- Return all row/card fields in list API responses.
- Use server-side or bulk export for large data sets.
- Build indexed maps and memoized derived results.
- Use virtualized lists.
- Pause or configure auto-refresh during active forms/modals.

## Design system and responsive UI

The product has a consistent visible identity: dark-blue headers, purple selected states, pills, cards, calendars, and role dashboards. Recent work on headers, scrollbar visibility, filters, exports, and alignment improved usability.

Implementation consistency needs improvement. Direct visual values appear frequently alongside theme tokens, which makes related screens drift over time.

Recommended actions:

- Define semantic tokens for page/list/card/input/active/destructive/success/warning states.
- Reuse a single filter-popup and list-header design.
- Define responsive breakpoints instead of local screenshot-specific CSS fixes.
- Keep Clear control placement consistent across tabs.

## Date and timezone review

Date behavior is implemented in several places and mixes local date helpers, `T00:00`, `T12:00`, `toISOString`, and manually built strings. This can cause wrong weekdays and off-by-one dates.

Adopt a single date utility:

- Store business date-only values as `YYYY-MM-DD`.
- Avoid UTC conversion for date-only data.
- Expose `parseLocalDate`, `formatBusinessDate`, `formatDisplayDate`, and date-range helpers.
- Use one calendar/date adapter in all tabs.
- Add timezone-boundary tests.

## Error, loading, and empty states

Many screens have local loading and error treatment, and workflow errors reach the user. The next improvement is standardization:

- Add a root `ErrorBoundary`.
- Normalize API errors centrally.
- Convert backend business errors into useful user messages while preserving support trace IDs.
- Standardize loading, empty, retry, and error states for all list screens.

## Security review

### Good

- Native authentication storage uses secure platform storage.
- Sales Coordinator UI masks phone values.
- Frontend does not control follow-up meeting-code generation.

### Risks

- Plain `.env` is not ignored by the current Git rules.
- Web token persistence requires review.
- Location data needs strict backend role authorization.
- Client checks must not replace backend authorization.

## Navigation review

Navigation is role-aware and works, but is implemented with custom screen state/history in `App.tsx`. This limits future deep linking, browser back behavior, screen restoration, analytics, and complex nested flows. A supported navigation/routing framework should be evaluated before the route tree expands much further.

## Quality, tests, and delivery readiness

TypeScript strict mode is enabled and `tsc --noEmit` passed during the audit. The scan found no broad `any`, `@ts-ignore`, `@ts-nocheck`, debug `console`, or TODO/FIXME patterns.

No test runner, tests, lint configuration, formatting configuration, or CI workflow was found. This is the largest release-risk area.

### Minimum release gate

1. Type check.
2. Lint and formatting check.
3. Unit tests for date helpers, filters, mapping, masking, and payload generation.
4. Integration tests for login, workflow update, verification, filtering, and export names.
5. Android, iOS, and web smoke test.
6. CI build/export validation.

## Top 20 strengths

1. Strict TypeScript configuration.
2. Typed API/service boundaries.
3. Native secure token storage.
4. Session bootstrap and refresh.
5. Explicit role mapping.
6. Correct workflow-update API use.
7. No client-side meeting-code generation.
8. Duplicate-submit protection.
9. Strong meeting validation.
10. Sales Coordinator verification flow.
11. Combined lead/meeting task aggregation.
12. Active-meeting de-duplication.
13. Role-based phone masking.
14. Pagination and stale-request safeguards.
15. Filters, date ranges, exports, and clear controls.
16. Sticky headers and visible scrolling.
17. Read-only historical meeting date.
18. Incremental Git history.
19. Theme/component foundation.
20. Passing TypeScript compilation.

## Top 20 issues

1. No automated tests.
2. No lint, formatter, or CI gate.
3. Oversized screen components.
4. N+1 API calls.
5. Export request fanout.
6. Non-virtualized large lists.
7. Repeated array processing.
8. Duplicate API transport code.
9. No centralized 401 retry/error interceptor.
10. Web token storage risk.
11. No root error boundary.
12. JavaScript in a critical business form.
13. Inconsistent date handling.
14. Theme-token drift from direct visual values.
15. Old unused UI variants in active files.
16. Hardcoded employee mappings.
17. Some mock/local-only product behavior.
18. Manual navigation architecture.
19. Plain `.env` is not ignored.
20. Existing uncommitted deletions/documentation changes require release hygiene.

## Prioritized roadmap

### P0 — Reliability and release safety

- Add tests for login, meeting workflow update, verification, dates, filters, and exports.
- Add ESLint, Prettier, typecheck, and CI.
- Add root error boundary and central API error handling.
- Backend must repair unique follow-up meeting-code generation and make workflow updates idempotent.
- Review existing uncommitted deletions before release.

### P1 — Maintainability and performance

- Split Sales Coordinator, Sales Manager Tasks, and Lead Workflow Form into feature modules.
- Replace N+1 requests with backend list DTOs.
- Move large exports server-side or to bulk APIs.
- Add virtualized lists.
- Centralize date helpers, API client, and refresh retry.

### P2 — Scale and product completion

- Replace mocks/local-only workflows with live APIs.
- Remove hardcoded employee codes.
- Complete semantic design tokens and shared list/filter components.
- Adopt a scalable navigation approach.
- Implement approved experiences for currently unsupported roles.

## Final verdict

The frontend is beyond prototype stage and can support operational Sales Person and Sales Coordinator workflows. Its immediate need is engineering consolidation: test coverage, centralized transport and error behavior, shared date handling, performance-safe list/data loading, and decomposition of large screens.

The duplicate follow-up meeting-code failure is a backend workflow issue based on the captured request path. The frontend correctly calls workflow update; backend must create a fresh unique code or repair its sequence/clone data state.
