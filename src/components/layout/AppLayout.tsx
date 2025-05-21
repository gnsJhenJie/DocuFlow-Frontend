'use client';

import type { ReactNode } from 'react';
import { Header } from './Header';
import { SidebarNav } from './SidebarNav';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Sidebar, SidebarContent, SidebarHeader, SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppLogo } from '@/components/AppLogo';
import { Toaster } from "@/components/ui/toaster";
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

function LayoutContent({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user && pathname !== '/login') {
      console.log('[AppLayout] User not authenticated, redirecting to login.');
      router.push('/login');
    }
  }, [user, loading, router, pathname]);

  if (loading) {
    return <div className="flex h-screen items-center justify-center"><p>Loading application...</p></div>;
  }

  if (!user && pathname !== '/login') {
    // Still show loading or a minimal page while redirecting
    return <div className="flex h-screen items-center justify-center"><p>Redirecting to login...</p></div>;
  }
  
  if (pathname === '/login') {
     return <>{children}</>;
  }

  return (
    <SidebarProvider defaultOpen>
      <Sidebar variant="sidebar" collapsible="icon">
        <SidebarHeader className="p-4 items-center">
           <div className="flex items-center justify-between w-full">
             <AppLogo />
             {/* The trigger here is for icon-only mode to expand again or for offcanvas to show */}
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
