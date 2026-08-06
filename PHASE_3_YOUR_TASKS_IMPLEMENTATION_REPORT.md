# Phase 3 Analysis: Sales Manager Your Tasks

No code was modified. Scope is limited to the existing Sales Manager **Your Tasks** implementation and the contracts documented in `assets/swagger.json`.

---

## 1. Every file involved

### Primary implementation files

| File | Responsibility |
|---|---|
| `App.tsx` | Selects the Sales Manager task screen, supplies callbacks, stores the selected task, opens New Lead/meeting forms, and navigates to task details |
| `src/modules/salesManager/tasks/SalesManagerTasksScreen.tsx` | Renders Your Tasks, search, filters, task count, empty state, and task-card grid |
| `src/modules/salesManager/tasks/components/SalesTaskCard.tsx` | Renders each task card and handles card, phone, WhatsApp, location, and Update Form actions |
| `src/modules/salesManager/tasks/types/tasks.ts` | Defines `SalesTask`, meeting-stage, and schedule UI models |
| `src/modules/salesManager/tasks/mock/salesTasksData.ts` | Contains the ten hardcoded task records currently displayed |
| `src/modules/salesManager/tasks/mock/taskFilterOptions.ts` | Contains the hardcoded task-type and meeting-stage filter options |
| `src/modules/salesManager/tasks/SalesManagerLeadDetailScreen.tsx` | Displays the selected task's detailed lead information and its actions |
| `src/modules/salesManager/forms/LeadWorkflowForm.jsx` | Receives the selected task when Update Form is pressed and selects first-meeting or follow-up mode |

### Existing backend foundation relevant to future integration

| File | Current relevance |
|---|---|
| `src/api/lead.ts` | Implements only `POST /v1/leads`; it does not load tasks or meetings |
| `src/services/LeadService.ts` | Handles only lead creation state |
| `src/types/lead.ts` | Contains lead-creation and basic lead-response DTOs, but not meeting queue DTOs |
| `src/services/SecureStorageService.ts` | Supplies the access token required by authenticated APIs |

### Supporting files

| File | Responsibility |
|---|---|
| `src/layout/AppShell.tsx` | Renders the application shell containing Your Tasks |
| `src/layout/navigationTypes.ts` | Defines tab and route-related types used by the shell |
| `src/theme/theme.ts` | Supplies styling tokens used by the task screen and cards |

---

## 2. Every component involved

### `App` and `AppShell`

They control the current screen, selected tab, selected task, navigation history, lead/meeting modal, and Sales Manager-specific rendering. The `leads` route renders `SalesManagerTasksScreen` for a Sales Manager.

### `SalesManagerTasksScreen`

It renders the heading, New Lead and Service Request buttons, search, filters, matching count, responsive task grid, and empty state.

### `FilterDropdown`

A local component used once for task type and once for meeting stage. It opens the option list, indicates the selected value, and returns a selection to the screen.

### `SalesTaskCard`

It displays client name, contact actions, meeting stage, location, remarks, last-updated value, next-follow-up value, and Update Form.

### `SalesManagerLeadDetailScreen`

It displays contact, profile, meeting, image, location, and remarks information. It exposes Back, Call, WhatsApp, Open in Maps, and Update Form actions.

### `SectionHeading` and `LeadImage`

These are local presentation components inside the detail screen.

### `LeadWorkflowForm`

It opens in `first-meeting` mode when `meetingStage` is `1st Meeting`; every other stage opens `followup-meeting` mode.

---

## 3. Current mock data source

The task list comes entirely from `src/modules/salesManager/tasks/mock/salesTasksData.ts`, which exports `salesTasksData: readonly SalesTask[]` containing ten hardcoded records.

Mock records contain ID, name, phone, location, coordinates, location-pin state, meeting stage, remarks, display-formatted dates, schedule category, optional profile information, and optional images.

No API currently loads or refreshes this list. Creating a lead or submitting a meeting does not update it.

---

## 4. Current filtering logic

Filtering runs locally inside a `useMemo`. A record must match search, task type, and meeting stage.

### Task-type filter

Options are `All Tasks`, `Today`, `Pending`, and `Future 3 Days`. Matching uses exact equality against the hardcoded `task.schedule` value. Dates are not calculated.

### Meeting-stage filter

Options are `All Stages` and `1st Meeting` through `10th Meeting`. Matching uses exact equality against `task.meetingStage`.

---

## 5. Current search logic

Search is client-side. Name search is trimmed, lowercased, and matched with `includes()`. Mobile search strips non-numeric characters from the entered value and task phone, then performs a partial digit match.

A task matches when search is empty, the name contains the search text, or the mobile number contains the entered digits. Location, lead code, remarks, email, stage, status, and assigned employee are not searched.

---

## 6. Current sorting logic

There is no explicit sorting. `Array.filter()` preserves the order from `salesTasksData.ts`.

Card color is based on the task's index in the filtered array, so filtering can change a card's color without changing the underlying record.

---

## 7. Current task-card interactions

| Element | Action |
|---|---|
| Entire task card | Calls `onOpenDetails(task)` |
| WhatsApp icon | Stops card propagation and opens `https://wa.me/{number}` |
| Phone icon | Stops card propagation and opens `tel:{number}` |
| Location icon | Stops card propagation and opens Google Maps using latitude and longitude |
| Update Form | Stops card propagation and calls `onUpdateMeeting(task)` |
| New Lead | Opens `LeadWorkflowForm` in `new-lead` mode |
| Service Request | Currently has no business callback |
| Search clear icon | Resets the search value |
| Filter controls | Update local task-type and meeting-stage state |

The details screen additionally provides Back, Call, WhatsApp, Open in Maps, and Update Form actions.

---

## 8. Current navigation flow

```text
Successful Sales Manager login
  -> Dashboard
  -> Your Task tab
  -> route: leads
  -> SalesManagerTasksScreen
```

Opening a task:

```text
Task card
  -> App.tsx stores the full SalesTask in selectedSalesTask
  -> navigate('sales-task-details')
  -> SalesManagerLeadDetailScreen
```

Opening an update form:

```text
Update Form
  -> meetingStage inspected
  -> 1st Meeting: first-meeting
  -> all other stages: followup-meeting
  -> LeadWorkflowForm modal
```

No identifier is currently resolved through an API; the complete mock object is passed between screens.

---

## 9. Current API requirements

The backend integration must provide:

1. An authenticated task/meeting queue for the current Sales Manager.
2. Name or mobile search.
3. Today, Pending, and Future 3 Days filtering.
4. Meeting sequence filtering from first through tenth meeting.
5. Client name, mobile, location, coordinates, stage, remarks, timestamps, and next follow-up.
6. Stable meeting and lead identifiers.
7. Detail information required by `SalesManagerLeadDetailScreen`.
8. Loading, empty, and error states.
9. Bearer-token authentication.

---

## 10. Exact Swagger endpoints that should replace the mock data

### Primary queue endpoint

```http
GET /v1/meetings
```

Operation: `getAllMeetings` — "Get meetings queue based on filters".

| Query parameter | Type | Required | Frontend use |
|---|---|---|---|
| `search` | string | No | Name/mobile search |
| `date` | string | No | Date filtering |
| `status` | string | No | Meeting-status filtering |
| `sequence` | integer | No | First through tenth meeting filtering |

Response: `ApiResponseListMeetingResponse`, containing `MeetingResponse[]` in `data`.

This is the closest and primary Swagger replacement for `salesTasksData`.

### Supporting endpoints

| Endpoint | Operation | Use |
|---|---|---|
| `GET /v1/meetings/today` | `getTodayMeetings` | Exact Today category |
| `GET /v1/meetings/upcoming` | `getUpcomingMeetings` | Upcoming meetings; Swagger does not limit it to three days |
| `POST /v1/meetings/search` | `searchMeetings` | Paginated keyword search alternative |
| `GET /v1/meetings/{meetingCode}` | `getMeetingByCode` | Authoritative meeting details |
| `GET /v1/leads/{uniqueLeadId}` | `getLeadDetails` | Lead details, if a usable `uniqueLeadId` is available |

Swagger also exposes `POST /v1/leads/search` and `POST /v1/leads/filter`, but their `LeadResponse` does not contain enough meeting information to directly replace the current task cards.

---

## 11. Required DTOs

- `ApiResponseListMeetingResponse`
- `MeetingResponse`
- `ApiResponseListMeetingDetailResponse`
- `MeetingDetailResponse`
- `MeetingSearchRequest`
- `Pageable`
- `ApiResponsePageResponseMeetingSummaryResponse`
- `PageResponseMeetingSummaryResponse`
- `MeetingSummaryResponse`
- `ApiResponseMeetingDetailResponse`
- `LocalTime`
- `ApiResponseLeadDetailResponse`
- `LeadDetailResponse`
- `AuditInfoDto`
- Existing component-facing `SalesTask`

---

## 12. Backend response to existing UI mapping

| `SalesTask` field | Backend source | Status |
|---|---|---|
| `id` | `meetingCode` | Direct stable string mapping |
| `name` | `clientName` | Direct |
| `phone` | `mobileNumber` | Direct |
| `locationText` | `meetingLocation`, `address`, or `googleLocation` | Fallback precedence requires confirmation |
| `coordinates` | Possibly parsed from `googleLocation` | Numeric fields are missing |
| `hasLocationPin` | Derived from usable location data | Not supplied |
| `meetingStage` | `meetingNumber` | Convert to `1st Meeting`, `2nd Meeting`, etc. |
| `remarks` | `meetingRemarks`, `meetingNotes`, or `discussion` | Authoritative field is unclear |
| `lastUpdated` | No queue field | Missing |
| `nextFollowUpDate` | `nextMeetingDate` and `nextMeetingTime` | Requires formatting |
| `schedule` | Derived from date/status | Business rules are not documented |
| `email` | Not in meeting queue | Missing |
| `profession` | Not documented | Missing |
| `ageGroup` | Not documented | Missing |
| `priorInvestment` | Not documented | Missing |
| `adviceMode` | Not documented | Missing |
| `kids` | Not documented | Missing |
| `bestFollowUpTime` | Not documented | Missing |
| `leadQualification` | Possibly `clientInterestLevel` | Semantic match is unconfirmed |
| `maritalStatus` | Not documented | Missing |
| `visitingCardImage` | `visitingCard` | Direct if it is a usable URL |
| `adBoardImage` | No backend field | Missing |

Backend date and `LocalTime` values must be formatted into the existing display strings. Swagger does not directly return `Today`, `Pending`, or `Future 3 Days` classifications.

---

## 13. Files that will require modification

### Definitely required

| File | Required change |
|---|---|
| `src/modules/salesManager/tasks/SalesManagerTasksScreen.tsx` | Replace direct mock dependency with service-provided tasks and API states |
| `src/modules/salesManager/tasks/types/tasks.ts` | Add mapping-related types while retaining `SalesTask` |
| `src/api/lead.ts` or a matching meeting API layer | Add authenticated meeting queue calls |
| `src/services/LeadService.ts` or a matching meeting service layer | Add queue request state and orchestration |
| `src/types/lead.ts` or matching meeting DTO types | Add Swagger meeting DTOs |

### May be required for detail integration

| File | Reason |
|---|---|
| `App.tsx` | Store stable meeting identifiers and pass loading/detail callbacks |
| `src/modules/salesManager/tasks/SalesManagerLeadDetailScreen.tsx` | Load authoritative meeting or lead details |
| `src/modules/salesManager/forms/LeadWorkflowForm.jsx` | Only when meeting update integration requires backend identifiers |

### Mock files

`salesTasksData.ts` will stop being imported after integration. `taskFilterOptions.ts` can remain because it defines the unchanged UI choices.

`SalesTaskCard.tsx`, shell, theme, Dashboard, and navigation can remain unchanged if the mapping layer produces a complete `SalesTask`.

---

## 14. Recommended integration order

1. Confirm whether `GET /v1/meetings` is scoped to the authenticated Sales Manager.
2. Confirm Pending, Future 3 Days, and accepted `status` semantics.
3. Confirm `googleLocation` format and coordinate availability.
4. Confirm `meetingCode` and lead `uniqueLeadId` relationships.
5. Add Swagger meeting DTOs.
6. Add authenticated `GET /v1/meetings` API handling.
7. Add queue loading, data, and error service state.
8. Implement backend-to-`SalesTask` mapping.
9. Connect `SalesManagerTasksScreen` without changing its UI.
10. Connect `search` to the backend.
11. Map stage labels to `sequence=1...10`.
12. Connect task-type filters using confirmed backend rules.
13. Verify phone, WhatsApp, maps, detail, and Update Form actions.
14. Load meeting details through `GET /v1/meetings/{meetingCode}`.
15. Load lead details only after the identifier contract is confirmed.
16. Remove the `salesTasksData` import while leaving unrelated mocks untouched.

---

## Backend contract blockers

Swagger does not establish:

- Whether the queue is scoped to the authenticated Sales Manager.
- The accepted values and meaning of `status`.
- The exact meaning of Pending.
- Whether Upcoming means the next three days.
- Numeric latitude and longitude.
- The format of `googleLocation`.
- A queue-level last-modified timestamp.
- Which remarks field is authoritative.
- How `leadId` or `leadCode` maps to `uniqueLeadId`.
- Profession, age group, prior investment, advice mode, kids, follow-up preference, marital status, or ad-board image.
- Whether `clientInterestLevel` equals Hot/Medium/Cold qualification.
- Whether meeting sequences can exceed ten.

Until these points are confirmed, the meeting queue can replace most mock card data but cannot reproduce every existing task-card and detail-screen field solely from the documented Swagger contract.
