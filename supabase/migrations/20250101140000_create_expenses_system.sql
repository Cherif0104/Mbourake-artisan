-- Migration: Système de Suivi des Dépenses
-- Permet aux artisans, clients, partenaires et vendeurs de suivre leurs dépenses

-- Table des dépenses
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (category IN ('materials', 'labor', 'transport', 'equipment', 'other')),
  amount DECIMAL(12, 2) NOT NULL CHECK (amount >= 0),
  description TEXT,
  receipt_url TEXT, -- URL du justificatif (photo/facture)
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_expenses_user ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_project ON expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);

-- RLS Policies
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs peuvent voir leurs propres dépenses
CREATE POLICY "Users see their own expenses"
  ON expenses FOR SELECT
  USING (user_id = auth.uid());

-- Les utilisateurs peuvent créer leurs propres dépenses
CREATE POLICY "Users create their own expenses"
  ON expenses FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Les utilisateurs peuvent modifier leurs propres dépenses
CREATE POLICY "Users update their own expenses"
  ON expenses FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Les utilisateurs peuvent supprimer leurs propres dépenses
CREATE POLICY "Users delete their own expenses"
  ON expenses FOR DELETE
  USING (user_id = auth.uid());

-- Les admins peuvent tout voir/gérer
CREATE POLICY "Admins manage all expenses"
  ON expenses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Trigger pour updated_at
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Commentaires
COMMENT ON TABLE expenses IS 'Suivi des dépenses par utilisateur et projet';
COMMENT ON COLUMN expenses.category IS 'Catégorie: materials, labor, transport, equipment, other';
COMMENT ON COLUMN expenses.receipt_url IS 'URL du justificatif (photo/facture) stocké dans Supabase Storage';
