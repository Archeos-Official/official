import { supabase } from './supabaseClient';

const getUserId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
};

const getUserEmail = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.email || null;
};

export const projectsApi = {
    list: async (order = '-created_at', limit = 100) => {
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .order(order.startsWith('-') ? order.slice(1) : order, { ascending: !order.startsWith('-') })
            .limit(limit);
        if (error) throw error;
        return data;
    },

    getById: async (id) => {
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;
        return data;
    },

    filter: async (filters, order = '-created_at', limit = 100) => {
        let query = supabase.from('projects').select('*');
        
        Object.entries(filters).forEach(([key, value]) => {
            query = query.eq(key, value);
        });
        
        query = query.order(order.startsWith('-') ? order.slice(1) : order, { ascending: !order.startsWith('-') });
        
        if (limit) {
            query = query.limit(limit);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    create: async (project) => {
        const userId = await getUserId();
        const userEmail = await getUserEmail();
        
        const { data, error } = await supabase
            .from('projects')
            .insert({
                ...project,
                created_by: userEmail,
                updated_by: userEmail
            })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    update: async (id, updates) => {
        const userEmail = await getUserEmail();
        
        const { data, error } = await supabase
            .from('projects')
            .update({
                ...updates,
                updated_by: userEmail
            })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    delete: async (id) => {
        const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    getMyProjects: async (limit = 10) => {
        const userEmail = await getUserEmail();
        if (!userEmail) return [];
        
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('created_by', userEmail)
            .order('created_at', { ascending: false })
            .limit(limit);
        if (error) throw error;
        return data;
    },

    getPublicProjects: async () => {
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('is_private', false)
            .eq('is_archaeological', true)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }
};

export const expertsApi = {
    list: async (order = '-created_at') => {
        const { data, error } = await supabase
            .from('experts')
            .select('*')
            .order(order.startsWith('-') ? order.slice(1) : order, { ascending: !order.startsWith('-') });
        if (error) throw error;
        return data;
    },

    getById: async (id) => {
        const { data, error } = await supabase
            .from('experts')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;
        return data;
    },

    create: async (expert) => {
        const userEmail = await getUserEmail();
        
        const { data, error } = await supabase
            .from('experts')
            .insert({
                ...expert,
                created_by: userEmail
            })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    update: async (id, updates) => {
        const { data, error } = await supabase
            .from('experts')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    delete: async (id) => {
        const { error } = await supabase
            .from('experts')
            .delete()
            .eq('id', id);
        if (error) throw error;
    }
};

export const reportsApi = {
    list: async (order = '-created_at') => {
        const { data, error } = await supabase
            .from('government_reports')
            .select('*')
            .order(order.startsWith('-') ? order.slice(1) : order, { ascending: !order.startsWith('-') });
        if (error) throw error;
        return data;
    },

    getById: async (id) => {
        const { data, error } = await supabase
            .from('government_reports')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;
        return data;
    },

    filter: async (filters, order = '-created_at') => {
        let query = supabase.from('government_reports').select('*');
        
        Object.entries(filters).forEach(([key, value]) => {
            query = query.eq(key, value);
        });
        
        query = query.order(order.startsWith('-') ? order.slice(1) : order, { ascending: !order.startsWith('-') });
        
        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    create: async (report) => {
        const userEmail = await getUserEmail();
        
        const { data, error } = await supabase
            .from('government_reports')
            .insert({
                ...report,
                created_by: userEmail
            })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    update: async (id, updates) => {
        const { data, error } = await supabase
            .from('government_reports')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    delete: async (id) => {
        const { error } = await supabase
            .from('government_reports')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    getMyReports: async () => {
        const userEmail = await getUserEmail();
        if (!userEmail) return [];
        
        const { data, error } = await supabase
            .from('government_reports')
            .select('*')
            .eq('created_by', userEmail)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }
};

export const creditLogsApi = {
    list: async (order = '-created_at', limit = 100) => {
        const { data, error } = await supabase
            .from('credit_logs')
            .select('*')
            .order(order.startsWith('-') ? order.slice(1) : order, { ascending: !order.startsWith('-') })
            .limit(limit);
        if (error) throw error;
        return data;
    },

    create: async (log) => {
        const { data, error } = await supabase
            .from('credit_logs')
            .insert(log)
            .select()
            .single();
        if (error) throw error;
        return data;
    }
};

export const profilesApi = {
    getById: async (id) => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;
        return data;
    },

    update: async (id, updates) => {
        const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    list: async () => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*');
        if (error) throw error;
        return data;
    }
};
