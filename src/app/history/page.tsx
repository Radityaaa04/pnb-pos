"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatRupiah } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Receipt,
    Search,
    RefreshCw,
    ChevronDown,
    ChevronUp,
    Calendar,
    ShoppingBag,
    Banknote,
    ArrowLeftRight,
    Download
} from "lucide-react";
import { toast } from "sonner";

interface TransactionItem {
    id: string;
    product_name: string;
    product_price: number;
    quantity: number;
    subtotal: number;
}

interface Transaction {
    id: string;
    total: number;
    items_count: number;
    cash_received: number;
    payment_method: "cash" | "qris" | "transfer";
    voucher_code?: string | null;
    discount_amount?: number;
    created_at: string;
    transaction_items: TransactionItem[];
}

type DateFilter = "today" | "week" | "month" | "all";

const DATE_FILTER_OPTIONS: { label: string; value: DateFilter }[] = [
    { label: "Hari Ini", value: "today" },
    { label: "7 Hari", value: "week" },
    { label: "30 Hari", value: "month" },
    { label: "Semua", value: "all" },
];

function getDateRange(filter: DateFilter): Date | null {
    const now = new Date();
    if (filter === "today") {
        const d = new Date(now);
        d.setHours(0, 0, 0, 0);
        return d;
    }
    if (filter === "week") {
        const d = new Date(now);
        d.setDate(d.getDate() - 6);
        d.setHours(0, 0, 0, 0);
        return d;
    }
    if (filter === "month") {
        const d = new Date(now);
        d.setDate(d.getDate() - 29);
        d.setHours(0, 0, 0, 0);
        return d;
    }
    return null;
}

export default function HistoryPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [dateFilter, setDateFilter] = useState<DateFilter>("today");
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const fetchTransactions = useCallback(async () => {
        setLoading(true);
        try {
            let query = supabase
                .from("transactions")
                .select(`
          id,
          total,
          items_count,
          cash_received,
          payment_method,
          voucher_code,
          discount_amount,
          created_at,
          transaction_items (
            id,
            product_name,
            product_price,
            quantity,
            subtotal
          )
        `)
                .order("created_at", { ascending: false });

            const since = getDateRange(dateFilter);
            if (since) {
                query = query.gte("created_at", since.toISOString());
            }

            const { data, error } = await query;

            if (error) {
                // Fallback: try without nested items (migration may not be applied yet)
                let fallbackQuery = supabase
                    .from("transactions")
                    .select("id, total, items_count, cash_received, payment_method, voucher_code, discount_amount, created_at")
                    .order("created_at", { ascending: false });

                const since2 = getDateRange(dateFilter);
                if (since2) {
                    fallbackQuery = fallbackQuery.gte("created_at", since2.toISOString());
                }

                const { data: fallbackData, error: fallbackError } = await fallbackQuery;

                if (fallbackError) {
                    toast.error(`Gagal memuat riwayat transaksi: ${fallbackError.message}`);
                } else {
                    // Map to Transaction shape with empty items array
                    const mapped = (fallbackData ?? []).map((t) => ({
                        ...t,
                        cash_received: t.cash_received ?? 0,
                        payment_method: (t.payment_method ?? "cash") as "cash" | "qris" | "transfer",
                        transaction_items: [] as TransactionItem[],
                    }));
                    setTransactions(mapped as Transaction[]);
                    if (fallbackData && fallbackData.length > 0) {
                        toast.info("Detail item tidak tersedia — jalankan migrasi database untuk melihat rincian.");
                    }
                }
            } else {
                // Normalize: ensure transaction_items is always an array
                const normalized = (data ?? []).map((t) => ({
                    ...t,
                    cash_received: t.cash_received ?? 0,
                    payment_method: (t.payment_method ?? "cash") as "cash" | "qris" | "transfer",
                    transaction_items: Array.isArray(t.transaction_items) ? t.transaction_items : [],
                }));
                setTransactions(normalized as Transaction[]);
            }
        } finally {
            setLoading(false);
        }
    }, [dateFilter]);

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

    // Filter by search query (by transaction ID or product name in items)
    const filteredTransactions = transactions.filter((trx) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            trx.id.toLowerCase().includes(q) ||
            trx.transaction_items.some((item) => item.product_name.toLowerCase().includes(q))
        );
    });

    // Summary stats
    const totalRevenue = filteredTransactions.reduce((sum, t) => sum + t.total, 0);
    const totalItems = filteredTransactions.reduce((sum, t) => sum + t.items_count, 0);
    const avgTransaction = filteredTransactions.length > 0 ? totalRevenue / filteredTransactions.length : 0;

    const toggleExpand = (id: string) => {
        setExpandedId((prev) => (prev === id ? null : id));
    };

    const formatDate = (iso: string) => {
        return new Date(iso).toLocaleString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const handleExportCSV = () => {
        if (filteredTransactions.length === 0) {
            toast.error("Tidak ada data untuk diekspor");
            return;
        }

        const headers = ["ID Transaksi", "Tanggal", "Metode Pembayaran", "Jumlah Item", "Subtotal", "Diskon", "Total"];
        const rows = filteredTransactions.map(t => {
            const subtotal = t.total + (t.discount_amount || 0);
            return [
                t.id,
                formatDate(t.created_at).replace(/,/g, ""),
                t.payment_method.toUpperCase(),
                t.items_count.toString(),
                subtotal.toString(),
                (t.discount_amount || 0).toString(),
                t.total.toString()
            ];
        });

        const escapeCsvField = (field: string) => {
            if (field.includes(",") || field.includes('"') || field.includes("\n")) {
                return `"${field.replace(/"/g, '""')}"`;
            }
            return field;
        };

        const csvContent = [
            headers.map(escapeCsvField).join(","),
            ...rows.map(row => row.map(escapeCsvField).join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `laporan-pos-pnb-${dateFilter}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Laporan berhasil diunduh");
    };

    return (
        <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Receipt className="w-8 h-8 text-primary" />
                        Riwayat Transaksi
                    </h1>
                    <p className="text-muted-foreground mt-1">Lihat semua transaksi penjualan secara detail.</p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchTransactions}
                    disabled={loading}
                    className="self-start sm:self-auto"
                >
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Pendapatan</CardTitle>
                        <Banknote className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold text-primary">{formatRupiah(totalRevenue)}</p>
                        <p className="text-xs text-muted-foreground mt-1">{filteredTransactions.length} transaksi</p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Rata-rata Transaksi</CardTitle>
                        <ArrowLeftRight className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{formatRupiah(avgTransaction)}</p>
                        <p className="text-xs text-muted-foreground mt-1">Per transaksi</p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Item Terjual</CardTitle>
                        <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{totalItems}</p>
                        <p className="text-xs text-muted-foreground mt-1">Unit produk</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                {/* Date Filter Tabs */}
                <div className="flex gap-1 bg-muted rounded-lg p-1">
                    {DATE_FILTER_OPTIONS.map((opt) => (
                        <button
                            key={opt.value}
                            onClick={() => setDateFilter(opt.value)}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${dateFilter === opt.value
                                ? "bg-background shadow text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Cari ID transaksi atau nama produk..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                
                {/* Export Button */}
                <Button 
                    variant="secondary" 
                    className="bg-green-500/10 text-green-700 hover:bg-green-500/20 border-green-500/20"
                    onClick={handleExportCSV}
                >
                    <Download className="w-4 h-4 mr-2" />
                    Download CSV
                </Button>
            </div>

            {/* Transaction List */}
            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base">
                        Daftar Transaksi
                    </CardTitle>
                    <CardDescription>
                        {loading ? "Memuat data..." : `Menampilkan ${filteredTransactions.length} transaksi`}
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex items-center justify-center h-48 text-muted-foreground">
                            <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                            Memuat riwayat...
                        </div>
                    ) : filteredTransactions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
                            <Receipt className="w-10 h-10 opacity-20" />
                            <p>Belum ada transaksi</p>
                        </div>
                    ) : (
                        <ScrollArea className="max-h-[600px]">
                            <div className="divide-y">
                                {filteredTransactions.map((trx) => {
                                    const isExpanded = expandedId === trx.id;
                                    const change = trx.cash_received > 0 ? trx.cash_received - trx.total : null;

                                    return (
                                        <div key={trx.id} className="transition-colors hover:bg-muted/30">
                                            {/* Row Utama */}
                                            <button
                                                className="w-full text-left px-6 py-4 flex items-center gap-4"
                                                onClick={() => toggleExpand(trx.id)}
                                            >
                                                {/* Icon */}
                                                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 font-bold text-xs">
                                                    TRX
                                                </div>

                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-semibold text-sm">
                                                            #{trx.id.slice(0, 8).toUpperCase()}
                                                        </span>
                                                        <Badge variant="secondary" className="text-xs">
                                                            {trx.items_count} item
                                                        </Badge>
                                                        {/* Badge Metode Pembayaran */}
                                                        <Badge
                                                            variant="outline"
                                                            className={`text-xs ${
                                                                trx.payment_method === "cash"
                                                                    ? "border-emerald-500 text-emerald-600"
                                                                    : trx.payment_method === "qris"
                                                                    ? "border-blue-500 text-blue-600"
                                                                    : "border-purple-500 text-purple-600"
                                                            }`}
                                                        >
                                                            {trx.payment_method === "cash"
                                                                ? "Tunai"
                                                                : trx.payment_method === "qris"
                                                                ? "QRIS"
                                                                : "Transfer"}
                                                        </Badge>
                                                        {trx.voucher_code && (
                                                            <Badge variant="outline" className="text-xs border-green-500 text-green-600">
                                                                {trx.voucher_code}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                                        <Calendar className="w-3 h-3" />
                                                        {formatDate(trx.created_at)}
                                                    </div>
                                                </div>

                                                {/* Total */}
                                                <div className="text-right flex-shrink-0">
                                                    <p className="font-bold text-base text-primary">
                                                        +{formatRupiah(trx.total)}
                                                    </p>
                                                    {trx.cash_received > 0 && (
                                                        <p className="text-xs text-muted-foreground">
                                                            Tunai {formatRupiah(trx.cash_received)}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Expand Icon */}
                                                <div className="flex-shrink-0 ml-2 text-muted-foreground">
                                                    {isExpanded ? (
                                                        <ChevronUp className="w-4 h-4" />
                                                    ) : (
                                                        <ChevronDown className="w-4 h-4" />
                                                    )}
                                                </div>
                                            </button>

                                            {/* Detail Items (Expanded) */}
                                            {isExpanded && (
                                                <div className="px-6 pb-4 bg-muted/20 border-t">
                                                    <div className="pt-3 space-y-2">
                                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                                                            Detail Item
                                                        </p>
                                                        {trx.transaction_items.length === 0 ? (
                                                            <p className="text-sm text-muted-foreground italic">
                                                                Data item tidak tersedia (transaksi lama)
                                                            </p>
                                                        ) : (
                                                            <table className="w-full text-sm">
                                                                <thead>
                                                                    <tr className="text-xs text-muted-foreground border-b">
                                                                        <th className="text-left pb-2 font-medium">Produk</th>
                                                                        <th className="text-center pb-2 font-medium">Qty</th>
                                                                        <th className="text-right pb-2 font-medium">Harga</th>
                                                                        <th className="text-right pb-2 font-medium">Subtotal</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-border/50">
                                                                    {trx.transaction_items.map((item) => (
                                                                        <tr key={item.id}>
                                                                            <td className="py-2 font-medium">{item.product_name}</td>
                                                                            <td className="py-2 text-center text-muted-foreground">{item.quantity}×</td>
                                                                            <td className="py-2 text-right text-muted-foreground">
                                                                                {formatRupiah(item.product_price)}
                                                                            </td>
                                                                            <td className="py-2 text-right font-semibold">
                                                                                {formatRupiah(item.subtotal)}
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        )}

                                                        {/* Ringkasan Pembayaran */}
                                                        <div className="border-t pt-3 space-y-1 mt-2">
                                                            {trx.voucher_code && trx.discount_amount && (
                                                                <>
                                                                    <div className="flex justify-between text-sm text-muted-foreground">
                                                                        <span>Subtotal</span>
                                                                        <span>{formatRupiah(trx.total + trx.discount_amount)}</span>
                                                                    </div>
                                                                    <div className="flex justify-between text-sm text-green-600">
                                                                        <span>Diskon ({trx.voucher_code})</span>
                                                                        <span>-{formatRupiah(trx.discount_amount)}</span>
                                                                    </div>
                                                                </>
                                                            )}
                                                            <div className="flex justify-between text-sm font-bold">
                                                                <span>Total</span>
                                                                <span className="text-primary">{formatRupiah(trx.total)}</span>
                                                            </div>
                                                            {trx.cash_received > 0 && (
                                                                <>
                                                                    <div className="flex justify-between text-sm text-muted-foreground">
                                                                        <span>Tunai Diterima</span>
                                                                        <span>{formatRupiah(trx.cash_received)}</span>
                                                                    </div>
                                                                    <div className="flex justify-between text-sm font-semibold text-emerald-600">
                                                                        <span>Kembalian</span>
                                                                        <span>{formatRupiah(change ?? 0)}</span>
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </ScrollArea>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
