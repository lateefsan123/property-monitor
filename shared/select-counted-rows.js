// Each page is retried twice after a short pause: with 26,000+ sellers one
// dropped request ("Failed to fetch") used to fail the whole list.
export async function readPage(run, attempts = 3) {
  let result;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (attempt) await new Promise((resolve) => setTimeout(resolve, 600 * attempt));
    try {
      result = await run();
    } catch (error) {
      result = { data: null, error };
    }
    if (!result.error) return result;
  }
  return result;
}

// Fetch the first page and count together, then read remaining pages with a
// bounded queue. Keep page order even when responses arrive out of order.
export async function selectCountedRows(buildQuery, pageSize = 1000, concurrency = 3) {
  const { data, error, count } = await readPage(() => buildQuery(true).range(0, pageSize - 1));
  if (error) throw new Error(error.message);
  const first = data || [];
  if (first.length < pageSize) return first;

  // Older proxies may omit Content-Range. Never silently truncate their data.
  if (!Number.isInteger(count)) {
    const rows = [...first];
    for (let offset = pageSize; ; offset += pageSize) {
      const result = await readPage(() => buildQuery(false).range(offset, offset + pageSize - 1));
      if (result.error) throw new Error(result.error.message);
      const batch = result.data || [];
      rows.push(...batch);
      if (batch.length < pageSize) return rows;
    }
  }

  const pages = [first];
  const pageCount = Math.ceil(count / pageSize);
  let nextPage = 1;
  let failed = false;
  async function worker() {
    while (!failed && nextPage < pageCount) {
      const page = nextPage++;
      const offset = page * pageSize;
      const result = await readPage(() => buildQuery(false).range(offset, offset + pageSize - 1));
      if (result.error) {
        failed = true;
        throw new Error(result.error.message);
      }
      pages[page] = result.data || [];
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, pageCount - 1) }, worker));
  return pages.flat();
}
