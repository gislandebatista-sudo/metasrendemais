-- Create checklist items table for goal observations
CREATE TABLE public.goal_checklist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.goal_checklist_items ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can view checklist items"
ON public.goal_checklist_items FOR SELECT
USING (is_admin());

CREATE POLICY "Admins can insert checklist items"
ON public.goal_checklist_items FOR INSERT
WITH CHECK (is_admin());

CREATE POLICY "Admins can update checklist items"
ON public.goal_checklist_items FOR UPDATE
USING (is_admin());

CREATE POLICY "Admins can delete checklist items"
ON public.goal_checklist_items FOR DELETE
USING (is_admin());

-- Create index for faster lookups
CREATE INDEX idx_checklist_items_goal_id ON public.goal_checklist_items(goal_id);