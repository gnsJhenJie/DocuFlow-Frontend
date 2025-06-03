import { Badge } from "@/components/ui/badge";
import type { ReviewStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

interface DocumentStatusBadgeProps {
  status: ReviewStatus;
}

export function DocumentStatusBadge({ status }: DocumentStatusBadgeProps) {
  const statusStyles: Record<ReviewStatus, string> = {
    draft: "bg-gray-100 text-gray-800 border-gray-300",
    pending_review: "bg-yellow-100 text-yellow-800 border-yellow-300",
    approved: "bg-green-100 text-green-800 border-green-300",
    rejected: "bg-red-100 text-red-800 border-red-300",
  };

  const statusText: Record<ReviewStatus, string> = {
    draft: "Draft",
    pending_review: "Pending Review",
    approved: "Approved",
    rejected: "Rejected",
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        "capitalize px-2 py-1 text-xs font-semibold",
        statusStyles[status],
      )}
    >
      {statusText[status]}
    </Badge>
  );
}
