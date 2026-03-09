import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, FileText, Download, Mail, CheckCircle, Clock, 
  X, AlertCircle, DollarSign, Eye, Printer, Lock, Unlock, Info
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { useToastContext } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';
import { LoadingOverlay } from '../components/LoadingOverlay';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft: { label: 'Brouillon', color: 'bg-gray-100 text-gray-600 border border-gray-200', icon: <FileText size={16} /> },
  sent: { label: 'Envoyée', color: 'bg-blue-50 text-blue-700 border border-blue-100', icon: <Mail size={16} /> },
  paid: { label: 'Payée', color: 'bg-green-100 text-green-700 border border-green-200', icon: <CheckCircle size={16} /> },
  overdue: { label: 'En retard', color: 'bg-red-50 text-red-700 border border-red-100', icon: <AlertCircle size={16} /> },
  cancelled: { label: 'Annulée', color: 'bg-gray-100 text-gray-500 border border-gray-200', icon: <X size={16} /> },
};

type WorkflowStage = {
  step: number;
  key: string;
  clientLabel: string;
  artisanLabel: string;
  color: string;
  icon: React.ReactNode;
};

/** Workflow paiement : 1) Séquestration (client paie) 2) Déblocage en cours (validation admin) 3) Versé à l'artisan (commission déduite) 4) Litige → admin */
const WORKFLOW_STAGE_BY_ESCROW_STATUS: Record<string, WorkflowStage> = {
  pending: {
    step: 1,
    key: 'pending',
    clientLabel: 'En attente de paiement',
    artisanLabel: 'En attente paiement client',
    color: 'bg-gray-100 text-gray-600 border border-gray-200',
    icon: <Clock size={16} />,
  },
  held: {
    step: 2,
    key: 'held',
    clientLabel: 'Séquestration – Déblocage en cours (validation admin)',
    artisanLabel: 'Séquestration – En attente déblocage par l\'admin',
    color: 'bg-blue-50 text-blue-700 border border-blue-100',
    icon: <Lock size={16} />,
  },
  advance_paid: {
    step: 2,
    key: 'advance_paid',
    clientLabel: 'Séquestration – Déblocage en cours (validation admin)',
    artisanLabel: 'Séquestration – En attente déblocage par l\'admin',
    color: 'bg-blue-50 text-blue-700 border border-blue-100',
    icon: <Lock size={16} />,
  },
  released: {
    step: 3,
    key: 'released',
    clientLabel: 'Déblocage effectué – Versé à l\'artisan',
    artisanLabel: 'Versé à l\'artisan (commission déduite)',
    color: 'bg-green-100 text-green-700 border border-green-200',
    icon: <Unlock size={16} />,
  },
  frozen: {
    step: 4,
    key: 'frozen',
    clientLabel: 'Litige – Prise en charge par l\'admin',
    artisanLabel: 'Litige – Prise en charge par l\'admin',
    color: 'bg-amber-50 text-amber-700 border border-amber-200',
    icon: <AlertCircle size={16} />,
  },
  refunded: {
    step: 4,
    key: 'refunded',
    clientLabel: 'Remboursé',
    artisanLabel: 'Remboursé',
    color: 'bg-gray-100 text-gray-600 border border-gray-200',
    icon: <X size={16} />,
  },
};

const getWorkflowStage = (status: string | null | undefined, role: 'client' | 'artisan') => {
  const stage = WORKFLOW_STAGE_BY_ESCROW_STATUS[status || 'pending'] || WORKFLOW_STAGE_BY_ESCROW_STATUS.pending;
  return {
    ...stage,
    label: role === 'client' ? stage.clientLabel : stage.artisanLabel,
  };
};

export function InvoicesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { info } = useToastContext();
  const paymentsSectionRef = useRef<HTMLElement>(null);

  const [invoices, setInvoices] = useState<any[]>([]);
  const [prestations, setPrestations] = useState<Array<{ escrow: any; project: any }>>([]);
  const [clientPaiements, setClientPaiements] = useState<Array<{ escrow: any; project: any }>>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [tableUnavailable, setTableUnavailable] = useState(false);

  const navState = (location.state as {
    fromPaymentNotification?: boolean;
    project_id?: string;
    source?: 'notifications' | 'dashboard' | 'invoices';
    focus?: 'payments' | 'workflow' | 'expenses';
  } | null) || null;
  const fromPaymentNotification = !!navState?.fromPaymentNotification;
  const highlightProjectId = navState?.project_id;

  useEffect(() => {
    if (!user || !profile) return;
    fetchInvoices();
    if (profile.role === 'artisan') fetchPrestations();
    if (profile.role === 'client') fetchClientPaiements();
  }, [user, profile, filterStatus]);

  // Quand on arrive depuis la notification "Paiement reçu", scroll vers la section Paiements reçus
  useEffect(() => {
    const shouldFocusPayments = fromPaymentNotification || navState?.focus === 'payments';
    if (!shouldFocusPayments || loading || !paymentsSectionRef.current) return;
    paymentsSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [fromPaymentNotification, navState?.focus, loading]);

  const fetchPrestations = async () => {
    if (!user || profile?.role !== 'artisan') return;
    const { data: acceptedQuotes } = await supabase
      .from('quotes')
      .select('project_id')
      .eq('artisan_id', user.id)
      .eq('status', 'accepted');
    const projectIds = (acceptedQuotes || []).map(q => q.project_id).filter(Boolean);
    if (projectIds.length === 0) {
      setPrestations([]);
      return;
    }
    const { data: escrowsData } = await supabase
      .from('escrows')
      .select('*, projects(id, title, project_number, status)')
      .in('project_id', projectIds)
      .order('created_at', { ascending: false });
    setPrestations((escrowsData || []).map(e => ({ escrow: e, project: e.projects })));
  };

  const fetchClientPaiements = async () => {
    if (!user || profile?.role !== 'client') return;
    const { data: projectsData } = await supabase
      .from('projects')
      .select('id')
      .eq('client_id', user.id);
    const projectIds = (projectsData || []).map((p: any) => p.id).filter(Boolean);
    if (projectIds.length === 0) {
      setClientPaiements([]);
      return;
    }
    const { data: escrowsData } = await supabase
      .from('escrows')
      .select('*, projects(id, title, project_number, status)')
      .in('project_id', projectIds)
      .order('created_at', { ascending: false });
    setClientPaiements((escrowsData || []).map((e: any) => ({ escrow: e, project: e.projects })));
  };

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const thisYearStart = new Date(now.getFullYear(), 0, 1).toISOString();
  const totalReleased = prestations
    .filter(({ escrow }) => escrow?.status === 'released')
    .reduce((sum, { escrow }) => sum + Number(escrow?.artisan_payout ?? escrow?.total_amount ?? 0), 0);
  const releasedThisMonth = prestations
    .filter(({ escrow }) => escrow?.status === 'released' && (escrow?.updated_at && new Date(escrow.updated_at) >= new Date(thisMonthStart)))
    .reduce((sum, { escrow }) => sum + Number(escrow?.artisan_payout ?? escrow?.total_amount ?? 0), 0);
  const releasedThisYear = prestations
    .filter(({ escrow }) => escrow?.status === 'released' && (escrow?.updated_at && new Date(escrow.updated_at) >= new Date(thisYearStart)))
    .reduce((sum, { escrow }) => sum + Number(escrow?.artisan_payout ?? escrow?.total_amount ?? 0), 0);

  const fetchInvoices = async () => {
    if (!user || !profile) return;
    
    setLoading(true);
    
    let query;
    if (profile.role === 'client') {
      query = supabase
        .from('invoices')
        .select('*, projects(title, project_number), profiles!invoices_artisan_id_fkey(full_name)')
        .eq('client_id', user.id);
    } else if (profile.role === 'artisan') {
      query = supabase
        .from('invoices')
        .select('*, projects(title, project_number), profiles!invoices_client_id_fkey(full_name)')
        .eq('artisan_id', user.id);
    } else {
      setLoading(false);
      return;
    }

    if (filterStatus !== 'all') {
      query = query.eq('status', filterStatus);
    }

    const { data, error } = await query.order('issue_date', { ascending: false });
    
    if (error) {
      const err = error as { code?: string; status?: number; message?: string };
      const msg = typeof err?.message === 'string' ? err.message : '';
      const is404 = err?.status === 404 || err?.code === '42P01' || err?.code === 'PGRST116'
        || msg.includes('does not exist') || msg.includes('relation') || msg.toLowerCase().includes('42p01');
      setTableUnavailable(is404);
      setInvoices([]);
    } else {
      setTableUnavailable(false);
      setInvoices(data || []);
    }
    setLoading(false);
  };

  const handleDownloadPDF = async (invoice: any) => {
    if (invoice.pdf_url) {
      window.open(invoice.pdf_url, '_blank');
      return;
    }
    
    // Générer le PDF avec jspdf
    const { downloadInvoicePDF } = await import('../lib/invoicePdfGenerator');
    
    const invoiceData = {
      invoice_number: invoice.invoice_number || `INV-${invoice.id.slice(0, 8).toUpperCase()}`,
      issue_date: invoice.issue_date || invoice.created_at,
      due_date: invoice.due_date || null,
      client_name: profile?.role === 'client' 
        ? profile.full_name 
        : invoice.profiles?.full_name,
      client_address: null,
      client_phone: profile?.role === 'client' ? profile.phone : null,
      client_email: user?.email || null,
      artisan_name: profile?.role === 'artisan'
        ? profile.full_name
        : invoice.profiles?.full_name,
      artisan_address: null,
      artisan_phone: profile?.role === 'artisan' ? profile.phone : null,
      artisan_email: null,
      project_title: invoice.projects?.title || 'Projet',
      project_number: invoice.projects?.project_number || null,
      items: null, // Peut être étendu plus tard
      subtotal: parseFloat(invoice.subtotal_amount || invoice.total_amount || 0),
      tax_amount: parseFloat(invoice.tax_amount || 0),
      tax_percent: invoice.tax_percent || null,
      total_amount: parseFloat(invoice.total_amount || 0),
      status: invoice.status || 'sent',
      notes: invoice.notes || null,
    };
    
    downloadInvoicePDF(invoiceData);
  };

  const handleSendInvoice = async (_invoice: any) => {
    // Envoi par email non implémenté : à brancher sur un service (Resend, SendGrid, etc.)
    info('Envoi de la facture par email : bientôt disponible.');
  };

  const totalInvoices = invoices.length;
  const totalAmount = invoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0);
  const paidAmount = invoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0);
  const pendingAmount = invoices
    .filter(inv => ['sent', 'overdue'].includes(inv.status))
    .reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0);

  const workflowDataset = profile?.role === 'client' ? clientPaiements : prestations;
  const highlightedWorkflowItem = workflowDataset.find(({ project }) => highlightProjectId && project?.id === highlightProjectId);
  const workflowItem = highlightedWorkflowItem || workflowDataset[0] || null;
  const workflowStatusKey = workflowItem
    ? (workflowItem.project?.status === 'disputed' ? 'frozen' : workflowItem.escrow?.status) || 'pending'
    : 'pending';
  const workflowRole = profile?.role === 'client' ? 'client' : 'artisan';
  const currentWorkflowStage = getWorkflowStage(workflowStatusKey, workflowRole);
  const workflowSteps = [
    { step: 1, label: 'Paiement initié' },
    { step: 2, label: 'Séquestration / validation admin' },
    { step: 3, label: 'Déblocage / versement' },
    { step: 4, label: 'Clôture / litige' },
  ];

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
          <h1 className="font-bold text-gray-900">Mes factures</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 pb-32">
        {/* Bandeau workflow guidé */}
        <section className="mb-6 bg-white rounded-2xl p-4 border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Workflow financier</p>
              <h2 className="font-bold text-gray-900">
                {profile?.role === 'artisan' ? 'Paiements reçus -> Dépenses -> Solde' : 'Paiements effectués -> Dépenses -> Suivi'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {workflowItem?.project?.title
                  ? `Projet actif: ${workflowItem.project.title}`
                  : 'Aucun projet sélectionné. Les étapes s’actualisent automatiquement.'}
              </p>
            </div>
            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 flex-shrink-0 ${currentWorkflowStage.color}`}>
              {currentWorkflowStage.icon}
              {currentWorkflowStage.label}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2 my-3">
            {workflowSteps.map((s) => (
              <div key={s.step} className={`rounded-lg px-2 py-2 text-center border text-[11px] font-medium ${
                currentWorkflowStage.step >= s.step
                  ? 'bg-brand-50 border-brand-100 text-brand-700'
                  : 'bg-gray-50 border-gray-100 text-gray-500'
              }`}>
                <p className="font-bold">Étape {s.step}</p>
                <p>{s.label}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            {workflowItem?.project?.id && (
              <button
                type="button"
                onClick={() => navigate(`/projects/${workflowItem.project.id}`)}
                className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-bold"
              >
                Voir le projet
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate(`/expenses?projectId=${encodeURIComponent(highlightProjectId || workflowItem?.project?.id || '')}`, {
                state: { source: 'invoices', focus: 'add-expense', project_id: highlightProjectId || workflowItem?.project?.id || null },
              })}
              className="flex-1 px-3 py-2 bg-brand-500 text-white rounded-xl text-sm font-bold"
            >
              Continuer vers Dépenses
            </button>
          </div>
        </section>

        {/* Paiements effectués (client) — tous les paiements / dépenses par projet (escrow) */}
        {profile?.role === 'client' && (
          <section className="mb-6">
            <h2 className="font-bold text-gray-900 mb-3">Paiements effectués</h2>
            <p className="text-sm text-gray-500 mb-3">Tous vos paiements par projet (garantie puis déblocage). Chaque prestation est liée à un projet.</p>
            {clientPaiements.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 border border-gray-100 text-center">
                <DollarSign size={32} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">Aucun paiement pour le moment.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {clientPaiements.map(({ escrow, project }) => {
                  const statusKey = (project?.status === 'disputed' ? 'frozen' : escrow?.status) || 'pending';
                  const config = getWorkflowStage(statusKey, 'client');
                  const total = Number(escrow?.total_amount ?? 0);
                  return (
                    <div
                      key={escrow.id}
                      className="bg-white rounded-2xl p-4 border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="font-bold text-gray-900 truncate">{project?.title || project?.project_number || 'Projet'}</p>
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 flex-shrink-0 ${config.color}`}>
                          {config.icon}
                          {config.label}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-700">
                        <span>Montant payé</span>
                        <span className="font-bold">{total.toLocaleString('fr-FR')} FCFA</span>
                      </div>
                      {project?.id && (
                        <button
                          type="button"
                          onClick={() => navigate(`/projects/${project.id}`)}
                          className="mt-2 text-xs text-brand-500 font-bold hover:underline"
                        >
                          Voir le projet
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Paiements reçus (artisan) — tous les paiements reçus par projet (escrow) */}
        {profile?.role === 'artisan' && (
          <section ref={paymentsSectionRef} className="mb-6 scroll-mt-4">
            <h2 className="font-bold text-gray-900 mb-3">Paiements reçus</h2>
            <p className="text-sm text-gray-500 mb-3">Tous vos paiements reçus par projet. Coût de la prestation, commission prélevée et montant net versé (déblocage escrow). Chaque prestation est liée à un projet.</p>

            {/* Solde : total, ce mois, cette année */}
            {(totalReleased > 0 || releasedThisMonth > 0 || releasedThisYear > 0) && (
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-white rounded-2xl p-4 border border-gray-100 text-center">
                  <p className="text-xs text-gray-500 font-medium">Total versé</p>
                  <p className="text-lg font-black text-gray-900">{totalReleased.toLocaleString('fr-FR')} FCFA</p>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-gray-100 text-center">
                  <p className="text-xs text-gray-500 font-medium">Ce mois</p>
                  <p className="text-lg font-black text-brand-600">{releasedThisMonth.toLocaleString('fr-FR')} FCFA</p>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-gray-100 text-center">
                  <p className="text-xs text-gray-500 font-medium">Cette année</p>
                  <p className="text-lg font-black text-green-600">{releasedThisYear.toLocaleString('fr-FR')} FCFA</p>
                </div>
              </div>
            )}

            {prestations.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 border border-gray-100 text-center">
                <DollarSign size={32} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">Aucune prestation avec paiement pour le moment.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {prestations.map(({ escrow, project }) => {
                  const statusKey = (project?.status === 'disputed' ? 'frozen' : escrow?.status) || 'pending';
                  const config = getWorkflowStage(statusKey, 'artisan');
                  const total = Number(escrow?.total_amount ?? 0);
                  const net = escrow?.artisan_payout != null ? Number(escrow.artisan_payout) : total;
                  const fees = total - net;
                  const isHighlighted = highlightProjectId && project?.id === highlightProjectId;
                  return (
                    <div
                      key={escrow.id}
                      className={`bg-white rounded-2xl p-4 border shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all ${
                        isHighlighted ? 'border-brand-400 ring-2 ring-brand-200' : 'border-gray-100'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="font-bold text-gray-900 truncate">{project?.title || project?.project_number || 'Projet'}</p>
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 flex-shrink-0 ${config.color}`}>
                          {config.icon}
                          {config.label}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between text-gray-600">
                          <span>Coût prestation</span>
                          <span className="font-medium">{total.toLocaleString('fr-FR')} FCFA</span>
                        </div>
                        {fees > 0 && (
                          <div className="flex justify-between text-gray-500">
                            <span>Commission / frais</span>
                            <span className="font-medium">− {fees.toLocaleString('fr-FR')} FCFA</span>
                          </div>
                        )}
                        <div className="flex justify-between text-gray-900 font-bold pt-1 border-t border-gray-100">
                          <span>Net reçu</span>
                          <span className="text-green-600">{net.toLocaleString('fr-FR')} FCFA</span>
                        </div>
                      </div>
                      {project?.id && (
                        <button
                          type="button"
                          onClick={() => navigate(`/projects/${project.id}`)}
                          className="mt-2 text-xs text-brand-500 font-bold hover:underline"
                        >
                          Voir le projet
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Stats + Filtres + Liste factures : masqués pour l'artisan si table indisponible (workflow = escrow uniquement) */}
        {!(profile?.role === 'artisan' && tableUnavailable) && (
          <>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white rounded-2xl p-4 border border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <FileText size={18} className="text-brand-500" />
                  <p className="text-xs text-gray-500 font-medium">Total factures</p>
                </div>
                <p className="text-2xl font-black text-gray-900">{totalInvoices}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {totalAmount.toLocaleString('fr-FR')} FCFA
                </p>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle size={18} className="text-green-500" />
                  <p className="text-xs text-gray-500 font-medium">Payées</p>
                </div>
                <p className="text-2xl font-black text-green-600">
                  {paidAmount.toLocaleString('fr-FR')} FCFA
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {invoices.filter(i => i.status === 'paid').length} facture(s)
                </p>
              </div>
            </div>

            {pendingAmount > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
                <AlertCircle size={20} className="text-yellow-600 flex-shrink-0" />
                <div>
                  <p className="font-bold text-yellow-800 text-sm">En attente de paiement</p>
                  <p className="text-sm text-yellow-700">
                    {pendingAmount.toLocaleString('fr-FR')} FCFA
                  </p>
                </div>
              </div>
            )}

            {/* Filtres : simplifiés pour l'artisan (Toutes / Payées uniquement) */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  filterStatus === 'all'
                    ? 'bg-brand-500 text-white'
                    : 'bg-white border border-gray-200 text-gray-600'
                }`}
              >
                Toutes
              </button>
              {profile?.role === 'artisan' ? (
                <button
                  onClick={() => setFilterStatus('paid')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                    filterStatus === 'paid'
                      ? 'bg-brand-500 text-white'
                      : 'bg-white border border-gray-200 text-gray-600'
                  }`}
                >
                  {STATUS_CONFIG.paid.icon}
                  {STATUS_CONFIG.paid.label}
                </button>
              ) : (
                Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => setFilterStatus(key)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                      filterStatus === key
                        ? 'bg-brand-500 text-white'
                        : 'bg-white border border-gray-200 text-gray-600'
                    }`}
                  >
                    {config.icon}
                    {config.label}
                  </button>
                ))
              )}
            </div>
          </>
        )}

        {/* Message artisan quand table factures indisponible */}
        {profile?.role === 'artisan' && tableUnavailable && (
          <p className="text-sm text-gray-500 mb-4 text-center">
            Le détail des factures (brouillon, envoyée, etc.) sera disponible lorsque le module sera activé. En attendant, vos paiements reçus ci-dessus reflètent les déblocages escrow.
          </p>
        )}

        {/* Invoices List (caché pour artisan si table factures indisponible) */}
        {profile?.role === 'artisan' && tableUnavailable ? null : tableUnavailable ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
            <FileText size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium">Factures en préparation</p>
            <p className="text-sm text-gray-400 mt-1">
              Le module factures sera bientôt disponible.
            </p>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="mt-4 px-4 py-2 bg-brand-500 text-white rounded-xl text-sm font-medium"
            >
              Retour au tableau de bord
            </button>
          </div>
        ) : invoices.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
            <FileText size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium">Aucune facture</p>
            <p className="text-sm text-gray-400 mt-1">
              Les factures seront générées automatiquement après la fin des projets
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {invoices.map((invoice) => {
              const statusConfig = STATUS_CONFIG[invoice.status] || STATUS_CONFIG.draft;
              
              return (
                <div
                  key={invoice.id}
                  className="bg-white rounded-2xl p-4 border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-gray-900">{invoice.invoice_number}</p>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${statusConfig.color}`}>
                          {statusConfig.icon}
                          {statusConfig.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {invoice.projects?.title || invoice.projects?.project_number || 'Projet'}
                      </p>
                      {profile?.role === 'client' && invoice.profiles && (
                        <p className="text-xs text-gray-400 mt-1">
                          Artisan: {invoice.profiles.full_name}
                        </p>
                      )}
                      {profile?.role === 'artisan' && invoice.profiles && (
                        <p className="text-xs text-gray-400 mt-1">
                          Client: {invoice.profiles.full_name}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-gray-900">
                        {parseFloat(invoice.total_amount || 0).toLocaleString('fr-FR')} FCFA
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(invoice.issue_date).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  
                  {/* Invoice Details */}
                  <div className="border-t border-gray-50 pt-3 mt-3 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Montant HT:</span>
                      <span className="font-medium">{parseFloat(invoice.base_amount || 0).toLocaleString('fr-FR')} FCFA</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">TVA ({invoice.tva_percent || 18}%):</span>
                      <span className="font-medium">{parseFloat(invoice.tva_amount || 0).toLocaleString('fr-FR')} FCFA</span>
                    </div>
                    {invoice.due_date && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Échéance:</span>
                        <span className={`font-medium ${
                          invoice.status === 'overdue' ? 'text-red-600' : 'text-gray-700'
                        }`}>
                          {new Date(invoice.due_date).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    )}
                    {invoice.payment_date && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Payée le:</span>
                        <span className="font-medium text-green-600">
                          {new Date(invoice.payment_date).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => setSelectedInvoice(invoice)}
                      className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                    >
                      <Eye size={16} />
                      Détails
                    </button>
                    {invoice.pdf_url && (
                      <button
                        onClick={() => handleDownloadPDF(invoice)}
                        className="px-4 py-2 bg-brand-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                      >
                        <Download size={16} />
                        PDF
                      </button>
                    )}
                    {invoice.status === 'sent' && profile?.role === 'artisan' && (
                      <button
                        onClick={() => handleSendInvoice(invoice)}
                        title="Envoi par email : bientôt disponible"
                        className="px-4 py-2 bg-gray-300 text-gray-600 rounded-xl font-bold text-sm flex items-center justify-center gap-2 cursor-not-allowed"
                        disabled
                      >
                        <Mail size={16} />
                        Envoyer (bientôt)
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end z-50">
          <div className="w-full max-w-lg mx-auto bg-white rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Détails facture</h2>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-400 uppercase font-bold mb-1">Numéro</p>
                <p className="text-lg font-bold text-gray-900">{selectedInvoice.invoice_number}</p>
              </div>
              
              <div>
                <p className="text-xs text-gray-400 uppercase font-bold mb-1">Projet</p>
                <p className="text-gray-900">{selectedInvoice.projects?.title || selectedInvoice.projects?.project_number}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-400 uppercase font-bold mb-1">Date d'émission</p>
                  <p className="text-gray-900">
                    {new Date(selectedInvoice.issue_date).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                {selectedInvoice.due_date && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase font-bold mb-1">Date d'échéance</p>
                    <p className={`font-medium ${
                      selectedInvoice.status === 'overdue' ? 'text-red-600' : 'text-gray-900'
                    }`}>
                      {new Date(selectedInvoice.due_date).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="border-t border-gray-100 pt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Montant HT</span>
                  <span className="font-bold">{parseFloat(selectedInvoice.base_amount || 0).toLocaleString('fr-FR')} FCFA</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">TVA ({selectedInvoice.tva_percent || 18}%)</span>
                  <span className="font-bold">{parseFloat(selectedInvoice.tva_amount || 0).toLocaleString('fr-FR')} FCFA</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-100">
                  <span className="font-bold text-gray-900">Total TTC</span>
                  <span className="text-xl font-black text-brand-600">
                    {parseFloat(selectedInvoice.total_amount || 0).toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
              </div>
              
              <div>
                <p className="text-xs text-gray-400 uppercase font-bold mb-1">Statut</p>
                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-bold ${
                  STATUS_CONFIG[selectedInvoice.status]?.color || STATUS_CONFIG.draft.color
                }`}>
                  {STATUS_CONFIG[selectedInvoice.status]?.icon || STATUS_CONFIG.draft.icon}
                  {STATUS_CONFIG[selectedInvoice.status]?.label || selectedInvoice.status}
                </span>
              </div>
              
              {selectedInvoice.payment_date && (
                <div>
                  <p className="text-xs text-gray-400 uppercase font-bold mb-1">Date de paiement</p>
                  <p className="text-green-600 font-medium">
                    {new Date(selectedInvoice.payment_date).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              )}
              
              {selectedInvoice.payment_method && (
                <div>
                  <p className="text-xs text-gray-400 uppercase font-bold mb-1">Méthode de paiement</p>
                  <p className="text-gray-900 capitalize">{selectedInvoice.payment_method}</p>
                </div>
              )}
              
              {selectedInvoice.notes && (
                <div>
                  <p className="text-xs text-gray-400 uppercase font-bold mb-1">Notes</p>
                  <p className="text-gray-700">{selectedInvoice.notes}</p>
                </div>
              )}
              
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                {selectedInvoice.pdf_url && (
                  <button
                    onClick={() => handleDownloadPDF(selectedInvoice)}
                    className="flex-1 bg-brand-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
                  >
                    <Download size={18} />
                    Télécharger PDF
                  </button>
                )}
                <button
                  onClick={() => window.print()}
                  className="px-6 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl flex items-center justify-center gap-2"
                >
                  <Printer size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
