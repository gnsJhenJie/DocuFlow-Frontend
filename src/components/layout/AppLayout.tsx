
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
import { useState, useEffect } from 'react';

function LayoutContent({ children }: { children: ReactNode }) {
  const { user, loading: authIsLoading } = useAuth();
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted || authIsLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-lg text-muted-foreground">Loading application...</p>
      </div>
    );
  }

  if (pathname === '/login' || pathname.startsWith('/auth/callback')) {
     return <>{children}</>;
  }
  
  if (!user) {
    // AuthContext will handle redirection if !user and not on login/callback.
    // This state should ideally be brief or covered by the AuthContext's loading.
    // Render a minimal loader as a fallback.
    return (
        <div className="flex h-screen items-center justify-center bg-background">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-3 text-lg text-muted-foreground">Verifying authentication...</p>
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
      {/* Suspense is now in RootLayout, wrapping AppLayout */}
      <LayoutContent>{children}</LayoutContent>
      <Toaster />
    </AuthProvider>
  );
}
