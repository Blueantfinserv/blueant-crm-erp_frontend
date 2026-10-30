const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function harness(progress) {
  const slots = [];
  const timers = new Map();
  let cursor = 0, id = 0, completions = 0, currentProgress = progress;
  let effects = [];
  const react = {
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useEffect(callback, deps) {
      const i = cursor++;
      const old = slots[i];
      if (!old || deps.some((value, index) => !Object.is(value, old.deps[index]))) {
        old?.cleanup?.();
        effects.push(() => { slots[i] = { deps, cleanup: callback() }; });
      }
    },
  };
  class Value { constructor(value) { this.value = value; } interpolate() { return 'width'; } }
  const styles = new Proxy({}, { get: () => ({}) });
  const imports = name => {
    if (name === 'react') return react;
    if (name === 'react-native') return { View: 'View', Text: 'Text', Animated: { Value, View: 'AnimatedView', timing: () => ({ start() {}, stop() {} }) } };
    if (name === 'react-native-paper') return {};
    if (name.endsWith('/salesCoordinatorStyles')) return { styles, popupStyles: styles };
    if (name.endsWith('/coordinatorConstants')) return { PAGE_SIZE: 100 };
    if (name.endsWith('/VerificationDropdown')) return {};
    return require(name);
  };
  const file = path.join(__dirname, '../components/CoordinatorControls.tsx');
  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exported = {};
  new Function('require', 'exports', 'setTimeout', 'clearTimeout', output)(imports, exported, callback => { timers.set(++id, callback); return id; }, timer => timers.delete(timer));
  function text(node) { if (node == null) return ''; if (typeof node !== 'object') return String(node); if (Array.isArray(node)) return node.map(text).join(''); return text(node.props?.children); }
  function render() { cursor = 0; effects = []; const tree = exported.LoadingProgressBar({ progress: currentProgress, onComplete: () => completions++ }); const label = text(tree); effects.forEach(effect => effect()); return label; }
  return {
    render,
    ready(value) { currentProgress = value; return render(); },
    tick() { const first = timers.entries().next().value; if (!first) return null; timers.delete(first[0]); first[1](); return render(); },
    completed: () => completions,
    unmount() { slots.forEach(slot => slot?.cleanup?.()); },
    timerCount: () => timers.size,
  };
}
test('fast data still displays every ten-percent step and holds 100 before reveal', () => {
  const h = harness(100);
  const labels = [h.render()];
  for (let i = 0; i < 9; i++) labels.push(h.tick());
  assert.deepEqual(labels, ['10%', '20%', '30%', '40%', '50%', '60%', '70%', '80%', '90%', '100%']);
  assert.equal(h.completed(), 0);
  h.tick();
  assert.equal(h.completed(), 1);
});
test('slow data waits at 90 until real completion without skipping numbers', () => {
  const h = harness(0);
  assert.equal(h.render(), '10%');
  for (let step = 20; step <= 90; step += 10) assert.equal(h.tick(), `${step}%`);
  assert.equal(h.tick(), null);
  assert.equal(h.completed(), 0);
  h.ready(80);
  assert.equal(h.tick(), null);
  h.ready(100);
  assert.equal(h.tick(), '100%');
  h.tick();
  assert.equal(h.completed(), 1);
});
test('tab unmount cancels its timer and a cached tab starts a fresh full sequence', () => {
  const h = harness(100);
  h.render(); h.tick(); h.unmount();
  assert.equal(h.timerCount(), 0);
  assert.equal(h.completed(), 0);
  const reopened = harness(100);
  assert.equal(reopened.render(), '10%');
});
