"use client";

import { useState } from "react";
import { Plus, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  submitUserRecommendation,
  searchApiRecommendations,
} from "@/app/actions/recommendations";
import type { RecommendationCategory, ApiRecommendation } from "@/lib/types";

const ALL_CATEGORIES: RecommendationCategory[] = [
  "Movies",
  "TV Series",
  "Anime",
  "Games",
  "Music",
  "Books",
  "Outings",
  "Restaurants",
  "Activities",
  "Podcasts",
  "Other",
];

const SEARCHABLE_CATEGORIES: RecommendationCategory[] = [
  "Movies",
  "TV Series",
  "Anime",
  "Games",
  "Music",
  "Books",
];

export function SubmitRecommendationForm() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"manual" | "search">("manual");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Manual form state
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<RecommendationCategory>("Movies");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCategory, setSearchCategory] = useState<RecommendationCategory>("Movies");
  const [searchResults, setSearchResults] = useState<ApiRecommendation[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedResult, setSelectedResult] = useState<ApiRecommendation | null>(null);
  const [note, setNote] = useState("");

  const resetForm = () => {
    setTitle("");
    setCategory("Movies");
    setDescription("");
    setUrl("");
    setSearchQuery("");
    setSearchResults([]);
    setSelectedResult(null);
    setNote("");
    setError(null);
    setTab("manual");
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || searching) return;
    setSearching(true);
    setSelectedResult(null);
    const { results, error: err } = await searchApiRecommendations(
      searchQuery,
      searchCategory
    );
    if (err) setError(err);
    else setSearchResults(results);
    setSearching(false);
  };

  const handleSubmitManual = async () => {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    setLoading(true);
    setError(null);

    const result = await submitUserRecommendation({
      title,
      description: description || undefined,
      category,
      external_url: url || undefined,
    });

    if (!result.success) {
      setError(result.error ?? "Failed to submit");
    } else {
      setOpen(false);
      resetForm();
    }
    setLoading(false);
  };

  const handleSubmitFromSearch = async () => {
    if (!selectedResult) return;
    setLoading(true);
    setError(null);

    const result = await submitUserRecommendation({
      title: selectedResult.title,
      description: note || selectedResult.description || undefined,
      category: selectedResult.category,
      external_url: selectedResult.external_url || undefined,
      image_url: selectedResult.image_url || undefined,
      source: selectedResult.source,
      source_id: selectedResult.source_id,
    });

    if (!result.success) {
      setError(result.error ?? "Failed to submit");
    } else {
      setOpen(false);
      resetForm();
    }
    setLoading(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Recommend Something
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share a Recommendation</DialogTitle>
        </DialogHeader>

        {/* Tab switcher */}
        <div className="flex gap-2 border-b pb-2">
          <button
            className={`text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${
              tab === "manual"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setTab("manual")}
          >
            Manual Entry
          </button>
          <button
            className={`text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${
              tab === "search"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setTab("search")}
          >
            Search APIs
          </button>
        </div>

        {tab === "manual" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rec-title">Title *</Label>
              <Input
                id="rec-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Inception, Zelda, ..."
              />
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as RecommendationCategory)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rec-desc">Description</Label>
              <Textarea
                id="rec-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Why do you recommend this?"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rec-url">Link (optional)</Label>
              <Input
                id="rec-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button
              onClick={handleSubmitManual}
              disabled={loading}
              className="w-full"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Submit Recommendation
            </Button>
          </div>
        )}

        {tab === "search" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={searchCategory}
                onValueChange={(v) =>
                  setSearchCategory(v as RecommendationCategory)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEARCHABLE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button
                variant="outline"
                onClick={handleSearch}
                disabled={searching}
              >
                {searching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>

            {searchResults.length > 0 && !selectedResult && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {searchResults.map((r, i) => (
                  <button
                    key={`${r.source_id}-${i}`}
                    className="flex items-start gap-3 w-full text-left p-2 rounded-md hover:bg-muted transition-colors"
                    onClick={() => setSelectedResult(r)}
                  >
                    {r.image_url && (
                      <img
                        src={r.image_url}
                        alt=""
                        className="w-10 h-14 object-cover rounded"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{r.title}</p>
                      {r.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {r.description}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {selectedResult && (
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  {selectedResult.image_url && (
                    <img
                      src={selectedResult.image_url}
                      alt=""
                      className="w-12 h-16 object-cover rounded"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">
                      {selectedResult.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedResult.category} · {selectedResult.source}
                    </p>
                  </div>
                  <button
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setSelectedResult(null)}
                  >
                    Change
                  </button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rec-note">Add a note (optional)</Label>
                  <Textarea
                    id="rec-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Why do you recommend this?"
                    rows={2}
                  />
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <Button
                  onClick={handleSubmitFromSearch}
                  disabled={loading}
                  className="w-full"
                >
                  {loading && (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  )}
                  Submit Recommendation
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
