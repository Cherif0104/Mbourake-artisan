-- Sécurise la liaison projet des dépenses:
-- - project_id peut être NULL
-- - sinon il doit pointer vers un projet lié à l'utilisateur:
--   * client propriétaire du projet, ou
--   * artisan assigné via accepted_quote_id, ou
--   * artisan avec un devis accepted historique.

CREATE OR REPLACE FUNCTION public.is_user_linked_to_project_for_expense(
  p_user_id uuid,
  p_project_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_project_id IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Client propriétaire du projet
  IF EXISTS (
    SELECT 1
    FROM projects p
    WHERE p.id = p_project_id
      AND p.client_id = p_user_id
  ) THEN
    RETURN TRUE;
  END IF;

  -- Artisan canonique (projects.accepted_quote_id)
  IF EXISTS (
    SELECT 1
    FROM projects p
    JOIN quotes q ON q.id = p.accepted_quote_id
    WHERE p.id = p_project_id
      AND q.artisan_id = p_user_id
  ) THEN
    RETURN TRUE;
  END IF;

  -- Fallback historique: devis accepted sur le projet
  IF EXISTS (
    SELECT 1
    FROM quotes q
    WHERE q.project_id = p_project_id
      AND q.artisan_id = p_user_id
      AND q.status = 'accepted'
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION public.is_user_linked_to_project_for_expense(uuid, uuid) IS
  'Retourne true si l utilisateur peut lier une dépense au projet (client propriétaire ou artisan lié).';

DROP POLICY IF EXISTS "Users create their own expenses" ON expenses;
DROP POLICY IF EXISTS "Users update their own expenses" ON expenses;

CREATE POLICY "Users create own expenses with linked project"
  ON expenses FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND public.is_user_linked_to_project_for_expense(auth.uid(), project_id)
  );

CREATE POLICY "Users update own expenses with linked project"
  ON expenses FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND public.is_user_linked_to_project_for_expense(auth.uid(), project_id)
  );
