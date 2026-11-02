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
test('ready data reveals immediately without waiting for animation timers', () => {
  const h = harness(100);
  h.render();
  assert.equal(h.completed(), 1);
  assert.equal(h.timerCount(), 0);
  h.render();
  assert.equal(h.completed(), 1);
});

test('data ready midway cancels remaining steps and reveals immediately', () => {
  const h = harness(0);
  h.render();
  assert.equal(h.tick(), '20%');
  h.ready(100);
  assert.equal(h.completed(), 1);
  assert.equal(h.timerCount(), 0);
});

test('slow data waits at 90 and reveals as soon as readiness arrives', () => {
  const h = harness(0);
  assert.equal(h.render(), '10%');
  for (let step = 20; step <= 90; step += 10) assert.equal(h.tick(), `${step}%`);
  assert.equal(h.tick(), null);
  assert.equal(h.completed(), 0);
  h.ready(100);
  assert.equal(h.completed(), 1);
  assert.equal(h.timerCount(), 0);
});

test('unmount cancels the pending cosmetic timer without revealing data', () => {
  const h = harness(0);
  h.render(); h.tick(); h.unmount();
  assert.equal(h.timerCount(), 0);
  assert.equal(h.completed(), 0);
});
