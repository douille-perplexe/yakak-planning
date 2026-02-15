ALTER TABLE public.events
  ADD COLUMN duration_minutes integer NOT NULL DEFAULT 120
  CHECK (duration_minutes >= 15 AND duration_minutes <= 1440);
