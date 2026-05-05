CREATE INDEX IF NOT EXISTS idx_goals_employee_id ON public.goals(employee_id);
CREATE INDEX IF NOT EXISTS idx_gmp_goal_id ON public.goal_monthly_progress(goal_id);
CREATE INDEX IF NOT EXISTS idx_gmp_month ON public.goal_monthly_progress(month);
CREATE INDEX IF NOT EXISTS idx_gmp_month_deleted ON public.goal_monthly_progress(month, is_deleted);
CREATE INDEX IF NOT EXISTS idx_emb_employee_month ON public.employee_monthly_bonus(employee_id, month);
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON public.employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON public.employees(status);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_months_month ON public.evaluation_months(month);