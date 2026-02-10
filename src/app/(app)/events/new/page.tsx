import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CreateEventForm } from "@/components/create-event-form";
import { getCategories } from "@/app/actions/categories";
import { ActivityCategory } from "@/lib/types";

export default async function NewEventPage() {
  const categories = (await getCategories()) as ActivityCategory[];

  return (
    <div className="space-y-6">
      <Link href="/">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </Link>

      <CreateEventForm categories={categories} />
    </div>
  );
}
