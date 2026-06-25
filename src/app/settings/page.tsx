"use client";

import { useState, useEffect } from "react";
import { Store, Printer, Database, Info, Check, Users, Plus, Shield } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { createUser } from "./actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const APP_VERSION = "1.0.0";

interface UserProfile {
  id: string;
  name: string;
  role: string;
  created_at: string;
}

export default function SettingsPage() {
    const [storeName, setStoreName] = useState(() =>
        typeof window !== "undefined"
            ? localStorage.getItem("settings_storeName") ?? "PNB POS"
            : "PNB POS"
    );
    const [receiptFooter, setReceiptFooter] = useState(() =>
        typeof window !== "undefined"
            ? localStorage.getItem("settings_receiptFooter") ?? "Terima kasih telah berbelanja!"
            : "Terima kasih telah berbelanja!"
    );
    const [saved, setSaved] = useState(false);

    // User management state
    const [profiles, setProfiles] = useState<UserProfile[]>([]);
    const [isAddUserOpen, setIsAddUserOpen] = useState(false);
    const [submittingUser, setSubmittingUser] = useState(false);
    
    // New User form
    const [newUser, setNewUser] = useState({
      name: "",
      email: "",
      password: "",
      role: "kasir"
    });

    useEffect(() => {
        fetchProfiles();
    }, []);

    const fetchProfiles = async () => {
        const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
        if (error) {
            console.error("Gagal memuat daftar pengguna:", error);
            toast.error("Gagal memuat daftar pengguna: " + error.message);
            return;
        }
        if (data) {
            setProfiles(data);
        }
    };

    const handleSave = () => {
        localStorage.setItem("settings_storeName", storeName);
        localStorage.setItem("settings_receiptFooter", receiptFooter);
        setSaved(true);
        toast.success("Pengaturan berhasil disimpan");
        setTimeout(() => setSaved(false), 2000);
    };

    const handleAddUser = async () => {
      if (!newUser.name || !newUser.email || !newUser.password) {
        toast.error("Semua field harus diisi");
        return;
      }
      setSubmittingUser(true);
      
      const formData = new FormData();
      formData.append("name", newUser.name);
      formData.append("email", newUser.email);
      formData.append("password", newUser.password);
      formData.append("role", newUser.role);

      const res = await createUser(formData);
      
      if (res?.error) {
        toast.error("Gagal membuat user: " + res.error);
      } else {
        toast.success("User berhasil dibuat!");
        setIsAddUserOpen(false);
        setNewUser({ name: "", email: "", password: "", role: "kasir" });
        fetchProfiles();
      }
      setSubmittingUser(false);
    };

    return (
        <div className="p-8 h-full flex flex-col gap-6 overflow-y-auto">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Pengaturan</h1>
                <p className="text-muted-foreground mt-1">
                    Kelola konfigurasi aplikasi POS Anda.
                </p>
            </div>

            <div className="grid gap-6 max-w-3xl">
                {/* Manajemen Pengguna */}
                <Card className="shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div>
                            <div className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-primary" />
                                <CardTitle>Manajemen Pengguna</CardTitle>
                            </div>
                            <CardDescription className="mt-1">
                                Kelola akun kasir dan admin/owner.
                            </CardDescription>
                        </div>
                        <Button size="sm" onClick={() => setIsAddUserOpen(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Tambah Pengguna
                        </Button>
                    </CardHeader>
                    <CardContent className="mt-4">
                        <div className="rounded-md border">
                            <div className="grid grid-cols-4 bg-muted/50 p-3 text-sm font-medium border-b">
                                <div className="col-span-2">Nama Pengguna</div>
                                <div>Peran (Role)</div>
                                <div className="text-right">Dibuat Pada</div>
                            </div>
                            <div className="divide-y">
                                {profiles.map((p) => (
                                    <div key={p.id} className="grid grid-cols-4 p-3 text-sm items-center hover:bg-muted/30">
                                        <div className="col-span-2 font-medium">
                                            {p.name}
                                            {p.role === 'owner' && <Shield className="w-3 h-3 inline-block ml-2 text-primary" />}
                                        </div>
                                        <div>
                                            <Badge variant={p.role === 'owner' ? 'default' : 'secondary'}>
                                                {p.role.toUpperCase()}
                                            </Badge>
                                        </div>
                                        <div className="text-right text-muted-foreground">
                                            {new Date(p.created_at).toLocaleDateString('id-ID')}
                                        </div>
                                    </div>
                                ))}
                                {profiles.length === 0 && (
                                    <div className="p-4 text-center text-muted-foreground">Memuat data...</div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Informasi Toko */}
                <Card className="shadow-sm">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Store className="h-5 w-5 text-primary" />
                            <CardTitle>Informasi Toko</CardTitle>
                        </div>
                        <CardDescription>
                            Data toko yang tampil di struk dan header aplikasi.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="storeName">Nama Toko</Label>
                            <Input
                                id="storeName"
                                value={storeName}
                                onChange={(e) => setStoreName(e.target.value)}
                                placeholder="Masukkan nama toko..."
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Pengaturan Struk */}
                <Card className="shadow-sm">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Printer className="h-5 w-5 text-primary" />
                            <CardTitle>Pengaturan Struk</CardTitle>
                        </div>
                        <CardDescription>
                            Kustomisasi pesan yang tercetak di bagian bawah struk belanja.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="receiptFooter">Pesan Footer Struk</Label>
                            <Input
                                id="receiptFooter"
                                value={receiptFooter}
                                onChange={(e) => setReceiptFooter(e.target.value)}
                                placeholder="Contoh: Terima kasih telah berbelanja!"
                            />
                            <p className="text-xs text-muted-foreground">
                                Pesan ini akan muncul di bagian bawah setiap struk yang dicetak.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Tombol Simpan */}
                <div className="flex justify-end">
                    <Button onClick={handleSave} className="min-w-[120px]" disabled={saved}>
                        {saved ? (
                            <>
                                <Check className="h-4 w-4 mr-2" />
                                Tersimpan
                            </>
                        ) : (
                            "Simpan Pengaturan"
                        )}
                    </Button>
                </div>

                <Separator />

                {/* Informasi Aplikasi */}
                <Card className="shadow-sm">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Info className="h-5 w-5 text-primary" />
                            <CardTitle>Tentang Aplikasi</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Nama Aplikasi</span>
                            <span className="font-medium">PNB-POS</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Versi</span>
                            <span className="font-medium">{APP_VERSION}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Framework</span>
                            <span className="font-medium">Next.js + Supabase</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">UI Library</span>
                            <span className="font-medium">shadcn/ui + Tailwind CSS</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Dialog Tambah User */}
            <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Tambah Pengguna Baru</DialogTitle>
                        <DialogDescription>
                            Buat akun baru untuk kasir atau administrator. Pastikan pengaturan <b>Email Confirmation</b> di Supabase dinonaktifkan agar pengguna bisa langsung login.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Nama Lengkap</Label>
                            <Input 
                                placeholder="Cth: Budi Santoso" 
                                value={newUser.name}
                                onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input 
                                type="email" 
                                placeholder="kasir1@pnbpos.com" 
                                value={newUser.email}
                                onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Password</Label>
                            <Input 
                                type="password" 
                                placeholder="Minimal 6 karakter" 
                                value={newUser.password}
                                onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Peran (Role)</Label>
                            <Select 
                                value={newUser.role} 
                                onValueChange={(val) => setNewUser({...newUser, role: val || "kasir"})}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih Role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="kasir">Kasir</SelectItem>
                                    <SelectItem value="owner">Owner / Admin</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddUserOpen(false)} disabled={submittingUser}>Batal</Button>
                        <Button onClick={handleAddUser} disabled={submittingUser}>
                            {submittingUser ? "Menyimpan..." : "Simpan Pengguna"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
