import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

export type ProjectRow = Database['public']['Tables']['projects']['Row'];
export type QuoteRow = Database['public']['Tables']['quotes']['Row'];
type Client = SupabaseClient<Database>;

export async function createProject(
  client: Client,
  data: {
    client_id: string;
    category_id: number;
    title: string;
    audio_description_url?: string;
    photos_urls?: string[];
    location?: string;
  },
) {
  const { data: project, error } = await client
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
  if (error) throw error;
  return project;
}

export async function getClientProjects(client: Client, clientId: string) {
  const { data, error } = await client
    .from('projects')
    .select('*, categories(*)')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getOpenProjects(client: Client, categoryId?: number) {
  let query = client
    .from('projects')
    .select('*, profiles(*), categories(*)')
    .eq('status', 'open');
  if (categoryId != null) query = query.eq('category_id', categoryId);
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createQuote(
  client: Client,
  data: {
    project_id: string;
    artisan_id: string;
    amount: number;
    message?: string;
    estimated_duration?: string;
  },
) {
  const { data: quote, error } = await client
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
  if (error) throw error;
  return quote;
}

export async function getProjectQuotes(client: Client, projectId: string) {
  const { data, error } = await client
    .from('quotes')
    .select('*, profiles(*)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function acceptQuote(client: Client, quoteId: string, projectId: string) {
  const { error: quoteErr } = await client
    .from('quotes')
    .update({ status: 'accepted' })
    .eq('id', quoteId);
  if (quoteErr) throw quoteErr;

  await client
    .from('quotes')
    .update({ status: 'rejected' })
    .eq('project_id', projectId)
    .neq('id', quoteId);

  const { error: projectErr } = await client
    .from('projects')
    .update({ status: 'quote_accepted' })
    .eq('id', projectId);
  if (projectErr) throw projectErr;
}
