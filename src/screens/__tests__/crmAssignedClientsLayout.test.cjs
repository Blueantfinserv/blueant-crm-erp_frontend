const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../../..');

test('CRM screens use a fixed shell so the client rows own vertical scrolling', () => {
  const app = fs.readFileSync(path.join(root, 'App.tsx'), 'utf8');
  const dashboardRoute = app.slice(app.indexOf("case 'dashboard':"), app.indexOf("case 'dashboard-list':"));
  const leadsRoute = app.slice(app.indexOf("case 'leads':"), app.indexOf("case 'client-work-follow':"));
  assert.ok(dashboardRoute.includes("scrollable: experience !== 'SALES_COORDINATOR' && experience !== 'CRM_ONBOARDING'"));
  assert.ok(leadsRoute.includes("scrollable: !isSalesWorkspaceExperience(experience) && experience !== 'CRM_ONBOARDING'"));

  const screen = fs.readFileSync(path.join(root, 'src/screens/CrmOnboardingScreen.tsx'), 'utf8');
  const assignedClientList = screen.slice(screen.indexOf('function AssignedClientList'), screen.indexOf('function AssignmentHeaderFilters'));
  assert.match(assignedClientList, /<ScrollView horizontal[^>]*>[\s\S]*?<FlatList/);
  assert.ok(assignedClientList.includes('data={pageClients}'));
  assert.ok(assignedClientList.includes('loading && !pageClients.length'));
  assert.ok(assignedClientList.includes('error && !visibleClients.length'));
  assert.ok(screen.includes('table: { flex: 1, minWidth: 1050 }'));
  assert.ok(screen.includes('row: { flexDirection: \'row\', alignItems: \'center\', minHeight: 34'));
  assert.ok(screen.includes('paddingVertical: 5, fontSize: 13'));
  assert.ok(screen.includes('details: { minHeight: 26'));
  assert.ok(assignedClientList.includes("'PAN number'"));
  assert.equal(assignedClientList.includes("'Role'"), false);
  assert.equal(assignedClientList.includes('client.assignedEmployeeRole ? roleLabel'), false);
  assert.ok(assignedClientList.includes('show(client.panNumber)'));
  assert.ok(assignedClientList.includes('panNumber: client.panNumber'));
  assert.ok(assignedClientList.includes('mobile: client.mobileNumber'));
  assert.ok(screen.includes("name: { fontSize: 11, fontWeight: '800'"));
  assert.ok(screen.includes('crmAssignmentApi.getTargets()'));
  assert.ok(screen.includes('targets={assignedClientTargets} filters={clientFilters}'));
  assert.ok(screen.includes('assignedEmployeeName: target?.fullName'));
  assert.ok(screen.includes('assignedEmployeeRole: target?.role'));
  assert.ok(screen.includes("role === 'RM' || role === 'RELATIONSHIP_MANAGER'"));
  assert.equal(assignedClientList.includes('Employee directory could not be loaded'), false);
});
