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
  | 'project_completed' 
  | 'payment_received' 
  | 'verification_approved' 
  | 'verification_rejected' 
  | 'new_message' 
  | 'quote_revision_requested'
  | 'quote_revision_responded'
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
    message: `Votre devis pour "${projectTitle}" a été accepté. En attente du paiement du client pour démarrer les travaux.`,
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
 * Notifie l'artisan qu'une demande de révision a été faite sur son devis.
 * Si le type 'quote_revision_requested' est refusé (enum), fallback en 'system' avec kind pour le routage.
 */
export async function notifyArtisanRevisionRequested(
  projectId: string,
  quoteId: string,
  artisanId: string,
  clientName: string,
  revisionId: string
) {
  const title = 'Nouvelle demande de révision';
  const message = `${clientName} a demandé une révision de votre devis`;
  const data = { project_id: projectId, quote_id: quoteId, revision_id: revisionId, kind: 'quote_revision_requested' as const };

  const { error: err1 } = await supabase.from('notifications').insert({
    user_id: artisanId,
    type: 'quote_revision_requested',
    title,
    message,
    data: { project_id: projectId, quote_id: quoteId, revision_id: revisionId },
    is_read: false,
  });
  if (err1 && (String(err1.code) === '23514' || /notifications_type_check|invalid enum/i.test(String(err1.message)))) {
    await supabase.from('notifications').insert({
      user_id: artisanId,
      type: 'system',
      title,
      message,
      data,
      is_read: false,
    });
  } else if (err1) {
    console.error('Error creating notification (revision requested):', err1);
    throw err1;
  }
}

/**
 * Notifie le client de la réponse de l'artisan à sa demande de révision.
 * On utilise 'system' pour éviter les 400 si l'enum n'a pas 'quote_revision_responded'.
 */
export async function notifyClientRevisionResponded(
  projectId: string,
  quoteId: string,
  clientId: string,
  artisanName: string,
  revisionStatus: 'accepted' | 'rejected' | 'modified',
  revisionId: string
) {
  const statusMessages = {
    accepted: 'a accepté votre demande de révision',
    rejected: 'a refusé votre demande de révision',
    modified: 'a modifié le devis selon votre demande',
  };

  const title = 'Réponse à votre demande de révision';
  const message = `${artisanName} ${statusMessages[revisionStatus]}`;
  const data: Record<string, unknown> = {
    project_id: projectId,
    quote_id: quoteId,
    revision_id: revisionId,
    revision_status: revisionStatus,
    kind: 'quote_revision_responded',
  };

  try {
    await supabase.from('notifications').insert({
      user_id: clientId,
      type: 'system',
      title,
      message,
      data,
      is_read: false,
    });
  } catch (err) {
    console.error('Error creating notification (revision responded):', err);
  }
}

/**
 * Notifie le client quand l'artisan a demandé la clôture (travaux terminés, à confirmer par le client)
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
 * Notifie l'artisan quand le client a demandé la clôture (demande côté client, en attente de sa confirmation)
 */
export async function notifyArtisanClientRequestedCompletion(projectId: string, artisanId: string, projectTitle: string) {
  await createNotification({
    userId: artisanId,
    type: 'project_completed',
    title: 'Demande de clôture par le client',
    message: `Le client a demandé la clôture du projet "${projectTitle}". Il va confirmer et noter votre prestation.`,
    data: { project_id: projectId },
  });
}

/**
 * Notifie l'artisan quand le client a confirmé la fin des travaux (clôture validée, la plateforme va procéder au paiement)
 */
export async function notifyArtisanClientConfirmedClosure(projectId: string, artisanId: string, projectTitle: string) {
  await createNotification({
    userId: artisanId,
    type: 'project_completed',
    title: 'Clôture confirmée par le client',
    message: `Le client a confirmé la fin des travaux pour "${projectTitle}". La plateforme va procéder au versement de votre paiement.`,
    data: { project_id: projectId },
  });
}

/**
 * Notifie le client quand un artisan clôture sa participation (abandon du devis)
 * Aucun paiement n'est effectué.
 */
export async function notifyClientArtisanAbandoned(
  projectId: string,
  clientId: string,
  projectTitle: string,
  artisanName?: string
) {
  const name = artisanName || 'L\'artisan';
  await createNotification({
    userId: clientId,
    type: 'system',
    title: 'Participation clôturée',
    message: `${name} a clôturé sa participation au projet "${projectTitle}". Aucun paiement ne sera effectué. Vous pouvez choisir un autre devis.`,
    data: { project_id: projectId },
  });
}

/**
 * Notifie l'artisan quand le paiement est reçu (montant net uniquement)
 */
export async function notifyArtisanPaymentReceived(projectId: string, artisanId: string, amount: number) {
  await createNotification({
    userId: artisanId,
    type: 'payment_received',
    title: 'Paiement reçu',
    message: `Vous avez reçu ${amount.toLocaleString('fr-FR')} FCFA. Vous pouvez maintenant commencer les travaux.`,
    data: { project_id: projectId },
  });
}

/**
 * Notifie l'artisan que le paiement client est sécurisé en escrow, avec rappel CGV et détail reliquat (TVA, commission 10-15%)
 */
export async function notifyArtisanPaymentHeldWithBreakdown(
  projectId: string,
  artisanId: string,
  params: {
    total_amount: number;
    tva_amount: number;
    commission_amount: number;
    artisan_payout: number;
  }
) {
  const { total_amount, tva_amount, commission_amount, artisan_payout } = params;
  const commissionPercent = total_amount > 0
    ? Math.round((commission_amount / total_amount) * 100)
    : 0;
  const msg = `Paiement du client reçu et sécurisé (${total_amount.toLocaleString('fr-FR')} FCFA). ` +
    `Après déduction TVA et commission plateforme (${commissionPercent}%), votre reliquat : ${artisan_payout.toLocaleString('fr-FR')} FCFA. ` +
    `Conformément aux CGV, ce montant vous sera versé à la clôture du projet.`;
  await createNotification({
    userId: artisanId,
    type: 'payment_received',
    title: 'Paiement reçu et sécurisé',
    message: msg,
    data: {
      project_id: projectId,
      total_amount,
      tva_amount,
      commission_amount,
      artisan_payout,
      cgv_reminder: true,
    },
  });
}

/**
 * Notifie l'autre partie qu'un litige a été signalé sur le projet
 */
export async function notifyOtherPartyDisputeRaised(
  projectId: string,
  projectTitle: string,
  recipientId: string
) {
  await createNotification({
    userId: recipientId,
    type: 'dispute_raised',
    title: 'Litige signalé',
    message: `Un litige a été signalé sur le projet "${projectTitle}". Le projet est en attente. L'équipe Mbourake vous contactera.`,
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

/**
 * Assure qu'un chat existe entre le client et l'artisan pour un projet
 * Crée automatiquement un message de bienvenue si le chat n'existe pas encore
 * Cette fonction est appelée automatiquement à l'acceptation d'un devis
 */
export async function ensureProjectChatExists(
  projectId: string,
  clientId: string,
  artisanId: string,
  projectTitle: string
) {
  try {
    // Vérifier si un message existe déjà entre ces deux utilisateurs pour ce projet
    const { data: existingMessages, error: checkError } = await supabase
      .from('messages')
      .select('id')
      .eq('project_id', projectId)
      .or(`sender_id.eq.${clientId},sender_id.eq.${artisanId}`)
      .limit(1);

    if (checkError) {
      console.error('Error checking existing chat:', checkError);
      // Ne pas bloquer si la vérification échoue
    }

    // Si aucun message n'existe, créer un message de bienvenue
    if (!existingMessages || existingMessages.length === 0) {
      // Récupérer le nom de l'artisan
      const { data: artisanProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', artisanId)
        .single();

      const artisanName = artisanProfile?.full_name || 'l\'artisan';

      // Créer un message de bienvenue de la part de l'artisan vers le client
      const { error: messageError } = await supabase.from('messages').insert({
        project_id: projectId,
        sender_id: artisanId,
        receiver_id: clientId,
        content: `Bonjour ! Votre devis pour "${projectTitle}" a été accepté. Nous pouvons maintenant discuter des détails du projet. N'hésitez pas à me contacter si vous avez des questions.`,
        type: 'text',
      });

      if (messageError) {
        console.error('Error creating welcome message:', messageError);
      } else {
        console.log(`Chat créé automatiquement pour le projet ${projectId}`);
      }
    }
  } catch (error) {
    console.error('Error ensuring project chat exists:', error);
  }
}
