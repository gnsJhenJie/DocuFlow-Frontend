
'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation'; // Added useSearchParams
import { Home, FileText, Users, Settings, FilePlus, MailCheck, ShieldAlert, UploadCloud, Edit3, History, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton, SidebarGroup, SidebarGroupLabel } from '@/components/ui/sidebar';
import type { User } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from 'react'; // Added useEffect, useState
import { apiClient } from '@/lib/apiClient'; // Added apiClient

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles?: User['role'][];
  subItems?: NavItem[];
  badgeCountKey?: 'pendingReviewCount' | 'draftCount' | 'approvedCount' | 'rejectedCount'; // Key to get badge count from dynamicCounts
}

interface DynamicCounts {
  pendingReviewCount: number;
  draftCount: number;
  approvedCount: number;
  rejectedCount: number;
  pendingMyReviewCount: number;
}

// Define base navigation items
const navItemsBase: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: Home, roles: ['viewer', 'editor', 'reviewer', 'admin'] },
  {
    href: '/documents',
    label: 'My Documents', // This will implicitly filter by author for editor/reviewer if no other filter
    icon: FileText,
    roles: ['editor', 'reviewer', 'admin'],
    subItems: [
      { href: '/documents/new', label: 'Create New', icon: FilePlus, roles: ['editor', 'admin'] },
    ]
  },
  { href: '/documents?view=pending_my_review', label: 'Pending My Review', icon: MailCheck, roles: ['reviewer', 'admin'], badgeCountKey: 'pendingMyReviewCount' },
  {
    href: '/admin',
    label: 'Admin Panel',
    icon: ShieldAlert,
    roles: ['admin'],
    subItems: [
      { href: '/admin', label: 'All Documents', icon: UploadCloud, roles: ['admin'] },
      { href: '/admin/users', label: 'User Management', icon: Users, roles: ['admin'] },
    ]
  },
  // Settings link to be added at the end, outside of status-based groups
];

// Document status navigation items (dynamic counts)
interface DocumentStatusNavItem {
  label: string;
  icon: React.ElementType;
  status: 'draft' | 'pending_review' | 'approved' | 'rejected';
  countKey: keyof DynamicCounts; // Reference to a key in DynamicCounts state
  href: string;
}

const documentStatusNavItemsConfig: DocumentStatusNavItem[] = [
    { label: 'Drafts', icon: Edit3, status: 'draft', countKey: 'draftCount', href: '/documents?status=draft' },
    { label: 'Pending Review', icon: Clock, status: 'pending_review', countKey: 'pendingReviewCount', href: '/documents?status=pending_review' },
    { label: 'Approved', icon: CheckCircle2, status: 'approved', countKey: 'approvedCount', href: '/documents?status=approved' },
    { label: 'Rejected', icon: XCircle, status: 'rejected', countKey: 'rejectedCount', href: '/documents?status=rejected' },
];


export function SidebarNav() {
  const pathname = usePathname();
  const currentSearchParams = useSearchParams(); // For more precise active state checking
  const { user, loading: authLoading } = useAuth();
  const [dynamicCounts, setDynamicCounts] = useState<DynamicCounts>({
    pendingReviewCount: 0,
    draftCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    pendingMyReviewCount: 0,
  });
  const [loadingCounts, setLoadingCounts] = useState(true);

  useEffect(() => {
    const fetchCounts = async () => {
      if (!user || authLoading) return;
      setLoadingCounts(true);
      try {
        // Fetch counts for different statuses. Backend might need specific endpoints for this.
        // For now, fetching all documents for the user and calculating client-side.
        // This is NOT ideal for performance with many documents.
        // Admin sees all, editor/reviewer sees their relevant docs.
        
        let baseParams = new URLSearchParams();
        if (user.role === 'editor') baseParams.set('authorId', user.id);
        // For reviewer, default view is complex, let's simplify: "Pending My Review" is separate.
        // Other status counts for reviewer will be for *their authored* documents.
        if (user.role === 'reviewer') baseParams.set('authorId', user.id); 
        // Admin sees all, no base filter needed unless specified by the nav item itself.

        const statusesToFetch: ReviewStatus[] = ['draft', 'pending_review', 'approved', 'rejected'];
        const counts: Partial<DynamicCounts> = {};

        for (const status of statusesToFetch) {
          const queryParams = new URLSearchParams(baseParams);
          queryParams.set('status', status);
          queryParams.set('limit', '1'); // We only need to know if there's at least one, or total count from backend.
                                          // For a real count, backend should provide it or fetch all.
                                          // Mocking with 'getDocuments' which returns paginated.
          const response = await apiClient.getDocuments(queryParams);
          // This is still an approximation using totalPages * limit or actual count if small
          // A proper backend API would provide these counts directly.
          // For simplicity, let's assume the 'documents' array length from a potentially wider query is the count
          // This needs a backend API for accurate counts.
          // Placeholder: Use a larger limit to get a better count estimate
          const statusParams = new URLSearchParams(baseParams);
          statusParams.set('status', status);
          statusParams.set('limit', '999'); // Try to get all for count
          const statusData = await apiClient.getDocuments(statusParams);
          let countKey: keyof DynamicCounts;
          if (status === 'pending_review') {
            countKey = 'pendingReviewCount';
          } else {
            countKey = `${status}Count` as keyof DynamicCounts;
          }
          counts[countKey] = statusData.documents.length;
          }
        
        // Pending My Review count (specific for reviewer/admin)
        if (user.role === 'reviewer' || user.role === 'admin') {
            const pendingMyReviewParams = new URLSearchParams();
            pendingMyReviewParams.set('view', 'pending_my_review');
            if (user.role === 'reviewer') pendingMyReviewParams.set('reviewerId', user.id); // Backend should handle this if view=pending_my_review
            pendingMyReviewParams.set('limit', '999');
            const pendingMyReviewData = await apiClient.getDocuments(pendingMyReviewParams);
            counts['pendingMyReviewCount'] = pendingMyReviewData.documents.length;
        }


        setDynamicCounts(prev => ({ ...prev, ...counts as DynamicCounts }));

      } catch (error) {
        console.error("Failed to fetch dynamic counts for sidebar:", error);
      } finally {
        setLoadingCounts(false);
      }
    };

    if (user && !authLoading) {
      fetchCounts();
    } else if (!authLoading && !user) {
      setLoadingCounts(false);
    }
  }, [user, authLoading]);


  if (authLoading || !user) {
    return ( // Show skeleton or loading state if auth is happening or no user
        <SidebarMenu className="flex-1 p-2">
            {[...Array(5)].map((_, i) => (
                <SidebarMenuItem key={i}>
                    <SidebarMenuButton disabled className="justify-start">
                        <Loader2 className="h-5 w-5 animate-spin mr-2"/> 
                        <span className="bg-muted h-4 w-2/3 rounded animate-pulse"></span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            ))}
        </SidebarMenu>
    );
  }

  const renderNavItem = (item: NavItem, isSubItem = false) => {
    if (item.roles && !item.roles.includes(user.role)) {
      return null;
    }

    const baseItemPath = item.href.split('?')[0];
    const currentBasePath = pathname.split('?')[0];
    
    let isActive = false;
    if (item.href === '/') { // Dashboard specific check
        isActive = currentBasePath === '/' && currentSearchParams.toString() === '';
    } else if (item.subItems && item.subItems.length > 0) {
      isActive = currentBasePath === baseItemPath || currentBasePath.startsWith(baseItemPath + '/');
    } else {
      isActive = currentBasePath === baseItemPath;
      if (isActive && item.href.includes('?')) {
        const itemParams = new URLSearchParams(item.href.split('?')[1]);
        isActive = true; 
        itemParams.forEach((value, key) => {
          if (currentSearchParams.get(key) !== value) {
            isActive = false;
          }
        });
        // Ensure no extra params on current for exact match unless item.href implies it
        if(isActive) {
            let extraParamsExist = false;
            currentSearchParams.forEach((val, key) => {
                if (!itemParams.has(key)) extraParamsExist = true;
            });
            if (extraParamsExist && item.href.split('?')[1] !== currentSearchParams.toString()) {
                // isActive = false; // This can be too strict. Let's be a bit lenient for now.
                // Consider if the item href params are a SUBSET of current params
            }
        }
      }
    }

    const ButtonComponent = isSubItem ? SidebarMenuSubButton : SidebarMenuButton;
    const ItemComponent = isSubItem ? SidebarMenuSubItem : SidebarMenuItem;
    const showSubMenu = item.subItems && item.subItems.length > 0 && (currentBasePath === baseItemPath || currentBasePath.startsWith(baseItemPath + '/'));
    const badgeCount = item.badgeCountKey ? dynamicCounts[item.badgeCountKey] : undefined;

    return (
      <ItemComponent key={item.href}>
        <Link href={item.href} passHref legacyBehavior>
          <ButtonComponent isActive={isActive} tooltip={item.label}>
            <item.icon className="h-5 w-5" />
            <span className="truncate">{item.label}</span>
            {loadingCounts && item.badgeCountKey ? (
                <Loader2 className="ml-auto h-4 w-4 animate-spin" />
            ) : badgeCount !== undefined && badgeCount > 0 ? (
              <Badge variant="secondary" className="ml-auto">{badgeCount}</Badge>
            ) : null}
          </ButtonComponent>
        </Link>
        {showSubMenu && ( 
          <SidebarMenuSub>
            {item.subItems.map(subItem => renderNavItem(subItem, true))}
          </SidebarMenuSub>
        )}
      </ItemComponent>
    );
  };

  const renderDocumentStatusNavItem = (item: DocumentStatusNavItem) => {
    const itemParams = new URLSearchParams(item.href.split('?')[1]);
    const isActive = pathname.startsWith(item.href.split('?')[0]) && 
                     currentSearchParams.get('status') === itemParams.get('status') && 
                     !currentSearchParams.get('view'); // Ensure not active if a 'view' param is present

    const count = dynamicCounts[item.countKey];

    return (
      <SidebarMenuItem key={item.href}>
        <Link href={item.href} passHref legacyBehavior>
          <SidebarMenuButton isActive={isActive} tooltip={item.label}>
            <item.icon className="h-5 w-5" />
            <span className="truncate">{item.label}</span>
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

  // Combine base nav items with settings
  const allNavItems = [
    ...navItemsBase,
    { href: '/settings', label: 'Settings', icon: Settings, roles: ['viewer', 'editor', 'reviewer', 'admin'] }
  ];

  return (
    <div className="flex flex-col h-full">
      <SidebarMenu className="flex-1">
        {allNavItems.map(item => renderNavItem(item))}
      </SidebarMenu>
      { (user.role === 'editor' || user.role === 'admin' || user.role === 'reviewer') && (
        <>
          <SidebarGroup className="mt-auto">
            <SidebarGroupLabel>Document Statuses</SidebarGroupLabel>
              <SidebarMenu>
                {documentStatusNavItemsConfig.map(renderDocumentStatusNavItem)}
              </SidebarMenu>
          </SidebarGroup>
        </>
      )}
    </div>
  );
}
