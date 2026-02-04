import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ModificationInfo {
  modifierEmail: string | null;
  modifierName: string | null;
}

export function useModificationInfo(userId: string | undefined) {
  const [info, setInfo] = useState<ModificationInfo>({ modifierEmail: null, modifierName: null });
  const [isLoading, setIsLoading] = useState(false);

  const fetchModifierInfo = useCallback(async () => {
    if (!userId) {
      setInfo({ modifierEmail: null, modifierName: null });
      return;
    }

    try {
      setIsLoading(true);
      
      // Fetch from profiles table
      const { data, error } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('user_id', userId)
        .single();
      
      if (error) {
        console.error('Error fetching modifier info:', error);
        setInfo({ modifierEmail: null, modifierName: null });
        return;
      }
      
      setInfo({
        modifierEmail: data?.email || null,
        modifierName: data?.full_name || null,
      });
    } catch (error) {
      console.error('Error fetching modifier info:', error);
      setInfo({ modifierEmail: null, modifierName: null });
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchModifierInfo();
  }, [fetchModifierInfo]);

  return { ...info, isLoading };
}
