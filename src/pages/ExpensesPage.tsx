import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, Plus, Receipt, TrendingUp, DollarSign, Package, Wrench, Truck, Settings, FileText,
  Upload, X, Image as ImageIcon, Info, Wallet
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { useToastContext } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';
import { LoadingOverlay } from '../components/LoadingOverlay';

type ExpenseCategory = 'materials' | 'labor' | 'transport' | 'equipment' | 'other';
type PeriodFilter = 'all' | 'month' | 'year';

const CATEGORY_CONFIG: Record<ExpenseCategory, { label: string; icon: React.ReactNode; color: string }> = {
  materials: { label: 'Matériaux', icon: <Package size={20} />, color: 'bg-blue-100 text-blue-600' },
  labor: { label: 'Main d\'œuvre', icon: <Wrench size={20} />, color: 'bg-green-100 text-green-600' },
  transport: { label: 'Transport', icon: <Truck size={20} />, color: 'bg-purple-100 text-purple-600' },
  equipment: { label: 'Équipement', icon: <Settings size={20} />, color: 'bg-orange-100 text-orange-600' },
  other: { label: 'Autre', icon: <FileText size={20} />, color: 'bg-gray-100 text-gray-600' },
};

/** Affiche le nom du projet en priorité (plus lisible que le numéro), puis la ref et la date. */
function projectDisplayLabel(project: { title?: string; project_number?: string; created_at?: string } | null): string {
  if (!project) return 'Projet';
  const name = project.title?.trim() || (project.project_number ? `Projet ref. ${project.project_number}` : 'Projet sans titre');
  const ref = project.project_number && project.title?.trim() ? ` (ref. ${project.project_number})` : '';
  const date = project.created_at
    ? ` · ${new Date(project.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`
    : '';
  return `${name}${ref}${date}`;
}

export function ExpensesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { error: showError } = useToastContext();
  
  const [expenses, setExpenses] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [revenueByEscrow, setRevenueByEscrow] = useState<Array<{ escrow: any; project: any }>>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterCategory, setFilterCategory] = useState<ExpenseCategory | 'all'>('all');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterPeriod, setFilterPeriod] = useState<PeriodFilter>('all');
  const [deepLinkApplied, setDeepLinkApplied] = useState(false);
  
  // Form states
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('materials');
  const [projectId, setProjectId] = useState<string>('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const navState = (location.state as { source?: 'dashboard' | 'invoices'; focus?: 'overview' | 'add-expense'; project_id?: string } | null) || null;
  const linkedProjectId = searchParams.get('projectId') || navState?.project_id || '';

  useEffect(() => {
    if (!user || !profile) return;
    fetchExpenses();
    fetchProjects();
    if (profile.role === 'artisan') fetchRevenue();
  }, [user, profile]);

  const fetchRevenue = async () => {
    if (!user || profile?.role !== 'artisan') return;
    const { data: acceptedQuotes } = await supabase
      .from('quotes')
      .select('project_id')
      .eq('artisan_id', user.id)
      .eq('status', 'accepted');
    const projectIds = (acceptedQuotes || []).map((q: any) => q.project_id).filter(Boolean);
    if (projectIds.length === 0) {
      setRevenueByEscrow([]);
      return;
    }
    const { data: escrowsData } = await supabase
      .from('escrows')
      .select('*, projects(id, title, project_number)')
      .in('project_id', projectIds)
      .eq('status', 'released')
      .order('updated_at', { ascending: false });
    setRevenueByEscrow((escrowsData || []).map((e: any) => ({ escrow: e, project: e.projects })));
  };

  const fetchExpenses = async () => {
    if (!user) return;
    
    let query = supabase
      .from('expenses')
      .select('*, projects(id, title, project_number, created_at)')
      .eq('user_id', user.id)
      .order('expense_date', { ascending: false });

    if (filterCategory !== 'all') {
      query = query.eq('category', filterCategory);
    }
    if (filterProject !== 'all') {
      query = query.eq('project_id', filterProject);
    }
    if (filterPeriod === 'month') {
      const monthStart = new Date();
      monthStart.setDate(1);
      query = query.gte('expense_date', monthStart.toISOString().split('T')[0]);
    } else if (filterPeriod === 'year') {
      const yearStart = new Date(new Date().getFullYear(), 0, 1);
      query = query.gte('expense_date', yearStart.toISOString().split('T')[0]);
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching expenses:', error);
    } else {
      setExpenses(data || []);
    }
    setLoading(false);
  };

  const fetchProjects = async () => {
    if (!user || !profile) return;
    
    if (profile.role === 'client') {
      const { data } = await supabase
        .from('projects')
        .select('id, title, project_number, created_at')
        .eq('client_id', user.id)
        .in('status', ['open', 'quote_accepted', 'in_progress', 'completed'])
        .order('created_at', { ascending: false });
      
      setProjects(data || []);
    } else if (profile.role === 'artisan') {
      const { data: quotesData } = await supabase
        .from('quotes')
        .select('project_id, projects(id, title, project_number, created_at)')
        .eq('artisan_id', user.id)
        .eq('status', 'accepted');
      
      const projectList = quotesData?.map((q: any) => q.projects).filter(Boolean) || [];
      setProjects(projectList);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [filterCategory, filterProject, filterPeriod]);

  useEffect(() => {
    if (deepLinkApplied || !linkedProjectId) return;
    if (projects.length === 0) return;
    const exists = projects.some((p) => p.id === linkedProjectId);
    if (!exists) {
      setDeepLinkApplied(true);
      return;
    }
    setProjectId(linkedProjectId);
    setFilterProject(linkedProjectId);
    if (navState?.focus === 'add-expense') {
      setShowAddForm(true);
    }
    setDeepLinkApplied(true);
  }, [deepLinkApplied, linkedProjectId, navState?.focus, projects]);

  const handleFileUpload = async (file: File): Promise<string | null> => {
    if (!user) return null;
    
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/expenses/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage
        .from('photos')
        .getPublicUrl(fileName);
      
      return urlData?.publicUrl || null;
    } catch (err) {
      console.error('Error uploading receipt:', err);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setSubmitting(true);
    try {
      let receiptUrl: string | null = null;
      
      if (receiptFile) {
        receiptUrl = await handleFileUpload(receiptFile);
      }
      
      const expenseData: any = {
        user_id: user.id,
        category,
        amount: parseFloat(amount),
        description: description.trim() || null,
        expense_date: expenseDate,
        receipt_url: receiptUrl,
      };
      
      if (projectId) {
        expenseData.project_id = projectId;
      }
      
      const { error } = await (supabase as any)
        .from('expenses')
        .insert(expenseData);
      
      if (error) throw error;
      
      // Reset form
      setAmount('');
      setDescription('');
      setCategory('materials');
      setProjectId('');
      setExpenseDate(new Date().toISOString().split('T')[0]);
      setReceiptFile(null);
      setShowAddForm(false);
      
      // Refresh expenses
      await fetchExpenses();
    } catch (err: any) {
      showError(`Erreur: ${err.message || 'Impossible d\'enregistrer la dépense'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const yearStart = new Date(new Date().getFullYear(), 0, 1);
  const totalExpensesThisMonth = expenses
    .filter((exp) => exp.expense_date && new Date(exp.expense_date) >= monthStart)
    .reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);
  const totalExpensesThisYear = expenses
    .filter((exp) => exp.expense_date && new Date(exp.expense_date) >= yearStart)
    .reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);
  const totalRevenue = revenueByEscrow.reduce(
    (sum, { escrow }) => sum + Number(escrow?.artisan_payout ?? escrow?.total_amount ?? 0),
    0
  );
  const balance = totalRevenue - totalExpenses;
  const revenueByProject = revenueByEscrow.reduce((acc, { escrow, project }) => {
    const projectId = project?.id;
    if (!projectId) return acc;
    const amount = Number(escrow?.artisan_payout ?? escrow?.total_amount ?? 0);
    acc.set(projectId, (acc.get(projectId) || 0) + amount);
    return acc;
  }, new Map<string, number>());
  const expensesByProject = expenses.reduce((acc, exp) => {
    const pId = exp.project_id;
    if (!pId) return acc;
    acc.set(pId, (acc.get(pId) || 0) + Number(exp.amount || 0));
    return acc;
  }, new Map<string, number>());
  const projectLookup = new Map<string, any>();
  projects.forEach((p) => projectLookup.set(p.id, p));
  revenueByEscrow.forEach(({ project }) => {
    if (project?.id) projectLookup.set(project.id, project);
  });
  expenses.forEach((exp) => {
    if (exp?.projects?.id) projectLookup.set(exp.projects.id, exp.projects);
  });
  const projectMarginRows = Array.from(new Set([...revenueByProject.keys(), ...expensesByProject.keys()]))
    .map((projectId) => {
      const revenue = revenueByProject.get(projectId) || 0;
      const expense = expensesByProject.get(projectId) || 0;
      const margin = revenue - expense;
      return {
        projectId,
        project: projectLookup.get(projectId),
        revenue,
        expense,
        margin,
      };
    })
    .sort((a, b) => Math.abs(b.margin) - Math.abs(a.margin))
    .slice(0, 3);

  if (loading) {
    return <LoadingOverlay />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 px-4 py-4 bg-white border-b border-gray-100 flex items-center gap-4">
        <button onClick={() => navigate('/dashboard')} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-gray-900">Suivi des dépenses</h1>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="w-10 h-10 bg-brand-500 text-white rounded-full flex items-center justify-center"
        >
          <Plus size={20} />
        </button>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 pb-32">
        {/* Pont workflow Finances -> Dépenses */}
        <div className="mb-6 p-4 bg-white border border-gray-100 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">Workflow financier</p>
          <h2 className="font-bold text-gray-900 mb-1">Paiements -&gt; Dépenses -&gt; Solde</h2>
          <p className="text-sm text-gray-500 mb-3">
            {linkedProjectId
              ? 'Projet pré-sélectionné depuis Finances. Enregistrez vos dépenses pour suivre la marge.'
              : 'Liez vos dépenses aux projets pour une marge chantier claire et à jour.'}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => navigate('/invoices', { state: { source: 'expenses', focus: 'payments', project_id: projectId || linkedProjectId || null } })}
              className="flex-1 px-3 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-bold"
            >
              Retour Finances
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="flex-1 px-3 py-2 rounded-xl bg-brand-500 text-white text-sm font-bold"
            >
              Ajouter une dépense
            </button>
          </div>
        </div>

        {/* Bloc explicatif (artisan) */}
        {profile?.role === 'artisan' && (
          <div className="mb-6 p-4 bg-brand-50 border border-brand-100 rounded-2xl">
            <div className="flex items-start gap-3">
              <Info size={20} className="text-brand-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-brand-900 text-sm mb-1">À quoi sert ce module ?</p>
                <p className="text-sm text-brand-800">
                  Enregistrez vos dépenses (matériaux, transport, etc.) et associez-les à un projet. Vous verrez en un coup d’œil ce que vous avez dépensé et ce que vous avez encaissé (paiements versés par la plateforme), pour suivre votre marge et votre chiffre d’affaires par chantier.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Revenus vs Dépenses (artisan) */}
        {profile?.role === 'artisan' && (
          <div className="mb-6 p-4 bg-white border border-gray-100 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Wallet size={18} />
              Revenus vs Dépenses
            </h2>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xs text-gray-500 font-medium">Encaissé</p>
                <p className="text-lg font-black text-green-600">{totalRevenue.toLocaleString('fr-FR')} FCFA</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Dépenses</p>
                <p className="text-lg font-black text-gray-900">{totalExpenses.toLocaleString('fr-FR')} FCFA</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Solde</p>
                <p className={`text-lg font-black ${balance >= 0 ? 'text-brand-600' : 'text-red-600'}`}>
                  {balance.toLocaleString('fr-FR')} FCFA
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3 mb-2 font-medium">Marge par projet (aperçu)</p>
            {projectMarginRows.length === 0 ? (
              <p className="text-xs text-gray-400">Aucune marge par projet à afficher pour le moment.</p>
            ) : (
              <div className="space-y-2">
                {projectMarginRows.map((row) => (
                  <div key={row.projectId} className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                    <p className="text-xs font-bold text-gray-800 truncate">
                      {projectDisplayLabel(row.project || { project_number: row.projectId })}
                    </p>
                    <div className="mt-1 flex items-center justify-between text-xs text-gray-600">
                      <span>Encaissé: {row.revenue.toLocaleString('fr-FR')} FCFA</span>
                      <span>Dépensé: {row.expense.toLocaleString('fr-FR')} FCFA</span>
                    </div>
                    <p className={`text-sm font-bold mt-1 ${row.margin >= 0 ? 'text-brand-600' : 'text-red-600'}`}>
                      Solde: {row.margin.toLocaleString('fr-FR')} FCFA
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign size={18} className="text-brand-500" />
              <p className="text-xs text-gray-500 font-medium">Total dépenses</p>
            </div>
            <p className="text-2xl font-black text-gray-900">
              {totalExpenses.toLocaleString('fr-FR')} FCFA
            </p>
          </div>
          
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={18} className="text-green-500" />
              <p className="text-xs text-gray-500 font-medium">Ce mois / année</p>
            </div>
            <p className="text-sm font-black text-gray-900">
              {totalExpensesThisMonth.toLocaleString('fr-FR')} / {totalExpensesThisYear.toLocaleString('fr-FR')} FCFA
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as any)}
            className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium"
          >
            <option value="all">Toutes catégories</option>
            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
          
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium"
          >
            <option value="all">Tous les projets</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {projectDisplayLabel(project)}
              </option>
            ))}
          </select>
          <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setFilterPeriod('all')}
              className={`px-3 py-2 text-xs font-bold ${filterPeriod === 'all' ? 'bg-brand-500 text-white' : 'text-gray-600'}`}
            >
              Tout
            </button>
            <button
              type="button"
              onClick={() => setFilterPeriod('month')}
              className={`px-3 py-2 text-xs font-bold border-l border-gray-200 ${filterPeriod === 'month' ? 'bg-brand-500 text-white' : 'text-gray-600'}`}
            >
              Ce mois
            </button>
            <button
              type="button"
              onClick={() => setFilterPeriod('year')}
              className={`px-3 py-2 text-xs font-bold border-l border-gray-200 ${filterPeriod === 'year' ? 'bg-brand-500 text-white' : 'text-gray-600'}`}
            >
              Cette année
            </button>
          </div>
        </div>

        {/* Expenses List */}
        {expenses.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
            <Receipt size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium">Aucune dépense enregistrée</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="mt-4 px-6 py-2 bg-brand-500 text-white rounded-xl font-bold"
            >
              Ajouter une dépense
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {expenses.map((expense) => {
              const categoryConfig = CATEGORY_CONFIG[expense.category as ExpenseCategory] || CATEGORY_CONFIG.other;
              
              return (
                <div key={expense.id} className="bg-white rounded-2xl p-4 border border-gray-100">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${categoryConfig.color}`}>
                        {categoryConfig.icon}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{categoryConfig.label}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(expense.expense_date).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                    <p className="text-lg font-black text-gray-900">
                      {parseFloat(expense.amount || 0).toLocaleString('fr-FR')} FCFA
                    </p>
                  </div>
                  
                  {expense.description && (
                    <p className="text-sm text-gray-600 mb-2">{expense.description}</p>
                  )}
                  
                  {expense.projects && (
                    <p className="text-xs text-gray-600 mb-2">
                      Projet : {projectDisplayLabel(expense.projects)}
                    </p>
                  )}
                  
                  {expense.receipt_url && (
                    <a
                      href={expense.receipt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-xs text-brand-500 font-medium"
                    >
                      <ImageIcon size={14} />
                      Voir justificatif
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Add Expense Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end z-50">
          <div className="w-full max-w-lg mx-auto bg-white rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Nouvelle dépense</h2>
              <button
                onClick={() => setShowAddForm(false)}
                className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">
                  Montant (FCFA)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-brand-500 focus:outline-none"
                  placeholder="0.00"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">
                  Catégorie
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setCategory(key as ExpenseCategory)}
                      className={`p-3 rounded-xl border-2 transition-all ${
                        category === key
                          ? 'border-brand-500 bg-brand-50'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${config.color}`}>
                        {config.icon}
                      </div>
                      <p className="text-xs font-bold text-gray-900">{config.label}</p>
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">
                  Projet
                </label>
                <p className="text-xs text-gray-500 mb-2">Nom du projet et date pour repérer facilement le chantier. Recommandé pour la marge.</p>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-brand-500 focus:outline-none"
                >
                  <option value="">Aucun projet</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {projectDisplayLabel(project)}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-brand-500 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">
                  Description (optionnel)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-brand-500 focus:outline-none resize-none"
                  placeholder="Détails de la dépense..."
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">
                  Justificatif (optionnel)
                </label>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="receipt-upload"
                  />
                  <label
                    htmlFor="receipt-upload"
                    className="cursor-pointer flex flex-col items-center gap-2"
                  >
                    {receiptFile ? (
                      <>
                        <ImageIcon size={32} className="text-brand-500" />
                        <p className="text-sm font-medium text-gray-900">{receiptFile.name}</p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setReceiptFile(null);
                          }}
                          className="text-xs text-red-500"
                        >
                          Supprimer
                        </button>
                      </>
                    ) : (
                      <>
                        <Upload size={32} className="text-gray-400" />
                        <p className="text-sm text-gray-500">Ajouter une photo du justificatif</p>
                      </>
                    )}
                  </label>
                </div>
              </div>
              
              <button
                type="submit"
                disabled={submitting || uploading || !amount}
                className="w-full bg-brand-500 text-white font-bold py-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Enregistrement...' : uploading ? 'Upload...' : 'Enregistrer la dépense'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
