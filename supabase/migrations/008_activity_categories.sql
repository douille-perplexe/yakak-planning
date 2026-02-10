-- ============================================================
-- 008: Activity Categories, Event Categories & Estimated Cost
-- ============================================================

-- 1.1 Activity categories table
CREATE TABLE public.activity_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE CHECK (char_length(name) BETWEEN 1 AND 50),
  icon text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT '',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX activity_categories_position_idx ON public.activity_categories(position);

ALTER TABLE public.activity_categories ENABLE ROW LEVEL SECURITY;

-- SELECT: all approved members
CREATE POLICY "Approved members can view categories"
  ON public.activity_categories FOR SELECT
  USING (public.is_approved_member());

-- INSERT: admins only
CREATE POLICY "Admins can create categories"
  ON public.activity_categories FOR INSERT
  WITH CHECK (public.is_admin());

-- UPDATE: admins only
CREATE POLICY "Admins can update categories"
  ON public.activity_categories FOR UPDATE
  USING (public.is_admin());

-- DELETE: admins only
CREATE POLICY "Admins can delete categories"
  ON public.activity_categories FOR DELETE
  USING (public.is_admin());

-- 1.2 Event categories junction table (many-to-many)
CREATE TABLE public.event_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.activity_categories(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, category_id)
);

CREATE INDEX event_categories_event_idx ON public.event_categories(event_id);
CREATE INDEX event_categories_category_idx ON public.event_categories(category_id);

ALTER TABLE public.event_categories ENABLE ROW LEVEL SECURITY;

-- SELECT: all approved members
CREATE POLICY "Approved members can view event categories"
  ON public.event_categories FOR SELECT
  USING (public.is_approved_member());

-- INSERT: event creator or admin
CREATE POLICY "Event creator or admin can add event categories"
  ON public.event_categories FOR INSERT
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id
        AND e.created_by = public.current_profile_id()
    )
  );

-- DELETE: event creator or admin
CREATE POLICY "Event creator or admin can remove event categories"
  ON public.event_categories FOR DELETE
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id
        AND e.created_by = public.current_profile_id()
    )
  );

-- 1.3 Add estimated_cost to events
ALTER TABLE public.events ADD COLUMN estimated_cost numeric(10,2) DEFAULT NULL;

-- 1.5 Seed default categories
INSERT INTO public.activity_categories (name, icon, color, position) VALUES
  ('Sports',       'dumbbell',    'orange',  0),
  ('Culture',      'palette',     'purple',  1),
  ('Social',       'users',       'blue',    2),
  ('Outdoor',      'trees',       'green',   3),
  ('Learning',     'book-open',   'yellow',  4),
  ('Relaxation',   'coffee',      'sky',     5),
  ('Food & Drink', 'utensils',    'red',     6),
  ('Travel',       'plane',       'indigo',  7),
  ('Nightlife',    'moon',        'violet',  8),
  ('Wellness',     'heart-pulse', 'pink',    9);
