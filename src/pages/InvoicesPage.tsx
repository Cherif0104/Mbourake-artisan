import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, FileText, Download, Mail, CheckCircle, Clock, 
  X, AlertCircle, Filter, DollarSign, Calendar, Eye, Printer
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { useToastContext } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft: { label: 'Brouillon', color: 'bg-gray-100 text-gray-600', icon: <FileText size={16} /> },
  sent: { label: 'Envoyée', color: 'bg-blue-100 text-blue-600', icon: <Mail size={16} /> },
  paid: { label: 'Payée', color: 'bg-green-100 text-green-600', icon: <CheckCircle size={16} /> },
  overdue: { label: 'En retard', color: 'bg-red-100 text-red-600', icon: <AlertCircle size={16} /> },
  cancelled: { label: 'Annulée', color: 'bg-gray-100 text-gray-500', icon: <X size={16} /> },
};

export function InvoicesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { info } = useToastContext();
  
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  useEffect(() => {
    if (!user || !profile) return;
    fetchInvoices();
  }, [user, profile, filterStatus]);

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
      console.error('Error fetching invoices:', error);
    } else {
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

  const handleSendInvoice = async (invoice: any) => {
    // TODO: Envoyer l'email avec la facture
    info('Envoi email à implémenter');
  };

  const totalInvoices = invoices.length;
  const totalAmount = invoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0);
  const paidAmount = invoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0);
  const pendingAmount = invoices
    .filter(inv => ['sent', 'overdue'].includes(inv.status))
    .reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-20 px-4 py-4 bg-white border-b border-gray-100 flex items-center gap-4">
        <button onClick={() => navigate('/dashboard')} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-gray-900">Mes factures</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 pb-32">
        {/* Stats Cards */}
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

        {/* Pending Amount Warning */}
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

        {/* Filters */}
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
          {Object.entries(STATUS_CONFIG).map(([key, config]) => (
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
          ))}
        </div>

        {/* Invoices List */}
        {invoices.length === 0 ? (
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
                  className="bg-white rounded-2xl p-4 border border-gray-100"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-gray-900">{invoice.invoice_number}</p>
                        <span className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${statusConfig.color}`}>
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
                        className="px-4 py-2 bg-blue-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                      >
                        <Mail size={16} />
                        Envoyer
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
