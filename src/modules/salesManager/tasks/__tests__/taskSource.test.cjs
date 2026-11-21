const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../taskSource.ts'), 'utf8');
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const exportedFunctions = {};
new Function('require', 'exports', output)(require, exportedFunctions);

test('refresh merges each enriched client task immediately and retains previous rows during incomplete history reads', () => {
  const old = { id: 'C1', taskKind: 'CLIENT', name: 'Old name', historyLoadState: undefined };
  const updated = { id: 'C1', taskKind: 'CLIENT', name: 'Updated name' };
  const readyNew = { id: 'C2', taskKind: 'CLIENT', name: 'Ready client' };
  const incomplete = { id: 'C3', taskKind: 'CLIENT', name: 'Unresolved client', historyLoadState: 'loading' };
  const failed = { id: 'C4', taskKind: 'CLIENT', name: 'Failed client', historyLoadState: 'error' };
  const result = exportedFunctions.mergeReadyClientTasks([old], [updated, readyNew, incomplete, failed]);
  assert.deepEqual(result.map(task => [task.id, task.name]), [
    ['C1', 'Updated name'],
    ['C2', 'Ready client'],
  ]);
});

test('ready client task merge keeps retained items if a refresh has no completed rows', () => {
  const retained = [{ id: 'C1', taskKind: 'CLIENT', name: 'Existing task' }];
  assert.deepEqual(exportedFunctions.mergeReadyClientTasks(retained, [{ id: 'C2', taskKind: 'CLIENT', historyLoadState: 'loading' }]), retained);
});
