"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { ActivityCategory } from "@/lib/types";
import {
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/app/actions/categories";
import {
  getCategoryIcon,
  getCategoryColorClass,
} from "@/lib/category-utils";

interface CategoryManagerProps {
  categories: ActivityCategory[];
}

export function CategoryManager({ categories }: CategoryManagerProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingCategory, setEditingCategory] =
    useState<ActivityCategory | null>(null);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async (formData: FormData) => {
    if (loading) return;
    setLoading(true);
    setError(null);
    const result = await createCategory({
      name: formData.get("name") as string,
      icon: (formData.get("icon") as string) || "",
      color: (formData.get("color") as string) || "",
    });
    if (!result.success) {
      setError(result.error ?? "Failed to create category");
    } else {
      setAddOpen(false);
    }
    setLoading(false);
  };

  const handleEdit = async (formData: FormData) => {
    if (!editingCategory || loading) return;
    setLoading(true);
    setError(null);
    const result = await updateCategory(editingCategory.id, {
      name: formData.get("name") as string,
      icon: (formData.get("icon") as string) || "",
      color: (formData.get("color") as string) || "",
    });
    if (!result.success) {
      setError(result.error ?? "Failed to update category");
    } else {
      setEditOpen(false);
      setEditingCategory(null);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (deletingId) return;
    if (!confirm("Delete this category? Events using it will lose this tag."))
      return;
    setDeletingId(id);
    await deleteCategory(id);
    setDeletingId(null);
  };

  const openEdit = (cat: ActivityCategory) => {
    setEditingCategory(cat);
    setError(null);
    setEditOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Activity Categories</span>
          <Dialog
            open={addOpen}
            onOpenChange={(open) => {
              setAddOpen(open);
              if (!open) setError(null);
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Category</DialogTitle>
              </DialogHeader>
              <form action={handleAdd} className="space-y-4">
                <div>
                  <Label htmlFor="add-name">Name</Label>
                  <Input
                    id="add-name"
                    name="name"
                    maxLength={50}
                    required
                    placeholder="e.g., Gaming"
                  />
                </div>
                <div>
                  <Label htmlFor="add-icon">
                    Icon (lucide name, e.g. &quot;dumbbell&quot;)
                  </Label>
                  <Input
                    id="add-icon"
                    name="icon"
                    placeholder="e.g., gamepad-2"
                  />
                </div>
                <div>
                  <Label htmlFor="add-color">
                    Color (tailwind, e.g. &quot;blue&quot;)
                  </Label>
                  <Input
                    id="add-color"
                    name="color"
                    placeholder="e.g., blue"
                  />
                </div>
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding...</> : "Add Category"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No categories yet.
          </p>
        ) : (
          <div className="space-y-2">
            {categories.map((cat) => {
              const Icon = getCategoryIcon(cat.icon);
              return (
                <div
                  key={cat.id}
                  className="flex items-center justify-between py-2"
                >
                  <Badge
                    className={getCategoryColorClass(cat.color) + " border"}
                  >
                    <Icon className="h-3 w-3" />
                    {cat.name}
                  </Badge>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => openEdit(cat)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => handleDelete(cat.id)}
                      disabled={deletingId === cat.id}
                    >
                      {deletingId === cat.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Edit dialog */}
        <Dialog
          open={editOpen}
          onOpenChange={(open) => {
            setEditOpen(open);
            if (!open) {
              setEditingCategory(null);
              setError(null);
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Category</DialogTitle>
            </DialogHeader>
            {editingCategory && (
              <form action={handleEdit} className="space-y-4">
                <div>
                  <Label htmlFor="edit-name">Name</Label>
                  <Input
                    id="edit-name"
                    name="name"
                    maxLength={50}
                    required
                    defaultValue={editingCategory.name}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-icon">Icon</Label>
                  <Input
                    id="edit-icon"
                    name="icon"
                    defaultValue={editingCategory.icon}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-color">Color</Label>
                  <Input
                    id="edit-color"
                    name="color"
                    defaultValue={editingCategory.color}
                  />
                </div>
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Save Changes"}
                </Button>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
