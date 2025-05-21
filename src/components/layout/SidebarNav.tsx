
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, FileText, Users, Settings, FilePlus, MailCheck, ShieldAlert, UploadCloud, Edit3, History, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton, SidebarGroup, SidebarGroupLabel } from '@/components/ui/sidebar';
import type { User } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from "@/components/ui/badge";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles?: User['role'][];
  subItems?: NavItem[];
  badgeCount?: number;
}

const navItems: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: Home, roles: ['viewer', 'editor', 'reviewer', 'admin'] },
  {
    href: '/documents',
    label: 'My Documents',
    icon: FileText,
    roles: ['editor', 'reviewer', 'admin'], // Added reviewer here so they can see their authored docs too
    subItems: [
      { href: '/documents/new', label: 'Create New', icon: FilePlus, roles: ['editor', 'admin'] },
    ]
  },
  { href: '/documents?view=pending_my_review', label: 'Pending My Review', icon: MailCheck, roles: ['reviewer', 'admin'], badgeCount: 2 }, // Example badge
  {
    href: '/admin',
    label: 'Admin Panel',
    icon: ShieldAlert,
    roles: ['admin'],
    subItems: [
      { href: '/admin/documents', label: 'All Documents', icon: UploadCloud, roles: ['admin'] },
      { href: '/admin/users', label: 'User Management', icon: Users, roles: ['admin'] }, // Placeholder
    ]
  },
  { href: '/settings', label: 'Settings', icon: Settings, roles: ['viewer', 'editor', 'reviewer', 'admin'] },
];

interface DocumentStatusNavItem {
  label: string;
  icon: React.ElementType;
  status: 'draft' | 'pending_review' | 'approved' | 'rejected';
  count: number;
  href: string;
}

const documentStatusNavItems: DocumentStatusNavItem[] = [
    { label: 'Drafts', icon: Edit3, status: 'draft', count: 5, href: '/documents?status=draft' },
    { label: 'Pending Review', icon: Clock, status: 'pending_review', count: 3, href: '/documents?status=pending_review' },
    { label: 'Approved', icon: CheckCircle2, status: 'approved', count: 12, href: '/documents?status=approved' },
    { label: 'Rejected', icon: XCircle, status: 'rejected', count: 2, href: '/documents?status=rejected' },
];


export function SidebarNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  if (!user) return null;

  const renderNavItem = (item: NavItem, isSubItem = false) => {
    if (item.roles && !item.roles.includes(user.role)) {
      return null;
    }

    // For precise active state, compare full href, especially for items with query params
    const isActive = item.subItems
        ? pathname.startsWith(item.href.split('?')[0]) // Base path for parent items
        : pathname === item.href.split('?')[0] && 
          (item.href.includes('?') ? new URLSearchParams(pathname.split('?')[1]).toString() === new URLSearchParams(item.href.split('?')[1]).toString() : true);


    const ButtonComponent = isSubItem ? SidebarMenuSubButton : SidebarMenuButton;
    const ItemComponent = isSubItem ? SidebarMenuSubItem : SidebarMenuItem;

    return (
      <ItemComponent key={item.href}>
        <Link href={item.href} passHref legacyBehavior>
          <ButtonComponent isActive={isActive} tooltip={item.label}>
            <item.icon className="h-5 w-5" />
            <span className="truncate">{item.label}</span>
            {item.badgeCount && item.badgeCount > 0 && (
              <Badge variant="secondary" className="ml-auto">{item.badgeCount}</Badge>
            )}
          </ButtonComponent>
        </Link>
        {item.subItems && isActive && ( // isActive check for expanding submenus
          <SidebarMenuSub>
            {item.subItems.map(subItem => renderNavItem(subItem, true))}
          </SidebarMenuSub>
        )}
      </ItemComponent>
    );
  };

  const renderDocumentStatusNavItem = (item: DocumentStatusNavItem) => {
    const currentParams = new URLSearchParams(pathname.split('?')[1]);
    const itemParams = new URLSearchParams(item.href.split('?')[1]);
    const isActive = pathname.startsWith(item.href.split('?')[0]) && currentParams.get('status') === itemParams.get('status') && !currentParams.get('view');


    return (
      <SidebarMenuItem key={item.href}>
        <Link href={item.href} passHref legacyBehavior>
          <SidebarMenuButton isActive={isActive} tooltip={item.label}>
            <item.icon className="h-5 w-5" />
            <span className="truncate">{item.label}</span>
            {item.count > 0 && (
              <Badge variant="outline" className="ml-auto">{item.count}</Badge>
            )}
          </SidebarMenuButton>
        </Link>
      </SidebarMenuItem>
    );
  };


  return (
    <div className="flex flex-col h-full">
      <SidebarMenu className="flex-1">
        {navItems.map(item => renderNavItem(item))}
      </SidebarMenu>
      { (user.role === 'editor' || user.role === 'admin' || user.role === 'reviewer') && ( // Reviewers might also want to see status filters
        <>
          <SidebarGroup className="mt-auto">
            <SidebarGroupLabel>Document Statuses</SidebarGroupLabel>
              <SidebarMenu>
                {documentStatusNavItems.map(renderDocumentStatusNavItem)}
              </SidebarMenu>
          </SidebarGroup>
        </>
      )}
    </div>
  );
}
