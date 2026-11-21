const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const flush = () => new Promise(resolve => setImmediate(resolve));
const compile = (file, modules) => {
  const exportedFunctions = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  new Function('require', 'exports', code)(name => modules[name], exportedFunctions);
  return exportedFunctions;
};

test('lead search publishes each completed page without waiting for slower pages and caps page workers at three', async () => {
  const requests = [];
  const module = compile('services/LeadSearchService.ts', {
    '../api/leadSearch': { leadSearchApi: { search: params => {
      const request = { params, ...deferred() };
      requests.push(request);
      return request.promise;
    } } },
  });
  const service = new module.LeadSearchService();
  const loading = service.loadLeads();
  await flush();
  assert.equal(requests.length, 1);
  requests[0].resolve({ data: { totalPages: 7, content: [{ leadId: 0, clientName: 'First page' }] }, timestamp: 't1' });
  await flush();
  assert.deepEqual(service.getState().leads.map(lead => lead.clientName), ['First page']);
  assert.equal(requests.length, 4, 'only three later pages are in flight');

  const fastPage = requests.find(request => request.params.page === 2);
  fastPage.resolve({ data: { content: [{ leadId: 2, clientName: 'Ready page' }] } });
  await flush();
  assert.deepEqual(service.getState().leads.map(lead => lead.clientName), ['First page', 'Ready page']);

  for (const request of requests.slice(1)) {
    if (request === fastPage) continue;
    request.resolve({ data: { content: [{ leadId: request.params.page, clientName: `Page ${request.params.page}` }] } });
  }
  await flush();
  assert.equal(requests.length, 7);
  for (const request of requests.slice(4)) {
    request.resolve({ data: { content: [{ leadId: request.params.page, clientName: `Page ${request.params.page}` }] } });
  }
  await loading;
  assert.equal(service.getState().leads.length, 7);
});

test('lead search refresh failure retains previously visible rows', async () => {
  const requests = [];
  const module = compile('services/LeadSearchService.ts', {
    '../api/leadSearch': { leadSearchApi: { search: params => {
      const request = { params, ...deferred() };
      requests.push(request);
      return request.promise;
    } } },
  });
  const service = new module.LeadSearchService();
  const initial = service.loadLeads();
  await flush();
  requests[0].resolve({ data: { totalPages: 1, content: [{ leadId: 1, clientName: 'Existing' }] } });
  await initial;

  const refresh = service.loadLeads();
  await flush();
  requests[1].reject(new Error('offline'));
  await refresh;
  assert.equal(service.getState().leads[0].clientName, 'Existing');
  assert.equal(service.getState().error, 'offline');
});

test('meeting list publishes base rows before verification lookups finish and retains them on refresh failure', async () => {
  const baseRequests = [];
  const verificationRequests = [];
  const module = compile('services/MeetingService.ts', {
    '../api/meeting': { meetingApi: {
      getMeetings: () => {
        const request = deferred();
        baseRequests.push(request);
        return request.promise;
      },
      getByVerificationStatus: status => {
        const request = { status, ...deferred() };
        verificationRequests.push(request);
        return request.promise;
      },
    } },
  });
  const service = new module.MeetingService();
  const loading = service.loadMeetings();
  await flush();
  baseRequests[0].resolve({ data: [{ meetingCode: 'M1', employeeCode: 'E1' }], timestamp: 't1' });
  await flush();
  assert.equal(service.getState().meetings[0].meetingCode, 'M1');
  assert.equal(service.getState().isLoading, true);
  verificationRequests.forEach(request => request.resolve({ data: [] }));
  await loading;

  const refresh = service.loadMeetings();
  await flush();
  baseRequests[1].reject(new Error('offline'));
  await refresh;
  assert.equal(service.getState().meetings[0].meetingCode, 'M1');
  assert.equal(service.getState().error, 'offline');
});
