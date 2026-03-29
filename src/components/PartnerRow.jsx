import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Settings, Calendar, Briefcase, Info } from 'lucide-react';
import { usePartnerContext } from '../context/PartnerContext';
import { calculateDeductedDays, calculateWorkedDays, calculateNormalTrainingAllocation, calculateExpectedWorkedDays } from '../utils/dateUtils';
import PartnerSettings from './PartnerSettings';
import CalendarView from './CalendarView';

export default function PartnerRow({ partner, isExpanded, onToggle }) {
    const { holidays, settings, year } = usePartnerContext();

    const [activeTab, setActiveTab] = useState('calendar');

    // Calculate vacation days used from calendar selections
    const usedVacationDays = useMemo(() => {
        if (!partner.vacations.length) return 0;
        return partner.vacations.reduce((acc, dateStr) => {
            const deducted = calculateDeductedDays(dateStr, dateStr, partner.workDays, holidays, false, partner.workPeriods, partner.workDayExceptions);
            return acc + deducted;
        }, 0);
    }, [partner.vacations, partner.workDays, partner.workPeriods, partner.workDayExceptions, holidays]);

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
            // Check based on periods if available
            const currentWorkDays = calculateDeductedDays(dateStr, dateStr, partner.workDays, holidays, false, partner.workPeriods, partner.workDayExceptions) > 0;
            if (!currentWorkDays) return;

            count++;
        });
        return count;
    }, [holidays, partner.workDays, partner.workPeriods, partner.workDayExceptions, settings.countHolidaysAsLeave]);

    // Calculate worked days in the year
    // Formations reçues/données on non-work days count as extra worked days (not as vacation credit)
    const workedDays = useMemo(() => {
        return calculateWorkedDays(
            year,
            partner.workDays,
            holidays,
            partner.vacations,
            partner.trainingsReceived || [],
            partner.trainingsGiven || [],
            partner.afvac || [],
            partner.workPeriods,
            partner.sickLeave || [],
            partner.workDayExceptions || {}
        );
    }, [year, partner.workDays, partner.workPeriods, holidays, partner.vacations, partner.trainingsReceived, partner.trainingsGiven, partner.afvac, partner.sickLeave, partner.workDayExceptions]);

    const expectedWorkedDays = useMemo(() => {
        const baseExpected = calculateExpectedWorkedDays(
            year,
            partner.workDays,
            holidays,
            partner.workPeriods,
            partner.workDayExceptions || {}
        );
        return baseExpected - (partner.allocations?.vacation || 0);
    }, [year, partner.workDays, holidays, partner.workPeriods, partner.workDayExceptions, partner.allocations?.vacation]);

    const workedDaysColor = useMemo(() => {
        if (workedDays === expectedWorkedDays) return 'text-emerald-600';
        if (workedDays > expectedWorkedDays) return 'text-indigo-600'; // Plus de jours travaillés que prévu
        return 'text-amber-500'; // Moins de jours travaillés que prévu
    }, [workedDays, expectedWorkedDays]);

    const normalTraining = useMemo(() => {
        return calculateNormalTrainingAllocation(year, partner.workPeriods, partner.workDays);
    }, [year, partner.workPeriods, partner.workDays]);

    const totalUsed = usedVacationDays + holidayDaysDeducted;
    const remaining = partner.allocations.vacation - totalUsed;
    const isOverLimit = remaining < 0;

    // Progress bar
    const totalAvailable = partner.allocations.vacation;
    const progressPercent = totalAvailable > 0 ? Math.min(100, (totalUsed / totalAvailable) * 100) : 100;

    // Training stats
    const usedTrainingReceived = (partner.trainingsReceived || []).length;
    const usedTrainingGiven = (partner.trainingsGiven || []).length;
    const allocatedTrainingReceived = partner.allocations.trainingReceive;
    const allocatedTrainingGiven = partner.allocations.trainingGive;

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
                    </div>
                </div>

                {/* Stats & Progress */}
                <div className="flex items-center justify-between sm:justify-end gap-6 sm:gap-10 flex-1">
                    <div className="flex items-center gap-6">
                        {/* Jours Travaillés */}
                        <div className="text-right border-r border-gray-100 pr-6">
                            <div className="flex items-center justify-end gap-1.5 mb-0.5 group/tooltip relative">
                                <p className="text-[10px] uppercase tracking-bold font-bold text-gray-400">Jours Travaillés</p>
                                <Info className="w-3.5 h-3.5 text-gray-300 cursor-help" />
                                <div className="absolute bottom-full right-0 mb-2 w-56 p-2 bg-gray-900 text-white text-[10px] rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-all pointer-events-none z-20 font-medium normal-case shadow-xl">
                                    <span className="text-gray-300 font-bold block mb-1 border-b border-gray-700 pb-1">Total calculé :</span>
                                    Comprennent : planning de base + jours de formations (données/reçues) + ajustements (jours ajoutés). 
                                    <br/><br/>
                                    Déduits : congés, AFVAC, maladie et ajustements (jours retirés).
                                    <br/><br/>
                                    <span className="text-gray-300 font-bold block mt-2 mb-1 border-b border-gray-700 pb-1">Attendu à la fin de l'année :</span>
                                    Le nombre de jours de travail prévus sur l'année (selon le planning et les jours fériés), auquel on retire le quota de congés payés de l'associé ({partner.allocations?.vacation || 0}j). Ne prend en compte aucune autre absence (AFVAC, maladie).
                                </div>
                            </div>
                            <div className="flex items-baseline justify-end gap-1">
                                <span className={`text-2xl font-bold tabular-nums tracking-tight ${workedDaysColor}`}>
                                    {workedDays}
                                </span>
                                <span className="text-sm font-medium text-gray-400">/ {expectedWorkedDays}j</span>
                            </div>
                        </div>

                        {/* Formations reçues */}
                        <div className="text-right border-r border-gray-100 pr-6 hidden md:block">
                            <p className="text-[10px] uppercase tracking-bold font-bold text-gray-400 mb-0.5">formations reçues</p>
                            <div className="flex items-baseline justify-end gap-1">
                                <span className="text-xl font-bold tabular-nums tracking-tight text-gray-700">
                                    {usedTrainingReceived}
                                </span>
                                <span className="text-xs font-medium text-gray-400">/ {allocatedTrainingReceived}j</span>
                            </div>
                            {allocatedTrainingReceived !== normalTraining && (
                                <p className="text-[9px] text-amber-600 font-medium">(normal: {normalTraining}j)</p>
                            )}
                        </div>

                        {/* Formations données */}
                        <div className="text-right border-r border-gray-100 pr-6 hidden md:block">
                            <p className="text-[10px] uppercase tracking-bold font-bold text-gray-400 mb-0.5">formations données</p>
                            <div className="flex items-baseline justify-end gap-1">
                                <span className="text-xl font-bold tabular-nums tracking-tight text-gray-700">
                                    {usedTrainingGiven}
                                </span>
                                <span className="text-xs font-medium text-gray-400">/ {allocatedTrainingGiven}j</span>
                            </div>
                            {allocatedTrainingGiven !== normalTraining && (
                                <p className="text-[9px] text-amber-600 font-medium">(normal: {normalTraining}j)</p>
                            )}
                        </div>

                        {/* Congés restants */}
                        <div className="text-right min-w-[140px]">
                            <p className="text-[10px] uppercase tracking-bold font-bold text-gray-400 mb-0.5">Congés restants</p>
                            <div className="flex items-baseline justify-end gap-1 mb-2">
                                <span className={`text-2xl font-bold tabular-nums tracking-tight ${isOverLimit ? 'text-red-500' : 'text-gray-900'}`}>
                                    {remaining}
                                </span>
                                <span className="text-sm font-medium text-gray-400">/ {totalAvailable}</span>
                            </div>
                            
                            {/* Progress bar moved here */}
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden w-full">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${isOverLimit ? 'bg-red-500' : 'bg-blue-500'}`}
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>
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
