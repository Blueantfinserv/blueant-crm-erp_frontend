const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../../..');
const clientSource = fs.readFileSync(path.join(root, 'components/ClientMeetingScheduleForm.tsx'), 'utf8');
const start = clientSource.indexOf('    if (!client.clientCode)');
const end = clientSource.indexOf('    setSaving(true)', start);
const validateClient = new Function('values', `let error; const { client, outcome, remarks, mode, aloneWith, businessChoice, meetingAddress, meetingLocation, coordinates, nextPlanDate } = values; const MEETING_LOCATIONS=['Noida']; const followUpOptions=()=>[{value:'2026-11-04'}]; const setError=value=>{error=value}; function validate(){${clientSource.slice(start, end)}} validate(); return error;`);
const valid = { client: {clientCode:'C1'}, outcome:'CONDUCTED', remarks:'Discussion', mode:'PHYSICAL', aloneWith:'SELF', businessChoice:'SERVICE', meetingAddress:'Home address', meetingLocation:'Noida', coordinates:{latitude:0,longitude:0}, nextPlanDate:'2026-11-04' };
test('conducted client meetings require every visible editable field', () => {
 assert.equal(validateClient(valid), undefined);
 for (const key of ['remarks','mode','aloneWith','businessChoice','meetingAddress','meetingLocation','nextPlanDate']) assert.ok(validateClient({...valid,[key]:''}), key);
 assert.ok(validateClient({...valid,coordinates:null}));
 assert.ok(validateClient({...valid,remarks:'   '}));
 assert.ok(validateClient({...valid,meetingAddress:'a'.repeat(501)}));
});
test('not conducted clients require remarks and live location but not hidden conducted fields', () => {
 const values = {...valid,outcome:'NOT_CONDUCTED',mode:'',aloneWith:'',businessChoice:'',meetingAddress:'',meetingLocation:'',nextPlanDate:''};
 assert.equal(validateClient(values), undefined);
 assert.ok(validateClient({...values,remarks:''}));
 assert.ok(validateClient({...values,coordinates:null}));
});
const prospectSource=fs.readFileSync(path.join(root,'modules/salesManager/forms/LeadWorkflowForm.jsx'),'utf8');
const body=prospectSource.slice(prospectSource.indexOf('    const nextErrors = {};'),prospectSource.indexOf('    setErrors(nextErrors);'));
const validateProspect=new Function('form','isSalesCoordinator',`const isNewLead=false;const lead={};const getFollowUpOptions=()=>[{value:'2026-11-04'}];${body}return nextErrors;`);
test('prospect live location is required for SM RM and SC; hidden card remains optional', () => {
 const form={meetingStatus:'Meeting Conducted',meetingMode:'Physical',meetingDate:'2026-11-03',leadStatus:'Work In Progress',joinedWith:'Alone',remarks:'Discussion',nextPlanDate:'2026-11-04',liveLocation:{latitude:0,longitude:0}};
 for(const sc of [false,true]){
 assert.deepEqual(validateProspect(form,sc),{});
 assert.ok(validateProspect({...form,liveLocation:null},sc).liveLocation);
 }
});
