const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function load(file) {
 const exports = {};
 const source = ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 new Function('require','exports',source)(name=>load(path.resolve(path.dirname(file),name+'.ts')),exports);
 return exports;
}
const root=path.resolve(__dirname,'..');
const {buildCrmAssignedLeadExport}=load(path.join(root,'crmAssignedLeadExport.ts'));
const {digitsOnly,timeText}=load(path.join(root,'salesCoordinator/coordinatorUtils.ts'));
const {csvCell}=load(path.join(root,'salesCoordinator/coordinatorExport.ts'));
const pc=fs.readFileSync(path.join(root,'SalesCoordinatorScreen.tsx'),'utf8');
const start=pc.indexOf('      const assignedStamp =');
const end=pc.indexOf('      const from = exportDatePart',start);
const body=pc.slice(start,end).replace('      const allMeetings = meetings.length ? meetings : await meetingService.getAllMeetingRecords();','');
const baseline=new Function('visibleAssignedLeads','allMeetings','pending','verified','digitsOnly','timeText',ts.transpileModule(body+';return {headers,rows};',{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText);
const serialize=result=>'\uFEFF'+[result.headers,...result.rows].map(row=>row.map(csvCell).join(',')).join('\r\n');
test('CRM export is byte-for-byte equivalent to existing PC export for identical input',()=>{
 let seed=21; const rand=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
 for(let run=0;run<100;run++){
  const leads=Array.from({length:20},(_,i)=>({uniqueLeadId:rand(3)?`U${i%12}`:undefined,leadId:i%8,leadCode:`L${i%8}`,clientName:`Client "${i}"`,mobileNumber:i%2?'98 12345':'9812345',assignedAt:['2026-10-01','2026-11-03',undefined][rand(3)],leadStatus:['CONVERTED','WORK_IN_PROGRESS',null][rand(3)],location:'Noida, Delhi',clinicAddress:'line1\nline2'}));
  const meetings=Array.from({length:30},(_,i)=>({id:i,meetingCode:`M${i%15}`,leadId:rand(8),leadCode:`L${rand(8)}`,mobileNumber:rand(2)?'9812345':undefined,meetingDate:['2026-11-01','2026-11-03',undefined][rand(3)],meetingTime:[{hour:10,minute:5},'09:00:00',null][rand(3)],updatedAt:rand(2)?'2026-11-03':undefined,remarks:'Remark, "quoted"',ageGroup:rand(2)?'AGE_25_35':undefined,profession:'DOCTOR',meetingTitle:'Intro Meeting'}));
  const pending=meetings.slice(0,5),verified=meetings.slice(3,12).map(m=>({...m,existingSip:'YES',remarks:'Verified remark'}));
  const expected=baseline(leads,meetings,pending,verified,digitsOnly,timeText);
  const actual=buildCrmAssignedLeadExport(leads,meetings,pending,verified);
  assert.deepEqual(actual,expected);
  assert.equal(actual.headers.length,27);
  assert.equal(serialize(actual),serialize(expected));
 }
});
test('unfiltered empty data and leads with no meetings preserve PC output',()=>{
 for(const leads of [[],[{clientName:'No meeting',leadId:1,mobileNumber:'00123'}]]){
  assert.deepEqual(buildCrmAssignedLeadExport(leads,[],[],[]),baseline(leads,[],[],[],digitsOnly,timeText));
 }
});

const crmSource=fs.readFileSync(path.join(root,'CrmOnboardingScreen.tsx'),'utf8');
const handlerSource=crmSource.slice(crmSource.indexOf('  const exportCrmAssignedLeads ='),crmSource.indexOf('  const sync ='));
function exportHandler(ready, fail=false) {
 const state={error:null,downloads:0,busy:false,calls:0};
 const deps={exportInFlight:{current:false},hasAssignedLeadsData:{current:ready},setLeadExportError:value=>{state.error=value;},Platform:{OS:'web'},Alert:{alert:()=>{}},setExportingLeads:value=>{state.busy=value;},assignedLeads:[],matchesAssignmentFilters:()=>true,leadFilters:{from:'',to:'',assignedTo:''},meetingApi:{getMeetings:async()=>{state.calls++;if(fail)throw Error('Access Denied');return {data:[]};},getByVerificationStatus:async()=>({data:[]})},buildCrmAssignedLeadExport:()=>({headers:[],rows:[]}),exportDatePart:value=>value,exportNamePart:()=> 'all-sales-persons',downloadCsv:()=>{if(fail)throw Error('Download unavailable');state.downloads++;},messageFor:error=>error.message};
 const body=ts.transpileModule(handlerSource+';return exportCrmAssignedLeads;', {compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
 const handler=new Function('deps','const {'+Object.keys(deps).join(',')+'}=deps;'+body)(deps);
 return {state,handler};
}
test('CRM download failures are visibly reported and the button can be retried',async()=>{
 const {state,handler}=exportHandler(true,true);
 await handler();assert.match(state.error,/Download unavailable/);assert.equal(state.downloads,0);assert.equal(state.busy,false);
 await handler();assert.equal(state.calls,0);
});
test('CRM export downloads on success and reports unavailable lead data without a silent no-op',async()=>{
 const valid=exportHandler(true);await valid.handler();assert.equal(valid.state.downloads,1);assert.equal(valid.state.error,null);assert.equal(valid.state.calls,0);
 const unavailable=exportHandler(false);await unavailable.handler();assert.match(unavailable.state.error,/not ready/);assert.equal(unavailable.state.calls,0);
 const button=crmSource.match(/accessibilityLabel="Export assigned leads to Excel" disabled=\{([^}]+)\}/);
 assert.equal(button[1],'exportingLeads');
});
