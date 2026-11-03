const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { performance } = require('node:perf_hooks');
const loaded = {};
new Function('exports', ts.transpileModule(fs.readFileSync(path.join(__dirname, '../taskMeetingSelectors.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(loaded);
const original = (meetings, leads) => meetings.filter(meeting => {
 if (meeting.meetingStatus !== 'SCHEDULED' || meeting.meetingType === 'INTRO') return false;
 const lead = leads.find(candidate => (meeting.leadId !== undefined && candidate.leadId === meeting.leadId) || (Boolean(meeting.leadCode) && candidate.leadCode === meeting.leadCode));
 return !loaded.isHiddenCompletedLead(lead?.leadStatus) && !loaded.isHiddenCompletedLead(meeting.leadStatus) && !loaded.isRemovedLead(lead?.leadStatus) && !loaded.isRemovedLead(meeting.leadStatus);
});
function candidate(meetings, leads) {
 const byId = new Map(), byCode = new Map();
 leads.forEach((lead, index) => {
  if (lead.leadId !== undefined && !Number.isNaN(lead.leadId) && !byId.has(lead.leadId)) byId.set(lead.leadId, { lead, index });
  if (lead.leadCode && !byCode.has(lead.leadCode)) byCode.set(lead.leadCode, { lead, index });
 });
 return meetings.filter(meeting => {
  if (meeting.meetingStatus !== 'SCHEDULED' || meeting.meetingType === 'INTRO') return false;
  const idMatch = meeting.leadId !== undefined ? byId.get(meeting.leadId) : undefined;
  const codeMatch = meeting.leadCode ? byCode.get(meeting.leadCode) : undefined;
  const lead = (idMatch && codeMatch ? (idMatch.index < codeMatch.index ? idMatch : codeMatch) : idMatch ?? codeMatch)?.lead;
  return !loaded.isHiddenCompletedLead(lead?.leadStatus) && !loaded.isHiddenCompletedLead(meeting.leadStatus) && !loaded.isRemovedLead(lead?.leadStatus) && !loaded.isRemovedLead(meeting.leadStatus);
 });
}
function compare(meetings, leads) {
 const before = structuredClone({ meetings, leads });
 const expected = original(meetings, leads);
 for (const implementation of [candidate, loaded.getActionableTaskMeetings]) {
  const actual = implementation(meetings, leads);
  assert.deepEqual(actual, expected);
  assert.equal(actual.length, expected.length);
  actual.forEach((record, i) => assert.equal(record, expected[i], 'same object reference and order'));
 }
 assert.deepEqual({ meetings, leads }, before, 'inputs unchanged');
}
test('first-match OR lookup preserves conflicting IDs/codes, duplicates, nulls, NaN and exact code matching', () => {
 const leads = [{leadId:1,leadCode:'A',leadStatus:'CONVERTED'}, {leadId:2,leadCode:'B'}, {leadId:1,leadCode:'B'}, {leadId:null,leadCode:''}, {leadId:NaN,leadStatus:'REMOVED'}, {leadCode:'lower',leadStatus:'NOT_INTERESTED'}];
 const pairs = [[2,'A'],[1,'B'],[null,''],[undefined,undefined],[NaN,undefined],[0,'LOWER'],[0,'lower'],[0,' lower ']];
 compare(pairs.map(([leadId,leadCode],i)=>({id:i,leadId,leadCode,meetingStatus:'SCHEDULED',meetingType:'FOLLOW_UP',meetingDate:i%2?null:undefined,verificationStatus:i%2?'PENDING':'VERIFIED'})),leads);
});
test('generated RM SC SM datasets preserve complete records, duplicate references, dates and verification flags', () => {
 let seed=971; const random=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
 const ids=[undefined,null,NaN,0,1,2,3,4,5],codes=[undefined,null,'','A','B','C',' a ','a'];
 const statuses=[undefined,null,'WORK_IN_PROGRESS','CONVERTED','CONVERTED_CLIENT','ALREADY_CLIENT','REMOVED','NOT_INTERESTED','CLIENT_REMOVED','CLIENT_NOT_INTERESTED'];
 for(let dataset=0;dataset<300;dataset++){
  const leads=Array.from({length:random(80)},()=>({leadId:ids[random(ids.length)],leadCode:codes[random(codes.length)],leadStatus:statuses[random(statuses.length)]}));
  const meetings=Array.from({length:random(100)},(_,i)=>({id:i,meetingCode:`M${i}`,leadId:ids[random(ids.length)],leadCode:codes[random(codes.length)],leadStatus:statuses[random(statuses.length)],meetingStatus:['SCHEDULED','COMPLETED','NOT_CONDUCTED',undefined][random(4)],meetingType:['INTRO','FOLLOW_UP',undefined][random(3)],employeeRole:['RELATIONSHIP_MANAGER','SALES_COORDINATOR','SALES_MANAGER'][random(3)],meetingDate:['2026-11-03','2026-11-04','2026-11-02',null,undefined][random(5)],verificationStatus:['PENDING','VERIFIED',undefined][random(3)],extra:{unchanged:i}}));
  if(meetings.length)meetings.push(meetings[0]);
  compare(meetings,leads);
 }
});
test('lookup-only benchmark on a synthetic large dataset (not application loading time)', () => {
 const leads=Array.from({length:5000},(_,i)=>({leadId:i,leadCode:`L${i}`}));
 const meetings=Array.from({length:3000},(_,i)=>({id:i,leadId:4999-i,meetingStatus:'SCHEDULED',meetingType:'FOLLOW_UP'}));
 compare(meetings,leads);
 let a=0,b=0;
 for(let i=0;i<5;i++) {let t=performance.now();original(meetings,leads);a+=performance.now()-t;t=performance.now();loaded.getActionableTaskMeetings(meetings,leads);b+=performance.now()-t;}
 console.log(`Synthetic lookup mean: original ${(a/5).toFixed(2)}ms, production optimized ${(b/5).toFixed(2)}ms; 5000 leads / 3000 meetings`);
});
