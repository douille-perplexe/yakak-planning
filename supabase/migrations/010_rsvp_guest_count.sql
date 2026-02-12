ALTER TABLE public.rsvps ADD COLUMN guest_count integer NOT NULL DEFAULT 0 CHECK (guest_count >= 0 AND guest_count <= 10);
