const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function api(fetchResponse) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../crmAssignment.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const imports = name => name.includes('SecureStorageService')
    ? { SecureStorageService: { getToken: async () => 'test-session' } }
    : { requestWithSessionRefresh: async (token, callback) => callback(token) };
  new Function('require', 'exports', 'fetch', source)(imports, exports, fetchResponse);
  return exports.crmAssignmentApi;
}

const client = (clientCode, salesPersonCode, createdBySalesPersonCode) => ({
  clientCode,
  clientName: `Client ${clientCode}`,
  salesPersonCode,
  salesPersonName: salesPersonCode ? `Employee ${salesPersonCode}` : undefined,
  createdBySalesPersonCode,
});

test('CRM assigned clients read all 28 Spring Page pages and exclude unassigned records', async () => {
  const calls = [];
  const clientApi = api(async (url, init) => {
    calls.push(url);
    assert.ok(url.startsWith('https://blueant-crm-erp.up.railway.app/api/v1/clients?'));
    assert.ok(init.headers.Authorization);
    const pageNumber = Number(new URL(url).searchParams.get('page'));
    return {
      ok: true,
      status: 200,
      json: async () => ({
        content: [
          client(`C${pageNumber}`, `EMP${pageNumber}`, 'CRM01'),
          client(`UNASSIGNED${pageNumber}`, undefined, 'CRM01'),
        ],
        totalElements: 2741,
        totalPages: 28,
        number: pageNumber,
        size: 100,
        numberOfElements: 2,
      }),
    };
  });

  const clients = await clientApi.getAssignedClients();
  assert.equal(calls.length, 28);
  assert.deepEqual(calls.map(url => Number(new URL(url).searchParams.get('page'))), Array.from({ length: 28 }, (_, index) => index));
  assert.equal(clients.length, 28);
  assert.equal(clients[0].salesPersonCode, 'EMP0');
  assert.equal(clients.some(record => record.clientCode.startsWith('UNASSIGNED')), false);
});

test('CRM Assigned Clients still accepts the existing success/data envelope', async () => {
  const clientApi = api(async url => {
    const pageNumber = Number(new URL(url).searchParams.get('page'));
    return {
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          content: [client(`C${pageNumber}`, undefined, undefined), {
            clientCode: 'LEGACY',
            assignedSalesPersonCode: 'LEGACY01',
            assignedSalesPersonName: 'Legacy Employee',
          }],
          totalPages: 1,
          number: pageNumber,
        },
      }),
    };
  });

  const clients = await clientApi.getAssignedClients();
  assert.deepEqual(clients.map(record => record.clientCode), ['LEGACY']);
});

test('CRM Assigned Clients rejects malformed page responses', async () => {
  const malformedResponses = [
    { content: [client('C1', 'EMP1')], number: 0 },
    { content: 'not-an-array', totalPages: 1, number: 0 },
    { content: [null], totalPages: 1, number: 0 },
  ];
  for (const body of malformedResponses) {
    const clientApi = api(async () => ({
      ok: true,
      status: 200,
      json: async () => body,
    }));
    await assert.rejects(clientApi.getAssignedClients(), /CRM response format is invalid/);
  }
});

test('CRM employee directory returns RM and SC names with their roles', async () => {
  const requestedUrls = [];
  const clientApi = api(async (url, init) => {
    requestedUrls.push(url);
    if (url.endsWith('/v1/roles')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: [
            { id: 11, roleCode: 'RELATIONSHIP_MANAGER' },
            { id: 12, roleCode: 'SALES_COORDINATOR' },
          ],
        }),
      };
    }

    const requestBody = JSON.parse(init.body);
    const isManager = requestBody.roleId === 11;
    return {
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          content: [{
            id: isManager ? 101 : 202,
            employeeCode: isManager ? 'RM101' : 'SC202',
            fullName: isManager ? 'Riya Manager' : 'Sam Coordinator',
          }],
          totalPages: 1,
        },
      }),
    };
  });

  assert.deepEqual(await clientApi.getTargets(), [
    { id: 101, employeeCode: 'RM101', fullName: 'Riya Manager', role: 'RELATIONSHIP_MANAGER' },
    { id: 202, employeeCode: 'SC202', fullName: 'Sam Coordinator', role: 'SALES_COORDINATOR' },
  ]);
  assert.ok(requestedUrls.every(url => url.startsWith('https://blueant-crm-erp.up.railway.app/api/')));
});

test('CRM Assigned Clients reports genuine HTTP errors', async () => {
  const clientApi = api(async () => ({
    ok: false,
    status: 403,
    json: async () => ({ success: false, message: 'Access denied' }),
  }));
  await assert.rejects(clientApi.getAssignedClients(), /Access denied/);
});

test('Assigned client employee filters receive the assigned salesperson, not the creator', () => {
  const screen = fs.readFileSync(path.join(__dirname, '../../screens/CrmOnboardingScreen.tsx'), 'utf8');
  assert.ok(screen.includes("salesPersonEmployeeCode: client.salesPersonCode ?? client.assignedSalesPersonCode ?? ''"));
  assert.ok(screen.includes('assignedEmployeeName: client.salesPersonName ?? client.assignedSalesPersonName'));
  assert.equal(screen.includes('salesPersonEmployeeCode: client.createdBySalesPersonCode'), false);
});

test('other CRM requests retain the configured API host and response envelope', async () => {
  let requestedUrl;
  const clientApi = api(async url => {
    requestedUrl = url;
    return { ok: true, status: 200, json: async () => ({ success: true, data: { content: [], totalPages: 1 } }) };
  });
  await clientApi.findClientByMobile('9999999999');
  assert.ok(requestedUrl.startsWith(`${process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://api.blueantfinserv.com/api'}/v1/clients?`));
});

const deferred = () => { let resolve; const promise = new Promise(yes => { resolve = yes; }); return { promise, resolve }; };
const tick = () => new Promise(resolve => setImmediate(resolve));
const pageResponse = (page, totalPages = 6) => ({ ok: true, status: 200, json: async () => ({ content: [client('C' + page, 'RM1')], totalPages, number: page }) });

test('CRM clients publish first and out-of-order pages immediately with at most three later pages in flight', async () => {
 const requests = [], snapshots = [];
 let active = 0, peak = 0;
 const clientApi = api(async url => {
  const page = Number(new URL(url).searchParams.get('page'));
  if (!page) return pageResponse(0);
  const pending = deferred(); requests.push({ page, ...pending });
  active++; peak = Math.max(peak, active);
  const result = await pending.promise; active--; return result;
 });
 const read = clientApi.getAssignedClients({ onPage: records => snapshots.push(records.map(row => row.clientCode)) });
 await tick();
 assert.deepEqual(snapshots, [['C0']]); assert.equal(requests.length, 3);
 requests.find(row => row.page === 2).resolve(pageResponse(2));
 await tick(); assert.deepEqual(snapshots.at(-1), ['C0','C2']);
 for (let i = 0; i < requests.length; i++) { requests[i].resolve(pageResponse(requests[i].page)); await tick(); }
 assert.equal((await read).length, 6); assert.equal(peak, 3);
});

test('CRM clients preserve already published pages when a later page fails', async () => {
 const snapshots = [];
 const clientApi = api(async url => Number(new URL(url).searchParams.get('page')) === 0 ? pageResponse(0, 2)
  : { ok: false, status: 503, json: async () => ({ success: false, message: 'Server busy' }) });
 await assert.rejects(clientApi.getAssignedClients({ onPage: rows => snapshots.push(rows) }), /Server busy/);
 assert.equal(snapshots[0][0].clientCode, 'C0');
});

test('cancelled CRM client loads suppress late page publication and stop scheduling pages', async () => {
 const pending = [], snapshots = []; let valid = true;
 const clientApi = api(async url => {
  const page = Number(new URL(url).searchParams.get('page'));
  if (!page) return pageResponse(0);
  const response = deferred(); pending.push({ page, ...response }); return response.promise;
 });
 const read = clientApi.getAssignedClients({ valid: () => valid, onPage: rows => snapshots.push(rows) });
 await tick(); valid = false;
 pending.forEach(row => row.resolve(pageResponse(row.page)));
 assert.deepEqual(await read, []); assert.equal(snapshots.length, 1); assert.equal(pending.length, 3);
});

test('CRM single-page endpoint requests exactly the requested 100-record page',async()=>{
 const calls=[];
 const clientApi=api(async url=>{calls.push(url);return pageResponse(12,28);});
 const result=await clientApi.getAssignedClientsPage(12);
 assert.equal(calls.length,1);
 const params=new URL(calls[0]).searchParams;
 assert.equal(params.get('page'),'12');assert.equal(params.get('size'),'100');
 assert.equal(result.number,12);
});

test('CRM client detail reads use the CRM host and preserve genuine permission errors', async () => {
 const calls=[];
 const clientApi=api(async url=>{calls.push(url);return {ok:true,status:200,json:async()=>({success:true,data:url.includes('/profile')?{clientCode:'C1',panNumber:'ABCDE1234F'}:[{meetingCode:'M1'}]})};});
 assert.equal((await clientApi.getAssignedClientProfile('C1')).panNumber,'ABCDE1234F');
 assert.equal((await clientApi.getAssignedClientHistory('C1'))[0].meetingCode,'M1');
 assert.ok(calls.every(url=>url.startsWith('https://blueant-crm-erp.up.railway.app/api/')));
 const denied=api(async()=>({ok:false,status:403,json:async()=>({success:false,message:'Access Denied'})}));
 await assert.rejects(denied.getAssignedClientProfile('C1'),/Access Denied/);
});
