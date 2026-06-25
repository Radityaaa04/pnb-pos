"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Package, AlertTriangle } from "lucide-react";

const LOW_STOCK_THRESHOLD = 5;

export function LowStockNotifier() {
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    // Check for already-low stock items on mount
    const checkInitialLowStock = async () => {
      const { data, error } = await supabase
        .from("products")
        .select("name, stock")
        .lte("stock", LOW_STOCK_THRESHOLD)
        .gt("stock", 0);

      if (error) {
        console.error("Gagal memeriksa stok rendah:", error);
        return;
      }

      if (data && data.length > 0) {
        setTimeout(() => {
          toast.warning(`${data.length} produk stok menipis!`, {
            description: data.map((p) => `${p.name} (sisa ${p.stock})`).join(", "),
            icon: <Package className="w-4 h-4 text-amber-500" />,
            duration: 8000,
          });
        }, 1500);
      }
    };

    checkInitialLowStock();

    // Subscribe to real-time product stock changes
    const channel = supabase
      .channel("low-stock-monitor")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "products",
        },
        (payload) => {
          const newData = payload.new as { name: string; stock: number };

          if (newData.stock === 0) {
            toast.error(`Stok habis: ${newData.name}`, {
              description: "Segera lakukan pengisian stok.",
              icon: <AlertTriangle className="w-4 h-4 text-red-500" />,
              duration: 10000,
            });
          } else if (newData.stock <= LOW_STOCK_THRESHOLD) {
            toast.warning(`Stok menipis: ${newData.name}`, {
              description: `Sisa stok: ${newData.stock} unit`,
              icon: <Package className="w-4 h-4 text-amber-500" />,
              duration: 8000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return null;
}
