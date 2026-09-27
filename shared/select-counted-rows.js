// Fetch the first page and count together, then read remaining pages with a
// bounded queue. Keep page order even when responses arrive out of order.
export async function selectCountedRows(buildQuery, pageSize = 1000, concurrency = 3) {
  const { data, error, count } = await buildQuery(true).range(0, pageSize - 1);
  if (error) throw new Error(error.message);
  const first = data || [];
  if (first.length < pageSize) return first;

  // Older proxies may omit Content-Range. Never silently truncate their data.
  if (!Number.isInteger(count)) {
    const rows = [...first];
    for (let offset = pageSize; ; offset += pageSize) {
      const result = await buildQuery(false).range(offset, offset + pageSize - 1);
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
      const result = await buildQuery(false).range(offset, offset + pageSize - 1);
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
