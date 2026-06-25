"use client";

import { useEffect, useState } from "react";
import { useSyncStore } from "@/store/useSyncStore";
import { WifiOff, Wifi, RefreshCw } from "lucide-react";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";

export function NetworkStatus() {
  const isOnline = useOnlineStatus();
  const { pendingTransactions, syncOfflineTransactions, isSyncing } = useSyncStore();

  // Fix #32: Tunda hiding agar ada animasi fade-out setelah sinkronisasi selesai
  const shouldHide = isOnline && pendingTransactions.length === 0;
  const [visible, setVisible] = useState(!shouldHide);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    if (shouldHide) {
      // Mulai fade-out, lalu sembunyikan setelah animasi selesai
      setFadingOut(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setFadingOut(false);
      }, 800);
      return () => clearTimeout(timer);
    } else {
      // Muncul kembali segera
      setVisible(true);
      setFadingOut(false);
    }
  }, [shouldHide]);

  useEffect(() => {
    // Attempt to sync when online and there are pending transactions
    if (isOnline && pendingTransactions.length > 0 && !isSyncing) {
      syncOfflineTransactions();
    }
  }, [isOnline, pendingTransactions.length, syncOfflineTransactions, isSyncing]);

  if (!visible) return null;

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-full shadow-lg border text-sm font-medium transition-all duration-700 ${fadingOut ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
        } ${isOnline
          ? "bg-background border-primary text-primary"
          : "bg-destructive text-destructive-foreground border-destructive"
        }`}
    >
      {!isOnline ? (
        <>
          <WifiOff className="w-4 h-4" />
          <span>Mode Offline</span>
          {pendingTransactions.length > 0 && (
            <span className="bg-background/20 px-2 py-0.5 rounded-full text-xs">
              {pendingTransactions.length} pending
            </span>
          )}
        </>
      ) : (
        <>
          {isSyncing ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Wifi className="w-4 h-4" />
          )}
          <span>Menyinkronkan {pendingTransactions.length} transaksi...</span>
        </>
      )}
    </div>
  );
}
