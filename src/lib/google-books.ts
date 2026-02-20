import type { ApiRecommendation } from "@/lib/types";

const BASE_URL = "https://www.googleapis.com/books/v1";

const SUBJECTS = [
  "fiction",
  "science",
  "history",
  "fantasy",
  "mystery",
  "romance",
  "thriller",
  "biography",
  "philosophy",
  "psychology",
  "adventure",
  "horror",
  "comedy",
  "manga",
  "self-help",
];

interface GoogleBook {
  id: string;
  volumeInfo: {
    title: string;
    description?: string;
    imageLinks?: { thumbnail?: string };
    averageRating?: number;
    infoLink?: string;
  };
}

interface GoogleBooksResponse {
  items?: GoogleBook[];
  totalItems: number;
}

function buildUrl(path: string, params: Record<string, string>): string {
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  const query = new URLSearchParams(params);
  if (apiKey) query.set("key", apiKey);
  return `${BASE_URL}${path}?${query.toString()}`;
}

export async function fetchRandomBooks(
  count: number = 3
): Promise<ApiRecommendation[]> {
  const subject = SUBJECTS[Math.floor(Math.random() * SUBJECTS.length)];
  const startIndex = Math.floor(Math.random() * 30);
  const url = buildUrl("/volumes", {
    q: `subject:${subject}`,
    startIndex: startIndex.toString(),
    maxResults: "20",
    orderBy: "relevance",
  });

  const res = await fetch(url, { next: { revalidate: 0 } });

  if (!res.ok) throw new Error(`Google Books fetchRandomBooks failed: ${res.status}`);

  const data: GoogleBooksResponse = await res.json();
  if (!data.items) return [];

  const shuffled = data.items.sort(() => Math.random() - 0.5).slice(0, count);

  return shuffled.map((b) => ({
    title: b.volumeInfo.title,
    description: b.volumeInfo.description?.slice(0, 300) ?? null,
    category: "Books" as const,
    image_url: b.volumeInfo.imageLinks?.thumbnail?.replace("http:", "https:") ?? null,
    external_url: b.volumeInfo.infoLink ?? `https://books.google.com/books?id=${b.id}`,
    source: "google_books" as const,
    source_id: `book-${b.id}`,
    rating: b.volumeInfo.averageRating,
  }));
}

export async function searchBooks(
  query: string
): Promise<ApiRecommendation[]> {
  const url = buildUrl("/volumes", {
    q: query,
    maxResults: "10",
  });

  const res = await fetch(url, { next: { revalidate: 0 } });

  if (!res.ok) throw new Error(`Google Books searchBooks failed: ${res.status}`);

  const data: GoogleBooksResponse = await res.json();
  if (!data.items) return [];

  return data.items.map((b) => ({
    title: b.volumeInfo.title,
    description: b.volumeInfo.description?.slice(0, 300) ?? null,
    category: "Books" as const,
    image_url: b.volumeInfo.imageLinks?.thumbnail?.replace("http:", "https:") ?? null,
    external_url: b.volumeInfo.infoLink ?? `https://books.google.com/books?id=${b.id}`,
    source: "google_books" as const,
    source_id: `book-${b.id}`,
    rating: b.volumeInfo.averageRating,
  }));
}
