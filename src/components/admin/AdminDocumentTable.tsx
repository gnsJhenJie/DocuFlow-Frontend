"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Document, User } from "@/lib/types";
import {
  MoreHorizontal,
  Eye,
  UserCheck2,
  History,
  Trash2,
  Loader2,
} from "lucide-react";
import { DocumentStatusBadge } from "@/components/documents/DocumentStatusBadge";
import { format, formatDistanceToNow, set } from "date-fns";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/apiClient"; // Import apiClient
import { useRouter } from "next/navigation"; // Import useRouter
import { se } from "date-fns/locale";

interface AdminDocumentTableProps {
  documents: Document[];
  onReassignReviewer: (
    documentId: string,
    newReviewerId: string,
  ) => Promise<void>;
  onViewHistory: (documentId: string) => void;
  onDocumentsChanged: () => void; // 新增這個 prop，告訴父元件名單有更新
  isLoading?: boolean;
}

export function AdminDocumentTable({
  documents,
  onReassignReviewer,
  onViewHistory,
  onDocumentsChanged,
  isLoading,
}: AdminDocumentTableProps) {
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(
    null,
  );
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [newReviewerId, setNewReviewerId] = useState<string>("");
  const [potentialReviewers, setPotentialReviewers] = useState<User[]>([]);
  const [isLoadingReviewers, setIsLoadingReviewers] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const fetchReviewersForModal = async () => {
    if (!showReassignModal) return; // Only fetch if modal is to be shown
    setIsLoadingReviewers(true);
    try {
      const fetchedReviewers = await apiClient.getReviewers();
      // Filter out the document's current author from the list of potential new reviewers
      setPotentialReviewers(
        fetchedReviewers.filter(
          (rev) => rev.id !== selectedDocument?.author_id,
        ),
      );
    } catch (error: any) {
      toast({
        title: "Error fetching reviewers",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoadingReviewers(false);
    }
  };

  // Fetch reviewers when the reassign modal is about to open
  useEffect(() => {
    if (showReassignModal && selectedDocument) {
      fetchReviewersForModal();
    }
  }, [showReassignModal, selectedDocument]);

  const handleOpenReassignModal = (doc: Document) => {
    setSelectedDocument(doc);
    setNewReviewerId(doc.reviewer_id || ""); // Pre-select current reviewer if any
    setShowReassignModal(true);
  };

  const handleOpenDeleteModal = (docId: string, docTitle: string) => {
    setSelectedDocument({ id: docId, title: docTitle } as Document); // Cast to Document type
    setShowDeleteModal(true);
  };

  const handleConfirmReassign = async () => {
    if (selectedDocument && newReviewerId) {
      await onReassignReviewer(selectedDocument.id, newReviewerId); // newReviewerId is string here
      setShowReassignModal(false);
      setSelectedDocument(null);
    } else {
      toast({
        title: "Selection Error",
        description: "Please select a new reviewer.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteDocument = async () => {
    // if(window.confirm(`Are you sure you want to delete document: "${docTitle}"? This action cannot be undone.`)) {
    setShowDeleteModal(false);
    try {
      await apiClient.deleteDocument(selectedDocument?.id || "");
      toast({
        title: "Document Deleted",
        description: `"${selectedDocument?.title}" has been successfully deleted.`,
        variant: "default",
      });
      onDocumentsChanged();
    } catch (error: any) {
      // alert(`Error Deleting Document: ${error.message}`);
      console.error("Error deleting document:", error);
      toast({
        title: "Error Deleting Document",
        description:
          error.message || "An error occurred while deleting the document.",
        variant: "destructive",
      });
    }
    // }
  };

  if (isLoading && documents.length === 0) {
    // Initial loading skeleton
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {[...Array(7)].map((_, i) => (
                <TableHead key={i}>
                  <Skeleton className="h-5 w-24" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                {[...Array(7)].map((_, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <>
      <Card className="shadow-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>Reviewer</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((doc) => (
              <TableRow key={doc.id} className={isLoading ? "opacity-50" : ""}>
                <TableCell className="font-medium">
                  <Link
                    href={`/documents/view?id=${doc.id}`}
                    className="hover:text-primary hover:underline"
                  >
                    {doc.title}
                  </Link>
                </TableCell>
                <TableCell>
                  <DocumentStatusBadge status={doc.status} />
                </TableCell>
                <TableCell>{doc.author_name}</TableCell>
                <TableCell>{doc.reviewer_name || "N/A"}</TableCell>
                <TableCell>
                  {isClient ? (
                    formatDistanceToNow(new Date(doc.updated_at), {
                      addSuffix: true,
                    })
                  ) : (
                    <Skeleton className="h-4 w-24" />
                  )}
                </TableCell>
                <TableCell>
                  {isClient ? (
                    doc.submitted_at ? (
                      format(new Date(doc.submitted_at), "PPP p")
                    ) : (
                      "N/A"
                    )
                  ) : (
                    <Skeleton className="h-4 w-20" />
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        disabled={isLoading}
                      >
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem asChild>
                        <Link
                          href={`/documents/view?id=${doc.id}`}
                          className="flex items-center"
                        >
                          <Eye className="mr-2 h-4 w-4" /> View Document
                        </Link>
                      </DropdownMenuItem>
                      {(doc.status === "pending_review" ||
                        doc.status === "draft" ||
                        doc.status === "rejected") && (
                        <DropdownMenuItem
                          onClick={() => handleOpenReassignModal(doc)}
                        >
                          <UserCheck2 className="mr-2 h-4 w-4" /> Reassign
                          Reviewer
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => onViewHistory(doc.id)}>
                        <History className="mr-2 h-4 w-4" /> View History
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleOpenDeleteModal(doc.id, doc.title)}
                        className="text-destructive focus:text-destructive focus:bg-destructive/10"
                        //  disabled={(doc.status === 'pending_review')} // Per API spec: Admin can delete any draft. Authors also.
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete Document
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={showReassignModal} onOpenChange={setShowReassignModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Reassign Reviewer</DialogTitle>
            <DialogDescription>
              Change the assigned reviewer for document: "
              {selectedDocument?.title}".
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="newReviewer" className="text-right col-span-1">
                New Reviewer
              </Label>
              <div className="col-span-3">
                <Select
                  value={newReviewerId}
                  onValueChange={setNewReviewerId}
                  disabled={isLoadingReviewers}
                >
                  <SelectTrigger id="newReviewer">
                    <SelectValue
                      placeholder={
                        isLoadingReviewers ? "Loading..." : "Select a reviewer"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingReviewers && (
                      <SelectItem value="loading" disabled>
                        Loading reviewers...
                      </SelectItem>
                    )}
                    {!isLoadingReviewers && potentialReviewers.length === 0 && (
                      <SelectItem value="no_reviewers" disabled>
                        No eligible reviewers
                      </SelectItem>
                    )}
                    {potentialReviewers.map((rev) => (
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
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              onClick={handleConfirmReassign}
              disabled={isLoadingReviewers || !newReviewerId}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              Deleting Document: {selectedDocument?.title}
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this document?
              <br />
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              onClick={handleDeleteDocument}
              variant="destructive"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Dummy Card component (already exists in project, removed definition here)
// const Card: React.FC<{ className?: string, children: React.ReactNode }> = ({ className, children }) => (
//   <div className={`bg-card rounded-lg border shadow-sm ${className}`}>
//     {children}
//   </div>
// );
