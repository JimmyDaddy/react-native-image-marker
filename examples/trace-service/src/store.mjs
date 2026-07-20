/** In-memory records are for local evaluation only, not production persistence. */
export function createMemoryTraceStore() {
  const records = new Map();
  return {
    /** @param {string} locator @param {Record<string, unknown>} record */
    async put(locator, record) {
      records.set(locator, { ...record });
    },
    /** @param {string} locator */
    async get(locator) {
      const record = records.get(locator);
      return record ? { ...record } : null;
    },
  };
}
