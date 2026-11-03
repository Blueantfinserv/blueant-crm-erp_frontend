const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,file);
const {mapMeetingToSalesTask}=require('../taskMappers.ts');
const {filterSalesTasks}=require('../taskFilters.ts');
const RealDate=Date; const fixed=new RealDate(2026,10,3,12).getTime();
global.Date=class extends RealDate {constructor(...args){super(...(args.length?args:[fixed]));}static now(){return fixed;}};
const compile=source=>ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const originalBody="        const locationMeeting = meetingState.meetings\n          .filter((candidate) => (\n            Number.isFinite(candidate.latitude)\n            && Number.isFinite(candidate.longitude)\n            && (\n              (meeting.leadId !== undefined && candidate.leadId === meeting.leadId)\n              || (Boolean(meeting.leadCode) && candidate.leadCode === meeting.leadCode)\n            )\n          ))\n          .sort((a, b) => (\n            b.workflowUpdatedAt ?? b.updatedAt ?? b.lastModifiedDate ?? b.meetingDate ?? ''\n          ).localeCompare(\n            a.workflowUpdatedAt ?? a.updatedAt ?? a.lastModifiedDate ?? a.meetingDate ?? ''\n          ))[0];\nreturn locationMeeting;";
const original=new Function('meeting','history','const meetingState={meetings:history};'+compile(originalBody));
const candidateSource="export function selectLocationMeeting(meeting: MeetingResponse, history: readonly MeetingResponse[]): MeetingResponse | undefined {\n  let selected: MeetingResponse | undefined;\n  for (const candidate of history) {\n    if (!(Number.isFinite(candidate.latitude) && Number.isFinite(candidate.longitude) && (\n      (meeting.leadId !== undefined && candidate.leadId === meeting.leadId)\n      || (Boolean(meeting.leadCode) && candidate.leadCode === meeting.leadCode)\n    ))) continue;\n    if (selected === undefined || (\n      candidate.workflowUpdatedAt ?? candidate.updatedAt ?? candidate.lastModifiedDate ?? candidate.meetingDate ?? ''\n    ).localeCompare(\n      selected.workflowUpdatedAt ?? selected.updatedAt ?? selected.lastModifiedDate ?? selected.meetingDate ?? ''\n    ) > 0) selected = candidate;\n  }\n  return selected;\n}\n";
const candidateExports={};new Function('exports',compile(candidateSource))(candidateExports);
const implementations=[candidateExports.selectLocationMeeting];
const production=path.join(__dirname,'../locationMeetingSelector.ts');
if(fs.existsSync(production))implementations.push(require(production).selectLocationMeeting);
function compare(meeting,history){
 const before=structuredClone({meeting,history});
 const expected=original(meeting,history);
 for(const implementation of implementations){
  const selected=implementation(meeting,history);assert.equal(selected,expected,'same selected object including ties');
  for(const role of ['RELATIONSHIP_MANAGER','SALES_COORDINATOR','SALES_MANAGER']){
   const current={...meeting,employeeRole:role};
   const lead={leadId:meeting.leadId,uniqueLeadId:'U1',assignmentDate:'2026-11-01',clinicAddress:'clinic'};
   const a={...mapMeetingToSalesTask(current,4,lead,expected,'2026-11-02'),verificationPending:true};
   const b={...mapMeetingToSalesTask(current,4,lead,selected,'2026-11-02'),verificationPending:true};
   assert.deepEqual(b,a,'all mapped fields unchanged');
   for(const mode of ['allTaskMode','taskToDoMode','todaysTaskMode','pendingTaskMode','future3DaysTaskMode']){
    const input={allLeadTasks:[],search:'',taskType:'All Tasks',taskStage:'Meetings',leadFilter:'All Prospects',meetingFilter:'All Meetings',allTaskFilter:'All Task',futureDayFilter:'Tomorrow',[mode]:true};
    assert.deepEqual(filterSalesTasks({...input,tasks:[b]}),filterSalesTasks({...input,tasks:[a]}));
   }
  }
 }
 assert.deepEqual({meeting,history},before,'no input mutation');
}
test('location selection edge cases preserve first ties, exact identities and coordinate eligibility',()=>{
 const target={id:1,leadId:2,leadCode:'A',meetingDate:'2026-11-03',meetingStatus:'SCHEDULED',meetingType:'FOLLOW_UP'};
 compare(target,[]);
 const good={leadId:2,latitude:0,longitude:-0,address:'original'};
 compare(target,[{...good,leadId:9,leadCode:'B'}]);
 const history=[{...good,id:1,updatedAt:'2026-11-01'}, {...good,id:2,workflowUpdatedAt:'2026-11-02'}, {...good,id:3,workflowUpdatedAt:'2026-11-02',address:'tie must lose'}, {...good,id:4,workflowUpdatedAt:'2026-11-04',latitude:NaN}, {...good,id:5,longitude:Infinity}, {...good,id:6,latitude:null}, {...good,id:7,longitude:undefined}, {...good,id:8,leadId:9,leadCode:'A',lastModifiedDate:'2026-11-01'}];
 compare(target,history);compare(target,[...history,history[1]]);
 compare({...target,leadId:null},[{...good,leadId:null,meetingDate:null},{...good,leadId:null,meetingDate:undefined}]);
 compare({...target,leadId:NaN,leadCode:undefined},[{...good,leadId:NaN}]);
 compare({...target,leadId:undefined,leadCode:' a '},[{...good,leadCode:'A'},{...good,leadCode:' a ',workflowUpdatedAt:''}]);
});
test('500 generated histories preserve full RM SC SM task objects and date/filter output',()=>{
 let seed=331;const rand=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
 const dates=[undefined,null,'','2026-11-02','2026-11-03','2026-11-04','2026-11-03T10:00:00','invalid'];
 const ids=[undefined,null,NaN,0,1,2,3],codes=[undefined,null,'','A','B','a',' A '],coords=[undefined,null,NaN,Infinity,-Infinity,0,-0,28,77];
 for(let run=0;run<500;run++){
  const meeting={id:run,meetingCode:`M${run}`,leadId:ids[rand(ids.length)],leadCode:codes[rand(codes.length)],meetingDate:dates[rand(6)],meetingStatus:['SCHEDULED','COMPLETED','NOT_CONDUCTED'][rand(3)],verificationStatus:['PENDING','VERIFIED',undefined][rand(3)],meetingType:'FOLLOW_UP',remarks:run%2?'remark':'',latitude:coords[rand(coords.length)],longitude:coords[rand(coords.length)]};
  const history=Array.from({length:rand(60)},(_,i)=>({id:i,leadId:ids[rand(ids.length)],leadCode:codes[rand(codes.length)],latitude:coords[rand(coords.length)],longitude:coords[rand(coords.length)],workflowUpdatedAt:dates[rand(dates.length)],updatedAt:dates[rand(dates.length)],lastModifiedDate:dates[rand(dates.length)],meetingDate:dates[rand(dates.length)],address:i%2?'address':'',meetingLocation:'fallback',verificationStatus:i%2?'PENDING':'VERIFIED'}));
  compare(meeting,history);
 }
});
