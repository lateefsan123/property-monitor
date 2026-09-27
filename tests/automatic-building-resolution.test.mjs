import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCatalogue, findCandidates, safeCandidate, acceptAiChoice, askBuildingAi } from '../supabase/functions/_shared/building-resolution.js';
import { createServer } from 'vite';

const row = (project, area, key = project + area) => ({ key, search_name: `${project}, ${area}`, source_project: project, source_area: area });
const catalogue = buildCatalogue([row('Marina Tower', 'Dubai Marina'), row('Marina Tower 1', 'Dubai Marina'),
  row('Marina Tower 2', 'Dubai Marina'), row('Common Tower', 'JVC'), row('Common Tower', 'Business Bay'),
  row('Peninsula Five', 'Business Bay'), row('Burj Views A', 'Downtown Dubai'), row('Burj Views B', 'Downtown Dubai')]);

test('normalizes number words and abbreviations without losing building identity', () => {
  assert.equal(safeCandidate(findCandidates('Peninsula 5, Business Bay', catalogue)).name, 'Peninsula Five, Business Bay');
  assert.equal(safeCandidate(findCandidates('Common Twr, JVC', catalogue)).area, 'jumeirah village circle');
  assert.equal(safeCandidate(findCandidates('Marina Twer 1', catalogue)).name, 'Marina Tower 1, Dubai Marina');
});
test('refuses area ambiguity, different towers, generic names and truncated input', () => {
  for (const raw of ['Common Tower', 'Marina Tower 3', 'Tower A', 'Marina Tower, Business Bay', 'Marina Tow…', 'Marina Tower, Unknown Area', 'person@example.com', 'Burj Views C']) {
    assert.equal(safeCandidate(findCandidates(raw, catalogue)), null, raw);
  }
  assert.ok(findCandidates('Burj Views A', catalogue).every(c => c.name.includes('Views A')));
});
test('AI cannot choose an invented ID, a lower-ranked building, or overrule ambiguity', () => {
  const candidates = findCandidates('Marina Twer 1', catalogue);
  assert.ok(acceptAiChoice({ decision: 'match', candidate_id: candidates[0].id }, candidates));
  assert.equal(acceptAiChoice({ decision: 'match', candidate_id: 'made-up' }, candidates), null);
  assert.equal(acceptAiChoice({ decision: 'review', candidate_id: candidates[0].id }, candidates), null);
  const ambiguous = findCandidates('Common Tower', catalogue);
  assert.equal(acceptAiChoice({ decision: 'match', candidate_id: ambiguous[0].id }, ambiguous), null);
});
test('duplicate cache rows do not create false ambiguity', () => {
  const duplicate = buildCatalogue([{ key: 'Marina Tower', search_name: 'Marina Tower' }, { key: 'marinatower', search_name: 'Marina Tower' }]);
  assert.equal(duplicate.length, 1);
  assert.equal(safeCandidate(findCandidates('Marina Tower', duplicate)).id, 'marinatower');
});
test('AI request uses a strict candidate schema and fails closed on errors or refusal', async () => {
  const candidates = findCandidates('Marina Twer 1', catalogue);
  const request = async (_url, options) => {
    const body = JSON.parse(options.body);
    assert.equal(body.store, false);
    assert.equal(body.response_format.json_schema.strict, true);
    assert.deepEqual(Object.keys(JSON.parse(body.messages[1].content)), ['building', 'candidates']);
    return { ok: true, json: async () => ({ choices: [{ message: { refusal: 'No' } }] }) };
  };
  assert.equal(acceptAiChoice(await askBuildingAi('Marina Twer 1', candidates, 'fixture', request), candidates), null);
  await assert.rejects(askBuildingAi('fixture', candidates, 'fixture', async () => ({ ok: false, status: 429 })), /429/);
  await assert.rejects(askBuildingAi('fixture', candidates, 'fixture', async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: 'invalid' } }] }) })));
});
test('saved automatic matches use the original name only and preserve explicit aliases', async () => {
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
  try {
    const { createLeadBuildingResolver, enrichLeadsWithDataQuality } = await vite.ssrLoadModule('/src/features/seller-signal/lead-data-quality.js');
    const auto = { automatic: true, aliasName: 'Marina Twer 1', canonicalName: 'Marina Tower 1, Dubai Marina' };
    const resolve = createLeadBuildingResolver([auto]);
    assert.equal(resolve('Marina Twer 1').canonicalName, auto.canonicalName);
    assert.equal(resolve('Marina Twer 2').status, 'unmatched');
    assert.equal(createLeadBuildingResolver([auto, { aliasName: auto.aliasName, canonicalName: 'Explicit choice' }])(auto.aliasName).canonicalName, 'Explicit choice');
    const [lead] = enrichLeadsWithDataQuality([{ id: 1, sourceId: 'fixture', name: 'Fixture', phone: '123', unit: '1', building: 'Unknown Fixture Tower' }]);
    assert.equal(lead.dataQuality.label, 'Building matching');
    assert.equal(lead.dataQuality.level, 'matching');
    assert.equal(lead.building, 'Unknown Fixture Tower');
  } finally { await vite.close(); }
});
