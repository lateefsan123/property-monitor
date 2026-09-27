import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../mobile/src/workspace/navigation-drawer.js', import.meta.url), 'utf8');
const gestureSource = source.slice(source.indexOf('  const edgeGesture ='), source.indexOf('  const dismissGesture ='));
function gesture(hasBack) {
  const calls = [];
  const context = { useMemo: factory => factory(), PanResponder: { create: handlers => handlers }, show: () => calls.push('drawer'), onHeaderBack: hasBack ? () => calls.push('back') : undefined };
  vm.createContext(context);
  vm.runInContext(`${gestureSource}\nthis.handlers = edgeGesture;`, context);
  return { handlers: context.handlers, calls };
}

test('edge swipe returns from a detail page without opening navigation', () => {
  const { handlers, calls } = gesture(true);
  assert.equal(handlers.onMoveShouldSetPanResponder(null, {dx:40,dy:4}),true);
  handlers.onPanResponderRelease(null, {dx:100,dy:8});
  assert.deepEqual(calls,['back']);
});
test('root-page edge swipe still opens navigation', () => {
  const { handlers, calls } = gesture(false);
  handlers.onPanResponderRelease(null, {dx:100,dy:8});
  assert.deepEqual(calls,['drawer']);
});
test('short, leftward and vertical gestures do not navigate', () => {
  const { handlers, calls } = gesture(true);
  for (const event of [{dx:12,dy:0},{dx:-90,dy:0},{dx:40,dy:90}]) {
    assert.equal(handlers.onMoveShouldSetPanResponder(null,event),false);
    handlers.onPanResponderRelease(null,event);
  }
  assert.deepEqual(calls,[]);
});
