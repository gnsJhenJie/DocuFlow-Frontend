'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, User as UserIcon, Settings, Shield, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';

export function UserProfile() {
  const { user, logout, loading, fetchCurrentUser } = useAuth();

  useEffect(() => {
    if (!user && !loading && localStorage.getItem('docuflow_jwt_token')) {
      fetchCurrentUser();
    }
  }, [user, loading, fetchCurrentUser]);

  if (loading) {
    return (
      <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full">
        <Loader2 className="h-5 w-5 animate-spin" />
      </Button>
    );
  }

  if (!user) {
    return (
      <Link href="/login">
        <Button variant="outline">Login</Button>
      </Link>
    );
  }

  const getAvatarFallback = (name: string) => {
    if (!name) return '??';
    const trimmed = name.trim();

    const isChinese = /[\u4e00-\u9fff]/.test(trimmed);
    if (isChinese) {
      return trimmed.length > 1 ? trimmed.slice(1) : trimmed; // 顯示名
    }

    const parts = trimmed.split(/\s+/);
    const initials = parts.map(p => p[0]).join('');
    return initials.toUpperCase(); // 顯示每個單字首字母
  };
  const fallbackInitials = getAvatarFallback(user.name);
  const fallbackAvatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    fallbackInitials
  )}&background=E0E0E0&color=000000&size=100`;


  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarImage
              src={user.avatarUrl || fallbackAvatarUrl}
              alt={user.name || 'User Avatar'}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.onerror = null;
                target.src = fallbackAvatarUrl;
              }}
            />
            <AvatarFallback>{fallbackInitials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email} ({user.role})
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {user.role === 'admin' && (
          <DropdownMenuItem asChild>
            <Link href="/admin" className="flex items-center">
              <Shield className="mr-2 h-4 w-4" />
              Admin Panel
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link href="/settings" className="flex items-center">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout}>
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
