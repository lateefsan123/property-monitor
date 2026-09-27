import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../mobile/src/workspace/navigation-drawer.js', import.meta.url), 'utf8');
const gestureSource = source.slice(source.indexOf('  const edgeGesture ='), source.indexOf('  const dismissGesture ='));
function gesture(hasBack) {
  const calls = [];
  const context = { useMemo: factory => factory(), PanResponder: { create: handlers => handlers }, open: false, slide: { stopAnimation() {}, setValue(value) { calls.push(value); } }, drawerWidth: 320, setOpen() {}, close: () => calls.push('close'), show: () => calls.push('drawer'), onHeaderBack: hasBack ? () => calls.push('back') : undefined };
  vm.createContext(context);
  vm.runInContext(`${gestureSource}\nthis.handlers = edgeGesture;`, context);
  return { handlers: context.handlers, calls };
}

test('edge swipe returns from a detail page without opening navigation', () => {
  const { handlers, calls } = gesture(true);
  assert.equal(handlers.onMoveShouldSetPanResponderCapture(null, {dx:40,dy:4,x0:10}),true);
  handlers.onPanResponderRelease(null, {dx:100,dy:8,vx:0,x0:10});
  assert.deepEqual(calls,['back']);
});
test('root-page edge swipe still opens navigation', () => {
  const { handlers, calls } = gesture(false);
  handlers.onPanResponderRelease(null, {dx:100,dy:8,vx:0,x0:10});
  assert.deepEqual(calls,['drawer']);
});
test('short, leftward and vertical gestures do not navigate', () => {
  const { handlers, calls } = gesture(true);
  for (const event of [{dx:12,dy:0},{dx:-90,dy:0},{dx:40,dy:90}]) {
    assert.equal(handlers.onMoveShouldSetPanResponderCapture(null,event),false);
    handlers.onPanResponderRelease(null,event);
  }
  assert.deepEqual(calls,[]);
});

test('root drawer follows a swipe beginning in the middle and settles open', () => {
  const { handlers, calls } = gesture(false);
  assert.equal(handlers.onMoveShouldSetPanResponderCapture(null, { x0: 190, dx: 20, dy: 2 }), true);
  handlers.onPanResponderGrant();
  handlers.onPanResponderMove(null, { dx: 140 });
  assert.equal(calls.at(-1), -180);
  handlers.onPanResponderRelease(null, { dx: 140, vx: 0 });
  assert.equal(calls.at(-1), 'drawer');
});
test('short drag settles closed and vertical scrolls are not captured', () => {
  const { handlers, calls } = gesture(false);
  assert.equal(handlers.onMoveShouldSetPanResponderCapture(null, { x0: 190, dx: 25, dy: 60 }), false);
  handlers.onPanResponderRelease(null, { dx: 25, vx: 0 });
  assert.equal(calls.at(-1), 'close');
  handlers.onPanResponderTerminate();
  assert.equal(calls.at(-1), 'close');
});
test('detail pages only capture back swipes from the edge', () => {
  assert.equal(gesture(true).handlers.onMoveShouldSetPanResponderCapture(null, { x0: 190, dx: 90, dy: 2 }), false);
});
