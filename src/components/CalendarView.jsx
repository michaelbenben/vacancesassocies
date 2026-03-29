import { useState, useEffect, useMemo } from 'react';
import { eachMonthOfInterval, endOfMonth, endOfYear, eachDayOfInterval, format, getDay, isWeekend, startOfYear, parseISO, isBefore, isAfter } from 'date-fns';
import { fr } from 'date-fns/locale';
import { usePartnerContext } from '../context/PartnerContext';
import { isWorkedHoliday } from '../utils/holidays';
import { getWorkDaysForDate, calculateDeductedDays } from '../utils/dateUtils';
import { GraduationCap, Umbrella, BookOpen, Activity } from 'lucide-react';

export default function CalendarView({ partner }) {
    const { year, holidays, settings } = usePartnerContext();
    const [mode, setMode] = useState('vacation'); // 'vacation' | 'given' | 'received' | 'afvac' | 'sick' | 'adjustment'

    const { applyBatchDates } = usePartnerContext();

    const [dragState, setDragState] = useState({
        isDragging: false,
        start: null,
        current: null,
        action: null
    });

    useEffect(() => {
        const handleMouseUp = () => {
            if (dragState.isDragging) {
                if (dragState.start && dragState.current) {
                    let start = parseISO(dragState.start);
                    let end = parseISO(dragState.current);
                    if (isBefore(end, start)) {
                        const temp = start;
                        start = end;
                        end = temp;
                    }
                    
                    const days = eachDayOfInterval({ start, end });
                    const dateStrings = days.map(d => format(d, 'yyyy-MM-dd'));
                    
                    applyBatchDates(partner.id, dateStrings, mode, dragState.action);
                }
                setDragState({ isDragging: false, start: null, current: null, action: null });
            }
        };

        window.addEventListener('mouseup', handleMouseUp);
        return () => window.removeEventListener('mouseup', handleMouseUp);
    }, [dragState, applyBatchDates, partner.id, mode]);

    const handleDragStart = (e, dateStr, isCurrentlyActioned) => {
        e.preventDefault();
        setDragState({
            isDragging: true,
            start: dateStr,
            current: dateStr,
            action: isCurrentlyActioned ? 'remove' : 'add'
        });
    };

    const handleDragEnter = (dateStr) => {
        if (dragState.isDragging) {
            setDragState(prev => ({ ...prev, current: dateStr }));
        }
    };

    const yearStart = startOfYear(new Date(year, 0, 1));
    const yearEnd = endOfYear(yearStart);

    const months = eachMonthOfInterval({
        start: yearStart,
        end: yearEnd
    });

    return (
        <div className="space-y-8">
            {/* Mode Switcher */}
            <div className="flex flex-col items-center gap-4">
                <div className="inline-flex bg-gray-100 p-1 rounded-xl gap-1">
                    <button
                        onClick={() => setMode('vacation')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'vacation' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        <Umbrella className="w-4 h-4" />
                        Congés
                    </button>
                    <button
                        onClick={() => setMode('given')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'given' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        <GraduationCap className="w-4 h-4" />
                        Formations données
                    </button>
                    <button
                        onClick={() => setMode('received')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'received' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        <BookOpen className="w-4 h-4" />
                        Formations reçues
                    </button>
                    {partner.allocations.hasAFVAC && (
                        <button
                            onClick={() => setMode('afvac')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'afvac' ? 'bg-white text-[#FBC619] shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            <Activity className="w-4 h-4" />
                            AFVAC
                        </button>
                    )}
                    <button
                        onClick={() => setMode('sick')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'sick' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M2 12h20" /></svg>
                        Maladie
                    </button>
                    <button
                        onClick={() => setMode('adjustment')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'adjustment' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
                        Ajustements
                    </button>
                </div>

                {/* Mode Explanation Text */}
                <div className="max-w-xl text-center animate-in fade-in slide-in-from-top-1 duration-300">
                    <p className="text-[11px] font-medium text-gray-500 leading-relaxed italic">
                        {mode === 'vacation' && "Décompté du solde annuel. Un jour de congé posé sur un jour travaillé réduit le solde de 1."}
                        {mode === 'given' && "Considéré comme du temps de travail effectif. Posée sur un jour de repos, elle augmente le total travaillé."}
                        {mode === 'received' && "Considéré comme du temps de travail effectif. Posée sur un jour de repos, elle augmente le total travaillé."}
                        {mode === 'afvac' && "Absence pour congrès. Décomptée des jours travaillés mais n'impacte pas le solde de congés."}
                        {mode === 'sick' && "Absence maladie. Décomptée des jours travaillés mais n'impacte pas le solde de congés."}
                        {mode === 'adjustment' && "Modifications manuelles du planning. Ajoutez un jour (+) ou retirez-en un (-) pour ajuster le total travaillé."}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-x-12 gap-y-12">
                {months.map(monthStart => (
                    <MonthGrid
                        key={monthStart.toString()}
                        monthStart={monthStart}
                        year={year}
                        partner={partner}
                        holidays={holidays}
                        mode={mode}
                        dragState={dragState}
                        onDragStart={handleDragStart}
                        onDragEnter={handleDragEnter}
                        settings={settings}
                    />
                ))}
            </div>

            <div className="flex flex-wrap justify-center gap-6 text-xs text-gray-500">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-primary"></div> Congé</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-purple-500"></div> Formations données</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-orange-500"></div> Formations reçues</div>
                {partner.allocations.hasAFVAC && (
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-[#FBC619]"></div> AFVAC</div>
                )}
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-gray-900"></div> Maladie</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-blue-500 flex items-center justify-center text-[8px] text-white font-bold">+</div> Ajouté</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-red-500 flex items-center justify-center text-[8px] text-white font-bold">-</div> Retiré</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-gray-100 border border-gray-200"></div> Travaillable</div>
            </div>
        </div>
    );
}

const isDateInRange = (dateStr, startStr, endStr) => {
    if (!startStr || !endStr) return false;
    let start = parseISO(startStr);
    let end = parseISO(endStr);
    if (isBefore(end, start)) {
        const temp = start;
        start = end;
        end = temp;
    }
    const date = parseISO(dateStr);
    return !isBefore(date, start) && !isAfter(date, end);
};

function MonthGrid({ monthStart, partner, holidays, mode, dragState, onDragStart, onDragEnter, settings }) {
    const monthTime = monthStart.getTime();
    const days = useMemo(() => {
        const end = endOfMonth(monthStart);
        return eachDayOfInterval({ start: monthStart, end });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [monthTime]);
    const startDay = getDay(monthStart); // 0=Sun
    const startOffset = (startDay + 6) % 7; // Mon=0
    const emptyCells = Array(startOffset).fill(null);

    const monthName = format(monthStart, 'MMMM', { locale: fr });

    const workedDaysThisMonth = useMemo(() => {
        let count = 0;
        const extraWorkedDays = new Set([...(partner.trainingsReceived || []), ...(partner.trainingsGiven || [])]);
        const vacationSet = new Set(partner.vacations || []);
        const afvacSet = new Set(partner.afvac || []);
        const sickLeaveSet = new Set(partner.sickLeave || []);

        days.forEach(day => {
            if (isWeekend(day)) return;

            const dateStr = format(day, 'yyyy-MM-dd');
            const dayOfWeek = day.getDay();
            const exception = (partner.workDayExceptions || {})[dateStr];

            const holidayName = holidays[dateStr];
            if (holidayName && exception !== true) {
                const isPentecote = holidayName.toLowerCase().includes('pentecôte');
                if (!isPentecote) return;
            }

            if (extraWorkedDays.has(dateStr)) {
                count++;
                return;
            }

            let isNormallyWorked = false;
            if (exception !== undefined) {
                isNormallyWorked = exception === true;
            } else {
                const currentWorkDays = getWorkDaysForDate(day, partner.workPeriods) || partner.workDays || {};
                isNormallyWorked = currentWorkDays[dayOfWeek] === true;
            }

            if (!isNormallyWorked) return;

            if (vacationSet.has(dateStr)) return;
            if (afvacSet.has(dateStr) || sickLeaveSet.has(dateStr)) return;

            count++;
        });

        return count;
    }, [days, partner, holidays]);

    const vacationDaysThisMonth = useMemo(() => {
        let count = 0;
        days.forEach(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            if ((partner.vacations || []).includes(dateStr)) {
                count += calculateDeductedDays(dateStr, dateStr, partner.workDays, holidays, false, partner.workPeriods, partner.workDayExceptions);
            } else if (settings?.countHolidaysAsLeave) {
                const holidayName = holidays[dateStr];
                if (holidayName && !holidayName.toLowerCase().includes('pentecôte')) {
                    const dayOfWeek = day.getDay();
                    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                        if (calculateDeductedDays(dateStr, dateStr, partner.workDays, holidays, false, partner.workPeriods, partner.workDayExceptions) > 0) {
                            count++;
                        }
                    }
                }
            }
        });
        return count;
    }, [days, partner.vacations, partner.workDays, partner.workPeriods, partner.workDayExceptions, holidays, settings?.countHolidaysAsLeave]);

    return (
        <div>
            <div className="flex items-center gap-2 mb-4">
                <h4 className="text-sm font-bold capitalize text-gray-900 bg-gray-100 px-2.5 py-1 rounded-md shrink-0">
                    {monthName}
                </h4>
                <div className="h-px flex-1 bg-gray-100" />
                <div className="flex items-center gap-1.5 shrink-0 text-[10px] font-semibold">
                    <div className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100/50" title="Jours travaillés (incl. formations)">
                        {workedDaysThisMonth}j trav.
                    </div>
                    {vacationDaysThisMonth > 0 && (
                        <div className="px-1.5 py-0.5 rounded bg-blue-50 text-primary border border-blue-100/50" title="Jours de congés posés">
                            {vacationDaysThisMonth}j vac.
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
                {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
                    <div key={`${d}-${i}`} className="text-[10px] text-center text-gray-400 font-bold">
                        {d}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5">
                {emptyCells.map((_, i) => (
                    <div key={`empty-${i}`} />
                ))}

                {days.map(day => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const dayOfWeek = getDay(day);
                    const isWknd = isWeekend(day);

                    const isVacation = partner.vacations.includes(dateStr);
                    const isGiven = (partner.trainingsGiven || []).includes(dateStr);
                    const isReceived = (partner.trainingsReceived || []).includes(dateStr);
                    const isAFVAC = (partner.afvac || []).includes(dateStr);
                    const isSick = (partner.sickLeave || []).includes(dateStr);
                    const exception = (partner.workDayExceptions || {})[dateStr];

                    const holidayName = holidays[dateStr];
                    const isPentecote = isWorkedHoliday(holidayName);
                    const isHoliday = !!holidayName;

                    const currentWorkDays = getWorkDaysForDate(day, partner.workPeriods) || partner.workDays || {};
                    let isPartnerWorkDay = currentWorkDays[dayOfWeek] === true;

                    if (exception !== undefined) {
                        isPartnerWorkDay = exception === true;
                    }

                    let isActualWorkDay = isPartnerWorkDay;
                    if (isHoliday && exception !== true && !isPentecote) {
                        isActualWorkDay = false;
                    }

                    let stateClasses = "bg-white text-gray-700 hover:bg-gray-50 border border-gray-100 hover:border-gray-300 cursor-pointer";

                    // Default states
                    if (isWknd && !isPartnerWorkDay) {
                        stateClasses = "text-gray-300 bg-gray-50 border-transparent cursor-default";
                    } else if (isHoliday && !isActualWorkDay && !isPentecote) {
                        stateClasses = "bg-red-50 text-red-500 font-bold border-red-100 cursor-default";
                    } else if (!isActualWorkDay) {
                        stateClasses = "bg-gray-100/50 text-gray-300 border-transparent cursor-default";
                    }

                    // Active States (Override defaults if selected)
                    if (isVacation) stateClasses = 'bg-primary text-white shadow-md shadow-primary/20 scale-105 z-10';
                    else if (isGiven) stateClasses = 'bg-purple-500 text-white shadow-md shadow-purple-500/20 scale-105 z-10';
                    else if (isReceived) stateClasses = 'bg-orange-500 text-white shadow-md shadow-orange-500/20 scale-105 z-10';
                    else if (isAFVAC) stateClasses = 'bg-[#FBC619] text-white shadow-md shadow-yellow-500/20 scale-105 z-10';
                    else if (isSick) stateClasses = 'bg-gray-900 text-white shadow-md shadow-gray-900/20 scale-105 z-10';
                    else if (isPentecote) {
                        stateClasses += " ring-2 ring-secondary/20 text-secondary font-semibold";
                    }

                    // Interaction Logic
                    const hasOtherAction = isVacation || isGiven || isReceived || isAFVAC || isSick;
                    let isDisabled = false;
                    if (mode === 'vacation') {
                        isDisabled = isWknd || (isHoliday && !isPentecote);
                    } else if (mode === 'afvac') {
                        isDisabled = !partner.allocations.hasAFVAC || isHoliday || isWknd;
                    } else if (mode === 'sick') {
                        isDisabled = isHoliday || isWknd;
                    } else if (mode === 'adjustment') {
                        isDisabled = hasOtherAction;
                    } else {
                        // Training modes
                        isDisabled = false;
                    }

                    const inDragRange = isDateInRange(dateStr, dragState.start, dragState.current);
                    const dragClasses = inDragRange ? `ring-2 ring-offset-1 ${dragState.action === 'add' ? 'ring-primary' : 'ring-red-400 opacity-50'}` : '';

                    // Tooltip text
                    let dayTitle = holidayName || "";
                    if (isVacation) dayTitle = "Congés";
                    else if (isGiven) dayTitle = "Formations données";
                    else if (isReceived) dayTitle = "Formations reçues";
                    else if (isAFVAC) dayTitle = "AFVAC";
                    else if (isSick) dayTitle = "Maladie";
                    else if (isPentecote) dayTitle = holidayName + " (Travaillé)";
                    else if (exception === true) dayTitle = "Ajustement (Jour travaillé)";
                    else if (exception === false) dayTitle = "Ajustement (Jour de repos)";

                    return (
                        <button
                            key={dateStr}
                            disabled={isDisabled}
                            onMouseDown={(e) => {
                                if (isDisabled) return;
                                let isActioned = false;
                                if (mode === 'vacation') isActioned = isVacation;
                                else if (mode === 'given') isActioned = isGiven;
                                else if (mode === 'received') isActioned = isReceived;
                                else if (mode === 'afvac') isActioned = isAFVAC;
                                else if (mode === 'sick') isActioned = isSick;
                                else if (mode === 'adjustment') isActioned = exception !== undefined;
                                onDragStart(e, dateStr, isActioned);
                            }}
                            onMouseEnter={() => {
                                if (!isDisabled) onDragEnter(dateStr);
                            }}
                            className={`
                h-9 w-9 rounded-lg flex items-center justify-center text-xs transition-all duration-200 relative group/day
                ${stateClasses}
                ${dragClasses}
                ${!isDisabled && mode === 'given' && !isGiven && !isVacation && !isReceived && !isAFVAC && !isSick ? 'hover:border-purple-300 hover:text-purple-600' : ''}
                ${!isDisabled && mode === 'received' && !isReceived && !isVacation && !isGiven && !isAFVAC && !isSick ? 'hover:border-orange-300 hover:text-orange-600' : ''}
                ${!isDisabled && mode === 'afvac' && partner.allocations.hasAFVAC && !isAFVAC && !isVacation && !isGiven && !isReceived && !isSick ? 'hover:border-[#FBC619] hover:text-[#FBC619]' : ''}
                ${!isDisabled && mode === 'sick' && !isSick && !isVacation && !isGiven && !isReceived && !isAFVAC ? 'hover:border-gray-900 hover:text-gray-900' : ''}
              `}
                        >
                            {format(day, 'd')}

                            {exception === true && (
                              <div className="absolute top-0 right-0 -mt-1 -mr-1 w-3 h-3 bg-blue-500 text-white text-[8px] flex items-center justify-center rounded-full border border-white font-bold leading-none">+</div>
                            )}
                            {exception === false && (
                              <div className="absolute top-0 right-0 -mt-1 -mr-1 w-3 h-3 bg-red-500 text-white text-[8px] flex items-center justify-center rounded-full border border-white font-bold leading-none">-</div>
                            )}

                            {dayTitle && (
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900/90 backdrop-blur text-white text-[10px] font-medium rounded opacity-0 group-hover/day:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity shadow-lg">
                                    {dayTitle}
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
