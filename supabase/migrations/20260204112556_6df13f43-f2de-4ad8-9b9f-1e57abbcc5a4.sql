-- Add last_modified_by column to employees table
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS last_modified_by UUID REFERENCES auth.users(id);

-- Add last_modified_by column to goals table  
ALTER TABLE public.goals 
ADD COLUMN IF NOT EXISTS last_modified_by UUID REFERENCES auth.users(id);

-- Create function to auto-update last_modified_by
CREATE OR REPLACE FUNCTION public.update_last_modified_by()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.last_modified_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers for employees
DROP TRIGGER IF EXISTS update_employees_modified ON public.employees;
CREATE TRIGGER update_employees_modified
BEFORE UPDATE ON public.employees
FOR EACH ROW
EXECUTE FUNCTION public.update_last_modified_by();

-- Create triggers for goals
DROP TRIGGER IF EXISTS update_goals_modified ON public.goals;
CREATE TRIGGER update_goals_modified
BEFORE UPDATE ON public.goals
FOR EACH ROW
EXECUTE FUNCTION public.update_last_modified_by();