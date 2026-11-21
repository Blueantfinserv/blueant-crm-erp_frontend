const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const exportsObject={};
new Function('exports',ts.transpileModule(fs.readFileSync(path.join(__dirname,'../crmAssignedClientPages.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(exportsObject);
const {CrmAssignedClientPages,assignedClientPageRows}=exportsObject;
const page=(n)=>({number:n,totalPages:28,totalElements:2741,content:Array.from({length:n===27?41:100},(_,i)=>({clientCode:'C'+(n*100+i),salesPersonCode:n===27?'LAST':'FIRST',clientName:n===27?'Final client':'Client '+(n*100+i),panNumber:n===27?'LASTPAN':'PAN'+i}))});

test('initial view requests only 100 clients and Next requests just the next 100',async()=>{
 const calls=[];const pager=new CrmAssignedClientPages(async n=>{calls.push(n);return page(n);});
 await pager.load(100,()=>true,()=>{});
 assert.deepEqual(calls,[0]);assert.equal(pager.getSnapshot().clients.length,100);
 assert.equal(pager.getSnapshot().complete,false);assert.equal(pager.getSnapshot().totalElements,2741);
 await pager.load(200,()=>true,()=>{});assert.deepEqual(calls,[0,1]);
 assert.equal(assignedClientPageRows(pager.getSnapshot().clients,1).length,100);
 await pager.load(100,()=>true,()=>{});assert.deepEqual(calls,[0,1]);
});

test('global filtering finds names, PAN and employees on page 28 while display stays at 100',async()=>{
 const calls=[];const pager=new CrmAssignedClientPages(async n=>{calls.push(n);return page(n);});
 await pager.load(100,()=>true,()=>{});
 await pager.load(Infinity,()=>true,()=>{});
 const snapshot=pager.getSnapshot();assert.equal(snapshot.complete,true);assert.equal(snapshot.clients.length,2741);
 assert.equal(calls.length,28);assert.equal(new Set(calls).size,28);
 for(const match of [row=>row.clientName==='Final client',row=>row.panNumber==='LASTPAN',row=>row.salesPersonCode==='LAST']){
  assert.equal(snapshot.clients.filter(match).length,41);
 }
 assert.equal(assignedClientPageRows(snapshot.clients,0).length,100);
 assert.equal(assignedClientPageRows(snapshot.clients,27).length,41);
});

test('cancellation stops a global scan and keeps earlier pages reusable',async()=>{
 let valid=true;const calls=[];const pager=new CrmAssignedClientPages(async n=>{calls.push(n);return page(n);});
 await pager.load(Infinity,()=>valid,snapshot=>{if(snapshot.clients.length===200)valid=false;});
 assert.deepEqual(calls,[0,1]);assert.equal(pager.getSnapshot().clients.length,200);
 valid=true;await pager.load(200,()=>valid,()=>{});assert.deepEqual(calls,[0,1]);
});

test('failed pages preserve earlier results and retry only the missing page',async()=>{
 let fail=true;const calls=[];const pager=new CrmAssignedClientPages(async n=>{calls.push(n);if(n===1&&fail)throw new Error('Failed page');return page(n);});
 await assert.rejects(pager.load(200,()=>true,()=>{}),/Failed page/);
 assert.equal(pager.getSnapshot().clients.length,100);
 fail=false;await pager.load(200,()=>true,()=>{});assert.deepEqual(calls,[0,1,1]);
});

test('Assigned Clients uses 100-row pages and hides its date picker without altering lead filters',()=>{
 const screen=fs.readFileSync(path.join(__dirname,'../CrmOnboardingScreen.tsx'),'utf8');
 assert.ok(screen.includes("{label !== 'clients' ? <Pressable onPress={() => { setDateTarget("));
 assert.ok(screen.includes('data={pageClients}'));
 assert.ok(screen.includes('accessibilityLabel="Next 100 clients"'));
 assert.ok(screen.includes('loadAssignedClients(false, true)'));
 assert.ok(screen.includes('assignedClientPageRows(visibleClients, page)'));
});
