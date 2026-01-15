/**
 * Service de Notifications - Système Centralisé
 * Gère toutes les notifications du processus Mbourake
 */

import { supabase } from './supabase';

export type NotificationType = 
  | 'new_project' 
  | 'new_quote' 
  | 'quote_accepted' 
  | 'quote_rejected' 
  | 'revision_requested' 
  | 'project_completed' 
  | 'payment_received' 
  | 'verification_approved' 
  | 'verification_rejected' 
  | 'new_message' 
  | 'system';

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message?: string;
  data?: Record<string, any>;
}

/**
 * Crée une notification pour un utilisateur
 */
export async function createNotification(params: CreateNotificationParams) {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: params.userId,
        type: params.type,
        title: params.title,
        message: params.message || null,
        data: params.data || {},
        is_read: false,
      });

    if (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  } catch (error) {
    console.error('Failed to create notification:', error);
    // Ne pas bloquer le processus si la notification échoue
  }
}

/**
 * Notifie les artisans quand un nouveau projet est créé
 */
export async function notifyArtisansNewProject(project: {
  id: string;
  title: string;
  category_id: number;
  location?: string;
  is_open: boolean;
  target_artisan_id?: string | null;
  max_distance_km?: number | null;
  min_rating?: number | null;
}) {
  try {
    // Si projet ciblé, notifier seulement l'artisan ciblé
    if (!project.is_open && project.target_artisan_id) {
      await createNotification({
        userId: project.target_artisan_id,
        type: 'new_project',
        title: 'Nouvelle demande pour vous',
        message: `Une nouvelle demande "${project.title}" vous a été assignée.`,
        data: { project_id: project.id },
      });
      return;
    }

    // Sinon, trouver les artisans de la catégorie
    const { data: artisans } = await supabase
      .from('artisans')
      .select('id, category_id, rating_avg, verification_status')
      .eq('category_id', project.category_id)
      .eq('is_available', true);

    if (!artisans || artisans.length === 0) return;

    // Filtrer selon les critères (note minimale)
    let eligibleArtisans = artisans;
    if (project.min_rating) {
      eligibleArtisans = artisans.filter(
        a => (a.rating_avg || 0) >= project.min_rating!
      );
    }

    // Créer les notifications
    const notifications = eligibleArtisans.map(artisan => ({
      user_id: artisan.id,
      type: 'new_project' as NotificationType,
      title: 'Nouvelle demande dans votre catégorie',
      message: `Une nouvelle demande "${project.title}" a été publiée.`,
      data: { project_id: project.id },
    }));

    // Insérer en batch
    if (notifications.length > 0) {
      await supabase.from('notifications').insert(notifications);
    }
  } catch (error) {
    console.error('Error notifying artisans:', error);
  }
}

/**
 * Notifie le client quand un devis est soumis
 * Déclenche également l'accès au chat pour discuter avec l'artisan
 */
export async function notifyClientNewQuote(projectId: string, clientId: string, artisanName: string) {
  await createNotification({
    userId: clientId,
    type: 'new_quote',
    title: 'Nouveau devis reçu',
    message: `${artisanName} a soumis un devis pour votre projet. Vous pouvez maintenant discuter avec lui via le chat.`,
    data: { project_id: projectId, chat_enabled: true },
  });
}

/**
 * Notifie l'artisan quand son devis est accepté
 */
export async function notifyArtisanQuoteAccepted(projectId: string, artisanId: string, projectTitle: string) {
  await createNotification({
    userId: artisanId,
    type: 'quote_accepted',
    title: 'Devis accepté !',
    message: `Votre devis pour "${projectTitle}" a été accepté.`,
    data: { project_id: projectId },
  });
}

/**
 * Notifie l'artisan quand son devis est refusé
 */
export async function notifyArtisanQuoteRejected(projectId: string, artisanId: string, projectTitle: string) {
  await createNotification({
    userId: artisanId,
    type: 'quote_rejected',
    title: 'Devis refusé',
    message: `Votre devis pour "${projectTitle}" a été refusé.`,
    data: { project_id: projectId },
  });
}

/**
 * Notifie l'artisan quand une révision est demandée
 */
export async function notifyArtisanRevisionRequested(projectId: string, artisanId: string, projectTitle: string) {
  await createNotification({
    userId: artisanId,
    type: 'revision_requested',
    title: 'Révision de devis demandée',
    message: `Le client demande une révision de votre devis pour "${projectTitle}".`,
    data: { project_id: projectId },
  });
}

/**
 * Notifie le client quand les travaux sont terminés
 */
export async function notifyClientProjectCompleted(projectId: string, clientId: string, projectTitle: string) {
  await createNotification({
    userId: clientId,
    type: 'project_completed',
    title: 'Travaux terminés',
    message: `Les travaux pour "${projectTitle}" sont terminés. Confirmez la clôture.`,
    data: { project_id: projectId },
  });
}

/**
 * Notifie l'artisan quand le paiement est reçu
 */
export async function notifyArtisanPaymentReceived(projectId: string, artisanId: string, amount: number) {
  await createNotification({
    userId: artisanId,
    type: 'payment_received',
    title: 'Paiement reçu',
    message: `Vous avez reçu ${amount.toLocaleString('fr-FR')} FCFA.`,
    data: { project_id: projectId },
  });
}

/**
 * Notifie quand un nouveau message arrive dans le chat
 */
export async function notifyNewMessage(projectId: string, recipientId: string, senderName: string) {
  await createNotification({
    userId: recipientId,
    type: 'new_message',
    title: 'Nouveau message',
    message: `${senderName} vous a envoyé un message.`,
    data: { project_id: projectId },
  });
}
