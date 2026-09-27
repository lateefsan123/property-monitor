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
    const { createLeadInsightServices } = await vite.ssrLoadModule('/shared/lead-insights.js');
    const building = rows[0];
    const db = {
      rpc: async () => ({ data: [{ building_key: building.key }] }),
      from: table => {
        const q = { select: () => q, eq: () => q, order: () => q,
          in: async () => ({ data: [building] }),
          limit: async () => ({ data: [{ building_key: building.key, amount: 1500000, date: '2026-09-25', beds: '2', builtup_area_sqft: 1000 }] }),
        };
        assert.ok(['buildings', 'transactions'].includes(table));
        return q;
      },
    };
    const services = createLeadInsightServices(db);
    const data = await services.fetchBuildingMarketData([building.key]);
    assert.equal(data.transactionsByBuilding[building.key][0].area_sqft, 1000);
    const result = services.computeLeadInsights([{ id: 'fixture', building: building.search_name }], data);
    assert.equal(result.updates.fixture.recentTransactions[0].area, 1000);
    assert.equal(result.updates.fixture.psf, 1500);
  } finally { await vite.close(); }
});
