'use client';

import { AppLogo } from '@/components/AppLogo';
import { UserProfile } from '@/components/UserProfile';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger }  from '@/components/ui/sheet';
import { SidebarProvider, useSidebar, SidebarTrigger as ShadCnSidebarTrigger } from '@/components/ui/sidebar';
import { Menu, Bell } from 'lucide-react';
import Link from 'next/link';
import { SidebarNav } from './SidebarNav';

export function Header() {
 const sidebarContext = useSidebar(); // Get context from parent SidebarProvider in AppLayout

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6 shadow-sm">
      <div className="flex items-center gap-2 md:hidden">
         {/* This ShadCnSidebarTrigger uses the context from AppLayout's SidebarProvider */}
        <ShadCnSidebarTrigger />
      </div>
      <div className="hidden md:block">
        <AppLogo />
      </div>
      
      <div className="ml-auto flex items-center gap-4">
        <Button variant="ghost" size="icon" className="rounded-full">
          <Bell className="h-5 w-5" />
          <span className="sr-only">Toggle notifications</span>
        </Button>
        <UserProfile />
      </div>
    </header>
  );
}
