"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GifResult } from "@/lib/giphy";
import { searchGifsAction, getTrendingGifsAction } from "@/app/actions/gif";

interface GifPickerProps {
  onSelect: (gif: GifResult) => void;
}

export function GifPicker({ onSelect }: GifPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState<GifResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadTrending = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const results = await getTrendingGifsAction();
      setGifs(results);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSearch = useCallback(async (q: string) => {
    setLoading(true);
    setError(false);
    try {
      const results = await searchGifsAction(q);
      setGifs(results);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load trending when popover opens
  useEffect(() => {
    if (open) {
      setQuery("");
      loadTrending();
    }
  }, [open, loadTrending]);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      loadTrending();
      return;
    }
    debounceRef.current = setTimeout(() => {
      loadSearch(query.trim());
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, open, loadTrending, loadSearch]);

  const handleSelect = (gif: GifResult) => {
    onSelect(gif);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 px-2 text-xs font-semibold">
          GIF
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2" align="end">
        <Input
          placeholder="Search GIFs..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="mb-2 h-8 text-sm"
          autoFocus
        />
        <ScrollArea className="max-h-72">
          {loading ? (
            <div className="grid grid-cols-3 gap-1">
              {Array.from({ length: 9 }).map((_, i) => (
                <div
                  key={i}
                  className="w-full h-16 rounded bg-muted animate-pulse"
                />
              ))}
            </div>
          ) : error ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Could not load GIFs. Try again.
            </p>
          ) : gifs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No GIFs found.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {gifs.map((gif) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={gif.id}
                  src={gif.preview_url}
                  alt={gif.title}
                  className="w-full h-16 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => handleSelect(gif)}
                  loading="lazy"
                />
              ))}
            </div>
          )}
        </ScrollArea>
        <p className="text-[10px] text-muted-foreground text-right mt-1">
          Powered by GIPHY
        </p>
      </PopoverContent>
    </Popover>
  );
}
