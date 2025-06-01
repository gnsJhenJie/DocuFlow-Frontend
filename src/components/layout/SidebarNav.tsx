'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  Home,
  FileText,
  Users,
  Settings,
  MailCheck,
  ShieldAlert,
  Files,
  Edit3,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
} from 'lucide-react';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarGroup,
  SidebarGroupLabel,
} from '@/components/ui/sidebar';
import type { User } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/apiClient';
import { clearAllModuleContexts } from 'next/dist/server/lib/render-server';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles?: User['role'][];
  badgeCountKey?: keyof DynamicCounts;
  subItems?: NavItem[];
}

interface DynamicCounts {
  pendingReviewCount: number;
  draftCount: number;
  approvedCount: number;
  rejectedCount: number;
  pendingMyReviewCount: number;
  myDocumentsCount: number;
  allDocumentsCount: number;
}

const navItemsBase: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: Home, roles: ['viewer', 'editor', 'reviewer', 'admin'] },
  { href: '/documents', label: 'Documents', icon: Files, roles: ['viewer', 'editor', 'reviewer', 'admin'], badgeCountKey: 'allDocumentsCount' },
  { href: '/documents?view=my_documents', label: 'My Documents', icon: FileText, roles: ['editor', 'reviewer', 'admin'], badgeCountKey: 'myDocumentsCount' },
  { href: '/documents?view=pending_my_review', label: 'Pending My Review', icon: MailCheck, roles: ['reviewer', 'admin'], badgeCountKey: 'pendingMyReviewCount' },
  {
    href: '/admin',
    label: 'Admin Panel',
    icon: ShieldAlert,
    roles: ['admin'],
    subItems: [
      { href: '/admin', label: 'All Documents', icon: Files, roles: ['admin'] },
      { href: '/admin/users', label: 'User Management', icon: Users, roles: ['admin'] },
    ]
  },
];

const cachedCounts: Record<string, DynamicCounts> = {};

export function SidebarNav() {
  const pathname = usePathname();
  const currentSearchParams = useSearchParams();
  const searchParamsString = currentSearchParams.toString();
  const { user, loading: authLoading } = useAuth();
  const [dynamicCounts, setDynamicCounts] = useState<DynamicCounts>({
    pendingReviewCount: 0,
    draftCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    pendingMyReviewCount: 0,
    myDocumentsCount: 0,
    allDocumentsCount: 0,
  });
  const [loadingCounts, setLoadingCounts] = useState(true);
  const firstLoadRef = useRef(true);

  useEffect(() => {
    const fetchCounts = async () => {
      if (!user || authLoading) return;
      setLoadingCounts(true);

      try {
        const params = new URLSearchParams({ limit: '999' });
        const { documents: allDocs } = await apiClient.getDocuments(params);

        const counts: DynamicCounts = {
          draftCount: 0,
          pendingReviewCount: 0,
          approvedCount: 0,
          rejectedCount: 0,
          pendingMyReviewCount: 0,
          myDocumentsCount: 0,
          allDocumentsCount: allDocs.length,
        };

        for (const doc of allDocs) {
          if (doc.status === 'draft') counts.draftCount++;
          if (doc.status === 'pending_review') counts.pendingReviewCount++;
          if (doc.status === 'approved') counts.approvedCount++;
          if (doc.status === 'rejected') counts.rejectedCount++;
          if (doc.reviewer_id === Number(user.id) && doc.status === 'pending_review') counts.pendingMyReviewCount++;
          if (doc.author_id === Number(user.id)) counts.myDocumentsCount++;
        }

        setDynamicCounts(counts);
      } catch (err) {
        console.error('Sidebar counts fetch error:', err);
      } finally {
        setLoadingCounts(false);
      }
    };

    if (user && !authLoading) fetchCounts();
  }, [user, authLoading, pathname, searchParamsString]);


  const renderNavItem = (item: NavItem) => {
    if (item.roles && !item.roles.includes(user.role)) return null;
    const [baseItemPath, itemQueryString] = item.href.split('?');
    const currentBasePath = pathname.split('?')[0];
    const currentQueryString = currentSearchParams.toString();
    let isActive = false;

    if (baseItemPath === '/') {
      isActive = currentBasePath === '/' && currentQueryString === '';
    } else {
      if (currentBasePath === baseItemPath) {
        if (itemQueryString) {
          const itemParams = new URLSearchParams(itemQueryString);
          let allMatch = true;
          itemParams.forEach((val, key) => {
            if (currentSearchParams.get(key) !== val) {
              allMatch = false;
            }
          });
          isActive = allMatch;
        } else {
          if (baseItemPath === '/documents') {
            isActive = (currentQueryString === '');
          } else {
            isActive = true;
          }
        }
      }
    }
      

    const badge = item.badgeCountKey ? dynamicCounts[item.badgeCountKey] : undefined;

    const renderSubItems = item.subItems?.length ? (
      <SidebarMenuSub>
        {item.subItems.map((sub) => renderNavItem(sub))}
      </SidebarMenuSub>
    ) : null;

    return (
      <SidebarMenuItem key={item.href}>
        <Link href={item.href} passHref legacyBehavior>
          <SidebarMenuButton isActive={isActive} tooltip={item.label}>
            {React.createElement(item.icon, { className: 'h-5 w-5' })}
            <span className="truncate">{item.label}</span>
            {loadingCounts && item.badgeCountKey ? (
              <Loader2 className="ml-auto h-4 w-4 animate-spin" />
            ) : badge ? (
              <Badge variant="secondary" className="ml-auto">{badge}</Badge>
            ) : null}
          </SidebarMenuButton>
        </Link>
        {renderSubItems}
      </SidebarMenuItem>
    );
  };

  const renderStatusItem = (label: string, icon: React.ElementType, status: keyof DynamicCounts, href: string) => {
    const params = new URLSearchParams(href.split('?')[1]);
    const isActive = pathname.startsWith(href.split('?')[0]) && currentSearchParams.get('status') === params.get('status') && !currentSearchParams.get('view');
    const count = dynamicCounts[status];

    return (
      <SidebarMenuItem key={href}>
        <Link href={href} passHref legacyBehavior>
          <SidebarMenuButton isActive={isActive} tooltip={label}>
            {React.createElement(icon, { className: 'h-5 w-5' })}
            <span className="truncate">{label}</span>
            {loadingCounts ? (
              <Loader2 className="ml-auto h-4 w-4 animate-spin" />
            ) : count > 0 ? (
              <Badge variant="outline" className="ml-auto">{count}</Badge>
            ) : null}
          </SidebarMenuButton>
        </Link>
      </SidebarMenuItem>
    );
  };

  const statusItems = [
    ['Drafts', Edit3, 'draftCount', '/documents?status=draft'],
    ['Pending Review', Clock, 'pendingReviewCount', '/documents?status=pending_review'],
    ['Approved', CheckCircle2, 'approvedCount', '/documents?status=approved'],
    ['Rejected', XCircle, 'rejectedCount', '/documents?status=rejected'],
  ] as const;

  return (
    <div className="flex flex-col h-full">
      <SidebarMenu className="flex-1">
        {navItemsBase.map((item) => renderNavItem(item))}
      </SidebarMenu>
      {(user.role === 'editor' || user.role === 'reviewer' || user.role === 'admin') && (
        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel>Document Statuses</SidebarGroupLabel>
          <SidebarMenu>
            {statusItems.map(([label, icon, key, href]) =>
              renderStatusItem(label, icon, key, href)
            )}
          </SidebarMenu>
        </SidebarGroup>
      )}
    </div>
  );
}
