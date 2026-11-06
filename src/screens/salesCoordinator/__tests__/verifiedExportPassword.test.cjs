const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),React=require('react');
function harness(){
 let cursor=0,downloads=0,disabled=false;const slots=[];
 const fakeReact={...React,useState(initial){const i=cursor++;if(!(i in slots))slots[i]=initial;return[slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value;}];},useRef(initial){const i=cursor++;if(!(i in slots))slots[i]={current:initial};return slots[i];}};
 const filename=path.join(__dirname,'../components/VerifiedMeetingsExportButton.tsx');
 const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{fileName:filename,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const exported={};new Function('require','exports',code)(name=>name==='react'?fakeReact:name==='react-native'?{Modal:'Modal',Pressable:'Pressable',Text:'Text',TextInput:'TextInput',View:'View',StyleSheet:{create:value=>value}}:name==='react-native-paper'?{Icon:'Icon'}:name.endsWith('/salesCoordinatorStyles')?{styles:{}}:require(name),exported);
 const render=()=>{cursor=0;return exported.VerifiedMeetingsExportButton({compact:false,disabled,onExport:()=>downloads++});};
 function find(tree,label){let result;function walk(el){if(!React.isValidElement(el))return;if(el.props.accessibilityLabel===label||el.type===label)result=el;React.Children.forEach(el.props.children,walk);}walk(tree);assert.ok(result,label);return result;}
 return{render,find,count:()=>downloads,setDisabled:value=>{disabled=value;}};
}
test('Excel click opens a masked password popup without downloading',()=>{
 const h=harness();h.find(h.render(),'Export verified meetings to Excel').props.onPress();const tree=h.render();assert.equal(h.count(),0);assert.equal(h.find(tree,'Modal').props.visible,true);assert.equal(h.find(tree,'Export password').props.secureTextEntry,true);
});
test('wrong password prevents download and displays a retry error',()=>{
 const h=harness();h.find(h.render(),'Export verified meetings to Excel').props.onPress();h.find(h.render(),'Export password').props.onChangeText('wrong');h.find(h.render(),'Confirm Excel export').props.onPress();assert.equal(h.count(),0);assert.equal(h.find(h.render(),'Modal').props.visible,true);
 let errors=[];function walk(el){if(!React.isValidElement(el))return;if(el.props.accessibilityRole==='alert')errors.push(el.props.children);React.Children.forEach(el.props.children,walk);}walk(h.render());assert.deepEqual(errors,['Incorrect password. Please try again.']);
});
test('correct password downloads once and requires password again for the next export',()=>{
 const h=harness();h.find(h.render(),'Export verified meetings to Excel').props.onPress();h.find(h.render(),'Export password').props.onChangeText('140302');const confirm=h.find(h.render(),'Confirm Excel export').props.onPress;confirm();confirm();assert.equal(h.count(),1);assert.equal(h.find(h.render(),'Modal').props.visible,false);
 h.find(h.render(),'Export verified meetings to Excel').props.onPress();assert.equal(h.find(h.render(),'Export password').props.value,'');h.find(h.render(),'Confirm Excel export').props.onPress();assert.equal(h.count(),1);
});
test('cancel and request-close clear password and cannot download',()=>{
 const h=harness();h.find(h.render(),'Export verified meetings to Excel').props.onPress();h.find(h.render(),'Export password').props.onChangeText('140302');h.find(h.render(),'Close export password').props.onPress();assert.equal(h.count(),0);assert.equal(h.find(h.render(),'Export password').props.value,'');
 h.find(h.render(),'Export verified meetings to Excel').props.onPress();h.find(h.render(),'Modal').props.onRequestClose();assert.equal(h.find(h.render(),'Modal').props.visible,false);
});
test('disabled export cannot open or confirm even if data becomes unavailable while popup is open',()=>{
 const h=harness();h.setDisabled(true);h.find(h.render(),'Export verified meetings to Excel').props.onPress();assert.equal(h.find(h.render(),'Modal').props.visible,false);
 h.setDisabled(false);h.find(h.render(),'Export verified meetings to Excel').props.onPress();h.find(h.render(),'Export password').props.onChangeText('140302');h.setDisabled(true);h.find(h.render(),'Confirm Excel export').props.onPress();assert.equal(h.count(),0);
});
