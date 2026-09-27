import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createBuildingScheduleServices } from '../shared/building-schedule-services.js';
import { emptySchedule, scheduleBuildingKey } from '../supabase/functions/_shared/building-schedule.js';

test('settings save only flags and authenticated owner, never building assignments', async () => {
  let payload;
  const services = createBuildingScheduleServices({ from: () => ({ upsert: async value => {payload=value;return {};} }) });
  await services.savePreferences('owner',{ enabled:true,fill_unused:false,days:{Monday:[]},user_id:'other' });
  assert.deepEqual(payload,{user_id:'owner',enabled:true,fill_unused:false});
  await assert.rejects(services.savePreferences(null,{}),/Sign in/);
});
test('settings failures surface instead of appearing saved', async () => {
  const services = createBuildingScheduleServices({ from: () => ({ upsert: async () => ({error:{message:'offline'}}) }) });
  await assert.rejects(services.savePreferences('owner',{}),/Could not save/);
});
test('unsaved building edits retain new settings from the cache and remain account scoped', () => {
  let draft=null;
  let saved=emptySchedule();
  const scope={emptySchedule,scheduleBuildingKey,createBuildingScheduleServices:()=>({}),buildingScheduleOptions:()=>({schedule:{queryKey:['schedule']},buildings:{enabled:false}}),useQueryClient:()=>({}),useMutation:()=>({reset(){}}),useQuery:()=>({data:saved,isPending:false}),useState:()=>[draft,next=>{draft=typeof next==='function'?next(draft):next;}]};
  vm.createContext(scope);
  const source=readFileSync(new URL('../shared/use-building-schedule.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace('export function','function');
  vm.runInContext(source,scope);
  const run=user=>scope.useBuildingSchedule({},user,{buildings:[]});
  run('owner').toggleBuilding('Monday','Forte 1');
  saved={...saved,enabled:true,fill_unused:true};
  const next=run('owner');
  assert.equal(next.value.enabled,true);assert.equal(next.value.fill_unused,true);
  assert.deepEqual(Array.from(next.value.days.Monday),['Forte 1']);
  assert.deepEqual(Array.from(run('other').value.days.Monday),[]);
});

test('rapid deselection clears the final day, and removal clears only the requested building', async () => {
  let draft = null;
  let persisted;
  const initial = { ...emptySchedule(), enabled: true, days: { ...emptySchedule().days, Monday: ['Forte 1', 'Forte 2'], Thursday: ['Forte 1'] } };
  const service = createBuildingScheduleServices({ from: () => ({ upsert: async value => { persisted = value; return {}; } }) });
  const scope = { emptySchedule, scheduleBuildingKey, createBuildingScheduleServices: () => service, buildingScheduleOptions: () => ({ schedule: { queryKey: ['schedule'] }, buildings: { enabled: false } }), useQueryClient: () => ({}), useMutation: () => ({ reset() {}, mutate: value => service.save('owner', value) }), useQuery: () => ({ data: initial, isPending: false }), useState: () => [draft, next => { draft = typeof next === 'function' ? next(draft) : next; }] };
  vm.createContext(scope);
  const source = readFileSync(new URL('../shared/use-building-schedule.js', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, '').replace('export function', 'function');
  vm.runInContext(source, scope);
  const run = () => scope.useBuildingSchedule({}, 'owner', { buildings: [] });
  const state = run();
  state.toggleBuilding('Monday', 'Forte 1');
  state.toggleBuilding('Thursday', 'Forte 1');
  assert.deepEqual(Array.from(run().value.days.Monday), ['Forte 2']);
  assert.deepEqual(Array.from(run().value.days.Thursday), []);
  run().toggleBuilding('Sunday', 'Forte 1');
  run().removeBuilding(' FORTE 1 ');
  assert.deepEqual(Array.from(run().value.days.Sunday), []);
  assert.deepEqual(Array.from(run().value.days.Monday), ['Forte 2']);
  run().removeBuilding('Forte 2');
  await run().save();
  assert.equal(Object.values(persisted.days).flat().length, 0);
  assert.equal(persisted.user_id, 'owner');
  assert.equal(persisted.enabled, true);
});
