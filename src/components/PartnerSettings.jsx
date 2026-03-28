import { usePartnerContext } from '../context/PartnerContext';
import { Plus, Trash2, Calendar as CalendarIcon, Info } from 'lucide-react';
import { DEFAULT_WORK_DAYS, calculateNormalTrainingAllocation } from '../utils/dateUtils';

const DAYS = [
    { label: 'Lun', index: 1 },
    { label: 'Mar', index: 2 },
    { label: 'Mer', index: 3 },
    { label: 'Jeu', index: 4 },
    { label: 'Ven', index: 5 }
];

export default function PartnerSettings({ partner }) {
    const { updateWorkPeriods, updateAllocation, year } = usePartnerContext();

    const normalTraining = calculateNormalTrainingAllocation(year, partner.workPeriods);

    const addPeriod = () => {
        const lastPeriod = partner.workPeriods[partner.workPeriods.length - 1];
        const newPeriods = [
            ...partner.workPeriods,
            { 
                startDate: `${year}-01-01`, // Default, user can change
                workDays: lastPeriod ? { ...lastPeriod.workDays } : { ...DEFAULT_WORK_DAYS }
            }
        ].sort((a, b) => a.startDate.localeCompare(b.startDate));
        updateWorkPeriods(partner.id, newPeriods);
    };

    const removePeriod = (index) => {
        if (partner.workPeriods.length <= 1) return;
        const newPeriods = partner.workPeriods.filter((_, i) => i !== index);
        updateWorkPeriods(partner.id, newPeriods);
    };

    const updatePeriodDate = (index, date) => {
        const newPeriods = [...partner.workPeriods];
        newPeriods[index] = { ...newPeriods[index], startDate: date };
        newPeriods.sort((a, b) => a.startDate.localeCompare(b.startDate));
        updateWorkPeriods(partner.id, newPeriods);
    };

    const toggleWorkDayInPeriod = (periodIndex, dayIndex) => {
        const newPeriods = [...partner.workPeriods];
        const currentDays = { ...newPeriods[periodIndex].workDays };
        currentDays[dayIndex] = !currentDays[dayIndex];
        newPeriods[periodIndex] = { ...newPeriods[periodIndex], workDays: currentDays };
        updateWorkPeriods(partner.id, newPeriods);
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Work Periods Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <CalendarIcon className="w-5 h-5 text-primary" />
                        <h3 className="font-bold text-gray-900">Planning de Travail</h3>
                    </div>
                    <button
                        onClick={addPeriod}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg text-sm font-bold transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        Ajouter un changement
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {partner.workPeriods.map((period, idx) => (
                        <div key={idx} className="relative p-6 bg-gray-50 rounded-xl border border-gray-100 group">
                            <div className="flex flex-col md:flex-row md:items-center gap-6">
                                {/* Date Selection */}
                                <div className="flex-1 max-w-[200px]">
                                    <label className="block text-[10px] font-bold uppercase text-gray-400 mb-2">À partir du</label>
                                    <input
                                        type="date"
                                        value={period.startDate}
                                        min={`${year}-01-01`}
                                        max={`${year}-12-31`}
                                        onChange={(e) => updatePeriodDate(idx, e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                    />
                                </div>

                                {/* Days Selection */}
                                <div className="flex-1">
                                    <label className="block text-[10px] font-bold uppercase text-gray-400 mb-2">Jours travaillés</label>
                                    <div className="flex gap-2">
                                        {DAYS.map((day) => {
                                            const isWorked = period.workDays[day.index];
                                            return (
                                                <button
                                                    key={day.index}
                                                    onClick={() => toggleWorkDayInPeriod(idx, day.index)}
                                                    className={`
                                                        flex-1 py-2 rounded-lg text-xs font-bold transition-all
                                                        ${isWorked 
                                                            ? 'bg-primary text-white shadow-md shadow-primary/20' 
                                                            : 'bg-white text-gray-400 border border-gray-200 hover:border-primary hover:text-primary'}
                                                    `}
                                                >
                                                    {day.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Delete button (if not the only one) */}
                                {partner.workPeriods.length > 1 && (
                                    <button
                                        onClick={() => removePeriod(idx)}
                                        className="mt-6 md:mt-0 p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>            {/* Quotas & Allocations Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Vacation Card (Compact) */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative group">
                    <div className="flex items-center justify-between mb-4">
                        <label className="text-sm font-bold text-gray-600">Droit aux congés</label>
                        <div className="relative group/tooltip">
                            <Info className="w-4 h-4 text-gray-300 pointer-cursor" />
                            <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-gray-900 text-white text-[10px] rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-all pointer-events-none z-20">
                                Total = Calcul auto (5 semaines) + Jours bonus.
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-baseline justify-center gap-2 mb-6">
                        <span className="text-5xl font-black text-primary">{partner.allocations.vacation}</span>
                        <span className="text-sm font-bold text-primary/40 uppercase">jours</span>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-gray-50">
                        <div className="flex justify-between items-center text-[10px] font-bold text-gray-400">
                            <span className="uppercase">Base auto (5 sem.)</span>
                            <span>{partner.allocations.vacation - (partner.allocations.vacationBonus || 0)}j</span>
                        </div>
                        
                        <div className="flex justify-between items-center bg-emerald-50/50 p-2 rounded-lg border border-emerald-100/50">
                            <span className="text-[10px] font-bold text-emerald-600 uppercase">Congés Bonus</span>
                            <div className="flex items-center gap-1">
                                <span className="text-[10px] font-bold text-emerald-600">+</span>
                                <input
                                    type="number"
                                    min="0"
                                    value={partner.allocations.vacationBonus || 0}
                                    onChange={(e) => updateAllocation(partner.id, 'vacationBonus', parseInt(e.target.value) || 0)}
                                    className="w-10 bg-transparent border-b border-emerald-200 focus:border-emerald-500 outline-none text-right text-xs font-bold text-emerald-600"
                                />
                                <span className="text-[10px] font-bold text-emerald-600">j</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Training Given */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <label className="block text-sm font-bold text-gray-600 mb-4 tracking-wider text-[11px]">Form. donnée (Quota)</label>
                    <div className="h-full flex flex-col justify-center pb-8">
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                            <input
                                type="number"
                                min="0"
                                value={partner.allocations.trainingGive}
                                onChange={(e) => updateAllocation(partner.id, 'trainingGive', parseInt(e.target.value) || 0)}
                                className="w-full bg-transparent outline-none text-center text-3xl font-black text-gray-700"
                            />
                            <p className="text-[10px] text-center text-gray-400 mt-2 font-medium italic">Suggéré (prorata) : {normalTraining}j</p>
                        </div>
                    </div>
                </div>

                {/* Training Received */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <label className="block text-sm font-bold text-gray-600 mb-4 tracking-wider text-[11px]">Form. reçue (Quota)</label>
                    <div className="h-full flex flex-col justify-center pb-8">
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                            <input
                                type="number"
                                min="0"
                                value={partner.allocations.trainingReceive}
                                onChange={(e) => updateAllocation(partner.id, 'trainingReceive', parseInt(e.target.value) || 0)}
                                className="w-full bg-transparent outline-none text-center text-3xl font-black text-gray-700"
                            />
                            <p className="text-[10px] text-center text-gray-400 mt-2 font-medium italic">Suggéré (prorata) : {normalTraining}j</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Display Options Section */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                    <div>
                        <h4 className="text-sm font-bold text-gray-900 mb-1">Options d'affichage</h4>
                        <p className="text-xs text-gray-400 font-medium">Personnalisez les fonctionnalités visibles pour cet associé.</p>
                    </div>
                    
                    <div className="flex items-center gap-6">
                        {/* AFVAC Toggle */}
                        <div className="flex items-center gap-3">
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${partner.allocations.hasAFVAC ? 'text-[#FBC619]' : 'text-gray-300'}`}>
                                {partner.allocations.hasAFVAC ? 'AFVAC : Activé' : 'AFVAC : Désactivé'}
                            </span>
                            <button
                                onClick={() => updateAllocation(partner.id, 'hasAFVAC', !partner.allocations.hasAFVAC)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 ${partner.allocations.hasAFVAC ? 'bg-[#FBC619]' : 'bg-gray-200'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-all duration-300 ${partner.allocations.hasAFVAC ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
