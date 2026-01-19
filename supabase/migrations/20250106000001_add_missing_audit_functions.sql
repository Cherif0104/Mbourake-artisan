-- Migration: Ajouter les fonctions d'audit manquantes
-- Ces fonctions sont utilisées pour la traçabilité des actions dans l'application

-- Vérifier que les tables d'audit existent avant de créer les fonctions
-- (Les tables doivent être créées par la migration create_audit_logs)

-- Function to log project actions
CREATE OR REPLACE FUNCTION public.log_project_action(
  p_project_id UUID,
  p_user_id UUID,
  p_action TEXT,
  p_old_value JSONB DEFAULT NULL,
  p_new_value JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  -- Vérifier si la table existe avant d'insérer
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'project_audit_logs'
  ) THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.project_audit_logs (
    project_id, user_id, action, old_value, new_value, metadata
  ) VALUES (
    p_project_id, p_user_id, p_action, p_old_value, p_new_value, p_metadata
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
EXCEPTION
  WHEN OTHERS THEN
    -- Retourner NULL en cas d'erreur au lieu de lever une exception
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log quote actions
CREATE OR REPLACE FUNCTION public.log_quote_action(
  p_quote_id UUID,
  p_project_id UUID,
  p_user_id UUID,
  p_action TEXT,
  p_old_value JSONB DEFAULT NULL,
  p_new_value JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  -- Vérifier si la table existe avant d'insérer
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'quote_audit_logs'
  ) THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.quote_audit_logs (
    quote_id, project_id, user_id, action, old_value, new_value, metadata
  ) VALUES (
    p_quote_id, p_project_id, p_user_id, p_action, p_old_value, p_new_value, p_metadata
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
EXCEPTION
  WHEN OTHERS THEN
    -- Retourner NULL en cas d'erreur au lieu de lever une exception
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log escrow actions
CREATE OR REPLACE FUNCTION public.log_escrow_action(
  p_escrow_id UUID,
  p_user_id UUID,
  p_action TEXT,
  p_old_value JSONB DEFAULT NULL,
  p_new_value JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  -- Vérifier si la table existe avant d'insérer
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'escrow_audit_logs'
  ) THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.escrow_audit_logs (
    escrow_id, user_id, action, old_value, new_value, metadata
  ) VALUES (
    p_escrow_id, p_user_id, p_action, p_old_value, p_new_value, p_metadata
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
EXCEPTION
  WHEN OTHERS THEN
    -- Retourner NULL en cas d'erreur au lieu de lever une exception
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log invoice actions
CREATE OR REPLACE FUNCTION public.log_invoice_action(
  p_invoice_id UUID,
  p_user_id UUID,
  p_action TEXT,
  p_old_value JSONB DEFAULT NULL,
  p_new_value JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  -- Vérifier si la table existe avant d'insérer
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'invoice_audit_logs'
  ) THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.invoice_audit_logs (
    invoice_id, user_id, action, old_value, new_value, metadata
  ) VALUES (
    p_invoice_id, p_user_id, p_action, p_old_value, p_new_value, p_metadata
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
EXCEPTION
  WHEN OTHERS THEN
    -- Retourner NULL en cas d'erreur au lieu de lever une exception
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Commentaires sur les fonctions
COMMENT ON FUNCTION public.log_project_action(UUID, UUID, TEXT, JSONB, JSONB, JSONB) IS 
  'Enregistre une action sur un projet dans les logs d''audit. Retourne NULL si la table n''existe pas.';

COMMENT ON FUNCTION public.log_quote_action(UUID, UUID, UUID, TEXT, JSONB, JSONB, JSONB) IS 
  'Enregistre une action sur un devis dans les logs d''audit. Retourne NULL si la table n''existe pas.';

COMMENT ON FUNCTION public.log_escrow_action(UUID, UUID, TEXT, JSONB, JSONB, JSONB) IS 
  'Enregistre une action sur un escrow dans les logs d''audit. Retourne NULL si la table n''existe pas.';

COMMENT ON FUNCTION public.log_invoice_action(UUID, UUID, TEXT, JSONB, JSONB, JSONB) IS 
  'Enregistre une action sur une facture dans les logs d''audit. Retourne NULL si la table n''existe pas.';
