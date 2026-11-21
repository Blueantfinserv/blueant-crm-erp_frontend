const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'../../..');
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function harness(file,doubles={}){
 const slots=[],effects=[],cleanups=[];let cursor=0;
 const react={
  useState:initial=>{const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return[slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value;}];},
  useRef:initial=>({current:initial}),useMemo:fn=>fn(),
  useEffect:(fn,deps)=>{const i=cursor++,old=slots[i];if(!old||deps.some((d,j)=>d!==old[j])){slots[i]=deps;effects.push(fn);}},
 };
 const element=(type,props)=>({type,props:props??{}});
 const native={StyleSheet:{create:x=>x,absoluteFillObject:{}},useWindowDimensions:()=>({width:1300,height:900}),View:'View',Text:'Text',Pressable:'Pressable',Modal:'Modal',ScrollView:'ScrollView',ActivityIndicator:'ActivityIndicator',Linking:{openURL:()=>{}}};
 const load=(filename)=>{
  const exports={};const output=ts.transpileModule(fs.readFileSync(filename,'utf8'),{fileName:filename,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  new Function('exports','require',output)(exports,name=>{
   if(name==='react')return react;
   if(name==='react/jsx-runtime')return{jsx:element,jsxs:element,Fragment:'Fragment'};
   if(name==='react-native')return native;
   if(name==='react-native-paper')return{Icon:'Icon'};
   for(const [suffix,value] of Object.entries(doubles))if(name.endsWith(suffix))return value;
   return load(path.resolve(path.dirname(filename),name+'.ts'));
  });return exports;
 };
 const exports=load(path.join(root,file));
 return{exports,render:(name,props)=>{cursor=0;const tree=exports[name](props);effects.splice(0).forEach(fn=>{const cleanup=fn();if(cleanup)cleanups.push(cleanup);});return tree;},dispose:()=>cleanups.forEach(fn=>fn())};
}
function find(node,predicate){if(!node||typeof node!=='object')return null;if(predicate(node))return node;for(const child of [node.props?.children??[]].flat(Infinity)){const match=find(child,predicate);if(match)return match;}return null;}

const client={id:1,clientCode:'C1',clientName:'Amit',mobileNumber:'9999911111',panNumber:'ABCDE1234F'};
test('CRM modal reuses RM/SC detail screen, retains family action and preserves profile on a denied profile request',async()=>{
 const profile=deferred(),history=deferred();let closed=0,family=0;const calls=[];
 const h=harness('src/screens/CrmClientDetailsDialog.tsx',{
  '/crmAssignment':{crmAssignmentApi:{getAssignedClientProfile:code=>{calls.push(['profile',code]);return profile.promise;},getAssignedClientHistory:code=>{calls.push(['history',code]);return history.promise;}}},
  '/SalesManagerLeadDetailScreen':{SalesManagerLeadDetailScreen:'SharedDetails'},
 });
 const props={client,onClose:()=>closed++,onManageFamily:()=>family++};
 let shared=find(h.render('CrmClientDetailsDialog',props),n=>n.type==='SharedDetails');
 assert.equal(shared.props.embedded,true);assert.equal(shared.props.onUpdateMeeting,undefined);
 assert.equal(shared.props.lead.taskKind,'CLIENT');assert.equal(shared.props.clientDetails.profile.panNumber,'ABCDE1234F');
 profile.reject(new Error('Access Denied'));
 history.resolve([{meetingCode:'M1',meetingNumber:1,meetingDate:'2026-11-20',remarks:'Latest note'}]);await tick();
 shared=find(h.render('CrmClientDetailsDialog',props),n=>n.type==='SharedDetails');
 assert.equal(shared.props.clientDetails.profile.panNumber,'ABCDE1234F');
 assert.equal(shared.props.clientDetails.profileError,'Access Denied');
 assert.deepEqual(shared.props.clientDetails.history.history,[]);
 find(shared.props.headerAction,n=>n.props?.accessibilityLabel==='Manage client family').props.onPress();shared.props.onBack();assert.equal(family,1);assert.equal(closed,1);
 assert.deepEqual(calls,[['profile','C1']]);
});

test('closing the CRM dialog ignores late profile and history responses',async()=>{
 const profile=deferred(),history=deferred();
 const h=harness('src/screens/CrmClientDetailsDialog.tsx',{'/crmAssignment':{crmAssignmentApi:{getAssignedClientProfile:()=>profile.promise,getAssignedClientHistory:()=>history.promise}},'/SalesManagerLeadDetailScreen':{SalesManagerLeadDetailScreen:'SharedDetails'}});
 const props={client,onClose:()=>{},onManageFamily:()=>{}};
 h.render('CrmClientDetailsDialog',props);h.dispose();
 profile.resolve({...client,clientName:'Late response'});history.resolve([{meetingCode:'M1'}]);await tick();
 const shared=find(h.render('CrmClientDetailsDialog',props),n=>n.type==='SharedDetails');
 assert.equal(shared.props.clientDetails.profile.clientName,'Amit');
 assert.deepEqual(shared.props.clientDetails.history.history,[]);
});

test('shared screen uses supplied CRM data without starting RM/SC-only history or duplicate profile requests',()=>{
 const historyCodes=[];let profileCalls=0,updated=0;
 const snapshot={history:[],loading:false,error:null,stale:false};
 const h=harness('src/modules/salesManager/tasks/SalesManagerLeadDetailScreen.tsx',{
  '/AuthContext':{useAuth:()=>({user:{role:'CRM_ONBOARDING'}})},
  '/useClientHistory':{useClientHistory:code=>{historyCodes.push(code);return snapshot;}},
  '/ClientHistoryService':{hasPendingClientVerification:()=>false},
  '/MeetingService':{meetingService:{getVerificationMeetings:async()=>[]}},
  '/meeting':{meetingApi:{}},
  '/lead':{leadApi:{}},
  '/ClientDocumentService':{downloadClientDocument:()=>{}},
  '/clientMeeting':{clientMeetingApi:{getProfile:()=>{profileCalls++;return Promise.resolve(client);}}},
  '/theme':{theme:{shadow:{card:{}}}},
 });
 const profile={...client,investmentTypes:['SIP'],nominees:[],documents:[]};
 const props={lead:{id:'C1',taskKind:'CLIENT',clientCode:'C1',name:'Amit',phone:'9999911111',taskLabel:'CLIENT',locationText:'Noida',coordinates:{latitude:0,longitude:0},remarks:'note',lastUpdated:'20 Nov'},onBack:()=>{},embedded:true,clientDetails:{profile,profileLoading:false,profileError:null,history:snapshot}};
 const tree=h.render('SalesManagerLeadDetailScreen',props);
 assert.deepEqual(historyCodes,[undefined]);assert.equal(profileCalls,0);
 assert.ok(find(tree,n=>n.props?.accessibilityLabel==='Close client details'));
 assert.equal(find(tree,n=>n.props?.accessibilityLabel==='Update meeting for Amit'),null);
 assert.ok(find(tree,n=>n.type==='Text'&&n.props.children==='Personal & Address'));
 assert.ok(find(tree,n=>n.type==='Text'&&n.props.children==='Investment Details'));
 const rm={...props,embedded:false,clientDetails:undefined,onUpdateMeeting:()=>updated++};
 const rmTree=h.render('SalesManagerLeadDetailScreen',rm);
 assert.equal(historyCodes.at(-1),'C1');assert.equal(profileCalls,1);
 const button=find(rmTree,n=>n.props?.accessibilityLabel==='Update meeting for Amit');
 assert.ok(button);button.props.onPress();assert.equal(updated,1);
});
