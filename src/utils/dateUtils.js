import { isWeekend, parseISO, eachDayOfInterval, format } from 'date-fns';
import { isWorkedHoliday } from './holidays';

/**
 * Calculate the number of working days taken between two dates for a specific partner.
 * 
 * @param {Date|string} start - Start date of the leave
 * @param {Date|string} end - End date of the leave
 * @param {Object} partnerWorkDays - Map of day index (0=Sun, 1=Mon... 6=Sat) to boolean
 * @param {Object} holidays - Map of 'YYYY-MM-DD' -> 'Holiday Name' (from getFrenchHolidays)
 * @param {boolean} countHolidaysAsLeave - Config option: if true, holidays count as leave days (rare, usually false)
 * @returns {number} count of days deducted
 */
export function calculateDeductedDays(start, end, partnerWorkDays, holidays, countHolidaysAsLeave = false) {
    const startDate = typeof start === 'string' ? parseISO(start) : start;
    const endDate = typeof end === 'string' ? parseISO(end) : end;

    // Generate all days in interval
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    let count = 0;

    days.forEach(day => {
        // 1. Check if it's a weekend. No partner works weekends.
        if (isWeekend(day)) {
            return;
        }

        const dateStr = format(day, 'yyyy-MM-dd');
        const dayOfWeek = day.getDay(); // 0-6, 0 is Sunday

        // 2. Check if the partner normally works on this day of the week
        // partnerWorkDays is expected to be: { 1: true, 2: true, ... } (Mon-Fri)
        // If undefined, assume true? No, default to true, but code should provide it.
        // If partner doesn't work this day (e.g. Wednesday), it doesn't count as leave.
        if (partnerWorkDays[dayOfWeek] === false) {
            return;
        }

        // 3. Check for public holidays
        const holidayName = holidays[dateStr];
        if (holidayName) {
            // It is a holiday.
            const isPentecote = isWorkedHoliday(holidayName);

            if (isPentecote) {
                // Pentecost is a WORKED day.
                // If it's a worked day, and the partner is taking leave, does it count?
                // YES. If everyone works Pentecost, taking it off costs a vacation day.
                count++;
                return;
            }

            // Other holidays (Christmas, New Year, etc.)
            if (!countHolidaysAsLeave) {
                // Usually, you don't burn a leave day for a public holiday.
                return;
            }
        }

        // If we're here: It's weekday, partner works it, not a free holiday.
        count++;
    });

    return count;
}

/**
 * Default work schedule (Mon-Fri)
 */
export const DEFAULT_WORK_DAYS = {
    1: true, // Mon
    2: true, // Tue
    3: true, // Wed
    4: true, // Thu
    5: true, // Fri
};
