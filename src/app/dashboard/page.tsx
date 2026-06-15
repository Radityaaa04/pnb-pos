"use client";

import { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import { Activity, CreditCard, DollarSign, Users, Loader2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { formatRupiah } from "@/lib/utils";

const chartConfig = {
  sales: {
    label: "Penjualan (Rp)",
    color: "oklch(0.205 0 0)",
  },
} satisfies ChartConfig;

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => { };
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}
function getSnapshot() {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}
function getServerSnapshot() {
  return true;
}

interface Transaction {
  id: string;
  created_at: string;
  total: number;
  items_count: number;
}

interface ChartData {
  day: string;
  sales: number;
}

export default function DashboardPage() {
  const isOnline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [loading, setLoading] = useState(true);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalTrx, setTotalTrx] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);

  const loadData = useCallback(async () => {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !data) {
      console.error(error);
      setLoading(false);
      return;
    }

    // Data Transaksi Terakhir (Ambil 5)
    setRecentTransactions(data.slice(0, 5));

    // Kalkulasi Hari Ini
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayData = data.filter((trx) => new Date(trx.created_at) >= todayStart);
    const income = todayData.reduce((acc, curr) => acc + curr.total, 0);
    setTotalIncome(income);
    setTotalTrx(todayData.length);

    // Data Grafik: 7 hari terakhir dari data real
    const DAY_LABELS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
    const now = new Date();
    const last7Days: ChartData[] = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() - (6 - i));
      d.setHours(0, 0, 0, 0);
      const nextDay = new Date(d);
      nextDay.setDate(d.getDate() + 1);

      const dayTotal = data
        .filter((trx) => {
          const trxDate = new Date(trx.created_at);
          return trxDate >= d && trxDate < nextDay;
        })
        .reduce((acc, trx) => acc + trx.total, 0);

      const label = i === 6 ? "Hari Ini" : DAY_LABELS[d.getDay()];
      return { day: label, sales: dayTotal };
    });
    setChartData(last7Days);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel("schema-db-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "transactions" },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  const avgIncome = totalTrx > 0 ? totalIncome / totalTrx : 0;

  return (
    <div className="p-8 h-full flex flex-col gap-6 overflow-y-auto">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Ringkasan performa bisnis Anda secara Real-Time.</p>
        </div>
        {loading && (
          <div className="flex items-center text-primary text-sm font-medium">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sinkronisasi Supabase...
          </div>
        )}
      </div>

      {/* STAT CARDS */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendapatan Live</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatRupiah(totalIncome)}</div>
            <p className="text-xs text-emerald-500 font-medium mt-1">Data aktual dari database</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transaksi</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTrx}</div>
            <p className="text-xs text-muted-foreground mt-1">Struk tercetak hari ini</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rata-rata Penjualan</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatRupiah(avgIncome)}</div>
            <p className="text-xs text-muted-foreground mt-1">Per transaksi hari ini</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status Server</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isOnline ? (
              <>
                <div className="text-2xl font-bold text-emerald-600">Terhubung</div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1 animate-pulse" />
                  Supabase Real-time Aktif
                </p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-destructive">Offline</div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center">
                  <span className="w-2 h-2 rounded-full bg-destructive mr-1" />
                  Tidak ada koneksi internet
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* CHARTS & RECENT TRANSACTIONS */}
      <div className="grid gap-6 md:grid-cols-7 lg:grid-cols-3">
        {/* CHART AREA */}
        <Card className="md:col-span-4 lg:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle>Tren Penjualan Live</CardTitle>
            <CardDescription>Grafik akan otomatis bertambah ketika ada transaksi kasir baru.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="min-h-[250px] w-full mt-4">
              <BarChart accessibilityLayer data={chartData}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.5} />
                <XAxis dataKey="day" tickLine={false} tickMargin={10} axisLine={false} />
                <YAxis
                  tickFormatter={(value) => `Rp${value / 1000000}M`}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  fontSize={12}
                  width={80}
                />
                <Tooltip content={<ChartTooltipContent />} cursor={{ fill: "var(--muted)", opacity: 0.2 }} />
                <Bar dataKey="sales" fill="var(--color-sales)" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* RECENT TRANSACTIONS */}
        <Card className="md:col-span-3 lg:col-span-1 shadow-sm flex flex-col">
          <CardHeader>
            <CardTitle>Transaksi Terakhir</CardTitle>
            <CardDescription>Otomatis muncul tanpa refresh layar.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            {recentTransactions.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm pb-10">
                Belum ada transaksi.
              </div>
            ) : (
              <div className="space-y-6 mt-2">
                {recentTransactions.map((trx) => {
                  const dateObj = new Date(trx.created_at);
                  const timeString = `${dateObj.getHours().toString().padStart(2, "0")}:${dateObj.getMinutes().toString().padStart(2, "0")}`;
                  return (
                    <div key={trx.id} className="flex items-center">
                      <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs mr-4">
                        TRX
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">Order Masuk</p>
                        <p className="text-xs text-muted-foreground">
                          Pukul {timeString} • {trx.items_count} Item
                        </p>
                      </div>
                      <div className="font-bold text-sm">+{formatRupiah(trx.total)}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
