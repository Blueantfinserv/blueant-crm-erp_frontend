# Meeting Swagger Change Audit

## Audit sources

- Previous baseline: `PHASE_4_FIRST_MEETING_INTEGRATION_AUDIT.yml`
- Previous Swagger snapshot: `assets/swagger.json`
- Latest published Swagger: <https://blueant-crm-erp.up.railway.app/api/v3/api-docs>

No project code files were modified.

## Executive conclusion

The Meeting contract has materially changed.

The intended First Meeting workflow is now substantially clearer:

1. `POST /v1/meetings` creates the meeting.
2. Its `ApiResponseMeetingResponse.data.meetingCode` identifies the created meeting.
3. `POST /v1/meetings/{meetingCode}/workflow-update` submits conducted/not-conducted status, lead disposition, investment details, next-plan information, and GPS location.

However, the complete frontend implementation is still not fully determinable from Swagger. Important conditional rules, stage/card transition behavior, several form-field destinations, and upload handling remain undocumented.

## New changes

### New Meeting endpoints

None.

The latest Swagger adds no Meeting endpoint relative to the previous Swagger snapshot.

### Removed Meeting endpoints

| Removed endpoint | Previous purpose |
|---|---|
| `POST /v1/meetings/{meetingCode}/reject` | Mark a meeting rejected |
| `POST /v1/meetings/{meetingCode}/outcome` | Update meeting outcome |
| `POST /v1/meetings/{meetingCode}/complete` | Complete a meeting with converted status |
| `GET /v1/meetings/outcome/{outcome}` | Query meetings by outcome |

The verification rejection endpoint still exists:

`POST /v1/meetings/verification/{meetingCode}/reject`

It is a process-coordinator verification operation and is not a replacement for the removed general Meeting rejection endpoint.

### Changed endpoint purpose/workflow

`POST /v1/meetings/{meetingCode}/workflow-update`

Previous summary:

> Update meeting outcome and optionally schedule a follow-up (sales workflow)

Latest summary:

> Submit meeting workflow update (conducted/not conducted, lead status, GPS location)

This is a material workflow change:

- Meeting outcome is no longer part of the workflow DTO.
- Follow-up scheduling fields were removed.
- Conducted status, business lead status, investment data, next-plan information, and structured GPS data now drive the workflow.
- The endpoint is now much more directly aligned with the First Meeting form.

## Modified request DTOs

### `CreateMeetingRequest`

Removed:

- `meetingOutcome`

Changed enum:

- `meetingStatus` added `NOT_CONDUCTED`

Unchanged required fields:

- `leadId`
- `meetingMode`
- `meetingDate`
- `meetingTime`
- `meetingLocation`

### `UpdateMeetingRequest`

Removed:

- `meetingOutcome`

Changed enum:

- `meetingStatus` added `NOT_CONDUCTED`

Required fields remain:

- `meetingCode`
- `meetingDate`
- `meetingTime`
- `meetingMode`
- `meetingLocation`

### `MeetingWorkflowRequest`

Major redesign.

Removed fields:

- `meetingOutcome`
- `scheduleNextMeeting`
- `nextMeetingDate`
- `nextMeetingTime`

Modified fields:

| Field | Previous | Latest |
|---|---|---|
| `meetingConducted` | Boolean | String enum: `CONDUCTED`, `NOT_CONDUCTED` |
| `leadStatus` | Unrestricted string, max 50 | Enum: `ALREADY_CLIENT`, `CONVERTED_CLIENT`, `REMOVE_CLIENT`, `CLIENT_NOT_INTERESTED`, `WORK_IN_PROGRESS` |

Added fields:

- `reason: string`
- `nextPlanTime: LocalTime`
- `currentInvestmentCompany: string`
- `currentAdvisor: string`
- `investmentType: SIP | LUMPSUM | SIP_AND_LUMPSUM`
- `investmentCompany: string`
- `currentStage: string`
- `latitude: number`
- `longitude: number`
- `address: string`
- `accuracy: number/double`

Still present:

- Meeting date, time, and mode
- Discussion and remarks
- `completedStage`
- `clientStatus`
- Participant fields
- `nextPlanDate`
- PAN and investment amount
- `productType`
- Leader information

### Removed request DTOs

These schemas disappeared together with their endpoints:

- `CompleteMeetingRequest`
- `UpdateMeetingOutcomeRequest`

### Unchanged request DTOs

No material changes detected in:

- `RescheduleMeetingRequest`
- `CancelMeetingRequest`
- `MeetingSearchRequest`

## Modified response DTOs

### `MeetingResponse`

Removed:

- `meetingOutcome`

Added:

- `meetingConducted: CONDUCTED | NOT_CONDUCTED`
- `leadStatus: ALREADY_CLIENT | CONVERTED_CLIENT | REMOVE_CLIENT | CLIENT_NOT_INTERESTED | WORK_IN_PROGRESS`
- `reason`
- `currentInvestmentCompany`
- `currentAdvisor`
- `investmentType`
- `investmentCompany`
- `currentStage`
- `panNumber`
- `investmentAmount`
- `latitude`
- `longitude`
- `locationCapturedAt`
- `locationAccuracy`
- `googleMapsUrl`

Changed:

- `meetingStatus` added `NOT_CONDUCTED`

### `MeetingDetailResponse`

Removed:

- `meetingOutcome`
- Duplicate/alternate `outcome`

Added the same workflow, investment, and GPS fields introduced in `MeetingResponse`.

Changed:

- `meetingStatus` added `NOT_CONDUCTED`

### `MeetingSummaryResponse`

Removed:

- `meetingOutcome`
- `outcome`

Changed:

- `meetingStatus` added `NOT_CONDUCTED`

No replacement lead-status or meeting-conducted property appears in this summary DTO.

### `MeetingUpdateResponse`

Removed:

- `meetingOutcome`

Changed:

- `meetingConducted`: Boolean to `CONDUCTED | NOT_CONDUCTED`
- `leadStatus`: unrestricted string to defined business enum

Added:

- `reason`
- `nextPlanTime`
- `currentInvestmentCompany`
- `currentAdvisor`
- `investmentType`
- `investmentCompany`
- `currentStage`
- `address`
- `latitude`
- `longitude`
- `locationCapturedAt`
- `locationAccuracy`
- `googleMapsUrl`

## Required-field changes

### New required fields

None.

`MeetingWorkflowRequest` still declares no required properties.

### Removed required fields

None.

The required arrays for the retained request DTOs are unchanged.

Swagger does not document conditional requirements such as:

- Whether `reason` is mandatory for `NOT_CONDUCTED`
- Whether `nextPlanDate` and `nextPlanTime` are mandatory for `WORK_IN_PROGRESS`
- Whether PAN and investment fields are mandatory for `CONVERTED_CLIENT`
- Whether latitude and longitude must be supplied together
- Which participant fields are conditionally required

## Enum changes

### `meetingStatus`

Previous:

- `SCHEDULED`
- `COMPLETED`
- `RESCHEDULED`
- `CANCELLED`
- `NO_SHOW`

Latest:

- All previous values
- `NOT_CONDUCTED`

This resolves the previous ambiguity around representing “Meeting Not Conducted.”

### `meetingConducted`

Previous:

- Boolean

Latest:

- `CONDUCTED`
- `NOT_CONDUCTED`

This is a breaking wire-format change.

### Workflow `leadStatus`

Newly constrained to:

- `ALREADY_CLIENT`
- `CONVERTED_CLIENT`
- `REMOVE_CLIENT`
- `CLIENT_NOT_INTERESTED`
- `WORK_IN_PROGRESS`

These values align closely with frontend business labels, but they are not identical to the broader Lead status enum. For example:

- Workflow: `CONVERTED_CLIENT`; general Lead status: `CONVERTED`
- Workflow: `REMOVE_CLIENT`; general Lead status: `REMOVED`
- Workflow: `CLIENT_NOT_INTERESTED`; general Lead status: `NOT_INTERESTED`

The frontend must not reuse the general Lead-status constants for this request without an explicit mapping.

### `investmentType`

New enum:

- `SIP`
- `LUMPSUM`
- `SIP_AND_LUMPSUM`

### Meeting outcome enum

The outcome enum was not merely changed; it was removed from the principal Meeting creation, update, workflow, and response contracts, and the outcome-specific endpoints were removed.

## Breaking changes

1. Existing calls to the removed outcome, reject, or complete endpoints will fail.
2. Sending `meetingOutcome` in creation, update, or workflow payloads is no longer supported by the published schema.
3. `meetingConducted` must change from a Boolean to the new string enum.
4. Workflow lead-status values now require a dedicated mapping.
5. Response consumers expecting `meetingOutcome` or `outcome` must be revised.
6. Summary/list UI cannot derive outcome from `MeetingSummaryResponse` anymore.
7. Follow-up scheduling can no longer use `scheduleNextMeeting`, `nextMeetingDate`, or `nextMeetingTime` through `MeetingWorkflowRequest`.
8. `NOT_CONDUCTED` must be accepted wherever `meetingStatus` is parsed or displayed.

## Impact on frontend

Positive changes:

- “Meeting Not Conducted” now has explicit representations.
- First Meeting lead-status choices now have explicit backend values.
- GPS no longer requires inventing a `googleLocation` string for workflow submission.
- `nextPlanTime` is now available alongside `nextPlanDate`.
- Current investment/advisor/company fields now have documented destinations.
- `MeetingResponse` explicitly contains `meetingCode`, so creation can supply the identifier required by the workflow-update call.

Required frontend revisions:

- Use a two-call First Meeting flow.
- Replace Boolean conducted mapping with `CONDUCTED`/`NOT_CONDUCTED`.
- Introduce workflow-specific lead-status mapping.
- Remove `meetingOutcome` from Meeting payload and response assumptions.
- Send structured `latitude`, `longitude`, `address`, and `accuracy`.
- Map investment UI to `investmentType` and the newly documented investment fields.
- Handle `NOT_CONDUCTED` in status badges and filtering.
- Do not rely on Meeting summaries for outcome display.

## Previous audit conclusions

### Conclusions that need revision

- **“Meeting Not Conducted has no clear enum mapping”** — resolved.
- **“WORK_IN_PROGRESS has no meetingOutcome mapping”** — obsolete because `meetingOutcome` was removed and `WORK_IN_PROGRESS` is now a valid workflow `leadStatus`.
- **“Coordinates require an undocumented googleLocation serialization”** — resolved for workflow updates through structured GPS fields.
- **“Create response may not provide meetingCode”** — resolved by `ApiResponseMeetingResponse.data.meetingCode`.
- **“Lead-status labels require mapping to the general Lead enum”** — revised: the workflow now defines its own explicit enum.
- **“Current investment data has no DTO destination”** — partially resolved.
- **“Workflow optionally schedules the next meeting”** — no longer valid; those scheduling controls were removed from the workflow DTO.

### Conclusions still valid

- No single endpoint handles the complete First Meeting submission.
- `POST /v1/meetings` remains the creation endpoint.
- Workflow update still requires an existing `meetingCode`.
- Create still requires mode, current meeting date/time, and meeting location.
- The API does not return a complete updated Lead/task-card object from workflow submission.
- Numbered card-stage behavior remains undocumented.
- `completedStage` and `currentStage` remain unrestricted strings with no documented accepted values.
- File handling remains unclear: workflow has no upload fields, while creation still exposes only a string `attachment`.
- Many Lead Profile fields still have no documented Meeting DTO destination.
- Conditional validation and transaction/rollback behavior remain undocumented.

## Is First Meeting now fully determinable?

No.

The core transport sequence is now determinable:

`POST /v1/meetings` → obtain `data.meetingCode` → `POST /v1/meetings/{meetingCode}/workflow-update`

The full implementation is not determinable because Swagger still does not define:

- Conditional field requirements by conducted status or lead status
- The accepted values and relationship of `completedStage` and `currentStage`
- How the card advances to “1st Meeting”
- Whether the task list must be refreshed from Leads, Meetings, or another source
- Whether the two calls are transactional
- What to do if creation succeeds but workflow update fails
- How visiting-card/ad-board files are uploaded
- Destinations for the remaining Lead Profile fields
- Whether `nextPlanDate/time` schedules a meeting or only records a plan
- Whether a separate `/schedule` call is required for a subsequent meeting

## Recommended implementation sequence

1. Update frontend contract models for the removed outcome fields and new enums.
2. Add dedicated mappings for `meetingConducted`, workflow `leadStatus`, and `investmentType`.
3. Map structured GPS and newly documented investment fields.
4. Implement meeting creation and retain `data.meetingCode`.
5. Submit the workflow update using that code.
6. Refresh authoritative Lead/task state only after both calls succeed.
7. Add explicit partial-failure handling between creation and workflow submission.
8. Defer card-stage derivation, conditional validation, uploads, and automatic next-meeting scheduling until the remaining Swagger ambiguities are resolved.
