
'use client';

import { AppLogo } from '@/components/AppLogo';
import { UserProfile } from '@/components/UserProfile';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger }  from '@/components/ui/sheet';
import { SidebarProvider, useSidebar, SidebarTrigger as ShadCnSidebarTrigger } from '@/components/ui/sidebar';
import { Menu, Bell, Sun, Moon } from 'lucide-react'; // Import Sun and Moon
import Link from 'next/link';
import { SidebarNav } from './SidebarNav';
import { useTheme } from '@/contexts/ThemeContext'; // Import useTheme
import { useEffect, useState } from 'react'; // For ensuring client-side rendering of icon

export function Header() {
 const sidebarContext = useSidebar(); // Get context from parent SidebarProvider in AppLayout
 const { theme, setTheme, isThemeInitialized } = useTheme();
 const [mounted, setMounted] = useState(false);

 useEffect(() => {
    setMounted(true);
 }, []);

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6 shadow-sm">
      <div className="flex items-center gap-2 md:hidden">
        <ShadCnSidebarTrigger />
      </div>
      <div className="hidden md:block">
        <AppLogo />
      </div>
      
      <div className="ml-auto flex items-center gap-2"> {/* Reduced gap from 4 to 2 for tighter spacing */}
        {mounted && isThemeInitialized && ( // Only render button client-side after theme is initialized
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            aria-label="Toggle theme"
            className="rounded-full"
          >
            {theme === 'light' ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
        )}
        <UserProfile />
      </div>
    </header>
  );
}
