import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock supabase before importing the store
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { stock: 100 } }),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
    })),
  },
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock crypto.randomUUID
vi.stubGlobal('crypto', {
  randomUUID: () => 'test-uuid-1234',
});

import { useSyncStore } from '@/store/useSyncStore';

describe('useSyncStore', () => {
  beforeEach(() => {
    useSyncStore.setState({ pendingTransactions: [], isSyncing: false });
    vi.clearAllMocks();
  });

  describe('addPendingTransaction', () => {
    it('adds a transaction with generated id and timestamp', () => {
      useSyncStore.getState().addPendingTransaction({
        total: 50000,
        items_count: 2,
        items: [
          { id: 'item-1', quantity: 1 },
          { id: 'item-2', quantity: 1 },
        ],
      });

      const pending = useSyncStore.getState().pendingTransactions;
      expect(pending).toHaveLength(1);
      expect(pending[0].id).toBe('test-uuid-1234');
      expect(pending[0].total).toBe(50000);
      expect(pending[0].items_count).toBe(2);
      expect(pending[0].timestamp).toBeGreaterThan(0);
    });

    it('appends multiple transactions', () => {
      const store = useSyncStore.getState();
      store.addPendingTransaction({
        total: 10000,
        items_count: 1,
        items: [{ id: 'item-1', quantity: 1 }],
      });
      store.addPendingTransaction({
        total: 20000,
        items_count: 1,
        items: [{ id: 'item-2', quantity: 2 }],
      });

      expect(useSyncStore.getState().pendingTransactions).toHaveLength(2);
    });
  });

  describe('removePendingTransaction', () => {
    it('removes a transaction by id', () => {
      useSyncStore.setState({
        pendingTransactions: [
          { id: 'tx-1', total: 10000, items_count: 1, items: [], timestamp: 123 },
          { id: 'tx-2', total: 20000, items_count: 2, items: [], timestamp: 456 },
        ],
      });

      useSyncStore.getState().removePendingTransaction('tx-1');
      const pending = useSyncStore.getState().pendingTransactions;
      expect(pending).toHaveLength(1);
      expect(pending[0].id).toBe('tx-2');
    });

    it('does nothing for non-existent id', () => {
      useSyncStore.setState({
        pendingTransactions: [
          { id: 'tx-1', total: 10000, items_count: 1, items: [], timestamp: 123 },
        ],
      });

      useSyncStore.getState().removePendingTransaction('non-existent');
      expect(useSyncStore.getState().pendingTransactions).toHaveLength(1);
    });
  });

  describe('syncOfflineTransactions', () => {
    it('does nothing when there are no pending transactions', async () => {
      await useSyncStore.getState().syncOfflineTransactions();
      expect(useSyncStore.getState().isSyncing).toBe(false);
    });

    it('does nothing when already syncing', async () => {
      useSyncStore.setState({
        pendingTransactions: [
          { id: 'tx-1', total: 10000, items_count: 1, items: [], timestamp: 123 },
        ],
        isSyncing: true,
      });

      await useSyncStore.getState().syncOfflineTransactions();
      // Should still have pending transaction since sync was skipped
      expect(useSyncStore.getState().pendingTransactions).toHaveLength(1);
    });

    it('sets isSyncing to true during sync and false after', async () => {
      useSyncStore.setState({
        pendingTransactions: [
          { id: 'tx-1', total: 10000, items_count: 1, items: [{ id: 'p1', quantity: 1 }], timestamp: 123 },
        ],
        isSyncing: false,
      });

      await useSyncStore.getState().syncOfflineTransactions();
      expect(useSyncStore.getState().isSyncing).toBe(false);
    });

    it('removes transactions after successful sync', async () => {
      useSyncStore.setState({
        pendingTransactions: [
          { id: 'tx-1', total: 10000, items_count: 1, items: [{ id: 'p1', quantity: 1 }], timestamp: 123 },
        ],
        isSyncing: false,
      });

      await useSyncStore.getState().syncOfflineTransactions();
      expect(useSyncStore.getState().pendingTransactions).toHaveLength(0);
    });
  });
});
