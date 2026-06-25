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

        let failCount = 0;

        for (const tx of pendingTransactions) {
          try {
            const { error } = await supabase.from('transactions').insert([
              { total: tx.total, items_count: tx.items_count }
            ]);

            if (error) {
              console.error("Gagal sync transaksi:", tx.id, error);
              failCount++;
              continue;
            }

            // Update stok untuk setiap item dalam transaksi offline
            if (tx.items && tx.items.length > 0) {
              for (const item of tx.items) {
                const { data: productData, error: fetchError } = await supabase
                  .from('products')
                  .select('stock')
                  .eq('id', item.id)
                  .single();

                if (fetchError) {
                  console.error("Gagal mengambil stok produk saat sync:", item.id, fetchError);
                  continue;
                }

                if (productData) {
                  const newStock = productData.stock - item.quantity;
                  if (newStock >= 0) {
                    const { error: updateError } = await supabase
                      .from('products')
                      .update({ stock: newStock })
                      .eq('id', item.id);
                    if (updateError) {
                      console.error("Gagal update stok saat sync:", item.id, updateError);
                    }
                  }
                }
              }
            }

            removePendingTransaction(tx.id);
            successCount++;
          } catch (e) {
            console.error("Gagal sync transaksi:", tx.id, e);
            failCount++;
          }
        }

        set({ isSyncing: false });
        if (successCount > 0) {
          toast.success(`${successCount} transaksi offline berhasil disinkronisasi!`);
        }
        if (failCount > 0) {
          toast.error(`${failCount} transaksi gagal disinkronisasi. Akan dicoba lagi saat koneksi stabil.`);
        }
      },
    }),
    {
      name: 'pnb-pos-sync-storage',
    }
  )
);
