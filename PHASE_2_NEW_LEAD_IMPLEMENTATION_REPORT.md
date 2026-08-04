# Phase 2 Analysis: Existing New Lead Workflow

No code was modified. Scope is limited to the existing New Lead workflow and Swagger `POST /v1/leads`.

---

## 1. Current workflow

There are two New Lead entry points:

```text
Successful Sales Manager login
  ├─ Dashboard
  │   └─ Quick Actions → New Lead
  │
  └─ Your Task
      └─ New Lead button
          ↓
App.tsx sets leadForm = { type: "new-lead" }
          ↓
App.tsx opens Modal
          ↓
LeadWorkflowForm renders in new-lead mode
          ↓
User completes form
          ↓
Create Lead
          ↓
submit()
          ↓
validate()
          ↓
onSubmit(payload)
          ↓
onClose()
```

At present, `App.tsx` does not pass `onSubmit`. The default no-op callback executes and the modal closes without creating a lead.

---

# 2. Every file involved

## Direct workflow files

| File | Responsibility |
|---|---|
| `App.tsx` | Owns modal state, opens New Lead form, passes props, and closes the form |
| `src/modules/salesManager/forms/LeadWorkflowForm.jsx` | Renders the form, holds state, validates fields, captures location, creates payload, and submits |
| `src/screens/DashboardScreen.tsx` | Connects the Dashboard New Lead action to `App.tsx` |
| `src/modules/salesManager/tasks/SalesManagerTasksScreen.tsx` | Provides the New Lead button on Your Tasks |

## Dashboard entry-point files

| File | Responsibility |
|---|---|
| `src/modules/salesManager/dashboard/components/SalesActivitySection.tsx` | Renders Sales Activity cards |
| `src/modules/salesManager/dashboard/components/SalesActivityCard.tsx` | Renders the clickable New Lead quick action |
| `src/modules/salesManager/dashboard/mock/salesActivityData.ts` | Defines the `new-lead` quick-action ID and label |
| `src/modules/salesManager/dashboard/types/dashboard.ts` | Defines the dashboard activity-card types |

## Form dependency files

| File | Responsibility |
|---|---|
| `PreviewMap.native.jsx` | Native map implementation used by the location field |
| `PreviewMap.web.jsx` | Web map implementation used by the location field |
| `src/types/auth.ts` | Supplies authenticated-user information indirectly through the application, but does not define lead DTOs |
| `src/services/SecureStorageService.ts` | Stores the access token that will eventually be required for authenticated lead creation |

## Shell files surrounding the workflow

| File | Responsibility |
|---|---|
| `src/layout/AppShell.tsx` | Wraps Dashboard and Your Tasks |
| `src/layout/TopNavigation.tsx` | Provides navigation and logout controls |
| `src/layout/navigationTypes.ts` | Defines top-navigation types |

## Current mock data file related to the post-create task list

| File | Responsibility |
|---|---|
| `src/modules/salesManager/tasks/mock/salesTasksData.ts` | Supplies the static task list; a newly created lead is not added here |
| `src/modules/salesManager/tasks/types/tasks.ts` | Defines the current `SalesTask` frontend model |

---

# 3. Components involved

## Entry-point components

- `DashboardScreen`
- `SalesActivitySection`
- `SalesActivityCard`
- `SalesManagerTasksScreen`

## Modal orchestration

- React Native `Modal`
- Outer modal-backdrop `Pressable`
- Inner modal-content `Pressable`

## New Lead form components

- `LeadWorkflowForm`
- `Field`
- `Input`
- `Select`
- `LocationField`
- `MapView`
- `Marker`
- `KeyboardAvoidingView`
- `ScrollView`
- `LinearGradient`
- Create Lead `Pressable`

The following components exist in the same form file but are not rendered in New Lead mode:

- `ChoiceGroup`
- `ImageQuestion`
- `CompactCalendar`

They belong to meeting-update modes.

---

# 4. Props passed from `App.tsx`

`App.tsx` currently renders:

```tsx
<LeadWorkflowForm
  key={`${leadForm.type}-${leadForm.lead?.id ?? 'new'}`}
  type={leadForm.type}
  lead={leadForm.lead}
  onClose={() => setLeadForm(null)}
/>
```

| Prop | New Lead value | Purpose |
|---|---|---|
| `key` | `new-lead-new` | Forces a clean component instance for the modal |
| `type` | `"new-lead"` | Selects New Lead fields and validation |
| `lead` | `undefined` | No existing lead is supplied |
| `onClose` | `() => setLeadForm(null)` | Closes the modal |
| `onSubmit` | Not passed | Would receive the generated payload |

`key` is a React reconciliation attribute and is not received as a regular component prop.

---

# 5. Mock and no-op props

| Prop/callback | Current status |
|---|---|
| `type` | Real local state; not mock |
| `lead` | Intentionally undefined for a new lead |
| `onClose` | Functional local callback |
| `onSubmit` | Omitted by `App.tsx` |
| Default `onSubmit = () => {}` | No-op |
| Dashboard `onCreateNewLead` | Functional; opens the modal |
| Your Tasks `onCreateNewLead` | Functional; opens the modal |

The form itself is currently frontend-only. It generates data but makes no HTTP request.

---

# 6. Function executed after Create Lead

The Create Lead button executes:

```text
submit()
```

Current sequence inside `submit()`:

1. Calls `validate()`.
2. Stops if validation fails.
3. Calls `onSubmit()` with the generated payload.
4. Calls `onClose()`.
5. Modal closes.

Because `App.tsx` does not pass `onSubmit`, the component’s default no-op function is called.

---

# 7. Does `App.tsx` provide `onSubmit`?

No.

`App.tsx` passes:

- `type`
- `lead`
- `onClose`

It does not pass `onSubmit`.

Therefore:

- No request is sent.
- No response is handled.
- No loading state is applied for lead creation.
- No API error is displayed.
- No created lead is stored.
- The task list is not refreshed.
- The modal closes as though creation succeeded.

---

# 8. Current generated payload

For New Lead mode, `submit()` currently generates an object equivalent to:

```text
type: "new-lead"
leadId: undefined

name
number
leadSource
remarks
locationText

meetingStatus
leadStatus
joinedMode
joinedWith
nextPlanDate

panNumber
amount
investmentType

leadEmail
profession
ageGroup
bestFollowUpTime
leadQualification
kids
maritalStatus
priorInvestment
priorInvestmentDetails
adviceMode

coordinates
hasLocationPin

images:
  visitingCard
  adBoard
```

Initial values for fields that are not visible in New Lead mode are still included:

| Field | Initial payload value |
|---|---|
| `meetingStatus` | `""` |
| `leadStatus` | `""` |
| `joinedMode` | `"Alone"` |
| `joinedWith` | `""` |
| `nextPlanDate` | `""` |
| `panNumber` | `""` |
| `amount` | `""` |
| `investmentType` | `""` |
| `leadEmail` | `""` |
| `profession` | `""` |
| `ageGroup` | `""` |
| `bestFollowUpTime` | `""` |
| `leadQualification` | `""` |
| `kids` | `""` |
| `maritalStatus` | `""` |
| `priorInvestment` | `""` |
| `priorInvestmentDetails` | `""` |
| `adviceMode` | `""` |
| `coordinates` | `null`, unless selected |
| `hasLocationPin` | Based on `coordinates` |
| `images.visitingCard` | `null` |
| `images.adBoard` | `null` |

This is a general-purpose workflow payload, not a `CreateLeadRequest`.

---

# 9. Current validation

New Lead mode validates these fields:

| Frontend field | Current validation |
|---|---|
| `name` | Must contain non-whitespace text |
| `number` | Must match `^\+?[\d\s-]{10,}$` |
| `leadSource` | Must be selected |
| `remarks` | Must contain non-whitespace text |
| `locationText` | Must contain non-whitespace text |

Not validated in New Lead mode:

- Name minimum/maximum length
- Exact Indian mobile-number format
- Location maximum length
- Email
- Alternate mobile number
- Coordinates, because the location pin is optional
- Images, because image controls are not rendered

---

# 10. Swagger `POST /v1/leads` contract

Request schema: `CreateLeadRequest`

## Required fields

- `clientName`
- `mobileNumber`
- `location`
- `leadSource`

## Optional fields

- `alternateMobileNumber`
- `email`

## Exact backend constraints

| Backend field | Constraint |
|---|---|
| `clientName` | Required; 2–100 characters |
| `mobileNumber` | Required; `^[6-9]\d{9}$` |
| `alternateMobileNumber` | Optional; empty or `^[6-9]\d{9}$` |
| `email` | Optional; 0–100 characters |
| `location` | Required; maximum 100 characters |
| `leadSource` | Required backend enum |

Backend lead-source enum:

- `WEBSITE`
- `GOOGLE`
- `FACEBOOK`
- `INSTAGRAM`
- `LINKEDIN`
- `YOUTUBE`
- `WHATSAPP`
- `WALK_IN`
- `REFERRAL`
- `EMPLOYEE_REFERRAL`
- `TELE_CALLING`
- `FIELD_VISIT`
- `BRANCH`
- `SEMINAR`
- `EVENT`
- `EMAIL_CAMPAIGN`
- `SMS_CAMPAIGN`
- `CHANNEL_PARTNER`
- `BUSINESS_PARTNER`
- `IMPORT`
- `API`
- `MANUAL`
- `OTHER`

---

# 11. Fields that match the backend request

## Exact property-name match

Only one current frontend payload property has the same name:

- `leadSource`

However, its values do not fully match the backend enum.

## Semantic matches requiring renaming

| Frontend | Backend |
|---|---|
| `name` | `clientName` |
| `number` | `mobileNumber` |
| `locationText` | `location` |
| `leadEmail` | `email` |

`leadEmail` is present in form state but is not displayed or populated in New Lead mode.

## Lead-source value comparison

| Frontend value | Exact backend equivalent |
|---|---|
| `Referral` | `REFERRAL` |
| `Website` | `WEBSITE` |
| `Walk-in` | `WALK_IN` |
| `Other` | `OTHER` |
| `Social Media` | No single exact backend enum |
| `Cold Call` | No exact enum named `COLD_CALL` |

The backend offers individual social channels and `TELE_CALLING`, but the frontend currently uses broader display values. Mapping cannot be based on exact equality for all current options.

---

# 12. Frontend fields absent from `CreateLeadRequest`

These generated frontend properties do not exist in the backend create-lead request:

- `type`
- `leadId`
- `remarks`
- `locationText` under that name
- `name` under that name
- `number` under that name
- `meetingStatus`
- `leadStatus`
- `joinedMode`
- `joinedWith`
- `nextPlanDate`
- `panNumber`
- `amount`
- `investmentType`
- `leadEmail` under that name
- `profession`
- `ageGroup`
- `bestFollowUpTime`
- `leadQualification`
- `kids`
- `maritalStatus`
- `priorInvestment`
- `priorInvestmentDetails`
- `adviceMode`
- `coordinates`
- `hasLocationPin`
- `images`
- `images.visitingCard`
- `images.adBoard`

`remarks` appears in `LeadResponse`, but it is not part of Swagger `CreateLeadRequest`.

Coordinates are also not part of `CreateLeadRequest`.

---

# 13. Backend fields missing from the frontend

## Missing exact request properties

- `clientName`
- `mobileNumber`
- `alternateMobileNumber`
- `email`
- `location`

Some have semantic frontend equivalents, but no exact DTO mapping currently exists.

## Missing UI fields

| Backend field | Frontend status |
|---|---|
| `alternateMobileNumber` | No form field or state |
| `email` | State exists as `leadEmail`, but the input is not rendered in New Lead mode |

## Semantically available but not mapped

| Backend field | Available frontend value |
|---|---|
| `clientName` | `name` |
| `mobileNumber` | `number` |
| `location` | `locationText` |
| `leadSource` | `leadSource`, but values require contract alignment |

Because alternate mobile and email are optional, the existing visible form can satisfy all required business fields after mapping and validation alignment.

---

# 14. Validation mismatches

| Contract area | Frontend | Backend |
|---|---|---|
| Client name | Non-empty | 2–100 characters |
| Mobile number | Allows optional `+`, spaces and hyphens, minimum digit-like length | Exactly 10 digits beginning with 6–9 |
| Location | Non-empty | Required and maximum 100 characters |
| Lead source | Any selected frontend option | Must be one of the documented enum values |
| Email | Not rendered or validated in New Lead mode | Optional, maximum 100 characters |
| Alternate mobile | Not present | Optional strict mobile format |
| Remarks | Required | Not present in create request |
| Coordinates | Optional frontend value | Not accepted |
| Images | Included as nulls | Not accepted |

---

# 15. Images and location handling

## Current frontend behavior

The generated local payload includes everything together:

```text
form fields
coordinates
hasLocationPin
images
```

Therefore, at the JavaScript callback level, location coordinates and image objects are bundled into the same payload.

However:

- New Lead mode does not render image selectors.
- Both image values remain `null`.
- The payload is never transmitted.

## Backend behavior

`POST /v1/leads` accepts `application/json`.

It accepts:

- `location` as a string

It does not accept:

- Latitude
- Longitude
- `hasLocationPin`
- Visiting-card image
- Ad-board image
- Multipart files

Swagger separately defines:

```text
Upload Document
POST /v1/documents
multipart/form-data
file
```

Therefore:

- Textual location belongs in the create-lead request.
- Coordinates cannot be submitted through `POST /v1/leads`.
- Images cannot be submitted through `POST /v1/leads`.
- Any document/image upload would be a separate multipart request.
- Swagger does not document how an uploaded document is associated with the newly created lead.
- No backend operation in the supplied contract accepts New Lead coordinates.

---

# 16. Response available after creation

`POST /v1/leads` returns `ApiResponseLeadResponse`, containing a `LeadResponse`.

Relevant returned fields include:

- `leadId`
- `leadCode`
- `uniqueLeadId`
- `clientName`
- `mobileNumber`
- `email`
- `location`
- `companyName`
- `leadSource`
- `leadStatus`
- `leadStage`
- `priority`
- `duplicateLeadStatus`
- Assigned-user information
- `nextPlanDate`
- `remarks`

The frontend currently has no response type, response mapping, or state update for this object.

---

# 17. Files requiring modification for integration

## Definitely requires modification

### `App.tsx`

Reason:

- Must provide the missing `onSubmit` callback.
- Must invoke lead creation.
- Must handle success and failure.
- Must determine whether and when the modal closes.
- Must refresh or update the visible task/dashboard data after success.

### `src/modules/salesManager/forms/LeadWorkflowForm.jsx`

Reason:

- Current New Lead payload is not a backend request.
- Validation does not match backend constraints.
- Lead-source values do not fully match the backend enum.
- The form currently closes immediately after calling `onSubmit`.
- It has no create-request loading/error behavior.
- It includes unrelated meeting and conversion fields in its generated payload.

### Lead API integration file

There is currently no lead API module.

A lead API integration file will be required to:

- Send `POST /v1/leads`
- Add the authenticated Bearer access token
- Serialize `CreateLeadRequest`
- Parse `ApiResponseLeadResponse`
- Convert backend errors into frontend errors

### Lead request/response type file

The current `SalesTask` type is not equivalent to either:

- `CreateLeadRequest`
- `LeadResponse`

Swagger-compatible request and response types will be required.

## May require modification after successful creation

### `src/modules/salesManager/tasks/SalesManagerTasksScreen.tsx`

Reason:

- Currently reads static `salesTasksData`.
- A successfully created lead cannot appear without replacing or refreshing that source.

### `src/modules/salesManager/tasks/types/tasks.ts`

Reason:

- The task model differs from the backend `LeadResponse`.
- A mapping will be needed if the created response is inserted into the task screen.

### `src/screens/DashboardScreen.tsx`

Only required if dashboard lead counts must refresh immediately after creation. Its existing `onCreateNewLead` wiring already opens the modal correctly.

## Files that do not require changes merely to send the request

- `src/modules/salesManager/dashboard/components/SalesActivitySection.tsx`
- `src/modules/salesManager/dashboard/components/SalesActivityCard.tsx`
- `src/layout/AppShell.tsx`
- `src/layout/TopNavigation.tsx`
- `PreviewMap.native.jsx`
- `PreviewMap.web.jsx`

Their current interaction wiring is sufficient.

---

# 18. Exact integration order

## Step 1: Define the backend contracts

Add representations for:

- `CreateLeadRequest`
- `LeadResponse`
- `ApiResponseLeadResponse`
- Backend lead-source enum

No UI behavior should be changed at this step.

## Step 2: Add the lead API operation

Implement:

- Create lead
- JSON serialization
- Bearer access-token attachment
- Response-envelope parsing
- Backend error propagation

## Step 3: Establish exact field mapping

Map:

```text
name         → clientName
number       → mobileNumber
locationText → location
leadEmail    → email
leadSource   → backend leadSource enum
```

Do not send unrelated workflow fields.

## Step 4: Align New Lead validation

Align:

- Client-name length
- Indian mobile-number pattern
- Location maximum length
- Backend lead-source values
- Optional email constraints if email becomes available in New Lead mode

Keep meeting-update validation separate and untouched.

## Step 5: Connect `App.tsx`

Pass a real `onSubmit` callback to `LeadWorkflowForm`.

The callback must:

1. Receive the New Lead form values.
2. Construct `CreateLeadRequest`.
3. Call the create-lead API.
4. Receive `LeadResponse`.
5. Propagate success or failure appropriately.

## Step 6: Correct submission lifecycle

Creation must no longer appear successful before the API succeeds.

The request lifecycle needs to distinguish:

- Submitting
- Successful creation
- Validation failure
- Backend failure

The modal should close only after confirmed creation.

## Step 7: Update the visible lead/task data

After success:

- Refresh the assigned-task source, or
- Insert a mapped created lead into the current data source

The current static `salesTasksData` cannot reflect the result.

## Step 8: Refresh dashboard lead totals

If immediate consistency is required, refresh:

- Lead Collected count
- Lead Collected List
- Related Sales Manager dashboard summaries

## Step 9: Handle location contract boundaries

Send only:

```text
location: locationText
```

Do not include coordinates in `POST /v1/leads`.

Coordinate persistence requires a separate documented backend contract.

## Step 10: Handle images separately

Do not include images in `POST /v1/leads`.

If New Lead image upload is later enabled:

1. Create the lead first.
2. Obtain `leadId` or `uniqueLeadId`.
3. Upload files separately.
4. Associate uploaded documents with the lead using a backend contract that is not currently documented.

---

# Final assessment

The existing New Lead UI already collects the four required business values:

- Client name
- Mobile number
- Lead source
- Location

However, none are currently transformed into a `CreateLeadRequest`, and lead-source options are only partially compatible.

The immediate integration blockers are:

- Missing `onSubmit` callback
- Missing lead API layer
- Missing request/response DTOs
- Property-name mismatches
- Lead-source value mismatches
- Validation mismatches
- Immediate modal closure
- Static task data
- No documented coordinate persistence
- No documented lead-to-document association for separate uploads
