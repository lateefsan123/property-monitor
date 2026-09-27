import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

test('citywide cache resolves exact projects and rejects ambiguous unqualified names', async () => {
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
  try {
    const { createLeadBuildingResolver } = await vite.ssrLoadModule('/src/features/seller-signal/lead-data-quality.js');
    const { getBuildingKeyVariants } = await vite.ssrLoadModule('/src/features/seller-signal/building-utils.js');
    const row = (project, area) => ({ source: 'dld_citywide', source_project: project, source_area: area,
      search_name: `${project}, ${area}`, location_name: project, key: `${project}${area}`.toLowerCase().replace(/[^a-z0-9]/g, '') });
    const rows = [row('Marina Tower', 'Dubai Marina'), row('Common Tower', 'JVC'), row('Common Tower', 'Business Bay'), row('VILLA MYRA', 'JUMEIRAH VILLAGE CIRCLE'), row('Studio One', 'Dubai Marina')];
    const resolve = createLeadBuildingResolver([], rows);
    for (const b of rows) {
      const match = resolve(b.search_name);
      assert.equal(match.canonicalName, b.search_name);
      assert.equal(getBuildingKeyVariants(match.canonicalName)[0], b.key);
    }
    assert.equal(resolve('Common Tower').status, 'unmatched');
    assert.equal(resolve('JVC').status, 'unmatched');
    assert.equal(resolve('Marina Tower 2').status, 'unmatched');
    assert.equal(resolve('Marina Tower').canonicalName, 'Marina Tower, Dubai Marina');
    assert.equal(resolve('Studio One').canonicalName, 'Studio One, Dubai Marina');
    assert.equal(resolve('VILLA MYRA').canonicalName, 'VILLA MYRA, JUMEIRAH VILLAGE CIRCLE');
  } finally { await vite.close(); }
});
