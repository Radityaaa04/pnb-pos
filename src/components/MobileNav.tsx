"use client";

import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import Sidebar from "./Sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";

interface MobileNavProps {
  role?: string | null;
  userName?: string | null;
}

export function MobileNav({ role, userName }: MobileNavProps) {
  return (
    <div className="md:hidden flex items-center justify-between p-4 border-b bg-card">
      <div className="flex items-center">
        <Sheet>
          <SheetTrigger className="mr-4 flex h-10 w-10 items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground">
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <SheetTitle className="sr-only">Menu Navigasi</SheetTitle>
            <Sidebar role={role} userName={userName} />
          </SheetContent>
        </Sheet>
        <h1 className="text-xl font-black tracking-tighter text-primary">PNB-POS</h1>
      </div>
      <ThemeToggle />
    </div>
  );
}
