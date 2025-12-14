import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Settings, Calendar, Briefcase } from 'lucide-react';
import { usePartnerContext } from '../context/PartnerContext';
import { calculateDeductedDays, calculateRecoveredDays } from '../utils/dateUtils';
import PartnerSettings from './PartnerSettings';
import CalendarView from './CalendarView';

export default function PartnerRow({ partner, isExpanded, onToggle }) {
    const { holidays, settings, year } = usePartnerContext();

    const [activeTab, setActiveTab] = useState('calendar');

    // Calculate vacation days used from calendar selections
    const usedVacationDays = useMemo(() => {
        if (!partner.vacations.length) return 0;
        return partner.vacations.reduce((acc, dateStr) => {
            const deducted = calculateDeductedDays(dateStr, dateStr, partner.workDays, holidays, false);
            return acc + deducted;
        }, 0);
    }, [partner.vacations, partner.workDays, holidays]);

    // Calculate recovered days from training (only on non-working days)
    const recoveredDays = useMemo(() => {
        const given = partner.trainingsGiven || [];
        const received = partner.trainingsReceived || [];
        const allTrainings = [...given, ...received];

        if (!allTrainings.length) return 0;
        return calculateRecoveredDays(allTrainings, partner.workDays, holidays);
    }, [partner.trainingsGiven, partner.trainingsReceived, partner.workDays, holidays]);

    // Calculate holiday days that fall on working days (when toggle is ON)
    const holidayDaysDeducted = useMemo(() => {
        if (!settings.countHolidaysAsLeave) return 0;

        let count = 0;
        Object.entries(holidays).forEach(([dateStr, holidayName]) => {
            // Skip Pentecost (it's a worked day, handled separately)
            if (holidayName.toLowerCase().includes('pentecôte')) return;

            const date = new Date(dateStr);
            const dayOfWeek = date.getDay();

            // Skip weekends
            if (dayOfWeek === 0 || dayOfWeek === 6) return;

            // Skip if partner doesn't work this day
            if (partner.workDays[dayOfWeek] === false) return;

            count++;
        });
        return count;
    }, [holidays, partner.workDays, settings.countHolidaysAsLeave]);

    const totalUsed = usedVacationDays + holidayDaysDeducted;
    const remaining = partner.allocations.vacation - totalUsed + recoveredDays;
    const isOverLimit = remaining < 0;

    // Progress bar calculation (clamped between 0 and 100 for visual sanity, but logic handles overflow)
    // Denom: Allocation + Recovered (Total available pot)
    const totalAvailable = partner.allocations.vacation + recoveredDays;
    const progressPercent = totalAvailable > 0 ? Math.min(100, (totalUsed / totalAvailable) * 100) : 100;

    return (
        <div className={`
      group relative bg-white rounded-2xl shadow-sm border border-gray-100 transition-all duration-300
      ${isExpanded ? 'shadow-xl ring-1 ring-primary/5 scale-[1.01] z-10' : 'hover:shadow-md hover:border-gray-200'}
    `}>
            <div
                onClick={onToggle}
                className="p-5 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-6"
            >

                {/* Partner Info */}
                <div className="flex items-center gap-5">
                    <div className={`
            relative w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold text-white shadow-lg transition-transform duration-300 group-hover:scale-105
            ${isOverLimit ? 'bg-gradient-to-br from-red-500 to-rose-600 shadow-red-500/25' : 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/25'}
          `}>
                        {partner.name.charAt(0)}

                        {/* Online Status Dot */}
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                            <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
                        </div>
                    </div>

                    <div>
                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-primary transition-colors">
                            {partner.name.split(' ')[0]}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-500 font-medium">
                            <Briefcase className="w-3.5 h-3.5" />
                            <span>{Object.values(partner.workDays).filter(Boolean).length}j / semaine</span>
                        </div>
                    </div>
                </div>

                {/* Stats & Progress */}
                <div className="flex items-center justify-between sm:justify-end gap-6 sm:gap-10 flex-1">
                    <div className="hidden sm:block flex-1 max-w-[200px]">
                        <div className="flex justify-between text-xs font-semibold mb-1.5">
                            <span className="text-gray-400">Progression</span>
                            <span className={isOverLimit ? 'text-red-500' : 'text-blue-600'}>
                                {Math.round(progressPercent)}%
                            </span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${isOverLimit ? 'bg-red-500' : 'bg-blue-500'}`}
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="text-right">
                            <p className="text-[10px] uppercase tracking-bold font-bold text-gray-400 mb-0.5">Solde Restant</p>
                            <div className="flex items-baseline justify-end gap-1">
                                <span className={`text-2xl font-bold tabular-nums tracking-tight ${isOverLimit ? 'text-red-500' : 'text-gray-900'}`}>
                                    {remaining}
                                </span>
                                <span className="text-sm font-medium text-gray-400">/ {totalAvailable}</span>
                            </div>
                            {recoveredDays > 0 && (
                                <p className="text-[10px] text-green-600 font-medium mt-0.5">
                                    +{recoveredDays} récupérés
                                </p>
                            )}
                        </div>

                        <button
                            className={`
                w-10 h-10 rounded-full flex items-center justify-center border transition-all duration-200
                ${isExpanded
                                    ? 'bg-gray-900 text-white border-gray-900 rotate-180'
                                    : 'bg-white text-gray-400 border-gray-200 hover:border-primary hover:text-primary'
                                }
              `}
                        >
                            <ChevronDown className="w-5 h-5 transition-transform" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Expanded Content */}
            <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${isExpanded ? 'grid-rows-[1fr] border-t border-gray-100' : 'grid-rows-[0fr]'}`}>
                <div className="overflow-hidden">
                    <div className="p-6 bg-gray-50/50">
                        {/* Tabs */}
                        <div className="flex justify-center mb-8">
                            <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-100 inline-flex">
                                <button
                                    onClick={() => setActiveTab('calendar')}
                                    className={`
                    px-6 py-2.5 rounded-lg flex items-center gap-2 text-sm font-semibold transition-all
                    ${activeTab === 'calendar'
                                            ? 'bg-primary text-white shadow-md'
                                            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                                        }
                  `}
                                >
                                    <Calendar className="w-4 h-4" /> Calendrier
                                </button>
                                <button
                                    onClick={() => setActiveTab('settings')}
                                    className={`
                    px-6 py-2.5 rounded-lg flex items-center gap-2 text-sm font-semibold transition-all
                    ${activeTab === 'settings'
                                            ? 'bg-primary text-white shadow-md'
                                            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                                        }
                  `}
                                >
                                    <Settings className="w-4 h-4" /> Configuration
                                </button>
                            </div>
                        </div>

                        <div className="animate-in fade-in zoom-in-95 duration-300">
                            {activeTab === 'settings' ? (
                                <PartnerSettings partner={partner} />
                            ) : (
                                <CalendarView partner={partner} />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
