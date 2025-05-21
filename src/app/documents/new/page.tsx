
'use client';

import { DocumentForm } from '@/components/documents/DocumentForm';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/apiClient';
import type { User } from '@/lib/types';

export default function NewDocumentPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  if (!user) {
    return <p className="text-center mt-8">Please log in to create a document.</p>;
  }

  if (user.role !== 'editor' && user.role !== 'admin') {
     return <p className="text-center mt-8 text-red-600">You do not have permission to create documents.</p>;
  }

  const handleSubmit = async (data: any, action: 'save_draft' | 'submit_for_review') => {
    // API expects 'save_draft' or 'submit_for_review'
    const payload = {
      ...data,
      action: action, // Ensure action is part of the payload for the backend
    };
    // API expects reviewerId to be a number if present
    if (payload.reviewerId && typeof payload.reviewerId === 'string') {
        payload.reviewerId = parseInt(payload.reviewerId, 10);
        if (isNaN(payload.reviewerId)) {
            toast({ title: "Invalid Reviewer", description: "Reviewer ID is not valid.", variant: "destructive" });
            return;
        }
    }


    try {
      console.log('[NewDocumentPage] Submitting to API:', payload);
      const newDocument = await apiClient.createDocument(payload);
      toast({
        title: `Document ${action === 'save_draft' ? 'Draft Saved' : 'Submitted'}`,
        description: `"${newDocument.title}" has been successfully ${action === 'save_draft' ? 'saved as a draft' : 'submitted for review'}.`,
      });
      router.push(`/documents/${newDocument.id}`);
    } catch (error: any) {
      console.error(`[NewDocumentPage] Error ${action === 'save_draft' ? 'saving draft' : 'submitting document'}:`, error);
      toast({
        title: `Error`,
        description: error.message || `Failed to ${action === 'save_draft' ? 'save draft' : 'submit document'}.`,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 md:px-0">
      {/* Pass user as currentUser, and ensure onSubmit handles the two distinct actions */}
      <DocumentForm 
        currentUser={user} 
        onSubmit={handleSubmit} 
        onCancel={() => router.push('/documents')} 
        formMode="create"
      />
    </div>
  );
}
