import React, { useEffect, useState } from 'react';
import { 
  Search, AlertTriangle, CheckCircle, XCircle, Clock, User, 
  MessageSquare, Phone, CreditCard, FileText, ChevronRight,
  X, DollarSign, ArrowRight, Loader2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface DisputedProject {
  id: string;
  title: string;
  project_number: string;
  status: string;
  created_at: string;
  location: string | null;
  client: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    avatar_url: string | null;
  } | null;
  artisan: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    avatar_url: string | null;
  } | null;
  escrow: {
    id: string;
    total_amount: number;
    status: string;
    artisan_payout: number;
    commission_amount: number;
  } | null;
  category: { name: string } | null;
}

type Resolution = 'refund_client' | 'pay_artisan' | 'split';

export function AdminDisputes() {
  const [disputes, setDisputes] = useState<DisputedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState<DisputedProject | null>(null);
  const [resolution, setResolution] = useState<Resolution>('pay_artisan');
  const [splitPercent, setSplitPercent] = useState(50);
  const [resolutionNote, setResolutionNote] = useState('');
  const [resolving, setResolving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchDisputes();
  }, []);

  const fetchDisputes = async () => {
    setLoading(true);
    
    // Fetch disputed projects with related data
    const { data: projects, error } = await supabase
      .from('projects')
      .select(`
        id, title, project_number, status, created_at, location,
        categories (name),
        profiles!projects_client_id_fkey (id, full_name, email, phone, avatar_url)
      `)
      .eq('status', 'disputed')
      .order('created_at', { ascending: false }) as { data: any[], error: any };

    if (error) {
      console.error('Error fetching disputes:', error);
      setLoading(false);
      return;
    }

    // For each project, get the accepted quote's artisan and escrow
    const enrichedProjects = await Promise.all(
      (projects || []).map(async (project: any) => {
        // Get accepted quote with artisan info
        const { data: quote } = await supabase
          .from('quotes')
          .select(`
            artisan_id,
            profiles!quotes_artisan_id_fkey (id, full_name, email, phone, avatar_url)
          `)
          .eq('project_id', project.id)
          .eq('status', 'accepted')
          .single() as { data: any };

        // Get escrow info
        const { data: escrow } = await supabase
          .from('escrows')
          .select('*')
          .eq('project_id', project.id)
          .single();

        return {
          id: project.id,
          title: project.title,
          project_number: project.project_number,
          status: project.status,
          created_at: project.created_at,
          location: project.location,
          client: project.profiles,
          artisan: quote?.profiles || null,
          escrow: escrow,
          category: project.categories,
        };
      })
    );

    setDisputes(enrichedProjects);
    setLoading(false);
  };

  const handleResolve = async () => {
    if (!selectedDispute || !selectedDispute.escrow) return;
    
    setResolving(true);
    
    try {
      const escrow = selectedDispute.escrow;
      let clientRefund = 0;
      let artisanPayment = 0;
      let escrowStatus = 'completed';
      
      switch (resolution) {
        case 'refund_client':
          clientRefund = escrow.total_amount;
          artisanPayment = 0;
          escrowStatus = 'refunded';
          break;
        case 'pay_artisan':
          clientRefund = 0;
          artisanPayment = escrow.artisan_payout;
          escrowStatus = 'completed';
          break;
        case 'split':
          const clientShare = escrow.total_amount * (splitPercent / 100);
          clientRefund = clientShare;
          artisanPayment = escrow.total_amount - clientShare - escrow.commission_amount;
          escrowStatus = 'completed';
          break;
      }
      
      // Update escrow
      await supabase
        .from('escrows')
        .update({
          status: escrowStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', escrow.id);
      
      // Update project status
      await supabase
        .from('projects')
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedDispute.id);
      
      // Notify client
      await supabase.from('notifications').insert({
        user_id: selectedDispute.client?.id,
        type: 'system',
        title: 'Litige résolu',
        message: resolutionNote || `Le litige pour "${selectedDispute.title}" a été résolu.` + 
          (clientRefund > 0 ? ` Remboursement: ${clientRefund.toLocaleString('fr-FR')} FCFA.` : ''),
        data: { project_id: selectedDispute.id },
      });
      
      // Notify artisan
      if (selectedDispute.artisan?.id) {
        await supabase.from('notifications').insert({
          user_id: selectedDispute.artisan.id,
          type: 'system',
          title: 'Litige résolu',
          message: resolutionNote || `Le litige pour "${selectedDispute.title}" a été résolu.` +
            (artisanPayment > 0 ? ` Paiement: ${artisanPayment.toLocaleString('fr-FR')} FCFA.` : ''),
          data: { project_id: selectedDispute.id },
        });
      }
      
      // Refresh list
      fetchDisputes();
      setSelectedDispute(null);
      setResolutionNote('');
      
    } catch (err) {
      console.error('Error resolving dispute:', err);
      alert('Erreur lors de la résolution du litige');
    }
    
    setResolving(false);
  };

  const filteredDisputes = disputes.filter(d =>
    d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.project_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.client?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.artisan?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-red-50 border border-red-100 rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertTriangle size={24} className="text-red-600" />
            </div>
            <div>
              <p className="text-3xl font-black text-red-700">{disputes.length}</p>
              <p className="text-sm font-bold text-red-600">Litiges en cours</p>
            </div>
          </div>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
              <CreditCard size={24} className="text-yellow-600" />
            </div>
            <div>
              <p className="text-3xl font-black text-yellow-700">
                {disputes.reduce((sum, d) => sum + (d.escrow?.total_amount || 0), 0).toLocaleString('fr-FR')}
              </p>
              <p className="text-sm font-bold text-yellow-600">FCFA bloqués</p>
            </div>
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Clock size={24} className="text-blue-600" />
            </div>
            <div>
              <p className="text-3xl font-black text-blue-700">
                {disputes.length > 0 ? Math.floor((Date.now() - new Date(disputes[disputes.length - 1]?.created_at || Date.now()).getTime()) / (1000 * 60 * 60 * 24)) : 0}
              </p>
              <p className="text-sm font-bold text-blue-600">Jours (plus ancien)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher par projet, client ou artisan..."
          className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-brand-500 focus:outline-none"
        />
      </div>

      {/* Disputes List */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        {loading ? (
          <div className="px-6 py-12 text-center">
            <Loader2 size={32} className="text-brand-500 animate-spin mx-auto" />
          </div>
        ) : filteredDisputes.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <AlertTriangle size={48} className="text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">Aucun litige en cours</p>
            <p className="text-sm text-gray-400">Tous les projets se passent bien !</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filteredDisputes.map((dispute) => (
              <div
                key={dispute.id}
                className="p-6 hover:bg-red-50/30 transition-colors cursor-pointer"
                onClick={() => setSelectedDispute(dispute)}
              >
                <div className="flex items-start gap-4">
                  {/* Alert Icon */}
                  <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <AlertTriangle size={24} className="text-red-600" />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="font-bold text-gray-900 mb-1">{dispute.title}</h4>
                        <p className="text-xs text-gray-400 font-mono">{dispute.project_number}</p>
                      </div>
                      <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                        En litige
                      </span>
                    </div>
                    
                    <div className="mt-3 flex items-center gap-6 text-sm">
                      {/* Client */}
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                          {dispute.client?.avatar_url ? (
                            <img src={dispute.client.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User size={12} className="text-gray-400" />
                          )}
                        </div>
                        <span className="text-gray-600">{dispute.client?.full_name || 'Client'}</span>
                      </div>
                      
                      <ArrowRight size={14} className="text-gray-300" />
                      
                      {/* Artisan */}
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                          {dispute.artisan?.avatar_url ? (
                            <img src={dispute.artisan.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User size={12} className="text-gray-400" />
                          )}
                        </div>
                        <span className="text-gray-600">{dispute.artisan?.full_name || 'Artisan'}</span>
                      </div>
                    </div>
                    
                    {/* Escrow Info */}
                    {dispute.escrow && (
                      <div className="mt-3 flex items-center gap-4">
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full flex items-center gap-1">
                          <DollarSign size={12} />
                          {dispute.escrow.total_amount.toLocaleString('fr-FR')} FCFA bloqués
                        </span>
                        <span className="text-xs text-gray-400">
                          Depuis {new Date(dispute.created_at).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <ChevronRight size={20} className="text-gray-300" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resolution Modal */}
      {selectedDispute && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-gray-900">Résolution du litige</h3>
                <p className="text-sm text-gray-500">{selectedDispute.project_number}</p>
              </div>
              <button
                onClick={() => setSelectedDispute(null)}
                className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Project Info */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-bold text-gray-900 mb-2">{selectedDispute.title}</h4>
                <p className="text-sm text-gray-500">{selectedDispute.category?.name} • {selectedDispute.location}</p>
              </div>

              {/* Parties */}
              <div className="grid grid-cols-2 gap-4">
                {/* Client */}
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-xs font-bold text-blue-600 uppercase mb-3">Client</p>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
                      {selectedDispute.client?.avatar_url ? (
                        <img src={selectedDispute.client.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User size={20} className="text-blue-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{selectedDispute.client?.full_name}</p>
                      <p className="text-xs text-gray-500">{selectedDispute.client?.phone}</p>
                    </div>
                  </div>
                </div>
                
                {/* Artisan */}
                <div className="bg-orange-50 rounded-xl p-4">
                  <p className="text-xs font-bold text-orange-600 uppercase mb-3">Artisan</p>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center overflow-hidden">
                      {selectedDispute.artisan?.avatar_url ? (
                        <img src={selectedDispute.artisan.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User size={20} className="text-orange-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{selectedDispute.artisan?.full_name}</p>
                      <p className="text-xs text-gray-500">{selectedDispute.artisan?.phone}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Escrow Details */}
              {selectedDispute.escrow && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <p className="text-xs font-bold text-yellow-700 uppercase mb-3">Fonds bloqués</p>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-black text-yellow-700">
                        {selectedDispute.escrow.total_amount.toLocaleString('fr-FR')}
                      </p>
                      <p className="text-xs text-yellow-600">Total FCFA</p>
                    </div>
                    <div>
                      <p className="text-2xl font-black text-gray-600">
                        {selectedDispute.escrow.commission_amount?.toLocaleString('fr-FR') || '0'}
                      </p>
                      <p className="text-xs text-gray-500">Commission</p>
                    </div>
                    <div>
                      <p className="text-2xl font-black text-green-600">
                        {selectedDispute.escrow.artisan_payout?.toLocaleString('fr-FR') || '0'}
                      </p>
                      <p className="text-xs text-green-600">Part artisan</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Resolution Options */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-gray-500 uppercase">Décision</p>
                
                <label className={`block p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  resolution === 'refund_client' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="resolution"
                    value="refund_client"
                    checked={resolution === 'refund_client'}
                    onChange={() => setResolution('refund_client')}
                    className="sr-only"
                  />
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      resolution === 'refund_client' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-400'
                    }`}>
                      <ArrowRight size={20} className="rotate-180" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">Rembourser le client</p>
                      <p className="text-xs text-gray-500">Le client récupère 100% des fonds</p>
                    </div>
                  </div>
                </label>
                
                <label className={`block p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  resolution === 'pay_artisan' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="resolution"
                    value="pay_artisan"
                    checked={resolution === 'pay_artisan'}
                    onChange={() => setResolution('pay_artisan')}
                    className="sr-only"
                  />
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      resolution === 'pay_artisan' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'
                    }`}>
                      <ArrowRight size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">Payer l'artisan</p>
                      <p className="text-xs text-gray-500">L'artisan reçoit son paiement normal</p>
                    </div>
                  </div>
                </label>
                
                <label className={`block p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  resolution === 'split' ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="resolution"
                    value="split"
                    checked={resolution === 'split'}
                    onChange={() => setResolution('split')}
                    className="sr-only"
                  />
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      resolution === 'split' ? 'bg-yellow-500 text-white' : 'bg-gray-100 text-gray-400'
                    }`}>
                      <DollarSign size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">Partager les fonds</p>
                      <p className="text-xs text-gray-500">Répartition personnalisée</p>
                    </div>
                  </div>
                </label>
                
                {resolution === 'split' && (
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    <label className="block">
                      <span className="text-sm font-bold text-gray-700">% pour le client</span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={splitPercent}
                        onChange={(e) => setSplitPercent(Number(e.target.value))}
                        className="w-full mt-2"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Client: {splitPercent}%</span>
                        <span>Artisan: {100 - splitPercent}%</span>
                      </div>
                    </label>
                  </div>
                )}
              </div>

              {/* Resolution Note */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                  Note de résolution (envoyée aux deux parties)
                </label>
                <textarea
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="Expliquez la décision..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-brand-500 focus:outline-none min-h-24"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedDispute(null)}
                  className="flex-1 py-4 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleResolve}
                  disabled={resolving}
                  className="flex-1 py-4 bg-brand-500 text-white font-bold rounded-xl hover:bg-brand-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {resolving ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <>
                      <CheckCircle size={20} />
                      Résoudre le litige
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
