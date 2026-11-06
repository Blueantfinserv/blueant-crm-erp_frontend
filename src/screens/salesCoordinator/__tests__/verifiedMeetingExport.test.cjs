const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
function load(name,globals={}) {
 const exported={};const source=ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',name+'.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 new Function('require','exports',...Object.keys(globals),source)(require,exported,...Object.values(globals));return exported;
}
const {VERIFIED_MEETING_EXPORT_HEADERS:headers,verifiedMeetingExportRows:rows}=load('verifiedMeetingExport');
test('verified export has exactly the requested nine columns in order',()=>{
 assert.deepEqual(headers,['Name','PAN Number','Sales Person / RM / SC Name','Meeting Date','Next Plan Date','Remarks RM / SC','Remarks PC','Address','Location']);
 const record={clientName:'Example',mobileNumber:'0987654321',panNumber:'ABCDE1234F',employeeName:'Sales Person',meetingDate:'2026-11-01',nextMeetingDate:'2026-11-05',remarks:'Sales note',verificationRemarks:'PC note',address:'Meeting address',location:'Noida'};
 assert.deepEqual(rows([record]),[['Example','ABCDE1234F','Sales Person','2026-11-01','2026-11-05','Sales note','PC note','Meeting address','Noida']]);
});
test('client export keeps original RM/SC and PC remarks distinct and prefers captured address/city',()=>{
 assert.deepEqual(rows([{isClientMeeting:true,meetingRemarks:'Original RM note',remarks:'Fallback note',verificationRemarks:'PC verified note',residentialAddress:'Captured address',address:'Old address',clinicAddress:'Clinic',currentCity:'Greater Noida',location:'Old city'}])[0].slice(5),['Original RM note','PC verified note','Captured address','Greater Noida']);
 assert.equal(rows([{isClientMeeting:true,remarks:'RM only'}])[0][6],'');
});
test('missing fields stay blank; supported employee, remarks and place fallbacks are retained',()=>{
 assert.deepEqual(rows([{}]),[Array(9).fill('')]);
 const result=rows([{assignedEmployeeName:'Fallback person',meetingRemarks:'Meeting note',discussion:'Discussion',clinicAddress:'Clinic address',meetingLocation:'Meeting place'}])[0];
 assert.equal(result[2],'Fallback person');assert.equal(result[5],'Meeting note');assert.equal(result[7],'Clinic address');assert.equal(result[8],'Meeting place');
});
test('all supplied filtered records and duplicate meetings retain their order beyond a mobile page',()=>{
 const records=Array.from({length:80},(_,i)=>({meetingCode:'M'+i,clientName:'Name '+i,employeeName:i%2?'RM':'SC',remarks:'Note '+i}));
 const matching=records.filter(m=>m.employeeName==='SC');matching.push(matching[0]);const before=structuredClone(matching);
 const result=rows(matching);assert.equal(result.length,41);assert.deepEqual(result.map(r=>r[0]),matching.map(r=>r.clientName));assert.deepEqual(matching,before);
});
test('existing Excel-compatible CSV download preserves quoted and multiline values',async()=>{
 let blob,fileName,clicked=false,revoked=false;
 const csv=load('coordinatorExport',{URL:{createObjectURL:value=>{blob=value;return'blob:local-export';},revokeObjectURL:()=>{revoked=true;}},document:{createElement:()=>({set href(value){assert.equal(value,'blob:local-export');},set download(value){fileName=value;},click(){clicked=true;}})}});
 csv.downloadCsv(headers,rows([{clientName:'Name, quoted "value"',remarks:'Line 1\nLine 2'}]),'verified-meetings-test');
 const content=await blob.text();assert.ok(content.includes('"Name, quoted ""value"""'));assert.ok(content.includes('"Line 1\nLine 2"'));assert.equal(fileName,'verified-meetings-test.csv');assert.ok(clicked&&revoked);
});
test('PC button is restricted to verified tab and exports full filtered records without fetching',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../../SalesCoordinatorScreen.tsx'),'utf8');
 const handler=source.slice(source.indexOf('  const exportVerifiedMeetings ='),source.indexOf('  const salesPersonNamesByCode ='));
 assert.ok(handler.includes('verifiedMeetingExportRows(visibleVerifiedMeetings)'));assert.ok(!handler.includes('mobilePageItems'));assert.doesNotMatch(handler,/fetch\(|meetingApi\.|clientMeetingApi\.|getAllMeetingRecords/);
 const label=source.indexOf('<VerifiedMeetingsExportButton compact=');assert.ok(label>0);
 assert.ok(source.slice(source.lastIndexOf("{tab === 'responses' ?",label),label).includes("{tab === 'responses' ?"));
});


test('phone is never substituted into a missing PAN export cell',()=>{
 assert.equal(rows([{mobileNumber:'9876543210'}])[0][1],'');
});
