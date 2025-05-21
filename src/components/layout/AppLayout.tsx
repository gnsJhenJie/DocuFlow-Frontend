
'use client';

import type { ReactNode } from 'react';
import { Header } from './Header';
import { SidebarNav } from './SidebarNav';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Sidebar, SidebarContent, SidebarHeader, SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppLogo } from '@/components/AppLogo';
import { Toaster } from "@/components/ui/toaster";
import { usePathname } from 'next/navigation'; // useRouter removed as redirection is handled by AuthContext
import { Loader2 } from 'lucide-react'; // Added for loading indicator

function LayoutContent({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  // AuthContext now handles all redirection logic.
  // AppLayout simply renders based on AuthContext's state.

  if (loading) {
    // Show a full-page loader while AuthContext is initializing or processing auth state
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-lg text-muted-foreground">Loading application...</p>
      </div>
    );
  }

  // If not loading and not on login page, but no user, AuthContext will redirect.
  // If on login page, or if user exists, render children.
  // The /auth/callback page will also be handled correctly by AuthContext's logic.
  if (pathname === '/login' || pathname.startsWith('/auth/callback')) {
     // For login and callback pages, render children directly without the main layout
     // AuthContext handles whether children (like OAuthCallbackContent) should render or redirect
     return <>{children}</>;
  }
  
  // If user is not authenticated and we are not on a public page (login/callback),
  // AuthContext would have redirected. If we reach here without a user, it's an unexpected state
  // or AuthContext is still about to redirect. For safety, show a loading/message.
  if (!user) {
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
