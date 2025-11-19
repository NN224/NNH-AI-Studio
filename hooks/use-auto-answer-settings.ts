import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useAutoAnswerSettings(locationId?: string) {
  const [settings, setSettings] = useState<any>({
    enabled: false,
    confidence_threshold: 80,
    answer_hours_questions: true,
    answer_location_questions: true,
    answer_services_questions: true,
    answer_pricing_questions: false,
    answer_general_questions: true,
    tone: 'professional',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    }
    init();
  }, []);

  useEffect(() => {
    async function fetchSettings() {
      if (!userId) return;
      
      setIsLoading(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('auto_reply_settings')
          .select('*')
          .eq('user_id', userId)
          .eq('location_id', locationId || '')
          .single();
          
        if (error) throw error;
        
        if (data) {
          setSettings(data);
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    if (userId) {
      fetchSettings();
    }
  }, [userId, locationId]);

  const updateSettings = async (updates: Partial<any>) => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('auto_reply_settings')
        .update(updates)
        .eq('user_id', userId)
        .eq('location_id', locationId || '');
        
      if (error) throw error;
      
      setSettings((prevSettings: any) => ({ ...prevSettings, ...updates }));
    } catch (error) {
      console.error('Failed to update settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return { settings, updateSettings, isLoading };
}
