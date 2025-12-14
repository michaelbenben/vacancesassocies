import { eachMonthOfInterval, endOfMonth, endOfYear, eachDayOfInterval, format, getDay, isWeekend, startOfYear } from 'date-fns';
import { fr } from 'date-fns/locale';
import { usePartnerContext } from '../context/PartnerContext';
import { isWorkedHoliday } from '../utils/holidays';

export default function CalendarView({ partner }) {
    const { year, holidays, toggleVacation } = usePartnerContext();

    const yearStart = startOfYear(new Date(year, 0, 1));
    const yearEnd = endOfYear(yearStart);

    const months = eachMonthOfInterval({
        start: yearStart,
        end: yearEnd
    });

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-x-12 gap-y-12">
            {months.map(monthStart => (
                <MonthGrid
                    key={monthStart.toString()}
                    monthStart={monthStart}
                    year={year}
                    partner={partner}
                    holidays={holidays}
                    onToggle={toggleVacation}
                />
            ))}
        </div>
    );
}

function MonthGrid({ monthStart, partner, holidays, onToggle }) {
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

                    const isSelected = partner.vacations.includes(dateStr);
                    const holidayName = holidays[dateStr];
                    const isPentecote = isWorkedHoliday(holidayName);
                    const isHoliday = !!holidayName;

                    const isPartnerWorkDay = partner.workDays[dayOfWeek] !== false;

                    let stateClasses = "bg-white text-gray-700 hover:bg-gray-50 border border-gray-100 hover:border-gray-300 cursor-pointer";

                    if (isWknd) {
                        stateClasses = "text-gray-300 bg-gray-50 border-transparent cursor-default";
                    } else if (isHoliday && !isPentecote) {
                        stateClasses = "bg-red-50 text-red-500 font-bold border-red-100 cursor-default";
                    } else if (!isPartnerWorkDay) {
                        stateClasses = "bg-gray-100/50 text-gray-300 border-transparent cursor-default";
                    }

                    if (isSelected) {
                        stateClasses = "bg-primary text-white shadow-md shadow-primary/25 border-primary font-bold scale-110 z-10";
                    } else if (isPentecote) {
                        stateClasses += " ring-2 ring-secondary/20 text-secondary font-semibold";
                    }

                    return (
                        <button
                            key={dateStr}
                            disabled={isWknd || (isHoliday && !isPentecote)}
                            onClick={() => onToggle(partner.id, dateStr)}
                            className={`
                h-9 w-9 rounded-lg flex items-center justify-center text-xs transition-all duration-200 relative group/day
                ${stateClasses}
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
