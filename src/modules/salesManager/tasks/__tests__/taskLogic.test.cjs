// Run: node --test src/modules/salesManager/tasks/__tests__/taskLogic.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

// The pure task modules need no React Native runtime or additional test dependency.
require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  module._compile(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, filename);
};
const dates = require('../taskDateUtils.ts');
const { filterSalesTasks, getTaskFilterCounts } = require('../taskFilters.ts');
const { mapLeadToSalesTask, mapClientToSalesTask, mapMeetingToSalesTask } = require('../taskMappers.ts');

function task(id, taskKind, offset, extra = {}) {
  const date = offset === undefined ? undefined : dates.calendarDateOffset(offset);
  return { id, taskKind, name: 'Alice', phone: '98765 43210', assignedAt: date,
    scheduledAt: date, nextPlanDate: date,
    schedule: offset === undefined ? 'Unscheduled' : offset < 0 ? 'Pending' : offset === 0 ? 'Today' : offset <= 3 ? 'Future 3 Days' : 'Later',
    ...extra };
}
const tasks = [task('past', 'LEAD', -1), task('today', 'LEAD', 0),
  task('tomorrow', 'CLIENT', 1), task('third', 'MEETING', 3, { meetingTitle: '1st Meeting' }),
  task('fourth', 'MEETING', 4), task('missing', 'CLIENT', undefined)];
function select(overrides = {}) {
  return filterSalesTasks({ tasks, allLeadTasks: tasks.filter(t => t.taskKind === 'LEAD'),
    search: '', taskType: 'All Tasks', taskStage: 'Meetings', leadFilter: 'All Prospects',
    meetingFilter: 'All Meetings', allTaskFilter: 'All Task', futureDayFilter: 'Tomorrow', ...overrides }).map(t => t.id);
}

test('assignment date boundaries preserve Today, Pending and Future 3 Days', () => {
  for (const offset of [-1, 0, 1, 2, 3, 4]) {
    const date = dates.calendarDateOffset(offset);
    assert.equal(dates.matchesAssignmentTaskFilter(date, 'Today'), offset === 0);
    assert.equal(dates.matchesAssignmentTaskFilter(date, 'Pending'), offset < 0);
    assert.equal(dates.matchesAssignmentTaskFilter(date, 'Future 3 Days'), offset >= 1 && offset <= 3);
  }
  assert.equal(dates.matchesAssignmentTaskFilter(undefined, 'Pending'), true);
  assert.equal(dates.matchesAssignmentTaskFilter(undefined, 'Today'), false);
});
test('task views retain their distinct date rules', () => {
  assert.deepEqual(select({ todaysTaskMode: true }), ['today']);
  assert.deepEqual(select({ pendingTaskMode: true }), ['past', 'missing']);
  assert.deepEqual(select({ taskToDoMode: true }), ['past', 'today', 'missing']);
  assert.deepEqual(select({ future3DaysTaskMode: true }), ['tomorrow']);
  assert.deepEqual(select({ future3DaysTaskMode: true, futureDayFilter: 'In 3 Days' }), ['third']);
});
test('all tasks, prospects and meeting title filters remain distinct', () => {
  assert.equal(select({ allTaskMode: true }).length, 6);
  assert.deepEqual(select({ allTaskMode: true, allTaskFilter: 'Clients' }), ['tomorrow', 'missing']);
  assert.deepEqual(select({ allLeadsMode: true }), ['past', 'today']);
  assert.deepEqual(select({ meetingFilter: '1st Meeting' }), ['third']);
});
test('search supports names, formatted phones and codes in the supported views', () => {
  assert.equal(select({ allTaskMode: true, search: ' ALICE ' }).length, 6);
  assert.equal(select({ allTaskMode: true, search: '98765-43210' }).length, 6);
  const coded = [task('coded', 'LEAD', 0, { uniqueLeadId: 'LD-42' })];
  assert.deepEqual(select({ tasks: coded, allTaskMode: true, search: 'ld-42' }), ['coded']);
  assert.deepEqual(select({ tasks: coded, taskStage: 'Leads', search: 'ld-42' }), []);
});
test('filter counts retain stage totals and search/date restrictions', () => {
  const counts = getTaskFilterCounts(tasks, '', 'All Tasks');
  assert.deepEqual(counts, { todayLeads: 1, activeLeads: 2, removedLeads: 0, meetings: 2, meetingsByTitle: { '1st Meeting': 1 } });
  assert.equal(getTaskFilterCounts(tasks, '', 'Today').activeLeads, 1);
  assert.equal(getTaskFilterCounts(tasks, 'Nobody', 'All Tasks').meetings, 0);
});
test('lead and client mapping retain identifiers and scheduling precedence', () => {
  const lead = mapLeadToSalesTask({ uniqueLeadId: 'LD-7', clientName: 'Test', nextPlanDate: '2026-10-30', assignmentDate: '2026-10-28' }, 0, '2026-11-02');
  assert.equal(lead.id, 'LD-7');
  assert.equal(lead.scheduledAt, '2026-11-02');
  assert.equal(lead.assignedAt, '2026-10-28');
  const client = mapClientToSalesTask({ clientCode: 'CL-8', activeMeetingDate: '2026-11-01', assignmentDate: '2026-10-28' }, 0);
  assert.equal(client.id, 'CL-8');
  assert.equal(client.scheduledAt, '2026-11-01');
});
test('meeting mapping retains location fallback and previous meeting date', () => {
  const result = mapMeetingToSalesTask({ meetingCode: 'MT-9', meetingDate: '2026-10-30' }, 0,
    { leadId: 7 }, { address: 'Clinic', latitude: 28, longitude: 77 }, '2026-10-20');
  assert.equal(result.id, 'MT-9');
  assert.equal(result.leadId, 7);
  assert.equal(result.locationText, 'Clinic');
  assert.deepEqual(result.coordinates, { latitude: 28, longitude: 77 });
  assert.equal(result.hasLocationPin, true);
  assert.equal(result.lastUpdated, '20 Oct');
});
