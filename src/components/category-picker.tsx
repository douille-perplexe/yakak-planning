"use client";

import { Badge } from "@/components/ui/badge";
import { ActivityCategory } from "@/lib/types";
import { getCategoryIcon, getCategoryColorClass } from "@/lib/category-utils";

interface CategoryPickerProps {
  categories: ActivityCategory[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function CategoryPicker({
  categories,
  selectedIds,
  onChange,
}: CategoryPickerProps) {
  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((s) => s !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((cat) => {
        const selected = selectedIds.includes(cat.id);
        const Icon = getCategoryIcon(cat.icon);
        return (
          <button key={cat.id} type="button" onClick={() => toggle(cat.id)}>
            <Badge
              variant={selected ? "default" : "outline"}
              className={
                selected
                  ? getCategoryColorClass(cat.color) + " border cursor-pointer"
                  : "cursor-pointer"
              }
            >
              <Icon className="h-3 w-3" />
              {cat.name}
            </Badge>
          </button>
        );
      })}
    </div>
  );
}
