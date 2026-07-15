
CREATE TABLE public.annual_macro_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  name TEXT NOT NULL,
  responsible TEXT,
  deadline TEXT,
  weight NUMERIC(5,2) NOT NULL DEFAULT 0,
  progress INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'planejada',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  last_modified_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_annual_macro_goals_year_month ON public.annual_macro_goals(year, month);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.annual_macro_goals TO authenticated;
GRANT ALL ON public.annual_macro_goals TO service_role;

ALTER TABLE public.annual_macro_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view annual macro goals"
  ON public.annual_macro_goals FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can insert annual macro goals"
  ON public.annual_macro_goals FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update annual macro goals"
  ON public.annual_macro_goals FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete annual macro goals"
  ON public.annual_macro_goals FOR DELETE
  TO authenticated
  USING (public.is_admin());

CREATE TRIGGER update_annual_macro_goals_updated_at
  BEFORE UPDATE ON public.annual_macro_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_last_modified_by();
