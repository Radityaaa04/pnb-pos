"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useCartStore, Product } from "@/store/useCartStore";
import { Plus, Minus, Trash2, ShoppingCart, Search, Loader2, X, Banknote, QrCode, Building2, Tag, Bluetooth } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatRupiah } from "@/lib/utils";
import { PRODUCT_IMAGE_MAP } from "@/lib/productImageMap";
import { useSyncStore } from "@/store/useSyncStore";
import { printReceiptBluetooth } from "@/lib/bluetoothPrinter";
import { useReactToPrint } from "react-to-print";
import Receipt, { PaymentMethod } from "@/components/Receipt";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";

const CATEGORIES = ["Semua", "Minuman", "Makanan", "Snack"];

// Cache expiry: 5 menit (300_000 ms)
const CACHE_TTL = 300_000;

export default function POSPage() {
  const { items, addItem, removeItem, updateQuantity, getTotal, clearCart } = useCartStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Semua");

  // State data Supabase
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const { addPendingTransaction } = useSyncStore();

  // State cetak struk
  const receiptRef = useRef<HTMLDivElement>(null);
  const [paidTransaction, setPaidTransaction] = useState<{
    items: (Product & { quantity: number })[];
    total: number;
    cashReceived: number;
    paymentMethod: PaymentMethod;
    voucherCode?: string | null;
    discountAmount?: number;
  } | null>(null);

  // State Voucher
  const [voucherCodeInput, setVoucherCodeInput] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState<{
    id: string;
    code: string;
    discount_type: "percent" | "fixed";
    discount_value: number;
    min_purchase: number;
    used_count: number;
  } | null>(null);
  const [applyingVoucher, setApplyingVoucher] = useState(false);

  // State metode pembayaran & nominal tunai
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [cashInput, setCashInput] = useState("");

  const [cashierName, setCashierName] = useState<string>("");

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error("Gagal mengambil user:", userError);
        return;
      }
      if (user) {
        const { data, error: profileError } = await supabase.from("profiles").select("name").eq("id", user.id).single();
        if (profileError) {
          console.error("Gagal mengambil profil kasir:", profileError);
          return;
        }
        if (data) {
          setCashierName(data.name);
        }
      }
    };
    fetchUser();
  }, []);

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: `Struk_POS`,
  });

  const handlePrintBluetooth = async () => {
    if (!paidTransaction) return;
    try {
      const storeName = typeof window !== "undefined" ? (localStorage.getItem("settings_storeName") ?? "PNB POS") : "PNB POS";
      const footerMessage = typeof window !== "undefined" ? (localStorage.getItem("settings_receiptFooter") ?? "Terima kasih telah berbelanja!") : "Terima kasih!";
      
      const receiptData = {
        storeName,
        cashierName: cashierName || undefined,
        date: new Date().toLocaleString("id-ID"),
        items: paidTransaction.items,
        subtotal: paidTransaction.total + (paidTransaction.discountAmount || 0),
        discount: paidTransaction.discountAmount || 0,
        voucherCode: paidTransaction.voucherCode || undefined,
        total: paidTransaction.total,
        paymentMethod: paidTransaction.paymentMethod === "cash" ? "Tunai" : paidTransaction.paymentMethod === "qris" ? "QRIS" : "Transfer Bank",
        cashReceived: paidTransaction.cashReceived,
        footerMessage
      };

      await printReceiptBluetooth(receiptData);
      toast.success("Mencetak via Bluetooth berhasil");
    } catch (error: any) {
      toast.error(error.message || "Gagal mencetak Bluetooth");
    }
  };

  const loadProducts = useCallback(async () => {
    // Fix #29: Cek cache dengan expiry TTL 5 menit
    try {
      const cachedRaw = localStorage.getItem("pnb_cached_products");
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw) as { data: Product[]; ts: number };
        if (Date.now() - cached.ts < CACHE_TTL) {
          setProducts(cached.data);
          setLoading(false);
          // Tetap fetch di background untuk update data terbaru
          supabase.from("products").select("*").then(({ data, error: bgError }) => {
            if (bgError) {
              console.error("Gagal memperbarui produk di background:", bgError);
              return;
            }
            if (data) {
              setProducts(data);
              localStorage.setItem("pnb_cached_products", JSON.stringify({ data, ts: Date.now() }));
            }
          });
          return;
        }
      }
    } catch {
      // Abaikan error parse JSON cache
    }

    const { data, error } = await supabase.from("products").select("*");
    if (error) {
      console.error("Error fetching products:", error);
      toast.error("Gagal memuat produk dan Anda sedang offline.");
    } else {
      setProducts(data || []);
      localStorage.setItem("pnb_cached_products", JSON.stringify({ data: data || [], ts: Date.now() }));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const filteredProducts = products.filter((product) => {
    const matchCategory = activeCategory === "Semua" || product.category === activeCategory;
    const matchSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  const handlePayment = async () => {
    if (items.length === 0) return;

    // Fix #33: Validasi nominal tunai hanya jika metode = cash
    const cashAmount = parseInt(cashInput.replace(/\D/g, ""), 10);
    const total = getTotal();
    if (paymentMethod === "cash" && (isNaN(cashAmount) || cashAmount < total)) {
      toast.error("Nominal tunai kurang dari total belanja!");
      return;
    }

    setPaying(true);

    try {
      const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);

      // Data transaksi pending
      const offlineTxData = {
        total,
        items_count: totalItems,
        items: items.map((i) => ({ id: i.id, quantity: i.quantity })),
        voucher_code: appliedVoucher ? appliedVoucher.code : null,
        discount_amount: discountAmount,
      };

      // Cek Offline Mode
      if (!navigator.onLine) {
        addPendingTransaction(offlineTxData);
        toast.success(`(Mode Offline) Pembayaran ${formatRupiah(total)} disimpan ke antrean!`);
        setPaidTransaction({
          items: [...items],
          total,
          cashReceived: paymentMethod === "cash" ? cashAmount : 0,
          paymentMethod,
          voucherCode: appliedVoucher ? appliedVoucher.code : null,
          discountAmount,
        });
        clearCart();
        setAppliedVoucher(null);
        setCashInput("");
        return;
      }

      // Simpan ke Supabase jika Online
      const { data: insertedTrx, error } = await supabase
        .from("transactions")
        .insert([{
          total,
          items_count: totalItems,
          cash_received: paymentMethod === "cash" ? cashAmount : 0,
          payment_method: paymentMethod,
          voucher_code: appliedVoucher ? appliedVoucher.code : null,
          discount_amount: discountAmount,
        }])
        .select("id")
        .single();

      const transactionDetails = {
        items: [...items],
        total,
        cashReceived: paymentMethod === "cash" ? cashAmount : 0,
        paymentMethod,
        voucherCode: appliedVoucher ? appliedVoucher.code : null,
        discountAmount,
      };

      if (error || !insertedTrx) {
        // Fallback masuk antrean jika insert gagal padahal online (mungkin gangguan server)
        addPendingTransaction(offlineTxData);
        toast.error(`Koneksi server terganggu. Pembayaran ${formatRupiah(total)} disimpan ke antrean lokal.`);
        setPaidTransaction(transactionDetails);
        clearCart();
        setAppliedVoucher(null);
        setCashInput("");
      } else {
        const transactionId = insertedTrx.id;

        // Simpan detail item ke transaction_items
        const transactionItemsPayload = items.map((item) => ({
          transaction_id: transactionId,
          product_id: item.id,
          product_name: item.name,
          product_price: item.price,
          quantity: item.quantity,
          subtotal: item.price * item.quantity,
        }));
        const { error: itemsError } = await supabase.from("transaction_items").insert(transactionItemsPayload);
        if (itemsError) {
          console.error("Gagal menyimpan detail item transaksi:", itemsError);
          toast.error("Detail item transaksi gagal disimpan: " + itemsError.message);
        }

        // Update voucher used_count
        if (appliedVoucher) {
          const { error: voucherUpdateError } = await supabase
            .from("vouchers")
            .update({ used_count: appliedVoucher.used_count + 1 })
            .eq("id", appliedVoucher.id);
          if (voucherUpdateError) {
            console.error("Gagal update pemakaian voucher:", voucherUpdateError);
            toast.error("Pemakaian voucher gagal diperbarui: " + voucherUpdateError.message);
          }
        }

        // Update stock di database + catat stock_logs
        for (const item of items) {
          const { data: productData, error: fetchStockError } = await supabase
            .from("products")
            .select("stock, name")
            .eq("id", item.id)
            .single();
          if (fetchStockError) {
            console.error("Gagal mengambil stok produk:", fetchStockError);
            toast.error(`Gagal mengambil stok ${item.name}: ${fetchStockError.message}`);
            continue;
          }
          if (productData) {
            const newStock = productData.stock - item.quantity;
            if (newStock < 0) {
              toast.warning(`Stok ${item.name} tidak mencukupi, stok tidak diperbarui.`);
            } else {
              const { error: stockUpdateError } = await supabase
                .from("products")
                .update({ stock: newStock })
                .eq("id", item.id);
              if (stockUpdateError) {
                console.error("Gagal update stok:", stockUpdateError);
                toast.error(`Gagal memperbarui stok ${item.name}: ${stockUpdateError.message}`);
                continue;
              }
              const { error: logError } = await supabase.from("stock_logs").insert([{
                product_id: item.id,
                product_name: productData.name,
                change_type: "sale",
                quantity: -item.quantity,
                stock_before: productData.stock,
                stock_after: newStock,
                note: `Terjual via POS (Transaksi #${transactionId.slice(0, 8)})`,
              }]);
              if (logError) {
                console.error("Gagal mencatat log stok:", logError);
              }
            }
          }
        }

        toast.success(`Pembayaran sebesar ${formatRupiah(total)} berhasil!`);
        setPaidTransaction(transactionDetails);
        clearCart();
        setAppliedVoucher(null);
        setCashInput("");
        setPaymentMethod("cash"); // Reset ke tunai setelah transaksi selesai
        // Refresh produk agar stok terbaru muncul
        const { data: updatedProducts, error: refreshError } = await supabase.from("products").select("*");
        if (refreshError) {
          console.error("Gagal memperbarui daftar produk:", refreshError);
        } else if (updatedProducts) {
          setProducts(updatedProducts);
          localStorage.setItem("pnb_cached_products", JSON.stringify({ data: updatedProducts, ts: Date.now() }));
        }
      }
    } finally {
      setPaying(false);
    }
  };

  const handleAddItem = (product: Product) => {
    if (product.stock <= 0) {
      toast.error("Stok produk habis!");
      return;
    }
    const currentItem = items.find((i) => i.id === product.id);
    if (currentItem && currentItem.quantity >= product.stock) {
      toast.error(`Maksimal stok ${product.name} adalah ${product.stock}`);
      return;
    }
    addItem(product);
  };

  // Fix #30: Gunakan stok dari state products yang sudah di-refresh
  const handleUpdateQuantity = (productId: string, newQuantity: number) => {
    const product = products.find((p) => p.id === productId);
    if (product && newQuantity > product.stock) {
      toast.error(`Maksimal stok ${product.name} adalah ${product.stock}`);
      return;
    }
    updateQuantity(productId, newQuantity);
  };

  // Fix #34: Hapus semua keranjang dengan konfirmasi
  const handleClearCart = () => {
    if (items.length === 0) return;
    if (window.confirm("Kosongkan semua keranjang? Tindakan ini tidak bisa dibatalkan.")) {
      clearCart();
      setAppliedVoucher(null);
      toast.info("Keranjang dikosongkan.");
    }
  };

  const handleApplyVoucher = async () => {
    if (!voucherCodeInput) return;
    setApplyingVoucher(true);

    try {
      const { data, error } = await supabase
        .from("vouchers")
        .select("*")
        .eq("code", voucherCodeInput.toUpperCase())
        .single();

      if (error || !data) {
        toast.error("Voucher tidak ditemukan");
        return;
      }

      if (!data.is_active) {
        toast.error("Voucher sudah tidak aktif");
        return;
      }

      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        toast.error("Voucher sudah kadaluarsa");
        return;
      }

      if (data.max_uses && data.used_count >= data.max_uses) {
        toast.error("Batas pemakaian voucher habis");
        return;
      }

      const currentSubtotal = getTotal();
      if (data.min_purchase > 0 && currentSubtotal < data.min_purchase) {
        toast.error(`Minimal belanja ${formatRupiah(data.min_purchase)} untuk voucher ini`);
        return;
      }

      setAppliedVoucher(data);
      toast.success(`Voucher ${data.code} diterapkan`);
      setVoucherCodeInput("");
    } catch (error) {
      toast.error("Gagal memvalidasi voucher");
    } finally {
      setApplyingVoucher(false);
    }
  };

  const removeVoucher = () => {
    setAppliedVoucher(null);
    toast.info("Voucher dilepas");
  };

  const subtotal = getTotal();
  let discountAmount = 0;
  if (appliedVoucher) {
    if (appliedVoucher.discount_type === "percent") {
      discountAmount = Math.floor(subtotal * (appliedVoucher.discount_value / 100));
    } else {
      discountAmount = appliedVoucher.discount_value;
    }
    if (discountAmount > subtotal) discountAmount = subtotal;
  }
  const total = subtotal - discountAmount;

  const cashAmount = parseInt(cashInput.replace(/\D/g, ""), 10);
  const change = paymentMethod === "cash" && !isNaN(cashAmount) && cashAmount >= total
    ? cashAmount - total
    : null;

  // Tombol Bayar aktif: selalu untuk non-cash, untuk cash harus sudah ada kembalian
  const isPayable = items.length > 0 && !paying &&
    (paymentMethod !== "cash" || change !== null);

  const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: React.ReactNode; desc: string }[] = [
    {
      value: "cash",
      label: "Tunai",
      icon: <Banknote className="w-5 h-5" />,
      desc: "Bayar dengan uang tunai",
    },
    {
      value: "qris",
      label: "QRIS",
      icon: <QrCode className="w-5 h-5" />,
      desc: "GoPay, OVO, Dana, dll",
    },
    {
      value: "transfer",
      label: "Transfer",
      icon: <Building2 className="w-5 h-5" />,
      desc: "Transfer bank / ATM",
    },
  ];

  
  const keranjangContent = (
    <>
      
          <div className="p-5 border-b flex items-center justify-between bg-muted/10">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <ShoppingCart className="w-6 h-6" />
              Keranjang
            </h2>
            <div className="flex items-center gap-2">
              <span className="bg-primary/10 text-primary text-sm font-bold px-3 py-1 rounded-full">
                {items.reduce((acc, item) => acc + item.quantity, 0)} item
              </span>
              {/* Fix #34: Tombol hapus semua */}
              {items.length > 0 && (
                <button
                  onClick={handleClearCart}
                  className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded"
                  title="Kosongkan keranjang"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          <ScrollArea className="flex-1 p-5">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-60 pt-20">
                <ShoppingCart className="w-16 h-16 mb-4" />
                <p className="text-lg">Keranjang kosong</p>
                <p className="text-sm mt-1">Klik menu untuk menambahkan</p>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-4 items-center">
                    <div className="flex-1">
                      <h4 className="font-bold leading-tight">{item.name}</h4>
                      <p className="text-primary font-semibold text-sm mt-1">{formatRupiah(item.price)}</p>
                    </div>

                    <div className="flex items-center gap-3 bg-muted/50 rounded-xl p-1 shadow-inner">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-lg bg-background shadow-sm hover:bg-destructive hover:text-destructive-foreground transition-colors"
                        onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                      >
                        <Minus className="w-5 h-5" />
                      </Button>
                      <span className="w-6 text-center font-bold text-lg">{item.quantity}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-lg bg-background shadow-sm hover:bg-primary hover:text-primary-foreground transition-colors"
                        onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                      >
                        <Plus className="w-5 h-5" />
                      </Button>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 text-destructive hover:bg-destructive hover:text-destructive-foreground rounded-lg transition-colors"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="p-5 border-t bg-muted/20 space-y-4">
            {/* Voucher Section */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Voucher Diskon
              </label>
              {appliedVoucher ? (
                <div className="flex items-center justify-between bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400 px-3 py-2 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    <span className="font-semibold text-sm">{appliedVoucher.code}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold bg-green-500/20 px-2 py-0.5 rounded">
                      {appliedVoucher.discount_type === "percent" ? `${appliedVoucher.discount_value}%` : formatRupiah(appliedVoucher.discount_value)}
                    </span>
                    <button onClick={removeVoucher} className="hover:bg-green-500/20 p-1 rounded-full transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder="Masukkan kode..."
                    value={voucherCodeInput}
                    onChange={(e) => setVoucherCodeInput(e.target.value)}
                    className="uppercase h-10"
                    disabled={applyingVoucher}
                  />
                  <Button
                    onClick={handleApplyVoucher}
                    disabled={!voucherCodeInput || applyingVoucher}
                    className="h-10 px-4"
                    variant="secondary"
                  >
                    {applyingVoucher ? <Loader2 className="w-4 h-4 animate-spin" /> : "Gunakan"}
                  </Button>
                </div>
              )}
            </div>

            {/* Subtotal & Total */}
            <div className="space-y-2">
              <div className="flex justify-between text-muted-foreground">
                <span className="font-medium">Subtotal</span>
                <span className="font-medium">{formatRupiah(subtotal)}</span>
              </div>
              {appliedVoucher && (
                <div className="flex justify-between text-green-600 dark:text-green-400 text-sm">
                  <span className="font-medium">Diskon ({appliedVoucher.code})</span>
                  <span className="font-medium">-{formatRupiah(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-2xl pt-2 border-t">
                <span>Total</span>
                <span className="text-primary">{formatRupiah(total)}</span>
              </div>
            </div>

            {/* Pilih Metode Pembayaran */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Metode Pembayaran
              </label>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_METHODS.map((method) => {
                  const isActive = paymentMethod === method.value;
                  return (
                    <button
                      key={method.value}
                      onClick={() => {
                        setPaymentMethod(method.value);
                        setCashInput("");
                      }}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border-2 py-3 px-2 text-center transition-all ${
                        isActive
                          ? "border-primary bg-primary/5 text-primary shadow-sm"
                          : "border-muted-foreground/20 hover:border-primary/40 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {method.icon}
                      <span className="text-xs font-bold leading-tight">{method.label}</span>
                      <span className="text-[10px] leading-tight opacity-70 hidden sm:block">{method.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Input Tunai — hanya muncul jika metode = cash */}
            {paymentMethod === "cash" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Uang Diterima
                </label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="Masukkan nominal tunai..."
                  className="h-11 text-right font-bold text-lg"
                  value={cashInput}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, "");
                    setCashInput(raw ? parseInt(raw, 10).toLocaleString("id-ID") : "");
                  }}
                />
                {change !== null && (
                  <div className="flex justify-between text-emerald-600 font-bold text-sm pt-1">
                    <span>Kembalian</span>
                    <span>{formatRupiah(change)}</span>
                  </div>
                )}
                {cashInput && change === null && (
                  <p className="text-destructive text-xs font-medium">
                    Uang kurang {formatRupiah(total - cashAmount)}
                  </p>
                )}
              </div>
            )}

            {/* Info QRIS / Transfer */}
            {paymentMethod !== "cash" && (
              <div className="rounded-xl bg-primary/5 border border-primary/20 px-4 py-3 text-sm text-center">
                <p className="font-semibold text-primary flex items-center justify-center gap-2">
                  {paymentMethod === "qris"
                    ? <><QrCode className="w-4 h-4" /> Scan QRIS</>
                    : <><Building2 className="w-4 h-4" /> Transfer Bank</>}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {paymentMethod === "qris"
                    ? "Persilakan pelanggan scan QR, lalu tekan Bayar"
                    : "Konfirmasi transfer dari pelanggan, lalu tekan Bayar"}
                </p>
              </div>
            )}

            <Button
              className="w-full h-14 text-lg font-bold rounded-xl shadow-lg transition-transform hover:scale-[1.02] active:scale-95"
              disabled={!isPayable}
              onClick={handlePayment}
            >
              {paying ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> MEMPROSES...</>
              ) : (
                `BAYAR ${formatRupiah(total)}`
              )}
            </Button>
          </div>
    </>
  );

  return (
    <div className="p-6 h-full flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kasir (POS)</h1>
          <p className="text-sm text-muted-foreground mt-1">Sistem Point of Sale</p>
        </div>
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari menu..."
            className="pl-9 h-11 bg-card rounded-full shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
        {/* AREA PRODUK */}
        <div className="flex-1 flex flex-col gap-4 overflow-hidden pb-24 lg:pb-0">
          <div className="flex gap-2 pb-2 overflow-x-auto no-scrollbar">
            {CATEGORIES.map((cat) => (
              <Badge
                key={cat}
                variant={activeCategory === cat ? "default" : "secondary"}
                className={`px-5 py-2 text-sm cursor-pointer rounded-full transition-all hover:scale-105 ${activeCategory === cat ? "shadow-md" : ""}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </Badge>
            ))}
          </div>

          <div className="flex-1 bg-card border rounded-2xl p-6 overflow-y-auto shadow-sm relative">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin mb-4" />
                <p>Memuat produk dari Supabase...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                <Search className="w-12 h-12 mb-4 opacity-20" />
                <p>Produk tidak ditemukan</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredProducts.map((product) => {
                  const isOutOfStock = product.stock <= 0;
                  return (
                    <div
                      key={product.id}
                      onClick={() => !isOutOfStock && handleAddItem(product)}
                      className={`group relative flex flex-col rounded-xl border bg-background transition-all overflow-hidden ${isOutOfStock ? "opacity-50 cursor-not-allowed grayscale" : "cursor-pointer hover:border-primary hover:shadow-md"}`}
                    >
                      <div className="h-32 w-full relative overflow-hidden bg-muted">
                        {PRODUCT_IMAGE_MAP[product.name] ? (
                          <img
                            src={PRODUCT_IMAGE_MAP[product.name]}
                            alt={product.name}
                            className={`w-full h-full object-cover transition-transform duration-300 ${!isOutOfStock && "group-hover:scale-110"}`}
                          />
                        ) : (
                          <div className={`w-full h-full ${product.color} opacity-80 ${!isOutOfStock && "group-hover:opacity-100"} transition-all`} />
                        )}
                        <div className="absolute top-2 right-2 bg-background/90 backdrop-blur text-xs font-bold px-2 py-1 rounded-md shadow-sm">
                          Stok: {product.stock}
                        </div>
                      </div>
                      <div className="p-4 flex flex-col gap-1">
                        <span className="text-xs font-medium text-muted-foreground">{product.category}</span>
                        <h3 className="font-semibold leading-tight line-clamp-2">{product.name}</h3>
                        <p className="text-primary font-bold mt-1 text-lg">{formatRupiah(product.price)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* KERANJANG */}
        <div className="w-full lg:w-[400px] flex-shrink-0 h-[45vh] lg:h-auto bg-card border shadow-sm rounded-2xl flex flex-col overflow-hidden">
          <div className="p-5 border-b flex items-center justify-between bg-muted/10">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <ShoppingCart className="w-6 h-6" />
              Keranjang
            </h2>
            <div className="flex items-center gap-2">
              <span className="bg-primary/10 text-primary text-sm font-bold px-3 py-1 rounded-full">
                {items.reduce((acc, item) => acc + item.quantity, 0)} item
              </span>
              {/* Fix #34: Tombol hapus semua */}
              {items.length > 0 && (
                <button
                  onClick={handleClearCart}
                  className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded"
                  title="Kosongkan keranjang"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          <ScrollArea className="flex-1 p-5">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-60 pt-20">
                <ShoppingCart className="w-16 h-16 mb-4" />
                <p className="text-lg">Keranjang kosong</p>
                <p className="text-sm mt-1">Klik menu untuk menambahkan</p>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-4 items-center">
                    <div className="flex-1">
                      <h4 className="font-bold leading-tight">{item.name}</h4>
                      <p className="text-primary font-semibold text-sm mt-1">{formatRupiah(item.price)}</p>
                    </div>

                    <div className="flex items-center gap-3 bg-muted/50 rounded-xl p-1 shadow-inner">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-lg bg-background shadow-sm hover:bg-destructive hover:text-destructive-foreground transition-colors"
                        onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                      >
                        <Minus className="w-5 h-5" />
                      </Button>
                      <span className="w-6 text-center font-bold text-lg">{item.quantity}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-lg bg-background shadow-sm hover:bg-primary hover:text-primary-foreground transition-colors"
                        onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                      >
                        <Plus className="w-5 h-5" />
                      </Button>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 text-destructive hover:bg-destructive hover:text-destructive-foreground rounded-lg transition-colors"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="p-5 border-t bg-muted/20 space-y-4">
            {/* Voucher Section */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Voucher Diskon
              </label>
              {appliedVoucher ? (
                <div className="flex items-center justify-between bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400 px-3 py-2 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    <span className="font-semibold text-sm">{appliedVoucher.code}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold bg-green-500/20 px-2 py-0.5 rounded">
                      {appliedVoucher.discount_type === "percent" ? `${appliedVoucher.discount_value}%` : formatRupiah(appliedVoucher.discount_value)}
                    </span>
                    <button onClick={removeVoucher} className="hover:bg-green-500/20 p-1 rounded-full transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder="Masukkan kode..."
                    value={voucherCodeInput}
                    onChange={(e) => setVoucherCodeInput(e.target.value)}
                    className="uppercase h-10"
                    disabled={applyingVoucher}
                  />
                  <Button
                    onClick={handleApplyVoucher}
                    disabled={!voucherCodeInput || applyingVoucher}
                    className="h-10 px-4"
                    variant="secondary"
                  >
                    {applyingVoucher ? <Loader2 className="w-4 h-4 animate-spin" /> : "Gunakan"}
                  </Button>
                </div>
              )}
            </div>

            {/* Subtotal & Total */}
            <div className="space-y-2">
              <div className="flex justify-between text-muted-foreground">
                <span className="font-medium">Subtotal</span>
                <span className="font-medium">{formatRupiah(subtotal)}</span>
              </div>
              {appliedVoucher && (
                <div className="flex justify-between text-green-600 dark:text-green-400 text-sm">
                  <span className="font-medium">Diskon ({appliedVoucher.code})</span>
                  <span className="font-medium">-{formatRupiah(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-2xl pt-2 border-t">
                <span>Total</span>
                <span className="text-primary">{formatRupiah(total)}</span>
              </div>
            </div>

            {/* Pilih Metode Pembayaran */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Metode Pembayaran
              </label>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_METHODS.map((method) => {
                  const isActive = paymentMethod === method.value;
                  return (
                    <button
                      key={method.value}
                      onClick={() => {
                        setPaymentMethod(method.value);
                        setCashInput("");
                      }}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border-2 py-3 px-2 text-center transition-all ${
                        isActive
                          ? "border-primary bg-primary/5 text-primary shadow-sm"
                          : "border-muted-foreground/20 hover:border-primary/40 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {method.icon}
                      <span className="text-xs font-bold leading-tight">{method.label}</span>
                      <span className="text-[10px] leading-tight opacity-70 hidden sm:block">{method.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Input Tunai — hanya muncul jika metode = cash */}
            {paymentMethod === "cash" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Uang Diterima
                </label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="Masukkan nominal tunai..."
                  className="h-11 text-right font-bold text-lg"
                  value={cashInput}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, "");
                    setCashInput(raw ? parseInt(raw, 10).toLocaleString("id-ID") : "");
                  }}
                />
                {change !== null && (
                  <div className="flex justify-between text-emerald-600 font-bold text-sm pt-1">
                    <span>Kembalian</span>
                    <span>{formatRupiah(change)}</span>
                  </div>
                )}
                {cashInput && change === null && (
                  <p className="text-destructive text-xs font-medium">
                    Uang kurang {formatRupiah(total - cashAmount)}
                  </p>
                )}
              </div>
            )}

            {/* Info QRIS / Transfer */}
            {paymentMethod !== "cash" && (
              <div className="rounded-xl bg-primary/5 border border-primary/20 px-4 py-3 text-sm text-center">
                <p className="font-semibold text-primary flex items-center justify-center gap-2">
                  {paymentMethod === "qris"
                    ? <><QrCode className="w-4 h-4" /> Scan QRIS</>
                    : <><Building2 className="w-4 h-4" /> Transfer Bank</>}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {paymentMethod === "qris"
                    ? "Persilakan pelanggan scan QR, lalu tekan Bayar"
                    : "Konfirmasi transfer dari pelanggan, lalu tekan Bayar"}
                </p>
              </div>
            )}

            <Button
              className="w-full h-14 text-lg font-bold rounded-xl shadow-lg transition-transform hover:scale-[1.02] active:scale-95"
              disabled={!isPayable}
              onClick={handlePayment}
            >
              {paying ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> MEMPROSES...</>
              ) : (
                `BAYAR ${formatRupiah(total)}`
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Fix #31: Dialog tidak bisa ditutup klik backdrop — onOpenChange diabaikan agar tidak bisa ditutup */}
      <Dialog open={paidTransaction !== null} onOpenChange={() => { /* intentionally blocked */ }}>
        <DialogContent
          className="sm:max-w-md text-center"
          showCloseButton={false}
        >
          <DialogHeader>
            <DialogTitle className="text-2xl text-center text-primary font-bold">Pembayaran Berhasil!</DialogTitle>
            <DialogDescription className="text-center text-md">
              Transaksi sebesar{" "}
              <span className="font-bold text-foreground">
                {paidTransaction && formatRupiah(paidTransaction.total)}
              </span>{" "}
              telah selesai.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center my-2">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          {paidTransaction && (
            <div className="text-sm space-y-1.5 bg-muted/50 rounded-lg px-4 py-3 text-left">
              {/* Metode Pembayaran */}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Metode</span>
                <span className="font-semibold capitalize">
                  {paidTransaction.paymentMethod === "cash"
                    ? "Tunai"
                    : paidTransaction.paymentMethod === "qris"
                    ? "QRIS"
                    : "Transfer Bank"}
                </span>
              </div>
              {/* Voucher */}
              {paidTransaction.voucherCode && (
                <div className="flex justify-between text-green-600">
                  <span className="text-muted-foreground">Diskon ({paidTransaction.voucherCode})</span>
                  <span className="font-semibold">-{formatRupiah(paidTransaction.discountAmount || 0)}</span>
                </div>
              )}
              {/* Tunai & Kembalian — hanya jika cash */}
              {paidTransaction.paymentMethod === "cash" && paidTransaction.cashReceived > 0 && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tunai</span>
                    <span className="font-semibold">{formatRupiah(paidTransaction.cashReceived)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Kembalian</span>
                    <span>{formatRupiah(paidTransaction.cashReceived - paidTransaction.total)}</span>
                  </div>
                </>
              )}
            </div>
          )}
          <DialogFooter className="sm:justify-center flex-col sm:flex-row gap-2 mt-2">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setPaidTransaction(null)}>
              Transaksi Baru
            </Button>
            <Button variant="secondary" className="w-full sm:w-auto font-bold bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-blue-500/20" onClick={() => handlePrintBluetooth()}>
              <Bluetooth className="w-4 h-4 mr-2" />
              Bluetooth
            </Button>
            <Button className="w-full sm:w-auto font-bold" onClick={() => handlePrint()}>
              Cetak PDF / Printer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Komponen Struk (Hidden) */}
      {paidTransaction && (
        <Receipt
          ref={receiptRef}
          items={paidTransaction.items}
          total={paidTransaction.total}
          cashReceived={paidTransaction.cashReceived}
          paymentMethod={paidTransaction.paymentMethod}
          voucherCode={paidTransaction.voucherCode}
          discountAmount={paidTransaction.discountAmount}
          cashierName={cashierName}
        />
      )}
    </div>
  );
}
