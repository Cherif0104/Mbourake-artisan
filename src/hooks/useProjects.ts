import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '@shared';

export type Project = Database['public']['Tables']['projects']['Row'];
export type Quote = Database['public']['Tables']['quotes']['Row'];

export function useProjects() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createProject = useCallback(async (data: {
    client_id: string;
    category_id: number;
    title: string;
    audio_description_url?: string;
    photos_urls?: string[];
    location?: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const { data: project, error: err } = await supabase
        .from('projects')
        .insert({
          client_id: data.client_id,
          category_id: data.category_id,
          title: data.title,
          audio_description_url: data.audio_description_url,
          photos_urls: data.photos_urls,
          location: data.location,
          status: 'open',
        })
        .select()
        .single();

      if (err) throw err;
      return project;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getClientProjects = useCallback(async (clientId: string) => {
    setLoading(true);
    try {
      const { data, error: err } = await supabase
        .from('projects')
        .select('*, categories(*)')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (err) throw err;
      return data;
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getOpenProjects = useCallback(async (categoryId?: number) => {
    setLoading(true);
    try {
      let query = supabase
        .from('projects')
        .select('*, profiles(*), categories(*)')
        .eq('status', 'open');

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      const { data, error: err } = await query.order('created_at', { ascending: false });

      if (err) throw err;
      return data;
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const createQuote = useCallback(async (data: {
    project_id: string;
    artisan_id: string;
    amount: number;
    message?: string;
    estimated_duration?: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const { data: quote, error: err } = await supabase
        .from('quotes')
        .insert({
          project_id: data.project_id,
          artisan_id: data.artisan_id,
          amount: data.amount,
          message: data.message,
          estimated_duration: data.estimated_duration,
          status: 'pending',
        })
        .select()
        .single();

      if (err) throw err;
      return quote;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getProjectQuotes = useCallback(async (projectId: string) => {
    setLoading(true);
    try {
      const { data, error: err } = await supabase
        .from('quotes')
        .select('*, profiles(*)')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (err) throw err;
      return data;
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const acceptQuote = useCallback(async (quoteId: string, projectId: string) => {
    setLoading(true);
    setError(null);
    try {
      // 1. Accept the chosen quote
      const { error: quoteErr } = await supabase
        .from('quotes')
        .update({ status: 'accepted' })
        .eq('id', quoteId);
      
      if (quoteErr) throw quoteErr;

      // 2. Reject other quotes for the same project
      await supabase
        .from('quotes')
        .update({ status: 'rejected' })
        .eq('project_id', projectId)
        .neq('id', quoteId);

      // 3. Update project status
      const { error: projectErr } = await supabase
        .from('projects')
        .update({ status: 'quote_accepted' })
        .eq('id', projectId);

      if (projectErr) throw projectErr;
      
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    createProject,
    getClientProjects,
    getOpenProjects,
    createQuote,
    getProjectQuotes,
    acceptQuote,
  };
}
