
'use client'; // Ensure this is a client component

import { useState, useEffect } from 'react'; // Import hooks
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/apiClient';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Document, User } from '@/lib/types';
import { FileText, Edit3, Eye, ShieldCheck, Trash2, UserCheck2, MessageSquareWarning } from 'lucide-react';
import { DocumentStatusBadge } from './DocumentStatusBadge';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton
import { toast } from '@/hooks/use-toast';

interface DocumentCardProps {
  document: Document;
  // currentUserRole: 'admin' | 'editor' | 'reviewer' | 'viewer'; // To control actions
  currentUser: User;
}

export function DocumentCard({ document, currentUser }: DocumentCardProps) {
  const [isClient, setIsClient] = useState(false); // State for client-side rendering

  useEffect(() => {
    setIsClient(true); // Set to true after component mounts
  }, []);

  const isAuthor = document.author_id === Number(currentUser.id);
  const isReviewer = document.reviewer_id === Number(currentUser.id);
  const isAdmin = currentUser.role === 'admin';

  const canEdit = 
    isAdmin
      ? (document.status === 'approved' ||
         (isAuthor && ['draft', 'rejected'].includes(document.status)))
      : (['editor', 'reviewer'].includes(currentUser.role) &&
         isAuthor &&
         ['draft', 'rejected'].includes(document.status)
        );
  
  const canReview = (isReviewer || isAdmin) && document.status === 'pending_review';
  const canDelete =
    isAdmin
      ? (document.status === 'approved' ||
         (isAuthor && ['draft', 'rejected'].includes(document.status)))
      : (['editor', 'reviewer'].includes(currentUser.role) &&
         isAuthor &&
         ['draft', 'rejected'].includes(document.status));

  // const canReassign = currentUser.role === 'admin' && document.status === 'pending_review';

  const router = useRouter();
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) return;
    try {
      await apiClient.deleteDocument(document.id);
      toast({
        title: 'Document Deleted',
        description: `"${document.title}" has been successfully deleted.`,
        variant: 'success',
      });
      window.location.reload();
    } catch (err: any) {
      alert(`Error Deleting Document: ${err.message}`);
    }
  };

  return (
    <Card className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-lg">
      {document.image_url && (
        <div className="relative h-48 w-full">
          <Image 
            src={document.image_url} 
            alt={document.title} 
            layout="fill" 
            objectFit="cover" 
            data-ai-hint="document preview"
          />
        </div>
      )}
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg leading-tight hover:text-primary transition-colors">
            <Link href={`/documents/view?id=${document.id}`}>{document.title}</Link>
          </CardTitle>
          <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0 ml-2" />
        </div>
        <CardDescription className="text-xs">
          By {document.author_name} &bull; Last updated: {' '}
          {isClient ? formatDistanceToNow(new Date(document.updated_at), { addSuffix: true }) : <Skeleton className="h-3 w-24 inline-block" />}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow pb-3">
        <p className="text-sm text-muted-foreground line-clamp-3">
          {document.content}
        </p>
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pt-2 border-t">
        <DocumentStatusBadge status={document.status} />
        <div className="flex gap-2 mt-2 sm:mt-0">
          <Link href={`/documents/view?id=${document.id}`} passHref>
            <Button variant="outline" size="sm">
              <Eye className="mr-1.5 h-3.5 w-3.5" /> View
            </Button>
          </Link>
          {canEdit && (
            <Link href={`/documents/view?id=${document.id}&edit=true`} passHref>
              <Button variant="secondary" size="sm">
                <Edit3 className="mr-1.5 h-3.5 w-3.5" /> Edit
              </Button>
            </Link>
          )}
          {canReview && isReviewer && (
             <Link href={`/documents/view?id=${document.id}&review=true&tab=reviewActions`} passHref>
              <Button variant="default" size="sm" className="bg-accent hover:bg-accent/90">
                <ShieldCheck className="mr-1.5 h-3.5 w-3.5" /> Review
              </Button>
            </Link>
          )}
          {canReview && !isReviewer && isAdmin && (
             <Link href={`/documents/view?id=${document.id}&review=true&tab=reviewActions`} passHref>
              <Button size="sm" className="bg-accent hover:bg-accent/90">
                <UserCheck2 className="mr-0.2 h-3.5 w-3.5" /> Reassign
              </Button>
            </Link>
          )}
          {canDelete && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
            >
              <Trash2 className="mr-0.2 h-4 w-4"/>
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
