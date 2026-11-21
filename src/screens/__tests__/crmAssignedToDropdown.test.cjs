const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
function harness(){
 const slots=[];let cursor=0;const selected=[];
 const element=(type,props)=>({type,props:props??{}});
 const react={useState:initial=>{const i=cursor++;if(!(i in slots))slots[i]=initial;return[slots[i],value=>{slots[i]=value;}];},useRef:()=>({current:{measureInWindow:callback=>callback(100,100,240,38)}})};
 const native={View:'View',Pressable:'Pressable',Text:'Text',TextInput:'TextInput',ScrollView:'ScrollView',Modal:'Modal',useWindowDimensions:()=>({width:1000,height:800}),StyleSheet:{create:x=>x,absoluteFillObject:{}}};
 const output=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../CrmAssignedToDropdown.tsx'),'utf8'),{fileName:'dropdown.tsx',compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const exports={};new Function('exports','require',output)(exports,name=>name==='react'?react:name==='react-native'?native:name==='react-native-paper'?{Icon:'Icon'}:{jsx:element,jsxs:element});
 const find=(node,label)=>{if(!node||typeof node!=='object')return null;if(node.props?.accessibilityLabel===label)return node;const children=node.props?.children??[];for(const child of [children].flat(Infinity)){const result=find(child,label);if(result)return result;}return null;};
 const render=()=>{cursor=0;return exports.CrmAssignedToDropdown({value:'Divya Gupta',options:['Divya Gupta','Monika Soni'],onChange:value=>selected.push(value)});};
 return{render,find,selected};
}
test('custom assigned-to dropdown opens, searches and selects an employee',()=>{
 const h=harness();h.find(h.render(),'Filter assigned clients by employee').props.onPress();
 assert.equal(h.find(h.render(),'Filter assigned clients by employee').props.accessibilityState.expanded,true);
 h.find(h.render(),'Search assigned employee').props.onChangeText('monika');
 assert.equal(h.find(h.render(),'Divya Gupta'),null);
 h.find(h.render(),'Monika Soni').props.onPress();
 assert.deepEqual(h.selected,['Monika Soni']);
 assert.equal(h.find(h.render(),'Filter assigned clients by employee').props.accessibilityState.expanded,false);
});
test('all assigned-to clears the employee filter and outside click closes the popup',()=>{
 const h=harness();h.find(h.render(),'Filter assigned clients by employee').props.onPress();
 h.find(h.render(),'All assigned to').props.onPress();assert.deepEqual(h.selected,['']);
 h.find(h.render(),'Filter assigned clients by employee').props.onPress();
 h.find(h.render(),'Close employee filter').props.onPress();
 assert.equal(h.find(h.render(),'Filter assigned clients by employee').props.accessibilityState.expanded,false);
});
test('role filter stays removed only from CRM Assigned Clients',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../CrmOnboardingScreen.tsx'),'utf8');
 assert.ok(source.includes("{label !== 'clients' ? <View style={styles.headerPickerShell}><Picker selectedValue={filters.role}"));
 assert.ok(source.includes("{label === 'clients' ? <CrmAssignedToDropdown"));
 assert.ok(source.includes("if (label === 'clients' && (filters.role || filters.from || filters.to)) onChange({ ...filters, role: '', from: '', to: '' })"));
});
