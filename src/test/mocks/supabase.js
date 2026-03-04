import { vi } from 'vitest';

// Chainable query builder mock
function createQueryBuilder(resolvedData = [], resolvedError = null) {
  const builder = {
    select: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    neq: vi.fn(() => builder),
    or: vi.fn(() => builder),
    order: vi.fn(() => builder),
    single: vi.fn(() => builder),
    then: vi.fn((resolve) => resolve({ data: resolvedData, error: resolvedError })),
  };

  // Make it thenable (awaitable)
  builder[Symbol.for('vitest:thenable')] = true;
  builder.then = (resolve) => Promise.resolve({ data: resolvedData, error: resolvedError }).then(resolve);

  return builder;
}

export function createMockSupabase() {
  const mockFrom = vi.fn(() => createQueryBuilder());

  const supabase = {
    from: mockFrom,
    _setResponse(table, data, error = null) {
      mockFrom.mockImplementation((tableName) => {
        if (typeof table === 'function') {
          return table(tableName);
        }
        if (tableName === table) {
          return createQueryBuilder(data, error);
        }
        return createQueryBuilder([]);
      });
    },
    _setMultiResponse(responses) {
      let callCount = 0;
      mockFrom.mockImplementation((tableName) => {
        const key = `${tableName}:${callCount}`;
        callCount++;
        if (responses[tableName]) {
          const resp = Array.isArray(responses[tableName])
            ? responses[tableName]
            : [responses[tableName]];
          const idx = Math.min(callCount - 1, resp.length - 1);
          // Find matching response
          for (const r of resp) {
            if (r.table === tableName) {
              return createQueryBuilder(r.data || [], r.error || null);
            }
          }
          return createQueryBuilder(responses[tableName].data || responses[tableName], responses[tableName].error || null);
        }
        return createQueryBuilder([]);
      });
    },
  };

  return supabase;
}
