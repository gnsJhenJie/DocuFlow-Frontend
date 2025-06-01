// src/components/documents/ReviewActions.tsx
'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckCircle2, XCircle, UserCheck2 } from 'lucide-react';

import type { User } from '@/lib/types';
import { apiClient } from '@/lib/apiClient';

interface ReviewActionsProps {
  documentId: string;
  documentTitle: string;
  currentUserId: string;
  currentReviewerId: string | null;
  onReassign: (newReviewerId: string) => void;
  onApprove: () => void;
  onReject: (reason: string) => void;
  showReassign: boolean;
  showApprove: boolean;
  showReject: boolean;
}

export function ReviewActions({
  documentId,
  documentTitle,
  currentUserId,
  currentReviewerId,
  onReassign,
  onApprove,
  onReject,
  showReassign,
  showApprove,
  showReject,
}: ReviewActionsProps) {
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [newReviewerId, setNewReviewerId] = useState<string>('');
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [isLoadingReviewers, setIsLoadingReviewers] = useState<boolean>(false);
  const [potentialReviewers, setPotentialReviewers] = useState<User[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const fetchReviewers = async () => {
      setIsLoadingReviewers(true);
      try {
        const data: User[] = await apiClient.getReviewers();
        let filtered = data;
        filtered = filtered.filter((r) => Number(r.id) !== Number(currentUserId));
        if (currentReviewerId) {
          filtered = filtered.filter((r) => Number(r.id) !== Number(currentReviewerId));
        }
        setPotentialReviewers(filtered);
      } catch (error) {
        console.error('Error fetching reviewers:', error);
      } finally {
        setIsLoadingReviewers(false);
      }
    };

    fetchReviewers();
  }, [currentUserId, currentReviewerId]);

  const handleReassignClick = () => {
    if (!newReviewerId) {
      toast({
        title: 'Reviewer Required',
        description: 'Please select a new reviewer before reassigning.',
        variant: 'destructive',
      });
      return;
    }
    console.log(`[ReviewActions] Reassigning document ${documentId} to user ${newReviewerId}`);
    onReassign(newReviewerId);
    setShowReassignModal(false);
    toast({
      title: 'Document Reassigned',
      description: `"${documentTitle}" has been reassigned.`,
      variant: 'default',
    });
  };

  const handleApproveClick = () => {
    console.log(`[ReviewActions] Approving document ${documentId}`);
    onApprove();
    toast({
      title: 'Document Approved',
      description: `"${documentTitle}" has been approved.`,
    });
  };

  const handleRejectClick = () => {
    if (!rejectionReason.trim()) {
      toast({
        title: 'Rejection Reason Required',
        description: 'Please provide a reason for rejecting the document.',
        variant: 'destructive',
      });
      return;
    }
    console.log(`[ReviewActions] Rejecting document ${documentId} with reason: ${rejectionReason}`);
    onReject(rejectionReason);
    setShowRejectModal(false);
    setRejectionReason('');
    toast({
      title: 'Document Rejected',
      description: `"${documentTitle}" has been rejected.`,
      variant: 'default',
    });
  };

  return (
    <>
      {/* —— 操作按鈕 (Reassign / Approve / Reject) —— */}
      <div className="flex gap-4">
        {showReassign && (
          <Button
            className="bg-accent hover:bg-accent/90"
            onClick={() => setShowReassignModal(true)}
          >
            <UserCheck2 className="mr-2 h-4 w-4" /> Reassign
          </Button>
        )}
        {showApprove && (
          <Button
            onClick={handleApproveClick}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
          </Button>
        )}
        {showReject && (
          <Button
            variant="destructive"
            onClick={() => setShowRejectModal(true)}
          >
            <XCircle className="mr-2 h-4 w-4" /> Reject
          </Button>
        )}
      </div>

      {/* —— Reject Modal —— */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Reject Document: {documentTitle}</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this document. This feedback will be sent to the author.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Textarea
              id="rejectionReason"
              placeholder="Enter rejection reason here..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="button" onClick={handleRejectClick} variant="destructive">
              Submit Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* —— Reassign Modal —— */}
      <Dialog open={showReassignModal} onOpenChange={setShowReassignModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Reassign Reviewer</DialogTitle>
            <DialogDescription>
              Change the assigned reviewer for document: "{documentTitle}".
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="newReviewer" className="text-center pl-2">
                New Reviewer
              </Label>
              <div className="col-span-3">
                <Select
                  value={newReviewerId}
                  onValueChange={setNewReviewerId}
                  disabled={isLoadingReviewers}
                >
                  <SelectTrigger
                    id="newReviewer"
                    className="w-full justify-between px-2 rounded-md border-gray-300 bg-white text-left"
                  >
                    <SelectValue
                      placeholder={isLoadingReviewers ? 'Loading…' : 'Select a reviewer'}
                      className="text-left pl-2"
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingReviewers && (
                      <SelectItem value="loading" disabled>
                        Loading reviewers…
                      </SelectItem>
                    )}
                    {!isLoadingReviewers && potentialReviewers.length === 0 && (
                      <SelectItem value="none" disabled>
                        No eligible reviewers
                      </SelectItem>
                    )}
                    {!isLoadingReviewers && potentialReviewers.map((rev) => (
                      <SelectItem key={rev.id} value={rev.id}>
                        {rev.name} ({rev.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              type="button"
              onClick={handleReassignClick}
              variant="default"
              className="bg-accent hover:bg-accent/90"
            >
              Reassign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
