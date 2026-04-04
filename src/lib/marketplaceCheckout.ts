import { supabase } from './supabase';

/** Met à jour le téléphone du profil acheteur si différent (pour affichage côté vendeur). */
export async function persistBuyerPhone(
  userId: string,
  phone: string,
  current: string | null | undefined
) {
  const t = phone.replace(/\s/g, '').trim();
  if (!t || t === (current ?? '').replace(/\s/g, '')) return;
  await supabase.from('profiles').update({ phone: t }).eq('id', userId);
}
