
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
    // If no user but not loading (meaning initial token check done), try fetching user.
    // This handles cases where token exists but user object wasn't immediately available.
    if (!user && !loading && localStorage.getItem('docuflow_jwt_token')) {
      fetchCurrentUser();
    }
  }, [user, loading, fetchCurrentUser]);


  if (loading) {
    return <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full"><Loader2 className="h-5 w-5 animate-spin" /></Button>;
  }

  if (!user) {
    return (
      <Link href="/login">
        <Button variant="outline">Login</Button>
      </Link>
    );
  }

  const getInitials = (name: string) => {
    if (!name) return '??';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-9 w-9">
            {/* Use a placeholder if avatarUrl is not present */}
            <AvatarImage src={user.avatarUrl || `https://placehold.co/100x100/E0E0E0/000000?text=${getInitials(user.name)}`} alt={user.name} data-ai-hint="user avatar" />
            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
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
        {/* Profile link can be re-enabled when /profile page exists */}
        {/* <DropdownMenuItem asChild>
          <Link href="/profile" className="flex items-center"> 
            <UserIcon className="mr-2 h-4 w-4" />
            Profile
          </Link>
        </DropdownMenuItem> */}
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
