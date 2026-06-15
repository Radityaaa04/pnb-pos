import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface PendingTransaction {
  id: string;
  total: number;
  items_count: number;
  items: { id: string; quantity: number }[];
  timestamp: number;
}

interface SyncStore {
  pendingTransactions: PendingTransaction[];
  addPendingTransaction: (tx: Omit<PendingTransaction, 'id' | 'timestamp'>) => void;
  removePendingTransaction: (id: string) => void;
  syncOfflineTransactions: () => Promise<void>;
  isSyncing: boolean;
}

export const useSyncStore = create<SyncStore>()(
  persist(
    (set, get) => ({
      pendingTransactions: [],
      isSyncing: false,
      addPendingTransaction: (tx) => {
        const newTx: PendingTransaction = {
          ...tx,
          id: crypto.randomUUID(),
          timestamp: Date.now(),
        };
        set((state) => ({
          pendingTransactions: [...state.pendingTransactions, newTx],
        }));
      },
      removePendingTransaction: (id) => {
        set((state) => ({
          pendingTransactions: state.pendingTransactions.filter((tx) => tx.id !== id),
        }));
      },
      syncOfflineTransactions: async () => {
        const { pendingTransactions, removePendingTransaction, isSyncing } = get();

        if (pendingTransactions.length === 0 || isSyncing) return;

        set({ isSyncing: true });
        let successCount = 0;

        for (const tx of pendingTransactions) {
          try {
            const { error } = await supabase.from('transactions').insert([
              { total: tx.total, items_count: tx.items_count }
            ]);

            if (!error) {
              // Update stok untuk setiap item dalam transaksi offline
              if (tx.items && tx.items.length > 0) {
                for (const item of tx.items) {
                  // Ambil stok terbaru dulu agar tidak tertimpa stok lama
                  const { data: productData } = await supabase
                    .from('products')
                    .select('stock')
                    .eq('id', item.id)
                    .single();

                  if (productData) {
                    const newStock = productData.stock - item.quantity;
                    if (newStock >= 0) {
                      await supabase
                        .from('products')
                        .update({ stock: newStock })
                        .eq('id', item.id);
                    }
                  }
                }
              }

              removePendingTransaction(tx.id);
              successCount++;
            }
          } catch (e) {
            console.error("Gagal sync transaksi:", tx.id, e);
          }
        }

        set({ isSyncing: false });
        if (successCount > 0) {
          toast.success(`${successCount} transaksi offline berhasil disinkronisasi!`);
        }
      },
    }),
    {
      name: 'pnb-pos-sync-storage',
    }
  )
);
