import { supabase } from '../supabase'

export class AuthService {
  static async initAnonymousSession(): Promise<boolean> {
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session) return true;

    const { error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
    return true;
  }

  static async getKisekiId(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('kiseki_users')
        .select('kiseki_id')
        .eq('id', user.id)
        .single();

      if (data && data.kiseki_id) return data.kiseki_id;

      // Generate new ID if not exists
      const newId = 'KSK-' + Math.random().toString(36).substring(2, 6).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
      const { error: insertError } = await supabase
        .from('kiseki_users')
        .insert({ id: user.id, kiseki_id: newId });

      if (insertError) throw insertError;
      return newId;
    } catch (e) {
      console.error('Failed to get or create Kiseki ID', e);
      return null;
    }
  }

  static async pingPresence(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      await supabase
        .from('kiseki_users')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', user.id);
    } catch (e) {
      console.error('Failed to ping presence', e);
    }
  }
}