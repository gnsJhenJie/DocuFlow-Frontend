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

  if (user.role === 'viewer') {
    return (
      <p className="text-center mt-8 text-red-600">
        You do not have permission to create documents.
      </p>
    );
  }

  const handleSubmit = async (
    data: any,
    action: 'save_draft' | 'submit_for_review'
  ) => {
    // Build the payload
    const payload: any = {
      ...data,
      action, // 'save_draft' or 'submit_for_review'
    };

    // Convert reviewerId if it's a string
    if (payload.reviewerId && typeof payload.reviewerId === 'string') {
      const n = parseInt(payload.reviewerId, 10);
      if (isNaN(n)) {
        toast({
          title: 'Invalid Reviewer',
          description: 'Reviewer ID must be a number.',
          variant: 'destructive',
        });
        return;
      }
      payload.reviewerId = n;
    }

    // Only require reviewerId when submitting for review
    if (action === 'submit_for_review' && !payload.reviewerId) {
      toast({
        title: 'Reviewer Required',
        description: 'Please select a reviewer before submitting for review.',
        variant: 'destructive',
      });
      return;
    }

    // If saving draft and no reviewer was chosen, drop the field entirely
    if (action === 'save_draft' && !payload.reviewerId) {
      delete payload.reviewerId;
    }

    try {
      console.log('[NewDocumentPage] Submitting to API:', payload);
      const newDocument = await apiClient.createDocument(payload);

      toast({
        title: action === 'save_draft' ? 'Draft Saved' : 'Submitted',
        description: `"${newDocument.title}" has been successfully ${
          action === 'save_draft' ? 'saved as a draft' : 'submitted for review'
        }.`,
      });

      // After creating a draft, go to the edit screen so you can continue
      router.push(`/documents/view?id=${newDocument.id}`)
    } catch (error: any) {
      console.error(
        `[NewDocumentPage] Error ${
          action === 'save_draft' ? 'saving draft' : 'submitting document'
        }:`,
        error
      );
      toast({
        title: 'Error',
        description:
          error.message ||
          `Failed to ${action === 'save_draft' ? 'save draft' : 'submit document'}.`,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 md:px-0">
      <DocumentForm
        currentUser={user}
        onSubmit={handleSubmit}
        onCancel={() => router.push('/documents')}
        formMode="create"
      />
    </div>
  );
}
