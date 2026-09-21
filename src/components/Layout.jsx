import { useEffect, useRef, useState } from 'react';
import { Calendar, Users, Plus, Trash2, X, ChevronDown, AlertTriangle, Pencil } from 'lucide-react';
import { usePartnerContext } from '../context/PartnerContext';

export default function Layout({ children }) {
  const { year, partners, addPartner, removePartner, updatePartner, loadFailed } = usePartnerContext();

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [confirmingId, setConfirmingId] = useState(null);
  const [confirmText, setConfirmText] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  const popoverRef = useRef(null);
  const nameInputRef = useRef(null);

  const closePopover = () => {
    setIsPopoverOpen(false);
    setConfirmingId(null);
    setConfirmText('');
    setEditingId(null);
    setEditName('');
    setNewName('');
  };

  useEffect(() => {
    if (!isPopoverOpen) return;
    const onMouseDown = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) closePopover();
    };
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (editingId) {
        setEditingId(null);
        setEditName('');
      } else if (confirmingId) {
        setConfirmingId(null);
        setConfirmText('');
      } else {
        closePopover();
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [isPopoverOpen, confirmingId, editingId]);

  const handleRename = (partner) => {
    const trimmed = editName.trim();
    setEditingId(null);
    setEditName('');
    if (!trimmed || trimmed === partner.name) return;
    updatePartner(partner.id, { name: trimmed });
  };

  const openPopover = () => {
    setIsPopoverOpen(true);
    setConfirmingId(null);
    setConfirmText('');
    setEditingId(null);
    setEditName('');
    setNewName('');
    setTimeout(() => nameInputRef.current?.focus(), 0);
  };

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    addPartner(trimmed);
    setNewName('');
    nameInputRef.current?.focus();
  };

  return (
    <div className="min-h-screen bg-bg-body text-text-main pb-20 font-sans selection:bg-primary/20 selection:text-primary-dark">
      {/* Abstract Background Decoration */}
      <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-secondary/5 blur-[120px]" />
      </div>

      <header className="sticky top-0 z-50 transition-all duration-300 backdrop-blur-md bg-white/70 border-b border-white/50 shadow-sm supports-[backdrop-filter]:bg-white/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-gradient-to-br from-primary to-primary-dark rounded-xl shadow-lg shadow-primary/25 text-white ring-1 ring-white/50">
                <Calendar className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-xl sm:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 tracking-tight">
                  Gestion planning associés
                </h1>
                <div className="flex items-center gap-2 text-xs font-semibold text-text-muted">
                  <span className="uppercase tracking-wider">Associés</span>
                  <span className="w-1 h-1 rounded-full bg-gray-300" />
                  <span className="text-primary">{year}</span>
                </div>
              </div>
            </div>

            <div className="relative">
              <button
                onClick={() => (isPopoverOpen ? closePopover() : openPopover())}
                aria-expanded={isPopoverOpen}
                aria-label="Gérer les associés"
                className="flex items-center gap-3 px-4 py-2 bg-white/50 rounded-full border border-white/60 shadow-sm hover:bg-white/80 transition-colors"
              >
                <Users className="w-4 h-4 text-text-muted" />
                <span className="text-sm font-medium text-text-main">{partners.length} Associés</span>
                <ChevronDown className={`w-3 h-3 text-text-muted transition-transform ${isPopoverOpen ? 'rotate-180' : ''}`} />
              </button>

              {isPopoverOpen && (
                <div
                  ref={popoverRef}
                  className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 animate-in fade-in zoom-in-95 duration-200"
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] uppercase tracking-bold font-bold text-gray-400">Gestion des associés</p>
                    <button
                      onClick={closePopover}
                      title="Fermer"
                      aria-label="Fermer la gestion des associés"
                      className="w-6 h-6 rounded-full flex items-center justify-center text-gray-300 hover:text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Load failure warning */}
                  {loadFailed && (
                    <div className="mb-3 px-3 py-2 rounded-xl bg-amber-50 border border-amber-100 text-[11px] text-amber-600 leading-snug">
                      Impossible de charger les données. La gestion des associés est indisponible pour le moment.
                    </div>
                  )}

                  {/* Add */}
                  <div className="flex gap-2 mb-4">
                    <input
                      ref={nameInputRef}
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
                      placeholder="Prénom du nouvel associé"
                      aria-label="Prénom du nouvel associé"
                      maxLength={30}
                      className="flex-1 min-w-0 px-3 py-2 text-sm rounded-xl border border-gray-200 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                    />
                    <button
                      onClick={handleAdd}
                      disabled={!newName.trim() || loadFailed}
                      title="Ajouter"
                      aria-label="Ajouter l'associé"
                      className="w-9 h-9 shrink-0 rounded-xl bg-primary text-white flex items-center justify-center hover:bg-primary-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-[10px] uppercase tracking-bold font-bold text-gray-400 mb-2">
                    Associés ({partners.length})
                  </p>
                  <div className="space-y-1">
                    {partners.map(p => confirmingId === p.id ? (
                      <div key={p.id} className="p-3 rounded-xl bg-red-50 border border-red-100">
                        <div className="flex items-start gap-2 mb-2">
                          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                          <p className="text-[11px] text-red-600 leading-snug">
                            Suppression définitive de <span className="font-bold">{p.name}</span> et de toutes
                            ses données (congés, formations, AFVAC, maladie, planning), pour toutes les années.
                          </p>
                        </div>
                        <input
                          autoFocus
                          value={confirmText}
                          onChange={(e) => setConfirmText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && confirmText.trim() === p.name.trim()) {
                              removePartner(p.id);
                              setConfirmingId(null);
                              setConfirmText('');
                            }
                          }}
                          placeholder={`Tapez « ${p.name} » pour confirmer`}
                          aria-label={`Confirmation de suppression de ${p.name}`}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-red-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-300 mb-2"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => { setConfirmingId(null); setConfirmText(''); }}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                          >
                            Annuler
                          </button>
                          <button
                            onClick={() => { removePartner(p.id); setConfirmingId(null); setConfirmText(''); }}
                            disabled={confirmText.trim() !== p.name.trim()}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Supprimer
                          </button>
                        </div>
                      </div>
                    ) : editingId === p.id ? (
                      <div key={p.id} className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                        <p className="text-[11px] text-gray-500 mb-2">
                          Modifier le nom de <span className="font-bold">{p.name}</span>
                        </p>
                        <input
                          autoFocus
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter' && editName.trim()) handleRename(p); }}
                          placeholder="Nouveau prénom"
                          aria-label={`Nouveau prénom pour ${p.name}`}
                          maxLength={30}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 mb-2"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => { setEditingId(null); setEditName(''); }}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                          >
                            Annuler
                          </button>
                          <button
                            onClick={() => handleRename(p)}
                            disabled={!editName.trim() || editName.trim() === p.name}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Renommer
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div key={p.id} className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors">
                        <span className="text-sm font-medium text-gray-700">{p.name}</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => { setEditingId(p.id); setEditName(p.name); setConfirmingId(null); setConfirmText(''); }}
                            title={`Modifier le nom de ${p.name}`}
                            aria-label={`Modifier le nom de ${p.name}`}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-primary hover:bg-primary/5 transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { setConfirmingId(p.id); setConfirmText(''); setEditingId(null); setEditName(''); }}
                            title={`Supprimer ${p.name}`}
                            aria-label={`Supprimer ${p.name}`}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {children}
      </main>
    </div>
  );
}