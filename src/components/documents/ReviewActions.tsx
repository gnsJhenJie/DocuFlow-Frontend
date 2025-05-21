'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { CheckCircle2, XCircle, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ReviewActionsProps {
  documentId: string;
  documentTitle: string;
  onApprove: () => void;
  onReject: (reason: string) => void;
}

export function ReviewActions({ documentId, documentTitle, onApprove, onReject }: ReviewActionsProps) {
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const { toast } = useToast();

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
        <Button onClick={handleApprove} className="bg-green-600 hover:bg-green-700 text-white">
          <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
        </Button>
        <Button variant="destructive" onClick={() => setShowRejectModal(true)}>
          <XCircle className="mr-2 h-4 w-4" /> Reject
        </Button>
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
    </>
  );
}
