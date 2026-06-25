"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Product } from "@/store/useCartStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatRupiah } from "@/lib/utils";
import { formatDateCompact } from "@/lib/format";
import {
  Package,
  RefreshCw,
  Save,
  AlertTriangle,
  AlertCircle,
  History,
  TrendingUp,
  TrendingDown,
  SlidersHorizontal,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface StockLog {
  id: string;
  product_id: string;
  product_name: string;
  change_type: "sale" | "restock" | "adjustment";
  quantity: number;
  stock_before: number;
  stock_after: number;
  note: string | null;
  created_at: string;
}

type ActiveTab = "stock" | "logs";

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [stockUpdates, setStockUpdates] = useState<Record<string, number | "">>({});
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<ActiveTab>("stock");
  const [stockLogs, setStockLogs] = useState<StockLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Modal Master Produk State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({ name: "", category: "Makanan", price: 0, stock: 0 });
  const [isSaving, setIsSaving] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("products").select("*").order("name");
    if (error) {
      toast.error("Gagal memuat data produk");
    } else if (data) {
      setProducts(data);
    }
    setLoading(false);
  }, []);

  const fetchStockLogs = useCallback(async () => {
    setLogsLoading(true);
    const { data, error } = await supabase
      .from("stock_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      toast.error("Gagal memuat riwayat stok");
    } else if (data) {
      setStockLogs(data as StockLog[]);
    }
    setLogsLoading(false);
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    if (activeTab === "logs") {
      fetchStockLogs();
    }
  }, [activeTab, fetchStockLogs]);

  const handleStockChange = (id: string, value: string) => {
    if (value === "") {
      setStockUpdates((prev) => ({ ...prev, [id]: "" }));
      return;
    }
    const parsed = parseInt(value);
    if (!isNaN(parsed) && parsed >= 0) {
      setStockUpdates((prev) => ({ ...prev, [id]: parsed }));
    }
  };

  const handleSaveStock = async (id: string) => {
    const newStock = stockUpdates[id];
    if (newStock === undefined || newStock === "") return;

    const product = products.find((p) => p.id === id);
    if (!product) return;

    if (newStock === 0) {
      const confirmed = window.confirm(
        "Anda akan mengatur stok menjadi 0. Produk ini tidak akan bisa dijual. Lanjutkan?"
      );
      if (!confirmed) return;
    }

    const stockBefore = product.stock;
    const stockAfter = newStock as number;
    const diff = stockAfter - stockBefore;
    const changeType = diff > 0 ? "restock" : "adjustment";

    setSavingIds((prev) => new Set(prev).add(id));

    const { error } = await supabase
      .from("products")
      .update({ stock: newStock })
      .eq("id", id);

    if (error) {
      toast.error("Gagal memperbarui stok");
    } else {
      // Log the stock change
      const { error: logError } = await supabase.from("stock_logs").insert([
        {
          product_id: product.id,
          product_name: product.name,
          change_type: changeType,
          quantity: diff,
          stock_before: stockBefore,
          stock_after: stockAfter,
          note:
            changeType === "restock"
              ? `Penambahan stok manual (+${diff})`
              : `Penyesuaian stok manual (${diff})`,
        },
      ]);

      if (logError) {
        console.error("Gagal mencatat riwayat perubahan stok:", logError);
        toast.warning("Stok diperbarui, tetapi riwayat perubahan gagal dicatat.");
      } else {
        toast.success("Stok berhasil diperbarui");
      }
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, stock: stockAfter } : p))
      );
      setStockUpdates((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }

    setSavingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  // --- CRUD Master Produk ---
  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setFormData({ name: "", category: "Makanan", price: 0, stock: 0 });
    setIsDialogOpen(true);
  };

  const handleOpenEditProduct = (p: Product) => {
    setEditingProduct(p);
    setFormData({ name: p.name, category: p.category, price: p.price, stock: p.stock });
    setIsDialogOpen(true);
  };

  const handleSaveProduct = async () => {
    if (!formData.name || formData.price < 0 || formData.stock < 0) {
      toast.error("Mohon isi form dengan benar");
      return;
    }

    setIsSaving(true);
    try {
      if (editingProduct) {
        // Update
        const { error } = await supabase.from("products").update({
          name: formData.name,
          category: formData.category,
          price: formData.price,
          stock: formData.stock
        }).eq("id", editingProduct.id);

        if (error) throw error;
        toast.success("Produk berhasil diubah");
      } else {
        // Create
        const { error } = await supabase.from("products").insert([{
          name: formData.name,
          category: formData.category,
          price: formData.price,
          stock: formData.stock,
          color: "#e2e8f0" // Default fallback color
        }]);

        if (error) throw error;
        toast.success("Produk berhasil ditambahkan");
      }
      setIsDialogOpen(false);
      fetchProducts();
    } catch (error: any) {
      toast.error(error.message || "Terjadi kesalahan saat menyimpan produk");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!window.confirm(`Anda yakin ingin menghapus produk "${name}" secara permanen?`)) {
      return;
    }
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) {
      toast.error("Gagal menghapus produk");
    } else {
      toast.success("Produk berhasil dihapus");
      fetchProducts();
    }
  };


  const lowStockProducts = products.filter((p) => p.stock > 0 && p.stock <= 5);
  const outOfStockProducts = products.filter((p) => p.stock === 0);


  const changeTypeLabel: Record<StockLog["change_type"], string> = {
    sale: "Penjualan",
    restock: "Restok",
    adjustment: "Penyesuaian",
  };

  const changeTypeIcon = (type: StockLog["change_type"]) => {
    if (type === "sale") return <TrendingDown className="w-3.5 h-3.5 text-red-500" />;
    if (type === "restock") return <TrendingUp className="w-3.5 h-3.5 text-green-600" />;
    return <SlidersHorizontal className="w-3.5 h-3.5 text-blue-500" />;
  };

  const changeTypeBadge = (type: StockLog["change_type"]) => {
    if (type === "sale") return "bg-red-100 text-red-700";
    if (type === "restock") return "bg-green-100 text-green-700";
    return "bg-blue-100 text-blue-700";
  };

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manajemen Gudang</h1>
          <p className="text-muted-foreground mt-2">
            Kelola ketersediaan stok produk Anda di sini.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              fetchProducts();
              if (activeTab === "logs") fetchStockLogs();
            }}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={handleOpenAddProduct}>
            <Plus className="w-4 h-4 mr-2" />
            Tambah Produk
          </Button>
        </div>
      </div>

      {/* Low-stock / out-of-stock alerts */}
      {!loading && outOfStockProducts.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <div>
            <p className="font-semibold">Stok Habis!</p>
            <p className="mt-0.5">
              {outOfStockProducts.map((p) => p.name).join(", ")} — produk tidak dapat
              dijual sampai stok diisi kembali.
            </p>
          </div>
        </div>
      )}
      {!loading && lowStockProducts.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
          <div>
            <p className="font-semibold">Stok Menipis</p>
            <p className="mt-0.5">
              {lowStockProducts.map((p) => `${p.name} (${p.stock})`).join(", ")} — segera
              lakukan restok.
            </p>
          </div>
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex gap-1 border-b">
        <button
          onClick={() => setActiveTab("stock")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "stock"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
        >
          <Package className="w-4 h-4" />
          Daftar Stok
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "logs"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
        >
          <History className="w-4 h-4" />
          Riwayat Perubahan Stok
        </button>
      </div>

      {/* ===== TAB: Stock Table ===== */}
      {activeTab === "stock" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Daftar Stok Produk
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-40 flex items-center justify-center text-muted-foreground">
                Memuat data...
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Nama Produk</th>
                      <th className="px-4 py-3 font-medium">Kategori</th>
                      <th className="px-4 py-3 font-medium">Harga</th>
                      <th className="px-4 py-3 font-medium">Stok Aktual</th>
                      <th className="px-4 py-3 font-medium w-40">Update Stok</th>
                      <th className="px-4 py-3 font-medium w-24 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {products.map((product) => {
                      const isEdited =
                        stockUpdates[product.id] !== undefined &&
                        stockUpdates[product.id] !== product.stock;

                      return (
                        <tr
                          key={product.id}
                          className="hover:bg-muted/50 transition-colors"
                        >
                          <td className="px-4 py-4 font-medium">
                            <div className="flex items-center gap-2">
                              {product.name}
                              {product.stock === 0 && (
                                <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                              )}
                              {product.stock > 0 && product.stock <= 5 && (
                                <AlertTriangle className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-muted-foreground">
                            {product.category}
                          </td>
                          <td className="px-4 py-4">{formatRupiah(product.price)}</td>
                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium ${product.stock === 0
                                  ? "bg-red-100 text-red-800"
                                  : product.stock <= 5
                                    ? "bg-orange-100 text-orange-800"
                                    : product.stock <= 10
                                      ? "bg-yellow-100 text-yellow-800"
                                      : "bg-green-100 text-green-800"
                                }`}
                            >
                              {product.stock === 0 ? "Habis" : product.stock}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min="0"
                                className="w-20 h-9"
                                value={
                                  stockUpdates[product.id] !== undefined
                                    ? stockUpdates[product.id]
                                    : product.stock
                                }
                                onChange={(e) =>
                                  handleStockChange(product.id, e.target.value)
                                }
                              />
                              {isEdited && (
                                <Button
                                  size="icon"
                                  className="h-9 w-9 bg-primary/10 text-primary hover:bg-primary hover:text-white"
                                  onClick={() => handleSaveStock(product.id)}
                                  disabled={savingIds.has(product.id)}
                                >
                                  <Save className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                onClick={() => handleOpenEditProduct(product)}
                                title="Edit Produk"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDeleteProduct(product.id, product.name)}
                                title="Hapus Produk"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {products.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-8 text-center text-muted-foreground"
                        >
                          Belum ada produk.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ===== TAB: Stock Logs ===== */}
      {activeTab === "logs" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              Riwayat Perubahan Stok
            </CardTitle>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="h-40 flex items-center justify-center text-muted-foreground">
                Memuat riwayat...
              </div>
            ) : stockLogs.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-muted-foreground">
                Belum ada riwayat perubahan stok.
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Waktu</th>
                      <th className="px-4 py-3 font-medium">Produk</th>
                      <th className="px-4 py-3 font-medium">Jenis</th>
                      <th className="px-4 py-3 font-medium text-center">Perubahan</th>
                      <th className="px-4 py-3 font-medium text-center">Sebelum</th>
                      <th className="px-4 py-3 font-medium text-center">Sesudah</th>
                      <th className="px-4 py-3 font-medium">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {stockLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {formatDateCompact(log.created_at)}
                        </td>
                        <td className="px-4 py-3 font-medium">{log.product_name}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${changeTypeBadge(log.change_type)}`}
                          >
                            {changeTypeIcon(log.change_type)}
                            {changeTypeLabel[log.change_type]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-semibold">
                          <span
                            className={
                              log.quantity > 0 ? "text-green-600" : "text-red-600"
                            }
                          >
                            {log.quantity > 0 ? `+${log.quantity}` : log.quantity}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-muted-foreground">
                          {log.stock_before}
                        </td>
                        <td className="px-4 py-3 text-center font-medium">
                          {log.stock_after}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {log.note ?? "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modal / Dialog Form Produk */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Edit Produk" : "Tambah Produk Baru"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="name" className="text-right text-sm font-medium">
                Nama
              </label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="col-span-3"
                placeholder="cth. Es Kopi Susu"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="category" className="text-right text-sm font-medium">
                Kategori
              </label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="Minuman">Minuman</option>
                <option value="Makanan">Makanan</option>
                <option value="Snack">Snack</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="price" className="text-right text-sm font-medium">
                Harga
              </label>
              <Input
                id="price"
                type="number"
                min="0"
                value={formData.price || ""}
                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="stock" className="text-right text-sm font-medium">
                Stok Awal
              </label>
              <Input
                id="stock"
                type="number"
                min="0"
                value={formData.stock === 0 && !editingProduct ? "" : formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                className="col-span-3"
                disabled={!!editingProduct} // Stok tidak diedit dari sini jika sedang mode edit
              />
            </div>
            {editingProduct && (
              <p className="text-xs text-muted-foreground ml-[25%]">
                * Update stok dilakukan melalui kolom <b>Update Stok</b> di tabel.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>
              Batal
            </Button>
            <Button onClick={handleSaveProduct} disabled={isSaving}>
              {isSaving ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
