"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Store, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message === "Invalid login credentials" ? "Email atau password salah" : error.message);
      setLoading(false);
      return;
    }

    toast.success("Login berhasil!");
    // The middleware will handle redirect based on role, but we can do a hard refresh
    // or router.push('/pos') and let the middleware sort it out.
    router.refresh();
    router.push("/pos");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-primary-foreground">
              <Store className="w-6 h-6" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Login PNB-POS</CardTitle>
          <CardDescription>
            Masukkan email dan password untuk masuk ke sistem kasir
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="kasir@pnbpos.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
              </div>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="bg-muted/50 p-3 rounded-md text-sm text-center border border-border/50">
              <p className="text-muted-foreground mb-2">Coba gunakan akun ini (jika sudah didaftarkan):</p>
              <div className="flex justify-around gap-2 text-left">
                <div>
                  <p className="font-mono font-bold text-xs mb-1">Owner / Admin:</p>
                  <p className="font-mono font-medium text-xs">admin@pnb.com</p>
                </div>
                <div>
                  <p className="font-mono font-bold text-xs mb-1">Kasir:</p>
                  <p className="font-mono font-medium text-xs">kasir@pnb.com</p>
                </div>
              </div>
              <p className="font-mono font-medium text-xs mt-2 pt-2 border-t border-border/50">Password: Ceper123</p>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                "Masuk"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
