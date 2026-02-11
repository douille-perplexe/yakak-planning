import Link from "next/link";
import { Plus } from "lucide-react";

export function Fab({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="md:hidden fixed bottom-24 right-4 z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center active:scale-95 transition-transform"
    >
      <Plus className="h-6 w-6" />
    </Link>
  );
}
