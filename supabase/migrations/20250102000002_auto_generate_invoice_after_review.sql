-- Génération automatique de facture après notation (review)
-- Migration: Trigger facture après review (au lieu de completion)

-- Désactiver l'ancien trigger qui créait la facture à la completion
DROP TRIGGER IF EXISTS create_invoice_trigger ON projects;

-- Nouvelle fonction pour générer facture après review
CREATE OR REPLACE FUNCTION auto_generate_invoice_after_review()
RETURNS TRIGGER AS $$
DECLARE
  v_project projects%ROWTYPE;
  v_quote quotes%ROWTYPE;
  v_escrow escrows%ROWTYPE;
  v_invoice_number TEXT;
  v_base_amount NUMERIC;
  v_tva_percent NUMERIC := 18;
  v_tva_amount NUMERIC;
  v_total_amount NUMERIC;
  v_invoice_id UUID;
BEGIN
  -- Vérifier que c'est une nouvelle review (pas update)
  -- Et qu'il n'y a pas déjà de facture pour ce projet
  IF TG_OP = 'INSERT' AND NEW.rating IS NOT NULL THEN
    
    -- Vérifier si facture existe déjà
    IF EXISTS (SELECT 1 FROM invoices WHERE project_id = NEW.project_id) THEN
      RETURN NEW;
    END IF;
    
    -- Récupérer le projet
    SELECT * INTO v_project
    FROM projects
    WHERE id = NEW.project_id;

    -- Récupérer le devis accepté
    SELECT * INTO v_quote
    FROM quotes
    WHERE project_id = NEW.project_id
      AND status = 'accepted'
    LIMIT 1;

    -- Récupérer l'escrow
    SELECT * INTO v_escrow
    FROM escrows
    WHERE project_id = NEW.project_id
    LIMIT 1;

    -- Si on a un projet et un devis, créer la facture
    IF v_project.id IS NOT NULL AND v_quote.id IS NOT NULL THEN
      
      -- Calculer montants
      v_base_amount := COALESCE(v_escrow.total_amount, v_quote.amount, 0);
      v_tva_amount := v_base_amount * v_tva_percent / 100;
      v_total_amount := v_base_amount + v_tva_amount;

      -- Créer la facture
      INSERT INTO invoices (
        invoice_number,
        project_id,
        client_id,
        artisan_id,
        issued_date,
        due_date,
        base_amount,
        tva_percent,
        tva_amount,
        total_amount,
        status
      ) VALUES (
        generate_invoice_number(), -- Utiliser la fonction existante
        NEW.project_id,
        v_project.client_id,
        NEW.artisan_id,
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '30 days',
        v_base_amount,
        v_tva_percent,
        v_tva_amount,
        v_total_amount,
        'sent' -- Statut 'sent' car générée automatiquement après notation
      ) RETURNING id INTO v_invoice_id;

      -- Créer les items de facture
      INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount)
      VALUES (
        v_invoice_id,
        'Travaux réalisés - ' || COALESCE(v_project.title, 'Projet ' || v_project.project_number, 'Projet'),
        1,
        v_base_amount,
        v_base_amount
      );

      -- Log l'action de génération de facture
      PERFORM log_invoice_action(
        v_invoice_id,
        NEW.client_id,
        'generated',
        NULL,
        jsonb_build_object(
          'invoice_number', generate_invoice_number(),
          'total_amount', v_total_amount,
          'auto_generated', true,
          'review_id', NEW.id
        )
      );

      -- Notifier client et artisan (via notification service dans l'app)
      -- Les notifications seront gérées par l'application après détection de la nouvelle facture
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger après insertion review
DROP TRIGGER IF EXISTS trigger_auto_generate_invoice_after_review ON reviews;
CREATE TRIGGER trigger_auto_generate_invoice_after_review
  AFTER INSERT ON reviews
  FOR EACH ROW
  WHEN (NEW.rating IS NOT NULL)
  EXECUTE FUNCTION auto_generate_invoice_after_review();

COMMENT ON FUNCTION auto_generate_invoice_after_review() IS 'Génère automatiquement une facture après qu''un client ait noté l''artisan (review)';
