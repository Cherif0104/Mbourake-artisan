import React, { useEffect, useState } from 'react';
import { Search, DollarSign, Clock, CheckCircle, AlertCircle, ArrowUpRight, Shield, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Escrow {
  id: string;
  project_id: string;
  total_amount: number;
  platform_commission: number;
  artisan_payout: number;
  advance_paid: number;
  status: string;
  refund_status?: 'pending' | 'approved' | 'rejected' | null;
  refund_requested_at?: string;
  refund_requested_by?: string;
  refund_notes?: string;
  created_at: string;
  projects: { 
    title: string;
    project_number?: string;
    profiles: { full_name: string; email: string; phone?: string } | null;
  } | null;
}

export function AdminEscrows() {
  const [escrows, setEscrows] = useState<Escrow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedEscrow, setSelectedEscrow] = useState<Escrow | null>(null);

  useEffect(() => {
    fetchEscrows();
  }, []);

  const fetchEscrows = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('escrows')
      .select('*, projects(*, profiles(*))')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setEscrows(data);
    }
    setLoading(false);
  };

  const pendingRefunds = escrows.filter(e => e.refund_status === 'pending');
  
  const filteredEscrows = escrows.filter(escrow => {
    const matchesSearch = 
      escrow.projects?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      escrow.projects?.project_number?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || escrow.status === statusFilter || 
      (statusFilter === 'refund_pending' && escrow.refund_status === 'pending');
    return matchesSearch && matchesStatus;
  });

  const handleApproveRefund = async (escrowId: string, notes?: string) => {
    if (!confirm('Confirmez-vous l\'approbation de ce remboursement ?')) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    
    await supabase
      .from('escrows')
      .update({ 
        refund_status: 'approved',
        refund_approved_by: user?.id,
        refund_notes: notes || null,
        status: 'refunded'
      } as any)
      .eq('id', escrowId);
    
    // Log action
    try {
      await (supabase as any).rpc('log_escrow_action', {
        p_escrow_id: escrowId,
        p_user_id: user?.id,
        p_action: 'refund_approved',
        p_new_value: { refund_status: 'approved', status: 'refunded' },
        p_metadata: { notes: notes || null }
      });
    } catch (logErr) {
      console.error('Error logging refund approval:', logErr);
    }
    
    fetchEscrows();
    setSelectedEscrow(null);
    
    // Notification client
    const escrow = escrows.find(e => e.id === escrowId);
    if (escrow?.refund_requested_by) {
      await (supabase as any).from('notifications').insert({
        user_id: escrow.refund_requested_by,
        type: 'system',
        title: 'Remboursement approuvé',
        message: `Votre demande de remboursement pour le projet "${escrow.projects?.title}" a été approuvée.`,
        data: { project_id: escrow.project_id, escrow_id: escrowId }
      });
    }
  };

  const handleRejectRefund = async (escrowId: string, reason: string) => {
    if (!confirm('Confirmez-vous le rejet de ce remboursement ?')) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    
    await supabase
      .from('escrows')
      .update({ 
        refund_approved_by: user?.id,
        refund_notes: reason,
        status: 'active' // Utiliser status au lieu de refund_status qui n'existe pas dans le type
      } as any)
      .eq('id', escrowId);
    
    // Log action
    try {
      await (supabase as any).rpc('log_escrow_action', {
        p_escrow_id: escrowId,
        p_user_id: user?.id,
        p_action: 'refund_rejected',
        p_new_value: { status: 'active' },
        p_metadata: { reason }
      });
    } catch (logErr) {
      console.error('Error logging refund rejection:', logErr);
    }
    
    fetchEscrows();
    setSelectedEscrow(null);
    
    // Notification client
    const escrow = escrows.find(e => e.id === escrowId);
    if (escrow?.refund_requested_by) {
      await (supabase as any).from('notifications').insert({
        user_id: escrow.refund_requested_by,
        type: 'system',
        title: 'Remboursement refusé',
        message: `Votre demande de remboursement a été refusée. Raison: ${reason}`,
        data: { project_id: escrow.project_id, escrow_id: escrowId }
      });
    }
  };

  const totalHeld = escrows
    .filter(e => e.status === 'held')
    .reduce((sum, e) => sum + (e.total_amount || 0), 0);

  const totalReleased = escrows
    .filter(e => e.status === 'released')
    .reduce((sum, e) => sum + (e.total_amount || 0), 0);

  const totalCommission = escrows
    .filter(e => e.status === 'released')
    .reduce((sum, e) => sum + (e.platform_commission || 0), 0);

  const handleReleasePayment = async (escrowId: string) => {
    await supabase
      .from('escrows')
      .update({ status: 'released' })
      .eq('id', escrowId);
    fetchEscrows();
    setSelectedEscrow(null);
  };

  const handlePayAdvance = async (escrowId: string, amount: number) => {
    const escrow = escrows.find(e => e.id === escrowId);
    if (!escrow) return;

    await supabase
      .from('escrows')
      .update({ advance_paid: amount })
      .eq('id', escrowId);
    fetchEscrows();
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      held: 'bg-blue-100 text-blue-700',
      advance_paid: 'bg-purple-100 text-purple-700',
      released: 'bg-green-100 text-green-700',
      refunded: 'bg-red-100 text-red-700',
    };
    return styles[status] || 'bg-gray-100 text-gray-700';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'En attente',
      held: 'En garantie',
      advance_paid: 'Avance versée',
      released: 'Libéré',
      refunded: 'Remboursé',
    };
    return labels[status] || status;
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Shield size={24} />
            </div>
            <div>
              <p className="text-white/70 text-sm font-medium">Fonds en garantie</p>
              <p className="text-2xl font-black">{totalHeld.toLocaleString()} FCFA</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <CheckCircle size={24} />
            </div>
            <div>
              <p className="text-white/70 text-sm font-medium">Total libéré</p>
              <p className="text-2xl font-black">{totalReleased.toLocaleString()} FCFA</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-brand-500 to-brand-600 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-white/70 text-sm font-medium">Commissions gagnées</p>
              <p className="text-2xl font-black">{totalCommission.toLocaleString()} FCFA</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un projet..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-brand-500 focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-brand-500 focus:outline-none font-medium"
        >
          <option value="all">Tous les statuts</option>
          <option value="pending">En attente</option>
          <option value="held">En garantie</option>
          <option value="advance_paid">Avance versée</option>
          <option value="released">Libéré</option>
          <option value="refunded">Remboursé</option>
          <option value="refund_pending">Remboursements en attente ({pendingRefunds.length})</option>
        </select>
      </div>

      {/* Escrows List */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest">Projet</th>
              <th className="text-left px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest">Montant</th>
              <th className="text-left px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest">Commission</th>
              <th className="text-left px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest">Statut</th>
              <th className="text-left px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest">Date</th>
              <th className="text-right px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                  <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
                </td>
              </tr>
            ) : filteredEscrows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                  Aucun escrow trouvé
                </td>
              </tr>
            ) : (
              filteredEscrows.map((escrow) => (
                <tr key={escrow.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-bold text-gray-900">{escrow.projects?.title}</p>
                      <p className="text-sm text-gray-500">{escrow.projects?.profiles?.full_name}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-black text-gray-900">{escrow.total_amount?.toLocaleString()} FCFA</p>
                    {escrow.advance_paid > 0 && (
                      <p className="text-xs text-purple-600 font-bold">
                        Avance: {escrow.advance_paid.toLocaleString()} FCFA
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-brand-600">{escrow.platform_commission?.toLocaleString()} FCFA</p>
                    <p className="text-xs text-gray-400">
                      ({Math.round((escrow.platform_commission / escrow.total_amount) * 100)}%)
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${getStatusBadge(escrow.status)}`}>
                        {getStatusLabel(escrow.status)}
                      </span>
                      {escrow.refund_status === 'pending' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                          Remboursement demandé
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-500">
                      {new Date(escrow.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setSelectedEscrow(escrow)}
                      className="px-4 py-2 bg-brand-50 text-brand-600 font-bold text-sm rounded-lg hover:bg-brand-100 transition-colors"
                    >
                      Gérer
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Escrow Details Modal */}
      {selectedEscrow && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="mb-6">
              <span className={`inline-block px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider mb-3 ${getStatusBadge(selectedEscrow.status)}`}>
                {getStatusLabel(selectedEscrow.status)}
              </span>
              <h3 className="text-xl font-black text-gray-900">{selectedEscrow.projects?.title}</h3>
              <p className="text-sm text-gray-500 mt-1">Client: {selectedEscrow.projects?.profiles?.full_name}</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Montant total</span>
                <span className="font-black text-gray-900">{selectedEscrow.total_amount?.toLocaleString()} FCFA</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Commission ({Math.round((selectedEscrow.platform_commission / selectedEscrow.total_amount) * 100)}%)</span>
                <span className="font-bold text-brand-600">{selectedEscrow.platform_commission?.toLocaleString()} FCFA</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Paiement artisan</span>
                <span className="font-bold text-green-600">{selectedEscrow.artisan_payout?.toLocaleString()} FCFA</span>
              </div>
              {selectedEscrow.advance_paid > 0 && (
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-gray-500">Avance versée</span>
                  <span className="font-bold text-purple-600">{selectedEscrow.advance_paid.toLocaleString()} FCFA</span>
                </div>
              )}
            </div>

            {selectedEscrow.status === 'held' && (
              <div className="space-y-3 mb-6">
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Actions disponibles</p>
                
                {/* Pay Advance */}
                {selectedEscrow.advance_paid === 0 && (
                  <button
                    onClick={() => handlePayAdvance(selectedEscrow.id, selectedEscrow.total_amount * 0.4)}
                    className="w-full flex items-center justify-between p-4 bg-purple-50 text-purple-700 rounded-xl hover:bg-purple-100 transition-colors"
                  >
                    <div>
                      <p className="font-bold">Verser l'avance (40%)</p>
                      <p className="text-sm text-purple-500">{Math.round(selectedEscrow.total_amount * 0.4).toLocaleString()} FCFA</p>
                    </div>
                    <ArrowUpRight size={20} />
                  </button>
                )}
                
                {/* Release Full Payment */}
                <button
                  onClick={() => handleReleasePayment(selectedEscrow.id)}
                  className="w-full flex items-center justify-between p-4 bg-green-50 text-green-700 rounded-xl hover:bg-green-100 transition-colors"
                >
                  <div>
                    <p className="font-bold">Libérer le paiement complet</p>
                    <p className="text-sm text-green-500">{selectedEscrow.artisan_payout?.toLocaleString()} FCFA à l'artisan</p>
                  </div>
                  <CheckCircle size={20} />
                </button>
              </div>
            )}

            {selectedEscrow.refund_status === 'approved' && (
              <div className="p-4 bg-green-50 rounded-xl mb-6 flex items-center gap-3">
                <CheckCircle className="text-green-500" size={24} />
                <div>
                  <p className="font-bold text-green-700">Remboursement approuvé</p>
                  <p className="text-sm text-green-600">Le remboursement a été traité</p>
                </div>
              </div>
            )}

            {selectedEscrow.refund_status === 'rejected' && selectedEscrow.refund_notes && (
              <div className="p-4 bg-red-50 rounded-xl mb-6 flex items-start gap-3">
                <X className="text-red-500 mt-0.5" size={24} />
                <div>
                  <p className="font-bold text-red-700">Remboursement refusé</p>
                  <p className="text-sm text-red-600 mt-1">Raison: {selectedEscrow.refund_notes}</p>
                </div>
              </div>
            )}

            {selectedEscrow.status === 'released' && !selectedEscrow.refund_status && (
              <div className="p-4 bg-green-50 rounded-xl mb-6 flex items-center gap-3">
                <CheckCircle className="text-green-500" size={24} />
                <div>
                  <p className="font-bold text-green-700">Paiement libéré</p>
                  <p className="text-sm text-green-600">L'artisan a reçu son paiement</p>
                </div>
              </div>
            )}

            <button
              onClick={() => setSelectedEscrow(null)}
              className="w-full py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
