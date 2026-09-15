import { useState, useEffect, useMemo } from 'react';
import { eachMonthOfInterval, endOfMonth, endOfYear, eachDayOfInterval, format, getDay, isWeekend, startOfYear, parseISO, isBefore, isAfter } from 'date-fns';
import { fr } from 'date-fns/locale';
import { usePartnerContext } from '../context/PartnerContext';
import { isWorkedHoliday } from '../utils/holidays';
import { getWorkDaysForDate, calculateDeductedDays } from '../utils/dateUtils';
import { getDayValue, getDayPart, formatDays, stripPart } from '../utils/halfDays';
import { formatExceptionLabel } from '../utils/exceptions.js';
import { GraduationCap, Umbrella, BookOpen, Activity } from 'lucide-react';

export default function CalendarView({ partner }) {
    const { year, holidays, settings, pentecoteWorked = true } = usePartnerContext();
    const [mode, setMode] = useState('vacation'); // 'vacation' | 'given' | 'received' | 'afvac' | 'sick' | 'adjustment'
    const [quantity, setQuantity] = useState('FULL'); // 'FULL' | 'HALF'

    const { applyBatchDates, cycleHalfDay } = usePartnerContext();

    const [dragState, setDragState] = useState({
        isDragging: false,
        start: null,
        current: null,
        action: null,
        quantity: 'FULL'
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
                    
                    applyBatchDates(partner.id, dateStrings, mode, dragState.action, dragState.quantity || quantity);
                }
                setDragState({ isDragging: false, start: null, current: null, action: null, quantity: quantity });
            }
        };

        window.addEventListener('mouseup', handleMouseUp);
        return () => window.removeEventListener('mouseup', handleMouseUp);
    }, [dragState, applyBatchDates, partner.id, mode, quantity]);

    const handleDragStart = (e, dateStr, isCurrentlyActioned) => {
        // En HALF, pas de drag : le cycle est géré au clic via handleHalfClick
        if (quantity === 'HALF') return;
        e.preventDefault();
        setDragState({
            isDragging: true,
            start: dateStr,
            current: dateStr,
            action: isCurrentlyActioned ? 'remove' : 'add',
            quantity: 'FULL'
        });
    };

    const handleHalfClick = (dateStr) => {
        cycleHalfDay(partner.id, dateStr, mode);
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

                {/* Quantity Switcher — Journée entière / Demi-journée */}
                <div className="inline-flex bg-white border border-gray-200 p-1 rounded-xl gap-1 shadow-sm">
                    <button
                        onClick={() => setQuantity('FULL')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${quantity === 'FULL' ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        Journée entière
                    </button>
                    <button
                        onClick={() => setQuantity('HALF')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${quantity === 'HALF' ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        Demi-journée
                    </button>
                </div>

                {/* Mode Explanation Text */}
                <div className="max-w-xl text-center animate-in fade-in slide-in-from-top-1 duration-300">
                    <p className="text-[11px] font-medium text-gray-500 leading-relaxed italic">
                        {mode === 'vacation' && (quantity === 'FULL' ? "Décompté du solde annuel. Un jour de congé posé sur un jour travaillé réduit le solde de 1." : "1er clic = Matin, 2e = Après-midi, 3e = annule. Décompté 0,5 du solde.")}
                        {mode === 'given' && (quantity === 'FULL' ? "Considéré comme du temps de travail effectif. Posée sur un jour de repos, elle augmente le total travaillé." : "1er clic = Matin, 2e = Après-midi, 3e = annule.")}
                        {mode === 'received' && (quantity === 'FULL' ? "Considéré comme du temps de travail effectif. Posée sur un jour de repos, elle augmente le total travaillé." : "1er clic = Matin, 2e = Après-midi, 3e = annule.")}
                        {mode === 'afvac' && (quantity === 'FULL' ? "Absence pour congrès. Décomptée des jours travaillés mais n'impacte pas le solde de congés." : "1er clic = Matin, 2e = Après-midi, 3e = annule.")}
                        {mode === 'sick' && (quantity === 'FULL' ? "Absence maladie. Décomptée des jours travaillés mais n'impacte pas le solde de congés." : "1er clic = Matin, 2e = Après-midi, 3e = annule.")}
                        {mode === 'adjustment' && (quantity === 'FULL' ? "Modifications manuelles du planning. Ajoutez un jour (+) ou retirez-en un (-) pour ajuster le total travaillé." : "Demi-ajustement générique (±0,5) : +0,5 sur repos, -0,5 sur travaillé. Re-cliquez pour annuler.")}
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
                        quantity={quantity}
                        dragState={dragState}
                        onDragStart={handleDragStart}
                        onDragEnter={handleDragEnter}
                        onHalfClick={handleHalfClick}
                        settings={settings}
                        pentecoteWorked={pentecoteWorked}
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
                <div className="flex items-center gap-2"><div className="w-4 h-3 rounded border border-gray-300" style={{ background: 'linear-gradient(to right, #C51F84 50%, #fff 50%)' }}></div> Demi-journée</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-blue-500 flex items-center justify-center text-[8px] text-white font-bold">+</div> Ajouté</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-red-500 flex items-center justify-center text-[8px] text-white font-bold">-</div> Retiré</div>
                <div className="flex items-center gap-2"><div className="h-3 px-1 rounded-full bg-blue-500/90 text-white text-[8px] font-bold flex items-center">+½</div> Demi-ajout</div>
                <div className="flex items-center gap-2"><div className="h-3 px-1 rounded-full bg-red-500/90 text-white text-[8px] font-bold flex items-center">-½</div> Demi-retrait</div>
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

const HALF_COLORS = {
    vacation: '#C51F84',
    given: '#a855f7',
    received: '#f97316',
    afvac: '#FBC619',
    sick: '#111827',
};

function MonthGrid({ monthStart, partner, holidays, mode, quantity = 'FULL', dragState, onDragStart, onDragEnter, onHalfClick, settings, pentecoteWorked = true }) {
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

        days.forEach(day => {
            const dateStr = format(day, 'yyyy-MM-dd');

            const trainingVal = Math.max(
                getDayValue(partner.trainingsReceived || [], dateStr),
                getDayValue(partner.trainingsGiven || [], dateStr)
            );
            if (trainingVal >= 1) { count += 1; return; }

            const exception = (partner.workDayExceptions || {})[dateStr];
            const holidayName = holidays[dateStr];
            let base = 0;
            const isWknd = isWeekend(day);
            let isOffHoliday = false;
            if (holidayName && exception !== true && exception !== 0.5 && exception !== -0.5) {
                if (!isWorkedHoliday(holidayName, pentecoteWorked)) isOffHoliday = true;
            }
            if (!isWknd && !isOffHoliday) {
                if (exception === true) base = 1;
                else if (exception === false) base = 0;
                else if (exception === 0.5 || exception === -0.5) base = 0.5;
                else {
                    const currentWorkDays = getWorkDaysForDate(day, partner.workPeriods) || partner.workDays || {};
                    base = currentWorkDays[day.getDay()] === true ? 1 : 0;
                }
            } else if (exception === true) {
                base = 1;
            } else if (exception === 0.5 || exception === -0.5) {
                base = 0.5;
            }

            if (trainingVal > 0) {
                if (base === 0) { count += 0.5; return; }
                if (base === 0.5) { count += trainingVal >= 1 ? 1 : 0.5; return; }
                count += 1; return;
            }
            if (base === 0) return;

            const absent = Math.max(
                getDayValue(partner.vacations || [], dateStr),
                getDayValue(partner.afvac || [], dateStr),
                getDayValue(partner.sickLeave || [], dateStr)
            );
            if (absent > 0) { count += Math.max(0, base - absent); return; }

            count += base;
        });

        return Math.round(count * 2) / 2;
    }, [days, partner, holidays, pentecoteWorked]);

    const vacationDaysThisMonth = useMemo(() => {
        let count = 0;
        // Somme directe des clés (FULL=1, AM/PM=0.5 via calculateDeductedDays)
        const monthPrefix = format(monthStart, 'yyyy-MM');
        (partner.vacations || []).forEach(key => {
            const base = stripPart(key);
            if (base.startsWith(monthPrefix)) {
                count += calculateDeductedDays(key, key, partner.workDays, holidays, false, partner.workPeriods, partner.workDayExceptions, pentecoteWorked);
            }
        });
        // Jours fériés comptés comme congés (option globale)
        if (settings?.countHolidaysAsLeave) {
            days.forEach(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                if (getDayValue(partner.vacations || [], dateStr) > 0) return; // déjà compté
                const holidayName = holidays[dateStr];
                if (holidayName && !isWorkedHoliday(holidayName, pentecoteWorked)) {
                    const dayOfWeek = day.getDay();
                    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                        if (calculateDeductedDays(dateStr, dateStr, partner.workDays, holidays, false, partner.workPeriods, partner.workDayExceptions, pentecoteWorked) > 0) {
                            count++;
                        }
                    }
                }
            });
        }
        return Math.round(count * 2) / 2;
    }, [days, monthStart, partner.vacations, partner.workDays, partner.workPeriods, partner.workDayExceptions, holidays, settings?.countHolidaysAsLeave, pentecoteWorked]);

    return (
        <div>
            <div className="flex items-center gap-2 mb-4">
                <h4 className="text-sm font-bold capitalize text-gray-900 bg-gray-100 px-2.5 py-1 rounded-md shrink-0">
                    {monthName}
                </h4>
                <div className="h-px flex-1 bg-gray-100" />
                <div className="flex items-center gap-1.5 shrink-0 text-[10px] font-semibold">
                    <div className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100/50" title="Jours travaillés (incl. formations)">
                        {formatDays(workedDaysThisMonth)}j trav.
                    </div>
                    {vacationDaysThisMonth > 0 && (
                        <div className="px-1.5 py-0.5 rounded bg-blue-50 text-primary border border-blue-100/50" title="Jours de congés posés">
                            {formatDays(vacationDaysThisMonth)}j vac.
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

                    const vacationVal = getDayValue(partner.vacations || [], dateStr);
                    const givenVal = getDayValue(partner.trainingsGiven || [], dateStr);
                    const receivedVal = getDayValue(partner.trainingsReceived || [], dateStr);
                    const afvacVal = getDayValue(partner.afvac || [], dateStr);
                    const sickVal = getDayValue(partner.sickLeave || [], dateStr);

                    const isVacation = vacationVal > 0;
                    const isGiven = givenVal > 0;
                    const isReceived = receivedVal > 0;
                    const isAFVAC = afvacVal > 0;
                    const isSick = sickVal > 0;
                    const exception = (partner.workDayExceptions || {})[dateStr];

                    const holidayName = holidays[dateStr];
                    const isPentecote = isWorkedHoliday(holidayName, pentecoteWorked);
                    const isHoliday = !!holidayName;

                    const currentWorkDays = getWorkDaysForDate(day, partner.workPeriods) || partner.workDays || {};
                    let isPartnerWorkDay = currentWorkDays[dayOfWeek] === true;

                    const isHalfException = exception === 0.5 || exception === -0.5;
                    if (exception === true) isPartnerWorkDay = true;
                    else if (exception === false) isPartnerWorkDay = false;
                    else if (isHalfException) isPartnerWorkDay = true;
                    else if (exception !== undefined) isPartnerWorkDay = false;

                    let isActualWorkDay = isPartnerWorkDay;
                    if (isHoliday && exception !== true && exception !== 0.5 && exception !== -0.5 && !isPentecote) {
                        isActualWorkDay = false;
                    }

                    let stateClasses = "bg-white text-gray-700 hover:bg-gray-50 border border-gray-100 hover:border-gray-300 cursor-pointer";
                    let halfStyle = null;

                    // Default states
                    if (isWknd && !isPartnerWorkDay) {
                        stateClasses = "text-gray-300 bg-gray-50 border-transparent cursor-default";
                    } else if (isHoliday && !isActualWorkDay && !isPentecote) {
                        stateClasses = "bg-red-50 text-red-500 font-bold border-red-100 cursor-default";
                    } else if (!isActualWorkDay) {
                        stateClasses = "bg-gray-100/50 text-gray-300 border-transparent cursor-default";
                    }

                    // Active States (Override defaults if selected) — FULL vs HALF
                    const getActivePart = () => {
                        if (isVacation) return getDayPart(partner.vacations || [], dateStr);
                        if (isGiven) return getDayPart(partner.trainingsGiven || [], dateStr);
                        if (isReceived) return getDayPart(partner.trainingsReceived || [], dateStr);
                        if (isAFVAC) return getDayPart(partner.afvac || [], dateStr);
                        if (isSick) return getDayPart(partner.sickLeave || [], dateStr);
                        return null;
                    };
                    const activePart = getActivePart();
                    const isHalf = activePart === 'AM' || activePart === 'PM';
                    const activeType = isVacation ? 'vacation' : isGiven ? 'given' : isReceived ? 'received' : isAFVAC ? 'afvac' : isSick ? 'sick' : null;

                    if (isVacation || isGiven || isReceived || isAFVAC || isSick) {
                        if (isHalf && activeType) {
                            const color = HALF_COLORS[activeType];
                            halfStyle = activePart === 'AM'
                                ? { background: `linear-gradient(to right, ${color} 50%, #ffffff 50%)` }
                                : { background: `linear-gradient(to right, #ffffff 50%, ${color} 50%)` };
                            stateClasses = 'text-gray-900 border border-gray-300 shadow-sm scale-105 z-10 font-bold';
                        } else {
                            if (isVacation) stateClasses = 'bg-primary text-white shadow-md shadow-primary/20 scale-105 z-10';
                            else if (isGiven) stateClasses = 'bg-purple-500 text-white shadow-md shadow-purple-500/20 scale-105 z-10';
                            else if (isReceived) stateClasses = 'bg-orange-500 text-white shadow-md shadow-orange-500/20 scale-105 z-10';
                            else if (isAFVAC) stateClasses = 'bg-[#FBC619] text-white shadow-md shadow-yellow-500/20 scale-105 z-10';
                            else if (isSick) stateClasses = 'bg-gray-900 text-white shadow-md shadow-gray-900/20 scale-105 z-10';
                        }
                    }
                    else if (isPentecote) {
                        stateClasses += " ring-2 ring-secondary/20 text-secondary font-semibold";
                    }

                    // Interaction Logic
                    const hasOtherAction = isVacation || isGiven || isReceived || isAFVAC || isSick;
                    // Statut posé pour le mode courant (FULL ou ½) : autorise toujours le retrait,
                    // même si le jour est devenu non-posable (ex. Pentecôte basculée fériée).
                    const hasStatusForMode =
                        mode === 'vacation' ? isVacation :
                        mode === 'given' ? isGiven :
                        mode === 'received' ? isReceived :
                        mode === 'afvac' ? isAFVAC :
                        mode === 'sick' ? isSick :
                        mode === 'adjustment' ? exception !== undefined : false;
                    let isDisabled = false;
                    if (mode === 'vacation') {
                        isDisabled = isWknd || (isHoliday && !isPentecote);
                    } else if (mode === 'afvac') {
                        // Pentecôte travaillée => posable comme en congés
                        isDisabled = !partner.allocations.hasAFVAC || isWknd || (isHoliday && !isPentecote);
                    } else if (mode === 'sick') {
                        isDisabled = isWknd || (isHoliday && !isPentecote);
                    } else if (mode === 'adjustment') {
                        isDisabled = hasOtherAction;
                    } else {
                        // Training modes
                        isDisabled = false;
                    }
                    // Un jour déjà posé dans ce mode reste cliquable pour le retirer/nettoyer.
                    if (hasStatusForMode) isDisabled = false;

                    const inDragRange = quantity !== 'HALF' ? isDateInRange(dateStr, dragState.start, dragState.current) : false;
                    const dragClasses = inDragRange ? `ring-2 ring-offset-1 ${dragState.action === 'add' ? 'ring-primary' : 'ring-red-400 opacity-50'}` : '';

                    // Tooltip text
                    const partLabel = isHalf ? (activePart === 'AM' ? ' — Matin' : ' — Après-midi') : '';
                    let dayTitle = holidayName || "";
                    if (isVacation) dayTitle = "Congés" + partLabel;
                    else if (isGiven) dayTitle = "Formations données" + partLabel;
                    else if (isReceived) dayTitle = "Formations reçues" + partLabel;
                    else if (isAFVAC) dayTitle = "AFVAC" + partLabel;
                    else if (isSick) dayTitle = "Maladie" + partLabel;
                    else if (isPentecote) dayTitle = holidayName + " (Travaillé)";
                    else if (exception !== undefined) dayTitle = formatExceptionLabel(exception);

                    const isActionedForMode = () => {
                        // En HALF, pas de drag : le cycle est géré par onHalfClick
                        if (quantity === 'HALF') return false;
                        if (mode === 'vacation') return vacationVal >= 1;
                        if (mode === 'given') return givenVal >= 1;
                        if (mode === 'received') return receivedVal >= 1;
                        if (mode === 'afvac') return afvacVal >= 1;
                        if (mode === 'sick') return sickVal >= 1;
                        if (mode === 'adjustment') return exception !== undefined;
                        return false;
                    };

                    return (
                        <button
                            key={dateStr}
                            disabled={isDisabled}
                            style={halfStyle || undefined}
                            onMouseDown={(e) => {
                                if (isDisabled) return;
                                if (quantity === 'HALF') {
                                    e.preventDefault();
                                    onHalfClick(dateStr);
                                    return;
                                }
                                onDragStart(e, dateStr, isActionedForMode());
                            }}
                            onMouseEnter={() => {
                                if (!isDisabled && quantity !== 'HALF') onDragEnter(dateStr);
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

                            {isHalf && (
                              <span className="absolute bottom-0.5 right-1 text-[7px] font-black leading-none bg-white/90 rounded px-0.5 border border-gray-200">½</span>
                            )}

                            {exception === true && (
                              <div className="absolute top-0 right-0 -mt-1 -mr-1 w-3 h-3 bg-blue-500 text-white text-[8px] flex items-center justify-center rounded-full border border-white font-bold leading-none">+</div>
                            )}
                            {exception === false && (
                              <div className="absolute top-0 right-0 -mt-1 -mr-1 w-3 h-3 bg-red-500 text-white text-[8px] flex items-center justify-center rounded-full border border-white font-bold leading-none">-</div>
                            )}
                            {exception === 0.5 && (
                              <div className="absolute top-0 right-0 -mt-1 -mr-1 h-3 px-1 bg-blue-500/90 text-white text-[8px] flex items-center justify-center rounded-full border border-white font-bold leading-none">+½</div>
                            )}
                            {exception === -0.5 && (
                              <div className="absolute top-0 right-0 -mt-1 -mr-1 h-3 px-1 bg-red-500/90 text-white text-[8px] flex items-center justify-center rounded-full border border-white font-bold leading-none">-½</div>
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
