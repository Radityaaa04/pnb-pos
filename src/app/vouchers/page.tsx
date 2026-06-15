"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { formatRupiah } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Tag, Percent, Banknote, Calendar as CalendarIcon, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface Voucher {
  id: string;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  min_purchase: number;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export default function VouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    code: "",
    discount_type: "percent" as "percent" | "fixed",
    discount_value: "",
    min_purchase: "0",
    max_uses: "",
    expires_at: "",
  });

  const fetchVouchers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("vouchers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Gagal memuat voucher: " + error.message);
    } else {
      setVouchers(data as Voucher[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchVouchers();
  }, [fetchVouchers]);

  const handleAddVoucher = async () => {
    if (!formData.code || !formData.discount_value) {
      toast.error("Kode dan Nilai Diskon harus diisi!");
      return;
    }

    setSubmitting(true);
    const payload = {
      code: formData.code.toUpperCase(),
      discount_type: formData.discount_type,
      discount_value: Number(formData.discount_value),
      min_purchase: Number(formData.min_purchase) || 0,
      max_uses: formData.max_uses ? Number(formData.max_uses) : null,
      expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null,
      is_active: true,
      used_count: 0
    };

    const { error } = await supabase.from("vouchers").insert([payload]);

    if (error) {
      toast.error("Gagal membuat voucher: " + error.message);
    } else {
      toast.success("Voucher berhasil dibuat!");
      setIsAddOpen(false);
      setFormData({
        code: "",
        discount_type: "percent",
        discount_value: "",
        min_purchase: "0",
        max_uses: "",
        expires_at: "",
      });
      fetchVouchers();
    }
    setSubmitting(false);
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("vouchers")
      .update({ is_active: !currentStatus })
      .eq("id", id);
    if (error) {
      toast.error("Gagal update status: " + error.message);
    } else {
      toast.success("Status diperbarui!");
      fetchVouchers();
    }
  };

  const deleteVoucher = async (id: string) => {
    if (!window.confirm("Hapus voucher ini? Tindakan ini tidak bisa dibatalkan.")) return;
    const { error } = await supabase.from("vouchers").delete().eq("id", id);
    if (error) {
      toast.error("Gagal menghapus: " + error.message);
    } else {
      toast.success("Voucher dihapus!");
      fetchVouchers();
    }
  };

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary flex items-center gap-2">
            <Tag className="w-8 h-8" />
            Voucher & Diskon
          </h1>
          <p className="text-muted-foreground mt-1">Kelola kode promosi dan diskon transaksi.</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Tambah Voucher
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Daftar Voucher</CardTitle>
              <CardDescription>Semua voucher yang pernah dibuat.</CardDescription>
            </div>
            <Button variant="outline" size="icon" onClick={fetchVouchers} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 flex justify-center">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : vouchers.length === 0 ? (
            <div className="py-12 text-center border-2 border-dashed rounded-xl">
              <Tag className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <h3 className="font-semibold text-lg">Belum Ada Voucher</h3>
              <p className="text-muted-foreground">Buat voucher pertama Anda sekarang.</p>
              <Button onClick={() => setIsAddOpen(true)} variant="outline" className="mt-4">
                <Plus className="w-4 h-4 mr-2" /> Tambah Voucher
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vouchers.map((voucher) => (
                <Card key={voucher.id} className="relative overflow-hidden group">
                  <div className={`absolute top-0 left-0 w-1 h-full ${voucher.is_active ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <Badge variant="secondary" className="font-mono text-sm uppercase tracking-widest border-primary/20 text-primary">
                          {voucher.code}
                        </Badge>
                        <div className="mt-2 text-2xl font-black flex items-center gap-1">
                          {voucher.discount_type === "percent" ? (
                            <><Percent className="w-5 h-5 text-muted-foreground" /> {voucher.discount_value}%</>
                          ) : (
                            <><Banknote className="w-5 h-5 text-muted-foreground" /> {formatRupiah(voucher.discount_value)}</>
                          )}
                        </div>
                      </div>
                      <Badge variant={voucher.is_active ? "default" : "secondary"}>
                        {voucher.is_active ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </div>

                    <div className="space-y-2 mt-4 text-sm text-muted-foreground">
                      <div className="flex justify-between border-b pb-1">
                        <span>Min. Belanja:</span>
                        <span className="font-medium text-foreground">{formatRupiah(voucher.min_purchase)}</span>
                      </div>
                      <div className="flex justify-between border-b pb-1">
                        <span>Pemakaian:</span>
                        <span className="font-medium text-foreground">
                          {voucher.used_count} {voucher.max_uses ? `/ ${voucher.max_uses}` : '(Tanpa Batas)'}
                        </span>
                      </div>
                      <div className="flex justify-between border-b pb-1">
                        <span>Kadaluarsa:</span>
                        <span className="font-medium text-foreground">
                          {voucher.expires_at ? new Date(voucher.expires_at).toLocaleDateString('id-ID') : 'Tidak Ada'}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4 pt-4 border-t opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant={voucher.is_active ? "secondary" : "default"}
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => toggleActive(voucher.id, voucher.is_active)}
                      >
                        {voucher.is_active ? "Nonaktifkan" : "Aktifkan"}
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => deleteVoucher(voucher.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Add Voucher */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Voucher Baru</DialogTitle>
            <DialogDescription>Masukkan detail promo diskon baru.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Kode Voucher (Unik)</label>
              <Input
                placeholder="Misal: PROMO10"
                className="uppercase font-mono"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/\s/g, '') })}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Tipe Diskon</label>
                <Select
                  value={formData.discount_type}
                  onValueChange={(val) => { if (val) setFormData({ ...formData, discount_type: val as "percent" | "fixed" }); }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Tipe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Persen (%)</SelectItem>
                    <SelectItem value="fixed">Nominal (Rp)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Besaran Diskon</label>
                <Input
                  type="number"
                  placeholder={formData.discount_type === "percent" ? "Maks 100" : "Misal 10000"}
                  value={formData.discount_value}
                  onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Minimal Belanja (Opsional)</label>
              <Input
                type="number"
                placeholder="Misal 50000"
                value={formData.min_purchase}
                onChange={(e) => setFormData({ ...formData, min_purchase: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Batas Kuota Pakai</label>
                <Input
                  type="number"
                  placeholder="Kosong = Unlimited"
                  value={formData.max_uses}
                  onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Tgl Kadaluarsa</label>
                <Input
                  type="date"
                  value={formData.expires_at}
                  onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)} disabled={submitting}>
              Batal
            </Button>
            <Button onClick={handleAddVoucher} disabled={submitting}>
              {submitting ? "Menyimpan..." : "Simpan Voucher"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
