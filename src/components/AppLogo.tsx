import { BookMarked } from "lucide-react";
import Link from "next/link";

export function AppLogo() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2 text-xl font-semibold text-primary"
    >
      <BookMarked className="h-7 w-7" />
      <span>DocuFlow</span>
    </Link>
  );
}
