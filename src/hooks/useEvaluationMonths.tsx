import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface EvaluationMonth {
  id: string;
  month: string; // Format: YYYY-MM
  status: 'active' | 'closed';
  openedAt: string;
  closedAt?: string;
}

export function useEvaluationMonths() {
  const [evaluationMonths, setEvaluationMonths] = useState<EvaluationMonth[]>([]);
  const [currentMonth, setCurrentMonth] = useState<string>(() => 
    format(new Date(), 'yyyy-MM')
  );
  const [isLoading, setIsLoading] = useState(true);
  const { user, isAdmin } = useAuth();

  // Fetch all evaluation months
  const fetchEvaluationMonths = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('evaluation_months')
        .select('*')
        .order('month', { ascending: false });

      if (error) throw error;

      setEvaluationMonths((data || []).map(m => ({
        id: m.id,
        month: m.month,
        status: m.status as 'active' | 'closed',
        openedAt: m.opened_at,
        closedAt: m.closed_at || undefined,
      })));
    } catch (error) {
      console.error('Error fetching evaluation months:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize a new month (creates zeroed progress for all active employees/goals)
  const initializeMonth = useCallback(async (month: string): Promise<boolean> => {
    if (!isAdmin) {
      toast.error('Sem permissão', {
        description: 'Apenas administradores podem inicializar novos meses.',
      });
      return false;
    }

    try {
      // Call the database function to initialize the month
      const { error } = await supabase.rpc('initialize_month', {
        target_month: month
      });

      if (error) throw error;

      await fetchEvaluationMonths();
      toast.success(`Mês ${formatMonthLabel(month)} inicializado com sucesso!`);
      return true;
    } catch (error) {
      console.error('Error initializing month:', error);
      toast.error('Erro ao inicializar mês');
      return false;
    }
  }, [isAdmin, fetchEvaluationMonths]);

  // Close a month (prevents further edits)
  const closeMonth = useCallback(async (month: string): Promise<boolean> => {
    if (!isAdmin) {
      toast.error('Sem permissão', {
        description: 'Apenas administradores podem fechar meses.',
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from('evaluation_months')
        .update({ 
          status: 'closed',
          closed_at: new Date().toISOString(),
          closed_by: user?.id
        })
        .eq('month', month);

      if (error) throw error;

      await fetchEvaluationMonths();
      toast.success(`Mês ${formatMonthLabel(month)} fechado com sucesso!`);
      return true;
    } catch (error) {
      console.error('Error closing month:', error);
      toast.error('Erro ao fechar mês');
      return false;
    }
  }, [isAdmin, user, fetchEvaluationMonths]);

  // Check if a month is editable
  const isMonthEditable = useCallback((month: string): boolean => {
    const evalMonth = evaluationMonths.find(m => m.month === month);
    // Month is editable if it exists and is active, or if it doesn't exist yet (can be initialized)
    return !evalMonth || evalMonth.status === 'active';
  }, [evaluationMonths]);

  // Auto-initialize current month if it doesn't exist
  useEffect(() => {
    if (user && !isLoading && isAdmin) {
      const monthExists = evaluationMonths.some(m => m.month === currentMonth);
      if (!monthExists && evaluationMonths.length > 0) {
        // Only auto-initialize if there are already some months (not first setup)
        initializeMonth(currentMonth);
      }
    }
  }, [user, isLoading, currentMonth, evaluationMonths, isAdmin, initializeMonth]);

  useEffect(() => {
    if (user) {
      fetchEvaluationMonths();
    }
  }, [user, fetchEvaluationMonths]);

  return {
    evaluationMonths,
    currentMonth,
    setCurrentMonth,
    isLoading,
    initializeMonth,
    closeMonth,
    isMonthEditable,
    fetchEvaluationMonths,
  };
}

// Helper function to format month label
export function formatMonthLabel(month: string): string {
  const [year, monthNum] = month.split('-');
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return `${monthNames[parseInt(monthNum, 10) - 1]} ${year}`;
}

// Generate available months for selection (current year + next year)
export function getAvailableMonths(): { value: string; label: string }[] {
  const months: { value: string; label: string }[] = [];
  const now = new Date();
  const currentYear = now.getFullYear();
  
  // Add months from last year, current year, and next year
  for (let year = currentYear - 1; year <= currentYear + 1; year++) {
    for (let month = 1; month <= 12; month++) {
      const value = `${year}-${String(month).padStart(2, '0')}`;
      months.push({
        value,
        label: formatMonthLabel(value),
      });
    }
  }
  
  return months;
}
