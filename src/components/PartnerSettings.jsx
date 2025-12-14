import { usePartnerContext } from '../context/PartnerContext';

const DAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

export default function PartnerSettings({ partner }) {
    const { toggleWorkDay, updateAllocation } = usePartnerContext();

    return (
        <div className="p-6 bg-white/50 rounded-xl border border-white/40 shadow-inner space-y-6">
            <div>
                <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">
                    Jours Travaillés
                </h3>
                <div className="flex gap-2">
                    {DAYS.map((day, index) => {
                        if (index === 0 || index === 6) return null; // Skip weekends as per rules
                        const isWorked = partner.workDays[index];
                        return (
                            <button
                                key={day}
                                onClick={() => toggleWorkDay(partner.id, index)}
                                className={`
                  w-10 h-10 rounded-lg text-sm font-medium transition-all duration-200
                  ${isWorked
                                        ? 'bg-primary text-white shadow-md shadow-primary/30'
                                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                    }
                `}
                            >
                                {day}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                    <label className="block text-sm font-medium text-text-muted mb-1">
                        Quota Congés
                    </label>
                    <input
                        type="number"
                        min="0"
                        value={partner.allocations.vacation}
                        onChange={(e) => updateAllocation(partner.id, 'vacation', parseInt(e.target.value) || 0)}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-center text-lg font-semibold"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-text-muted mb-1">
                        Formation (Donnée)
                    </label>
                    <input
                        type="number"
                        min="0"
                        value={partner.allocations.trainingGive}
                        onChange={(e) => updateAllocation(partner.id, 'trainingGive', parseInt(e.target.value) || 0)}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none transition-all text-center text-lg font-semibold"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-text-muted mb-1">
                        Formation (Reçue)
                    </label>
                    <input
                        type="number"
                        min="0"
                        value={partner.allocations.trainingReceive}
                        onChange={(e) => updateAllocation(partner.id, 'trainingReceive', parseInt(e.target.value) || 0)}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none transition-all text-center text-lg font-semibold"
                    />
                </div>
            </div>
        </div>
    );
}
