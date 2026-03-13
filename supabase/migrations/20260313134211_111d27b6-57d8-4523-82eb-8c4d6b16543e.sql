
-- Table for goal score criteria (composition of percentages)
CREATE TABLE public.goal_score_criteria (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_monthly_progress_id UUID NOT NULL REFERENCES public.goal_monthly_progress(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  value NUMERIC NOT NULL DEFAULT 0,
  max_value NUMERIC,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.goal_score_criteria ENABLE ROW LEVEL SECURITY;

-- Admin full CRUD
CREATE POLICY "Admins can select criteria" ON public.goal_score_criteria FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "Admins can insert criteria" ON public.goal_score_criteria FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admins can update criteria" ON public.goal_score_criteria FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Admins can delete criteria" ON public.goal_score_criteria FOR DELETE TO authenticated USING (is_admin());

-- Colaboradores can view criteria for their own goals in published months
CREATE POLICY "Colaboradores can view own criteria" ON public.goal_score_criteria FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM goal_monthly_progress gmp
    JOIN goals g ON g.id = gmp.goal_id
    JOIN employees e ON e.id = g.employee_id
    WHERE gmp.id = goal_score_criteria.goal_monthly_progress_id
      AND e.user_id = auth.uid()
      AND is_month_published(gmp.month)
  )
);

-- Index for fast lookups
CREATE INDEX idx_goal_score_criteria_progress_id ON public.goal_score_criteria(goal_monthly_progress_id);
