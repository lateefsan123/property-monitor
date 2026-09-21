// Shared by text and voice on web/native. All database reads use the caller's
// authenticated client; these market tables are public reference data, not leads.
const PAGE = 250;
const MAX_ROWS = 5000;
const clean = value => String(value || '').replace(/[^\p{L}\p{N}\s'-]/gu, '').trim().slice(0, 100);
const positive = value => value !== null && value !== '' && Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : null;
const bedsValue = value => /^studio$/i.test(String(value).trim()) ? '0' : /^\d+(?:\s*(?:br|bed(?:room)?s?))?$/i.test(String(value).trim()) ? String(parseInt(value, 10)) : null;
const money = value => value == null ? 'Unavailable' : `AED ${Math.round(value).toLocaleString('en-GB')}`;

function date(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) throw new Error('Use valid YYYY-MM-DD dates.');
  return value;
}

export function salesFilters(args) {
  const start = date(args.start_date), end = date(args.end_date);
  if (start > end || (Date.parse(end) - Date.parse(start)) / 86400000 > 366) throw new Error('Choose a date range of up to one year.');
  const beds = args.beds === '' ? null : bedsValue(args.beds);
  if (args.beds !== '' && beds === null) throw new Error('Use a bedroom count, studio, or an empty value.');
  const min = args.min_area_sqft === '' ? null : positive(args.min_area_sqft);
  const max = args.max_area_sqft === '' ? null : positive(args.max_area_sqft);
  if ((args.min_area_sqft !== '' && min === null) || (args.max_area_sqft !== '' && max === null) || (min && max && min > max)) throw new Error('Invalid size range in square feet.');
  const area = clean(args.area);
  if (!args.building_key && area.length < 3) throw new Error('Choose a building or a specific area first.');
  return { start, end, beds, min, max, area, propertyType: args.property_type };
}

export function summarizeSales(rows, filters, complete = true) {
  const eligible = rows.filter(row => {
    const amount = positive(row.amount), size = positive(row.builtup_area_sqft);
    // Never mix rents, gifts, mortgages or nominal/share transfers into sale comps.
    if (!amount || amount < 100000 || !/sale|sell/i.test(row.category || '') || /rent|gift|mortgage|share|partial/i.test(row.category || '')) return false;
    if (filters.beds !== null && bedsValue(row.beds) !== filters.beds) return false;
    if (filters.min && (!size || size < filters.min)) return false;
    if (filters.max && (!size || size > filters.max)) return false;
    if (filters.propertyType === 'apartment' && !/apartment|flat/i.test(row.property_type || '')) return false;
    if (filters.propertyType === 'villa' && !/villa/i.test(row.property_type || '')) return false;
    return true;
  });
  const amounts = eligible.map(row => Number(row.amount)).sort((a, b) => a - b);
  const sized = eligible.filter(row => positive(row.builtup_area_sqft));
  const volume = amounts.reduce((a, b) => a + b, 0);
  const median = amounts.length ? (amounts[Math.floor((amounts.length - 1) / 2)] + amounts[Math.floor(amounts.length / 2)]) / 2 : null;
  return { eligible, summary: !complete ? null : {
    count: amounts.length, totalValueAed: volume, averagePriceAed: amounts.length ? volume / amounts.length : null,
    medianPriceAed: median, lowestPriceAed: amounts[0] ?? null, highestPriceAed: amounts.at(-1) ?? null,
    // Weighted by area, NOT an average of individual ratios. Missing sizes excluded.
    pricePerSqftAed: sized.length ? sized.reduce((sum, row) => sum + Number(row.amount), 0) / sized.reduce((sum, row) => sum + Number(row.builtup_area_sqft), 0) : null,
    pricePerSqftSampleSize: sized.length,
  } };
}

export function createAssistantMarket({ supabase, now = () => new Date() }) {
  const salesLocations = new Map(), listingLocations = new Map();
  async function query(builder, signal) {
    if (signal?.aborted) throw new Error('Lookup stopped.');
    const response = await (signal ? builder.abortSignal(signal) : builder);
    if (signal?.aborted) throw new Error('Lookup stopped.');
    if (response.error) throw new Error('Market data is temporarily unavailable.');
    return response;
  }
  async function bayut(body, signal) {
    if (signal?.aborted) throw new Error('Lookup stopped.');
    const { data, error } = await supabase.functions.invoke('bayut-alerts', { body, signal, timeout: 25000 });
    if (signal?.aborted) throw new Error('Lookup stopped.');
    if (error || data?.error || !data) throw new Error('Bayut data is temporarily unavailable.');
    return data;
  }
  async function locations(args, signal) {
    const term = clean(args.query);
    if (term.length < 2) throw new Error('Enter a building or area name.');
    if (args.source === 'bayut') {
      const data = await bayut({ mode: 'search', query: term }, signal);
      if (!Array.isArray(data.locations)) throw new Error('Bayut returned an invalid result.');
      const items = data.locations.slice(0, 20).filter(item => item.locationId).map(item => ({
        key: String(item.locationId), name: String(item.buildingName || item.searchName || '').slice(0, 160),
        area: String(item.fullPath || '').slice(0, 300),
      }));
      for (const item of items) listingLocations.set(item.key, { locationId: item.key, buildingName: item.name, searchName: item.name, fullPath: item.area });
      return { kind: 'market-locations', title: 'Bayut locations', items, note: 'Choose the matching building or area. Similar names may refer to different towers.' };
    }
    const find = name => query(supabase.from('buildings').select('key,search_name,location_name', { count: 'exact' })
      .or(`search_name.ilike.%${name}%,location_name.ilike.%${name}%`).order('key').limit(20), signal);
    let { data, count } = await find(term);
    // A known spelling variant only; preserve the tower number and never merge towers.
    const spelling = /^fort\s+(1|2)$/i.exec(term);
    const matchedQuery = !data?.length && spelling ? `Forte ${spelling[1]}` : term;
    if (matchedQuery !== term) ({ data, count } = await find(matchedQuery));
    const items = (data || []).map(row => ({ key: row.key, name: row.search_name || row.location_name, area: row.location_name }));
    for (const item of items) salesLocations.set(item.key, item);
    return { kind: 'market-locations', title: 'Buildings in sales data', items, total: count, requestedQuery: term, matchedQuery,
      note: matchedQuery !== term && items.length ? `Spelling match for “${term}”: “${matchedQuery}”. Tell the user the corrected name. If multiple towers match, ask which one; never silently substitute another tower.`
        : count > 20 ? 'First 20 matches. Narrow the name; do not combine ambiguous buildings.' : 'Imported market reference data. Resolve the exact tower before looking up sales.' };
  }
  async function sales(args, signal) {
    const filters = salesFilters(args);
    const building = args.building_key ? salesLocations.get(args.building_key) : null;
    if (args.building_key && !building) throw new Error('Find the sales building first and use its returned key.');
    const base = columns => {
      let q = supabase.from('transactions').select(columns, { count: 'exact' });
      if (building) q = q.eq('building_key', building.key);
      if (filters.area) q = q.ilike('full_location', `%${filters.area}%`);
      return q;
    };
    const [{ data: newest }, { data: oldest }] = await Promise.all([
      query(base('date').order('date', { ascending: false, nullsFirst: false }).limit(1), signal),
      query(base('date').order('date', { ascending: true, nullsFirst: false }).limit(1), signal),
    ]);
    const rows = [];
    let complete = false, matchingRows = null;
    while (rows.length < MAX_ROWS) {
      const { data, count } = await query(base('id,amount,category,date,beds,property_type,builtup_area_sqft,location_name,full_location,created_at')
        .gte('date', filters.start).lte('date', filters.end).order('date', { ascending: false }).order('id')
        .range(rows.length, rows.length + PAGE - 1), signal);
      const page = data || [];
      rows.push(...page); matchingRows = count;
      if (!page.length || (count !== null && rows.length >= count)) { complete = true; break; }
    }
    const { eligible, summary } = summarizeSales(rows, filters, complete);
    const coverage = { earliestRecordedSale: oldest?.[0]?.date || null, latestRecordedSale: newest?.[0]?.date || null };
    const availability = !coverage.latestRecordedSale ? 'no_history'
      : coverage.latestRecordedSale < filters.start || coverage.earliestRecordedSale > filters.end ? 'outside_recorded_range'
        : !eligible.length ? 'no_matching_records' : 'records_found';
    coverage.availability = availability;
    // A last transaction date is not a successful-import watermark. Never claim
    // the source is complete through that date, or that an empty month had no sales.
    const empty = complete && !eligible.length;
    const emptyState = empty ? {
      title: availability === 'outside_recorded_range' ? 'Requested period unavailable'
        : availability === 'no_history' ? 'Sales history unavailable' : 'No matching imported sales',
      detail: coverage.latestRecordedSale
        ? `Latest available record: ${coverage.latestRecordedSale}. This does not establish that no sales occurred in your requested period.`
        : 'There is no imported history for this location yet. This is not evidence of zero market sales.',
      meta: coverage.latestRecordedSale ? 'Ask for the latest available sales, or refresh the data source.' : 'A current sales source is needed.',
    } : null;
    const caveat = 'Imported sales only, not all Dubai sales. Asking prices are excluded. Source is the shared DLD/Bayut import; individual rows do not retain provider provenance. Unknown/non-sale categories and values below AED 100,000 are excluded. Comparable candidates are not a valuation.';
    return { kind: 'market-sales', title: `${building?.name || filters.area} sales`, source: 'Repeat AI imported sales (CSV / market cache)',
      priceType: 'recorded_sale', queriedAt: now().toISOString(), filters, coverage, summary: empty ? null : summary, emptyState,
      complete, scannedRows: rows.length, matchingRows, total: complete && !empty ? eligible.length : null,
      note: `${filters.start} – ${filters.end} · ${empty ? 'No matching records available for this request; market activity is unknown.' : complete ? `${eligible.length} imported sales; showing up to 20.` : 'Too many records. Narrow the dates or building; totals and averages are withheld.'} Imported coverage only.`,
      limitations: caveat,
      items: eligible.slice(0, 20).map(row => ({ date: row.date, name: row.location_name || building?.name || filters.area,
        amountAed: Number(row.amount), beds: bedsValue(row.beds), areaSqft: positive(row.builtup_area_sqft),
        pricePerSqftAed: positive(row.builtup_area_sqft) ? Number(row.amount) / Number(row.builtup_area_sqft) : null,
        propertyType: row.property_type, category: row.category, importedAt: row.created_at })),
    };
  }
  async function listings(args, signal) {
    const location = listingLocations.get(args.location_key);
    if (!location) throw new Error('Search Bayut locations first and use a returned key.');
    const beds = args.beds === '' ? null : bedsValue(args.beds);
    if (args.beds !== '' && beds === null) throw new Error('Invalid bedroom count.');
    const data = await bayut({ mode: 'watchlist', locations: [location] }, signal);
    const building = data.buildings?.find(item => String(item.locationId) === args.location_key);
    if (!building || building.fetchError || !Array.isArray(building.listings)) throw new Error('Bayut listings could not be retrieved. This does not mean there are no listings.');
    const all = building.listings.filter(item => beds === null || bedsValue(item.beds) === beds);
    const amounts = all.map(item => positive(item.price)).filter(value => value !== null);
    return { kind: 'market-listings', title: `${location.buildingName} asking prices`, source: 'Bayut via Repeat AI listing provider',
      priceType: 'asking', queriedAt: now().toISOString(), complete: false, sampleSize: all.length,
      latestListingUpdate: building.latestVerifiedAt || null,
      samplePriceRange: { lowestAed: amounts.length ? Math.min(...amounts) : null, highestAed: amounts.length ? Math.max(...amounts) : null },
      note: `${all.length} listings in the returned sample · Asking prices, not completed sales. Provider results may be cached for up to one hour; apartment sale listings only, not all market inventory.`,
      items: all.slice(0, 20).map(item => ({ name: String(item.title || location.buildingName).slice(0, 240), amountAed: positive(item.price),
        beds: bedsValue(item.beds), areaSqft: positive(item.areaSqft), updatedAt: item.verifiedAt || null })),
    };
  }
  return { read: (name, args, signal) => name === 'market_locations' ? locations(args, signal) : name === 'market_sales' ? sales(args, signal) : listings(args, signal) };
}

export function marketResultCards(result) {
  if (result.kind === 'market-locations') return result.items.map(item => ({ title: item.name, detail: item.area }));
  const cards = [];
  if (result.emptyState) cards.push(result.emptyState);
  if (result.summary) {
    const s = result.summary;
    cards.push({ title: `${s.count} imported sales`, detail: `Average ${money(s.averagePriceAed)} · Median ${money(s.medianPriceAed)}`,
      meta: s.pricePerSqftAed === null ? 'Price per sq ft unavailable' : `${money(s.pricePerSqftAed)} / sq ft · Area-weighted, ${s.pricePerSqftSampleSize} sales with sizes` });
  }
  for (const item of result.items) cards.push({ title: item.name, detail: `${money(item.amountAed)}${item.beds !== null ? ` · ${item.beds === '0' ? 'Studio' : `${item.beds} bed`}` : ''}${item.areaSqft ? ` · ${Math.round(item.areaSqft).toLocaleString('en-GB')} sq ft` : ''}`,
    meta: result.kind === 'market-sales' ? `Sold ${item.date}` : `Asking price${item.updatedAt ? ` · Updated ${String(item.updatedAt).slice(0, 10)}` : ' · Update date unavailable'}` });
  return cards;
}
