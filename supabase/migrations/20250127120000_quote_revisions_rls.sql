-- RLS pour quote_revisions : client peut insérer pour ses projets, artisan peut lire/mettre à jour pour ses devis
ALTER TABLE quote_revisions ENABLE ROW LEVEL SECURITY;

-- Client : insérer une demande de révision si c'est le client du projet
CREATE POLICY "Clients insert revisions for own projects"
  ON quote_revisions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = quote_revisions.project_id AND p.client_id = auth.uid()
    )
  );

-- Client : lire les révisions des projets dont il est client
CREATE POLICY "Clients read revisions for own projects"
  ON quote_revisions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = quote_revisions.project_id AND p.client_id = auth.uid()
    )
  );

-- Artisan : lire les révisions des devis qu'il a soumis
CREATE POLICY "Artisans read revisions for own quotes"
  ON quote_revisions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM quotes q
      WHERE q.id = quote_revisions.quote_id AND q.artisan_id = auth.uid()
    )
  );

-- Artisan : mettre à jour (répondre) les révisions de ses devis
CREATE POLICY "Artisans update revisions for own quotes"
  ON quote_revisions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM quotes q
      WHERE q.id = quote_revisions.quote_id AND q.artisan_id = auth.uid()
    )
  );
