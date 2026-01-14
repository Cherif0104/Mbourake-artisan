import React, { useEffect, useState } from 'react';
import { Search, Filter, MapPin, Clock, Eye, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Project {
  id: string;
  title: string;
  status: string;
  location: string | null;
  created_at: string;
  profiles: { full_name: string; email: string } | null;
  categories: { name: string } | null;
}

export function AdminProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('projects')
      .select('*, profiles(*), categories(*)')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setProjects(data);
    }
    setLoading(false);
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch = 
      project.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleUpdateStatus = async (projectId: string, newStatus: string) => {
    await supabase
      .from('projects')
      .update({ status: newStatus })
      .eq('id', projectId);
    fetchProjects();
    setSelectedProject(null);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      open: 'bg-green-100 text-green-700',
      quote_accepted: 'bg-blue-100 text-blue-700',
      in_progress: 'bg-yellow-100 text-yellow-700',
      completed: 'bg-purple-100 text-purple-700',
      cancelled: 'bg-red-100 text-red-700',
    };
    return styles[status] || 'bg-gray-100 text-gray-700';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      open: 'Ouvert',
      quote_accepted: 'Devis accepté',
      in_progress: 'En cours',
      completed: 'Terminé',
      cancelled: 'Annulé',
    };
    return labels[status] || status;
  };

  return (
    <div className="space-y-6">
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
          <option value="open">Ouvert</option>
          <option value="quote_accepted">Devis accepté</option>
          <option value="in_progress">En cours</option>
          <option value="completed">Terminé</option>
          <option value="cancelled">Annulé</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {['open', 'quote_accepted', 'in_progress', 'completed', 'cancelled'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`p-4 rounded-xl border transition-all ${
              statusFilter === status ? 'border-brand-500 bg-brand-50' : 'border-gray-100 bg-white hover:border-gray-200'
            }`}
          >
            <p className="text-2xl font-black text-gray-900">
              {projects.filter(p => p.status === status).length}
            </p>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              {getStatusLabel(status)}
            </p>
          </button>
        ))}
      </div>

      {/* Projects List */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="divide-y divide-gray-50">
          {loading ? (
            <div className="px-6 py-12 text-center text-gray-400">
              <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-400">
              Aucun projet trouvé
            </div>
          ) : (
            filteredProjects.map((project) => (
              <div
                key={project.id}
                className="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => setSelectedProject(project)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${getStatusBadge(project.status)}`}>
                        {getStatusLabel(project.status)}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-lg text-[10px] font-black uppercase tracking-wider">
                        {project.categories?.name || 'Sans catégorie'}
                      </span>
                    </div>
                    <h4 className="font-bold text-gray-900 mb-1">{project.title}</h4>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <MapPin size={14} />
                        {project.location || 'Non spécifié'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={14} />
                        {new Date(project.created_at).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">{project.profiles?.full_name}</p>
                    <p className="text-xs text-gray-400">{project.profiles?.email}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Project Details Modal */}
      {selectedProject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="mb-6">
              <span className={`inline-block px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider mb-3 ${getStatusBadge(selectedProject.status)}`}>
                {getStatusLabel(selectedProject.status)}
              </span>
              <h3 className="text-xl font-black text-gray-900">{selectedProject.title}</h3>
              <p className="text-sm text-gray-500 mt-1">
                Par {selectedProject.profiles?.full_name} · {selectedProject.categories?.name}
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">ID Projet</span>
                <span className="font-mono text-sm text-gray-900">{selectedProject.id.slice(0, 8)}...</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">Localisation</span>
                <span className="font-bold text-gray-900">{selectedProject.location || '-'}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">Date création</span>
                <span className="font-bold text-gray-900">
                  {new Date(selectedProject.created_at).toLocaleString('fr-FR')}
                </span>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Changer le statut</p>
              <div className="grid grid-cols-2 gap-2">
                {['open', 'quote_accepted', 'in_progress', 'completed', 'cancelled'].map((status) => (
                  <button
                    key={status}
                    onClick={() => handleUpdateStatus(selectedProject.id, status)}
                    disabled={selectedProject.status === status}
                    className={`py-2 px-3 rounded-xl font-bold text-xs uppercase transition-all ${
                      selectedProject.status === status
                        ? 'bg-brand-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {getStatusLabel(status)}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setSelectedProject(null)}
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
