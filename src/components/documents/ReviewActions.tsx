'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, XCircle, UserCheck2, MessageSquare } from 'lucide-react';

import type { User } from '@/lib/types';
import { apiClient } from '@/lib/apiClient';

import { on } from 'events';
import { set } from 'date-fns';

interface ReviewActionsProps {
  documentId: string;
  documentTitle: string;
  onReassign: () => void; // Optional reassign handler
  onApprove: () => void;
  onReject: (reason: string) => void;
  showReassign: boolean;
  showApprove: boolean;
  showReject: boolean;
}

export function ReviewActions({ documentId, documentTitle, onReassign, onApprove, onReject, showReassign, showApprove, showReject }: ReviewActionsProps) {
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
        const reviewers = await apiClient.getReviewers(); // 假設你有這個 API
        setPotentialReviewers(reviewers);
      } catch (error) {
        console.error('Error fetching reviewers:', error);
      } finally {
        setIsLoadingReviewers(false);
      }
    };

    fetchReviewers();
  }, []);

  const handleReassign = () => {
    console.log(`[ReviewActions] Reassigning document ${documentId}`);
    onReassign(newReviewerId);
    setShowReassignModal(false);
    toast({
      title: "Document Reassigned",
      description: `"${documentTitle}" has been reassigned.`,
      variant: "default", // Or success if preferred
    });
  };
  
  const handleApprove = () => {
    console.log(`[ReviewActions] Approving document ${documentId}`);
    onApprove();
    toast({
      title: "Document Approved",
      description: `"${documentTitle}" has been approved.`,
    });
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      toast({
        title: "Rejection Reason Required",
        description: "Please provide a reason for rejecting the document.",
        variant: "destructive",
      });
      return;
    }
    console.log(`[ReviewActions] Rejecting document ${documentId} with reason: ${rejectionReason}`);
    onReject(rejectionReason);
    setShowRejectModal(false);
    setRejectionReason(''); // Clear reason after submission
    toast({
      title: "Document Rejected",
      description: `"${documentTitle}" has been rejected.`,
      variant: "default", // Or destructive if preferred
    });
  };

  return (
    <>
      <div className="flex gap-4">
        {showReassign && (
          <Button className="bg-accent hover:bg-accent/90" onClick={() => setShowReassignModal(true)}>
            <UserCheck2 className="mr-2 h-4 w-4" /> Reassign
          </Button>
        )}
        {showApprove && (
          <Button onClick={handleApprove} className="bg-green-600 hover:bg-green-700 text-white">
            <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
          </Button>
        )}
        {showReject && (
          <Button variant="destructive" onClick={() => setShowRejectModal(true)}>
            <XCircle className="mr-2 h-4 w-4" /> Reject
          </Button>
        )}
      </div>

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
            <Button type="button" onClick={handleReject} variant="destructive">
                Submit Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showReassignModal} onOpenChange={setShowReassignModal}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Reassign Reviewer</DialogTitle>
            <DialogDescription>
              Change the assigned reviewer for document: "{documentTitle}".
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="newReviewer" className="text-right col-span-1">
                New Reviewer
              </Label>
              <div className="col-span-3">
                <Select value={newReviewerId} onValueChange={setNewReviewerId} disabled={isLoadingReviewers}>
                    <SelectTrigger id="newReviewer">
                    <SelectValue placeholder={isLoadingReviewers ? "Loading..." : "Select a reviewer"} />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingReviewers && <SelectItem value="loading" disabled>Loading reviewers...</SelectItem>}
                      {!isLoadingReviewers && potentialReviewers.length === 0 && <SelectItem value="no_reviewers" disabled>No eligible reviewers</SelectItem>}
                      {potentialReviewers.map(rev => (
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
            <Button type="button" onClick={handleReassign} variant="default" className="bg-accent hover:bg-accent/90">
                Reassign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
