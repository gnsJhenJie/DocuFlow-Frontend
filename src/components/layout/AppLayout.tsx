
'use client';

import type { ReactNode } from 'react';
import { Header } from './Header';
import { SidebarNav } from './SidebarNav';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Sidebar, SidebarContent, SidebarHeader, SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppLogo } from '@/components/AppLogo';
import { Toaster } from "@/components/ui/toaster";
import { usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react'; // Added useState, useEffect

function LayoutContent({ children }: { children: ReactNode }) {
  const { user, loading: authIsLoading } = useAuth(); // Renamed loading to authIsLoading to avoid conflict
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted || authIsLoading) {
    // This will be rendered on server (isMounted=false) and initial client render (isMounted=false)
    // and while auth is still loading on the client.
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-lg text-muted-foreground">Loading application...</p>
      </div>
    );
  }

  // At this point, isMounted is true and authIsLoading is false.
  // We can now safely check user status and pathname for client-side rendering decisions.

  if (pathname === '/login' || pathname.startsWith('/auth/callback')) {
     // For login and callback pages, render children directly.
     // AuthContext will handle redirection logic within those pages or based on auth state.
     return <>{children}</>;
  }

  if (!user) {
    // AuthContext should have redirected to /login if !user and not on login/callback.
    // This state (isMounted=true, authIsLoading=false, !user, not on login/callback)
    // should ideally not be reached if AuthContext's redirection is working.
    // However, as a fallback or if AuthContext is still initializing, show loading.
    // Or, if AuthContext has determined no user and needs to redirect, it will handle it.
    // This log helps if we unexpectedly reach here.
    console.log('[AppLayout] No user, not on login/callback. AuthContext should handle redirect.');
    // It's safer to let AuthContext's useEffect handle the redirect rather than duplicating here.
    // Displaying a minimal loader while AuthContext's redirect might be taking effect.
    return (
        <div className="flex h-screen items-center justify-center bg-background">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-3 text-lg text-muted-foreground">Checking authentication...</p>
        </div>
      );
  }

  // Authenticated user, render the full app layout
  return (
    <SidebarProvider defaultOpen>
      <Sidebar variant="sidebar" collapsible="icon">
        <SidebarHeader className="p-4 items-center">
           <div className="flex items-center justify-between w-full">
             <AppLogo />
             <SidebarTrigger className="hidden group-data-[collapsible=icon]:flex group-data-[collapsible=offcanvas]:flex" />
           </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarNav />
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <Header />
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <LayoutContent>{children}</LayoutContent>
      <Toaster />
    </AuthProvider>
  );
}
