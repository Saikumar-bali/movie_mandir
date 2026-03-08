import { supabase } from './SupabaseClient';

const SDUIService = {
    /**
     * Fetches the current UI layout from the database.
     */
    getLayout: async () => {
        try {
            const { data, error } = await supabase
                .from('app_config')
                .select('layout')
                .eq('id', 1)
                .single();

            if (error) throw error;
            return data?.layout || [];
        } catch (error) {
            console.error('[SDUIService] Error fetching layout:', error);
            return [];
        }
    },

    /**
     * Subscribes to real-time changes in the layout.
     * @param {function} callback - Function to call with new layout
     */
    subscribeToLayout: (callback) => {
        const subscription = supabase
            .channel('app_config_changes')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'app_config',
                    filter: 'id=eq.1'
                },
                (payload) => {
                    console.log('[SDUIService] Layout updated:', payload);
                    if (payload.new && payload.new.layout) {
                        callback(payload.new.layout);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }
};

export default SDUIService;
