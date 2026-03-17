import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useStoreLimit } from '../useStoreLimit';

// Mock callEdgeFunction
const mockCallEdgeFunction = vi.fn(() => Promise.resolve({ newMaxStores: 3 }));
vi.mock('../../utils/callEdgeFunction', () => ({
  callEdgeFunction: (...args) => mockCallEdgeFunction(...args),
}));

// ─── Mock Supabase ───────────────────────────────────────────────────
const mockChain = () => {
  const chain = {
    select: vi.fn(() => chain),
    update: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    single: vi.fn(() => chain),
    then(resolve) {
      return Promise.resolve({ data: null, error: null, count: 0 }).then(resolve);
    },
  };
  return chain;
};

let fromResponses = {};
let rpcResponses = {};
const mockFrom = vi.fn((table) => {
  if (fromResponses[table]) {
    const response = fromResponses[table].shift() || { data: null, error: null, count: 0 };
    const chain = mockChain();
    chain.then = (resolve) => Promise.resolve(response).then(resolve);
    return chain;
  }
  return mockChain();
});
const mockRpc = vi.fn((fn) => {
  if (rpcResponses[fn]) {
    const response = rpcResponses[fn].shift() || { data: null, error: null };
    return Promise.resolve(response);
  }
  return Promise.resolve({ data: null, error: null });
});

vi.mock('../../supabaseClient', () => ({
  supabase: {
    from: (...args) => mockFrom(...args),
    rpc: (...args) => mockRpc(...args),
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
    },
  },
}));

const ORG_ID = 'org-1';

describe('useStoreLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fromResponses = {};
    rpcResponses = {};
  });

  function setup(maxStores, activeCount, pricePerStore = 97) {
    fromResponses = {
      subscriptions: [{
        data: { id: 'sub-1', max_stores: maxStores, price_per_store: pricePerStore, current_period_end: '2026-04-15' },
        error: null,
      }],
    };
    fromResponses.stores = [{ data: null, error: null, count: activeCount }];
    rpcResponses = {
      get_current_pricing: [{ data: [{ price_per_store: pricePerStore }], error: null }],
    };
  }

  it('checkBeforeCreate retorna true quando dentro do limite', async () => {
    setup(5, 2);
    const { result } = renderHook(() => useStoreLimit(ORG_ID));

    let allowed;
    await act(async () => {
      allowed = await result.current.checkBeforeCreate();
    });

    expect(allowed).toBe(true);
    expect(result.current.upgradeInfo).toBeNull();
  });

  it('checkBeforeCreate retorna false e seta upgradeInfo quando no limite', async () => {
    setup(3, 3);
    const { result } = renderHook(() => useStoreLimit(ORG_ID));

    let allowed;
    await act(async () => {
      allowed = await result.current.checkBeforeCreate();
    });

    expect(allowed).toBe(false);
    expect(result.current.upgradeInfo).toMatchObject({
      maxStores: 3,
      storeCount: 3,
      subscriptionId: 'sub-1',
      pricePerStore: 97,
    });
  });

  it('checkBeforeCreate retorna false quando acima do limite', async () => {
    setup(1, 2);
    const { result } = renderHook(() => useStoreLimit(ORG_ID));

    let allowed;
    await act(async () => {
      allowed = await result.current.checkBeforeCreate();
    });

    expect(allowed).toBe(false);
    expect(result.current.upgradeInfo.maxStores).toBe(1);
    expect(result.current.upgradeInfo.storeCount).toBe(2);
  });

  it('permite criar quando sem assinatura (maxStores null)', async () => {
    fromResponses = {
      subscriptions: [{ data: null, error: { code: 'PGRST116' } }],
      stores: [{ data: null, error: null, count: 5 }],
    };
    rpcResponses = { get_current_pricing: [{ data: null, error: null }] };
    const { result } = renderHook(() => useStoreLimit(ORG_ID));

    let allowed;
    await act(async () => {
      allowed = await result.current.checkBeforeCreate();
    });

    expect(allowed).toBe(true);
    expect(result.current.upgradeInfo).toBeNull();
  });

  it('setUpgradeInfo permite fechar o modal', async () => {
    setup(1, 1);
    const { result } = renderHook(() => useStoreLimit(ORG_ID));

    await act(async () => {
      await result.current.checkBeforeCreate();
    });
    expect(result.current.upgradeInfo).not.toBeNull();

    act(() => { result.current.setUpgradeInfo(null); });
    expect(result.current.upgradeInfo).toBeNull();
  });

  it('addSlots atualiza max_stores via edge function', async () => {
    setup(1, 1);
    mockCallEdgeFunction.mockResolvedValueOnce({ newMaxStores: 3 });

    const { result } = renderHook(() => useStoreLimit(ORG_ID));

    await act(async () => {
      await result.current.checkBeforeCreate();
    });
    expect(result.current.upgradeInfo).not.toBeNull();

    let success;
    await act(async () => {
      success = await result.current.addSlots(2);
    });

    expect(success).toBe(true);
    expect(result.current.upgradeInfo).toBeNull();
    expect(mockCallEdgeFunction).toHaveBeenCalledWith('asaas-update-subscription', {
      subscriptionId: 'sub-1',
      addStores: 2,
    });
  });
});
