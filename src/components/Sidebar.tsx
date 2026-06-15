"use client";

import Link from 'next/link';
import { LayoutDashboard, ShoppingCart, Settings, Package, Receipt, Ticket, LogOut, User } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { ThemeToggle } from '@/components/ThemeToggle';

interface SidebarProps {
  role?: string | null;
  userName?: string | null;
}

export default function Sidebar({ role, userName }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Gagal logout: " + error.message);
    } else {
      toast.success("Berhasil logout");
      router.refresh();
      router.push("/login");
    }
  };

  const isOwner = role === 'owner';

  return (
    <div className="w-64 border-r bg-card h-full flex flex-col">
      <div className="p-6 border-b flex items-center gap-2">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">
          <ShoppingCart className="w-5 h-5" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-primary">PNB-POS</h2>
      </div>
      
      {/* User Info */}
      <div className="p-4 border-b flex items-center gap-3 bg-muted/20">
        <Avatar className="h-10 w-10 border border-border">
          <AvatarFallback className="bg-primary/10 text-primary">
            {userName ? userName.substring(0, 2).toUpperCase() : <User className="w-5 h-5" />}
          </AvatarFallback>
        </Avatar>
        <div className="overflow-hidden">
          <p className="text-sm font-medium truncate">{userName || "Pengguna"}</p>
          <p className="text-xs text-muted-foreground capitalize">{role || "Role tidak diketahui"}</p>
        </div>
      </div>

      <div className="flex-1 py-4 overflow-y-auto">
        <nav className="grid gap-2 px-4">
          <Link href="/pos" className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${pathname.startsWith('/pos') ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
            <ShoppingCart className="h-4 w-4" />
            <span className="text-sm font-medium">Kasir (POS)</span>
          </Link>

          {isOwner && (
            <>
              <Link href="/dashboard" className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${pathname.startsWith('/dashboard') ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                <LayoutDashboard className="h-4 w-4" />
                <span className="text-sm font-medium">Dashboard</span>
              </Link>
              <Link href="/inventory" className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${pathname.startsWith('/inventory') ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                <Package className="h-4 w-4" />
                <span className="text-sm font-medium">Gudang</span>
              </Link>
            </>
          )}

          <Link href="/history" className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${pathname.startsWith('/history') ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
            <Receipt className="h-4 w-4" />
            <span className="text-sm font-medium">Riwayat Transaksi</span>
          </Link>

          {isOwner && (
            <Link href="/vouchers" className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${pathname.startsWith('/vouchers') ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
              <Ticket className="h-4 w-4" />
              <span className="text-sm font-medium">Voucher</span>
            </Link>
          )}
        </nav>
      </div>

      <div className="p-4 border-t mt-auto space-y-2">
        {isOwner && (
          <Link href="/settings" className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${pathname.startsWith('/settings') ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
            <Settings className="h-4 w-4" />
            <span className="text-sm font-medium">Pengaturan</span>
          </Link>
        )}
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-muted-foreground">Tampilan</span>
          <ThemeToggle />
        </div>
        <Button variant="ghost" className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-3" />
          Logout
        </Button>
      </div>
    </div>
  );
}
