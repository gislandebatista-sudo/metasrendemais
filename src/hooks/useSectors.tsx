import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useSectors() {
  const [sectors, setSectors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSectors = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Fetch distinct sectors from employees table
      const { data, error } = await supabase
        .from('employees')
        .select('sector')
        .order('sector');
      
      if (error) throw error;
      
      // Get unique sectors
      const uniqueSectors = [...new Set(data?.map(e => e.sector) || [])];
      setSectors(uniqueSectors);
    } catch (error) {
      console.error('Error fetching sectors:', error);
      setSectors([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSectors();
  }, [fetchSectors]);

  return { sectors, isLoading, refetch: fetchSectors };
}
