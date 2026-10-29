// Run: node --test src/modules/salesManager/tasks/__tests__/taskCard.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const platform = { OS: 'web' };
const source = fs.readFileSync(path.join(__dirname, '../components/SalesTaskCard.tsx'), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const exportsObject = {};
const imports = name => {
  if (name === 'react-native') return { Platform: platform, Pressable: 'Pressable', Text: 'Text', View: 'View', Linking: { openURL() {} }, StyleSheet: { create: value => value } };
  if (name === 'react-native-paper') return { Icon: 'Icon' };
  if (name.endsWith('/theme/theme')) return { theme: { colors: {}, spacing: {}, radius: {}, shadow: {} } };
  return require(name);
};
new Function('require', 'exports', js)(imports, exportsObject);
const render = exportsObject.SalesTaskCard.type;
const task = { name: 'Test', phone: '9876543210', taskKind: 'LEAD', taskLabel: 'PROSPECTS', schedule: 'Today', coordinates: { latitude: 0, longitude: 0 } };
function walk(element, callback, ancestors = []) {
  if (!React.isValidElement(element)) return;
  callback(element, ancestors);
  React.Children.forEach(element.props.children, child => walk(child, callback, [...ancestors, element]));
}
function action(tree, prefix) {
  let found;
  walk(tree, element => { if (element.props.accessibilityLabel?.startsWith(prefix)) found = element; });
  return found;
}
test('web card actions are never nested inside a button', () => {
  platform.OS = 'web';
  const tree = render({ task, width: '31%' });
  assert.equal(tree.props.accessibilityRole, undefined);
  assert.equal(tree.props.focusable, false);
  walk(tree, (element, ancestors) => {
    if (element.props.accessibilityRole === 'button') assert.ok(ancestors.every(parent => parent.props.accessibilityRole !== 'button'));
  });
  assert.ok(action(tree, 'Open details'));
  assert.ok(action(tree, 'Update meeting'));
});
test('details and update actions remain separate and stop bubbling', () => {
  let details = 0, updates = 0, stopped = 0;
  const tree = render({ task, width: '31%', onOpenDetails: () => details++, onUpdateMeeting: () => updates++ });
  const event = { stopPropagation: () => stopped++ };
  action(tree, 'Open details').props.onPress(event);
  assert.equal(details, 1);
  action(tree, 'Update meeting').props.onPress(event);
  assert.equal(updates, 1);
  assert.equal(details, 1);
  assert.equal(stopped, 2);
  tree.props.onPress();
  assert.equal(details, 2);
});
test('verification pending still disables meeting updates', () => {
  let updates = 0;
  const tree = render({ task: { ...task, verificationPending: true }, width: '31%', onUpdateMeeting: () => updates++ });
  const update = action(tree, 'Update meeting');
  assert.equal(update.props.disabled, true);
  update.props.onPress({ stopPropagation() {} });
  assert.equal(updates, 0);
});
test('native card retains its existing accessible button', () => {
  platform.OS = 'android';
  const tree = render({ task, width: '100%' });
  assert.equal(tree.props.accessibilityRole, 'button');
  assert.equal(tree.props.focusable, true);
  platform.OS = 'web';
});
