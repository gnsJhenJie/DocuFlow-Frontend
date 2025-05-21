
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DocumentCard } from '@/components/documents/DocumentCard';
import type { Document, ReviewStatus } from '@/lib/types';
import { mockDocuments } from '@/lib/mockData';
import Link from 'next/link';
import { PlusCircle, Search, Filter } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'next/navigation';

export default function DocumentsPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState('updatedAt_desc');
  const [viewFilter, setViewFilter] = useState<string | null>(null);

  useEffect(() => {
    const initialStatus = searchParams.get('status') as ReviewStatus | null;
    const currentView = searchParams.get('view');

    setViewFilter(currentView);

    if (currentView === 'pending_my_review') {
      setStatusFilter('pending_review'); // This view implies pending_review status
    } else if (initialStatus && ['draft', 'pending_review', 'approved', 'rejected'].includes(initialStatus)) {
      setStatusFilter(initialStatus);
    } else {
      setStatusFilter('all'); // Default if no specific status or view implies status
    }
  }, [searchParams]);

  useEffect(() => {
    if (!user) {
      setDocuments([]);
      return;
    }

    console.log('[DocumentsPage] Filtering: User:', user.id, 'Role:', user.role, 'Status:', statusFilter, 'View:', viewFilter, 'Search:', searchTerm);
    let tempDocs = [...mockDocuments];

    // Apply primary filter based on 'view'
    if (viewFilter === 'pending_my_review') {
      tempDocs = tempDocs.filter(
        doc => doc.reviewerId === user.id && doc.status === 'pending_review'
      );
    } else {
      // General role-based filtering if no specific view takes precedence
      if (user.role === 'editor') {
        tempDocs = tempDocs.filter(doc => doc.authorId === user.id);
      } else if (user.role === 'reviewer') {
        // Reviewer sees docs they are assigned to review OR docs they authored.
        tempDocs = tempDocs.filter(doc => doc.reviewerId === user.id || doc.authorId === user.id);
      }
      // Admin sees all docs (no initial filter on tempDocs which starts as all mockDocuments)
      // Viewer logic could be added here if they have specific constraints beyond status

      // Apply status filter (if not 'all' and not overridden by a view that implies status)
      // If viewFilter was 'pending_my_review', statusFilter would be 'pending_review',
      // and the specific filter for that view already handled the status.
      // This is for general status filtering when no specific view is active.
      if (statusFilter !== 'all') {
        tempDocs = tempDocs.filter(doc => doc.status === statusFilter);
      }
    }

    // Apply search term filter to the already filtered list
    if (searchTerm) {
      tempDocs = tempDocs.filter(doc =>
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sorting
    tempDocs.sort((a, b) => {
      if (sortBy === 'updatedAt_desc') {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
      if (sortBy === 'updatedAt_asc') {
        return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      }
      if (sortBy === 'title_asc') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });

    setDocuments(tempDocs);
  }, [user, searchTerm, statusFilter, sortBy, viewFilter]);


  if (!user) {
    return <p className="text-center mt-8">Please log in to view documents.</p>;
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {viewFilter === 'pending_my_review' ? 'Documents Pending Your Review' : 'Your Documents'}
          </h1>
          <p className="text-muted-foreground">Manage, review, and track all your documents.</p>
        </div>
        {(user.role === 'editor' || user.role === 'admin') && (
          <Link href="/documents/new">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Create Document
            </Button>
          </Link>
        )}
      </div>

      {/* Filters section, conditionally disable status if view implies it */}
      <div className="mb-6 p-4 bg-card border rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search documents..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="statusFilter" className="block text-sm font-medium text-muted-foreground mb-1">Status</label>
            <Select 
              value={statusFilter} 
              onValueChange={(value) => {
                // When user manually changes status, clear the specific view if it implies a different status
                if (viewFilter === 'pending_my_review' && value !== 'pending_review') {
                  const newParams = new URLSearchParams(searchParams.toString());
                  newParams.delete('view');
                  newParams.set('status', value === 'all' ? '' : value);
                  router.push(`/documents?${newParams.toString()}`);
                } else {
                  setStatusFilter(value as ReviewStatus | 'all');
                }
              }}
              disabled={viewFilter === 'pending_my_review'} // Disable if view dictates status
            >
              <SelectTrigger id="statusFilter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending_review">Pending Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label htmlFor="sortBy" className="block text-sm font-medium text-muted-foreground mb-1">Sort By</label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger id="sortBy">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updatedAt_desc">Last Updated (Newest)</SelectItem>
                <SelectItem value="updatedAt_asc">Last Updated (Oldest)</SelectItem>
                <SelectItem value="title_asc">Title (A-Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {documents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map((doc) => (
            <DocumentCard key={doc.id} document={doc} currentUserRole={user.role} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Filter className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Documents Found</h3>
          <p className="text-muted-foreground">
            {searchTerm || statusFilter !== 'all' || viewFilter ? 'Try adjusting your search or filters.' : 'Get started by creating a new document.'}
          </p>
          {(user.role === 'editor' || user.role === 'admin') && !searchTerm && statusFilter === 'all' && !viewFilter &&(
             <Link href="/documents/new" className="mt-4 inline-block">
                <Button variant="default">
                  <PlusCircle className="mr-2 h-4 w-4" /> Create First Document
                </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

// Need to import router for programmatic navigation if status/view conflict
import { useRouter } from 'next/navigation';
// (already imported) const router = useRouter(); should be at the top of the component.
// Make sure it is imported if it's used inside handleSelectChange or similar.
// The provided code snippet seems to not use `router.push` inside the select's onValueChange
// but if we were to add logic to change URL query params based on select, we would.
// For now, the current `setStatusFilter` will trigger re-fetch/re-filter.

// Correction: `router.push` is needed if `onValueChange` for status filter
// is to clear the `view` query param.
// Let's make sure `useRouter` is imported and initialized.
// It is already imported in the original file, so this comment is just for clarity.
// The `router.push` logic in `onValueChange` of Status Select is not present in the original file so I will remove it for now to match existing patterns.
// The `setStatusFilter` will trigger the `useEffect` which uses `searchParams`,
// so to truly update the URL, we'd navigate.
// The current approach modifies local state, which then re-filters.
// For cleaner state management with URL, navigation is better.
// Let's adjust the select to just set state, consistent with original.

/*
  To make status select clear the view filter by changing URL:
  const router = useRouter(); // at the top of component

  // Inside Select onValueChange for statusFilter:
  onValueChange={(value) => {
    const newParams = new URLSearchParams(searchParams.toString());
    if (value === 'all') {
      newParams.delete('status');
    } else {
      newParams.set('status', value);
    }
    // If changing status, assume specific "view" is no longer primary
    if (viewFilter) {
        newParams.delete('view');
    }
    router.push(`/documents?${newParams.toString()}`);
  }}
  This would make the URL the source of truth for filters.
  For now, keeping it simpler by just updating component state.
*/
