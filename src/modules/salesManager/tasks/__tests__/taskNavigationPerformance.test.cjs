const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '../../../../..');
const filename = path.join(root, 'src/modules/salesManager/tasks/hooks/useSalesManagerTasks.ts');
const local = createRequire(filename);
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, file);
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const flush = () => new Promise(resolve => setImmediate(resolve));
function runner() {
  const slots = [], effects = []; let cursor = 0;
  const react = {
    useState: initial => { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
      return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useRef: initial => { const i = cursor++; return slots[i] ??= { current: initial }; },
    useMemo: callback => { cursor++; return callback(); },
    useEffect: (callback, deps) => { const i = cursor++, previous = slots[i];
      if (!previous || deps.some((value, j) => !Object.is(value, previous.deps[j]))) {
        effects.push(() => { previous?.cleanup?.(); slots[i] = { deps, cleanup: callback() }; });
      }
    },
  };
  const service = key => {
    let state = { [key]: [], isLoading: false, error: null }; const listeners = new Set(); const requests = [];
    const set = patch => { state = { ...state, ...patch }; listeners.forEach(listener => listener(state)); };
    const load = () => { const request = deferred(); requests.push(request); set({ isLoading: true, error: null }); return request.promise; };
    return { requests, getState: () => state, set, subscribe: listener => { listeners.add(listener); listener(state); return () => listeners.delete(listener); }, loadLeads: load, loadMeetings: load,
      getPendingVerificationMeetings: () => [], getVerifiedMeetings: () => [] };
  };
  const leads = service('leads'), meetings = service('meetings'), clients = [];
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const exports = {};
  new Function('require', 'exports', code)(name => {
    if (name === 'react') return react;
    if (name.endsWith('/LeadSearchService')) return { leadSearchService: leads };
    if (name.endsWith('/MeetingService')) return { meetingService: meetings };
    if (name.endsWith('/LeadService')) return { leadService: { getState: () => ({}), subscribe: () => () => {} } };
    if (name.endsWith('/ClientHistoryService')) return { clientHistoryService: {subscribeInvalidatedHistory:()=>()=>{}} };
    if (name === '../clientTaskData') return { loadClientTaskQueue: options => { const request = deferred(); clients.push({ request, options }); return request.promise; } };
    return local(name);
  }, exports);
  return { leads, meetings, clients,
    render: active => { cursor = 0; const result = exports.useSalesManagerTasks({ includeClientTasks: true, allTaskMode: true, active }); effects.splice(0).forEach(effect => effect()); return result; },
    async finish(index, tasks) {
      const progress = { loadedClients: tasks.length, totalClients: tasks.length, loadedPages: 1, totalPages: 1, queueComplete: true, historyPending: 0, historyCompleted: 0, historyFailed: 0 };
      clients[index].options.onPage(tasks, progress);
      clients[index].options.onProgress(progress);
      leads.set({ leads: [], isLoading: false }); meetings.set({ meetings: [], isLoading: false });
      leads.requests[index].resolve(); meetings.requests[index].resolve(); clients[index].request.resolve(tasks);
      await flush();
    },
  };
}
const task = id => ({ id, taskKind: 'CLIENT', name: `Client ${id}`, phone: '9876543210', schedule: 'Today', scheduledAt: '2026-11-04', nextPlanDate: '2026-11-04' });

test('RM/SC Details-to-Back keeps complete results and refreshes without remounting or publishing partial data', async () => {
  const r = runner(); assert.equal(r.render(true).hasCompleteData, false); await flush();
  const old = [task('1'), task('2')]; await r.finish(0, old);
  const ready = r.render(true); assert.equal(ready.hasCompleteData, true); assert.deepEqual(ready.filteredTasks, old);
  r.render(false); assert.equal(r.leads.requests.length, 1); assert.equal(r.meetings.requests.length, 1);
  r.render(true); await flush(); assert.equal(r.leads.requests.length, 2); assert.equal(r.clients.length, 2);
  const waiting = r.render(true); assert.equal(waiting.hasCompleteData, true); assert.deepEqual(waiting.filteredTasks, old);
  r.leads.set({ leads: [{ leadId: 3, leadCode: 'L3', clientName: 'new assignment' }], isLoading: false });
  assert.deepEqual(r.render(true).filteredTasks, old, 'new lead response cannot publish a partial result');
  await r.finish(1, [task('3')]); assert.deepEqual(r.render(true).filteredTasks, [task('3')]);
});

test('failed background refresh retains complete results; manual retry still performs fresh reads', async () => {
  const r = runner(); r.render(true); await flush(); const old = [task('1')]; await r.finish(0, old); r.render(true);
  r.render(false); r.render(true); await flush();
  r.leads.set({ leads: [], isLoading: false, error: 'server failed' }); r.meetings.set({ meetings: [], isLoading: false });
  r.leads.requests[1].resolve(); r.meetings.requests[1].resolve(); r.clients[1].request.reject(new Error('queue failed')); await flush();
  const failed = r.render(true); assert.equal(failed.hasCompleteData, true); assert.deepEqual(failed.filteredTasks, old); assert.equal(failed.clientError, 'queue failed');
  const retry = failed.refreshTasks(); await flush(); assert.equal(r.clients.length, 3); await r.finish(2, [task('2')]); await retry;
  assert.deepEqual(r.render(true).filteredTasks, [task('2')]);
});

test('virtualized rows preserve all records, duplicate identities, complete search and exact ordering', () => {
  const file = path.join(root, 'src/modules/salesManager/tasks/components/VirtualizedTaskList.tsx');
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React } }).outputText;
  const exports = {};
  new Function('require', 'exports', code)(() => ({}), exports);
  const records = Object.freeze(Array.from({ length: 795 }, (_, index) => task(String(index % 794))));
  for (const columns of [1, 2, 3]) {
    const rows = exports.buildTaskRows(records, columns); const combined = rows.flatMap(row => row.tasks ?? []);
    assert.deepEqual(combined, records); combined.forEach((record, index) => assert.strictEqual(record, records[index]));
    assert.equal(combined.length, 795);
  }
  const { filterSalesTasks } = local('../taskFilters');
  const filtered = filterSalesTasks({ tasks: records, allLeadTasks: [], allTaskMode: true, allTaskFilter: 'All Task', search: 'Client 750' });
  assert.deepEqual(exports.buildTaskRows(filtered, 3).flatMap(row => row.tasks ?? []), [records[750]]);
});

test('App keeps the same keyed RM/SC list during Details and leaves SM on its existing route', () => {
  const source = fs.readFileSync(path.join(root, 'App.tsx'), 'utf8');
  const branch = source.slice(source.indexOf('    const clientRole ='), source.indexOf('    switch (screen) {'));
  const code = ts.transpileModule(`export function render(backendRole, screen, history, account) {
    const clientHistoryReloadCycle={current:undefined};
    const screenHistory={current:history}, authenticatedUserKey=account, salesTaskScreenKey=0, salesTaskFilter='Today', salesTaskView='task-to-do';
    const selectedSalesTask={taskKind:'CLIENT',clientCode:'C1'}; const renderShell=value=>value; const goBack=()=>{};
    const View='View', SalesManagerTasksScreen='Tasks', ClientWorkFollowScreen='Clients', SalesManagerLeadDetailScreen='Details';
    ${branch} return null;
  }`, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React }, fileName: 'test.tsx' }).outputText;
  const exports = {}, React = { createElement: (type, props, ...children) => ({ type, key: props?.key, props: { ...props, children } }) };
  new Function('exports', 'React', code)(exports, React);
  for (const role of ['RELATIONSHIP_MANAGER', 'SALES_COORDINATOR']) {
    for (const origin of ['leads', 'client-work-follow']) {
      const before = exports.render(role, origin, [], 'user1');
      const details = exports.render(role, 'sales-task-details', [origin], 'user1');
      const after = exports.render(role, origin, [], 'user1');
      const list = tree => tree.props.children[0].props.children[0];
      assert.equal(list(before).type, list(details).type); assert.equal(list(before).key, list(details).key); assert.equal(list(after).key, list(before).key);
      assert.equal(details.props.children[0].props.style.display, 'none'); assert.equal(after.props.children[0].props.style.display, 'flex');
      assert.notEqual(list(exports.render(role, origin, [], 'user2')).key, list(before).key);
    }
  }
  assert.equal(exports.render('SALES_MANAGER', 'leads', [], 'sm'), null);
});


test('All Clients screen uses progressive cards and retains them when later loading fails', () => {
  const source = fs.readFileSync(path.join(root, 'src/screens/ClientWorkFollowScreen.tsx'), 'utf8');
  assert.ok(source.includes('loadClientTaskQueue({'));
  assert.ok(source.includes('onClients:'));
  assert.ok(source.includes('setClients(previous =>'));
  assert.ok(source.includes('error && !clients.length'));
  assert.ok(source.includes('loadId.current += 1'));
});


test('previous visible task data cannot open a client update before fresh verification succeeds', async () => {
  const app = fs.readFileSync(path.join(root, 'App.tsx'), 'utf8');
  const start = app.indexOf("    if (task.taskKind === 'CLIENT') {");
  const end = app.indexOf('    if (task.verificationPending)', start + 1);
  const branch = ts.transpileModule(`export async function guard(task,clientHistoryService,hasPendingClientVerification,setMessage,setClientMeetingTask){${app.slice(start,end)}}`, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const exports={}; new Function('exports',branch)(exports);
  for (const outcome of ['pending','verified','failed','account-changed']) {
    const request=deferred();let opened=null,message=null,current=true,calls=0;
    const service={captureScope:()=>1,isCurrentScope:()=>current,refresh:()=>{calls++;return request.promise;}};
    const pending=exports.guard({taskKind:'CLIENT',clientCode:'C1',verificationPending:false},service,rows=>rows.some(row=>row.verificationStatus==='PENDING'||row.verifiedByPc===false),value=>{message=value;},value=>{opened=value;});
    assert.equal(calls,1);assert.equal(opened,null);
    if(outcome==='failed') request.reject(new Error('network unavailable'));
    else {if(outcome==='account-changed')current=false;request.resolve([{verificationStatus:outcome==='pending'?'PENDING':'VERIFIED',verifiedByPc:outcome!=='pending'}]);}
    await pending;
    assert.equal(opened!==null,outcome==='verified');
    if(outcome==='failed')assert.equal(message,'network unavailable');
  }
});


test('All Clients screen keeps history failure feedback without progress narration', () => {
  const source=fs.readFileSync(path.join(root,'src/screens/ClientWorkFollowScreen.tsx'),'utf8');
  assert.ok(source.includes('progress.historyFailed > 0'));
  assert.ok(source.includes('error && !clients.length'));
  assert.equal(source.includes('Loading clients:'),false);
  assert.equal(source.includes('Updating meeting history for'),false);
  assert.equal(source.includes('All ${progress.loadedClients} clients'),false);
});


test('partial history enrichment cannot replace complete global task inputs during refresh',async()=>{
 const r=runner();r.render(true);await flush();const old=[task('1'),task('2')];await r.finish(0,old);r.render(true);
 r.render(false);r.render(true);await flush();
 const progress={loadedClients:1,totalClients:2,loadedPages:1,totalPages:1,queueComplete:true,historyPending:1,historyCompleted:0,historyFailed:0};
 r.clients[1].options.onPage([{...task('3'),historyLoadState:'loading',verificationPending:true}],progress);r.clients[1].options.onProgress(progress);
 const partial=r.render(true);assert.deepEqual(partial.filteredTasks,old);assert.equal(partial.taskDataComplete,false);
 await r.finish(1,[task('3')]);assert.deepEqual(r.render(true).filteredTasks,[task('3')]);
});
