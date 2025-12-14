import { useState } from 'react';
import { eachMonthOfInterval, endOfMonth, endOfYear, eachDayOfInterval, format, getDay, isWeekend, startOfYear } from 'date-fns';
import { fr } from 'date-fns/locale';
import { usePartnerContext } from '../context/PartnerContext';
import { isWorkedHoliday } from '../utils/holidays';
import { GraduationCap, Umbrella, BookOpen } from 'lucide-react';

export default function CalendarView({ partner }) {
    const { year, holidays, toggleVacation, toggleTraining } = usePartnerContext();
    const [mode, setMode] = useState('vacation'); // 'vacation' | 'given' | 'received'

    const yearStart = startOfYear(new Date(year, 0, 1));
    const yearEnd = endOfYear(yearStart);

    const months = eachMonthOfInterval({
        start: yearStart,
        end: yearEnd
    });

    return (
        <div className="space-y-8">
            {/* Mode Switcher */}
            <div className="flex justify-center">
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
                        Formation Donnée
                    </button>
                    <button
                        onClick={() => setMode('received')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'received' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        <BookOpen className="w-4 h-4" />
                        Formation Reçue
                    </button>
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
                        onToggle={(id, date) => {
                            if (mode === 'vacation') {
                                toggleVacation(id, date);
                            } else {
                                // Check limit before adding
                                const isGiven = mode === 'given';
                                const list = (isGiven ? partner.trainingsGiven : partner.trainingsReceived) || [];
                                const limit = (isGiven ? partner.allocations.trainingGive : partner.allocations.trainingReceive) || 0;

                                // If unselecting (already in list), always allow
                                if (list.includes(date)) {
                                    toggleTraining(id, date, mode);
                                    return;
                                }

                                // If adding, check limit
                                if (list.length >= limit) {
                                    alert(`Limite atteinte pour les formations ${isGiven ? 'données' : 'reçues'} (${limit} jours).`);
                                    return;
                                }

                                toggleTraining(id, date, mode);
                            }
                        }}
                        mode={mode}
                    />
                ))}
            </div>

            <div className="flex flex-wrap justify-center gap-6 text-xs text-gray-500">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-primary"></div> Congé</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-purple-500"></div> Formation Donnée</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-orange-500"></div> Formation Reçue</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-gray-100 border border-gray-200"></div> Travaillable</div>
            </div>
        </div>
    );
}

function MonthGrid({ monthStart, partner, holidays, onToggle, mode }) {
    const monthEnd = endOfMonth(monthStart);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const startDay = getDay(monthStart); // 0=Sun
    const startOffset = (startDay + 6) % 7; // Mon=0
    const emptyCells = Array(startOffset).fill(null);

    const monthName = format(monthStart, 'MMMM', { locale: fr });

    return (
        <div>
            <div className="flex items-center gap-2 mb-4">
                <h4 className="text-sm font-bold capitalize text-gray-900 bg-gray-100 px-3 py-1 rounded-full">
                    {monthName}
                </h4>
                <div className="h-px flex-1 bg-gray-100" />
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
                    const isGiven = partner.trainingsGiven && partner.trainingsGiven.includes(dateStr);
                    const isReceived = partner.trainingsReceived && partner.trainingsReceived.includes(dateStr);

                    const holidayName = holidays[dateStr];
                    const isPentecote = isWorkedHoliday(holidayName);
                    const isHoliday = !!holidayName;

                    const isPartnerWorkDay = partner.workDays[dayOfWeek] !== false;

                    let stateClasses = "bg-white text-gray-700 hover:bg-gray-50 border border-gray-100 hover:border-gray-300 cursor-pointer";

                    // Default states
                    if (isWknd) {
                        stateClasses = "text-gray-300 bg-gray-50 border-transparent cursor-default";
                    } else if (isHoliday && !isPentecote) {
                        stateClasses = "bg-red-50 text-red-500 font-bold border-red-100 cursor-default";
                    } else if (!isPartnerWorkDay) {
                        stateClasses = "bg-gray-100/50 text-gray-300 border-transparent cursor-default";
                    }

                    // Active States (Override defaults if selected)
                    if (isVacation) {
                        stateClasses = "bg-primary text-white shadow-md shadow-primary/25 border-primary font-bold scale-110 z-10";
                    } else if (isGiven) {
                        stateClasses = "bg-purple-500 text-white shadow-md shadow-purple-500/25 border-purple-500 font-bold scale-110 z-10";
                    } else if (isReceived) {
                        stateClasses = "bg-orange-500 text-white shadow-md shadow-orange-500/25 border-orange-500 font-bold scale-110 z-10";
                    } else if (isPentecote) {
                        stateClasses += " ring-2 ring-secondary/20 text-secondary font-semibold";
                    }

                    // Interaction Logic
                    let isDisabled = false;
                    if (mode === 'vacation') {
                        isDisabled = isWknd || (isHoliday && !isPentecote);
                    } else {
                        // Training modes
                        isDisabled = false;
                    }

                    return (
                        <button
                            key={dateStr}
                            disabled={isDisabled}
                            onClick={() => onToggle(partner.id, dateStr)}
                            className={`
                h-9 w-9 rounded-lg flex items-center justify-center text-xs transition-all duration-200 relative group/day
                ${stateClasses}
                ${!isDisabled && mode === 'given' && !isGiven && !isVacation && !isReceived ? 'hover:border-purple-300 hover:text-purple-600' : ''}
                ${!isDisabled && mode === 'received' && !isReceived && !isVacation && !isGiven ? 'hover:border-orange-300 hover:text-orange-600' : ''}
              `}
                            title={holidayName || ''}
                        >
                            {format(day, 'd')}

                            {isHoliday && (
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900/90 backdrop-blur text-white text-[10px] font-medium rounded opacity-0 group-hover/day:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity shadow-lg">
                                    {holidayName}
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
