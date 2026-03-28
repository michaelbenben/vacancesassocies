import { isWeekend, parseISO, eachDayOfInterval, startOfYear, endOfYear, format } from 'date-fns';
import { isWorkedHoliday } from './holidays';

/**
 * Calculate the number of working days taken between two dates for a specific partner.
 * 
 * @param {Date|string} start - Start date of the leave
 * @param {Date|string} end - End date of the leave
 * @param {Object} partnerWorkDays - Map of day index (0=Sun, 1=Mon... 6=Sat) to boolean (Fallback if no periods)
 * @param {Object} holidays - Map of 'YYYY-MM-DD' -> 'Holiday Name'
 * @param {boolean} countHolidaysAsLeave - Config option
 * @param {Array} workPeriods - Optional array of { startDate, workDays }
 * @returns {number} count of days deducted
 */
export function calculateDeductedDays(start, end, partnerWorkDays, holidays, countHolidaysAsLeave = false, workPeriods = [], workDayExceptions = {}) {
    const startDate = typeof start === 'string' ? parseISO(start) : start;
    const endDate = typeof end === 'string' ? parseISO(end) : end;

    // Generate all days in interval
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    let count = 0;

    days.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const dayOfWeek = day.getDay(); // 0-6, 0 is Sunday
        const holidayName = holidays[dateStr];
        const exception = workDayExceptions[dateStr];

        // determine if this day should be treated as normally worked
        let isNormallyWorked = false;
        if (exception !== undefined) {
            isNormallyWorked = exception === true;
        } else {
            // weekends: no one works without exception
            if (isWeekend(day)) {
                isNormallyWorked = false;
            } else {
                // public holidays (except pentecote) are off for deduction
                if (holidayName && !isWorkedHoliday(holidayName) && !countHolidaysAsLeave) {
                    isNormallyWorked = false;
                } else {
                    const currentWorkDays = getWorkDaysForDate(day, workPeriods) || partnerWorkDays;
                    isNormallyWorked = currentWorkDays[dayOfWeek] === true;
                }
            }
        }

        if (isNormallyWorked) {
            count++;
        }
    });

    return count;
}

/**
 * @deprecated Le mécanisme de récupération est supprimé. Les formations sur jours
 * non travaillés sont désormais comptées comme jours travaillés supplémentaires.
 * Conservée ici pour éviter de casser d'éventuels appelants existants.
 */
export function calculateRecoveredDays() {
    return 0;
}

/**
 * Calculate the total number of worked days in a year for a specific partner.
 *
 * Worked days = all normal working days in the year (incl. Lundi de Pentecôte)
 *               - congés pris
 *               - jours AFVAC (pris sur temps de travail)
 *               + formations reçues sur jours non travaillés (elles sont travaillées)
 *               + formations données sur jours non travaillés (elles sont travaillées)
 *
 * Note: les jours AFVAC ne comptent PAS comme du travail. S'ils tombent sur un
 * jour normalement travaillé, ils réduisent le décompte des jours travaillés.
 *
 * @param {number} year
 * @param {Object} partnerWorkDays - Fallback if periods is empty
 * @param {Object} holidays
 * @param {string[]} vacations
 * @param {string[]} trainingsReceived
 * @param {string[]} trainingsGiven
 * @param {string[]} afvac
 * @param {Array} workPeriods
 * @returns {number}
 */
export function calculateWorkedDays(year, partnerWorkDays, holidays, vacations = [], trainingsReceived = [], trainingsGiven = [], afvac = [], workPeriods = [], sickLeave = [], workDayExceptions = {}) {
    const yearStart = startOfYear(new Date(year, 0, 1));
    const yearEnd = endOfYear(yearStart);
    const days = eachDayOfInterval({ start: yearStart, end: yearEnd });

    const vacationSet = new Set(vacations);
    const afvacSet = new Set(afvac);
    const sickLeaveSet = new Set(sickLeave);
    // Only training types count as worked even on non-scheduled days
    const extraWorkedDays = new Set([...trainingsReceived, ...trainingsGiven]);

    let count = 0;

    days.forEach(day => {
        // Never count weekends
        if (isWeekend(day)) return;

        const dateStr = format(day, 'yyyy-MM-dd');
        const dayOfWeek = day.getDay();

        const exception = workDayExceptions[dateStr];

        // Never count public holidays (except Lundi de Pentecôte which is worked)
        // UNLESS there is a manual adjustment forcing it to be worked (+)
        const holidayName = holidays[dateStr];
        if (holidayName && exception !== true) {
            const isPentecote = holidayName.toLowerCase().includes('pentecôte');
            if (!isPentecote) return;
        }

        // Formations (reçues ou données) on non-scheduled days = extra worked day
        if (extraWorkedDays.has(dateStr)) {
            count++;
            return;
        }

        // Check for manual exceptions
        let isNormallyWorked = false;
        if (exception !== undefined) {
            isNormallyWorked = exception === true;
        } else {
            // 2. Check work days for this specific date (from periods or global)
            const currentWorkDays = getWorkDaysForDate(day, workPeriods) || partnerWorkDays;
            isNormallyWorked = currentWorkDays[dayOfWeek] === true;
        }

        // Skip days the partner doesn't work (normally or by exception)
        if (!isNormallyWorked) return;

        // Skip vacation days
        if (vacationSet.has(dateStr)) return;

        // AFVAC or Sick Leave on working days = not worked
        if (afvacSet.has(dateStr) || sickLeaveSet.has(dateStr)) return;

        count++;
    });

    return count;
}

/**
 * Find the work days schedule for a specific date given a list of periods.
 */
export function getWorkDaysForDate(date, workPeriods = []) {
    if (!workPeriods || workPeriods.length === 0) return null;

    // Sort periods by date descending
    const sorted = [...workPeriods].sort((a, b) => b.startDate.localeCompare(a.startDate));

    // Find the first period that is <= date
    const dateStr = typeof date === 'string' ? date : format(date, 'yyyy-MM-dd');
    const period = sorted.find(p => p.startDate <= dateStr);

    return period ? period.workDays : null;
}

/**
 * Calculate the total vacation allocation for the year based on work periods.
 * Rule: 5 weeks * (weighted average of days worked per week).
 */
export function calculateAnnualVacationAllocation(year, workPeriods = [], fallbackWorkDays = null) {
    const yearStart = startOfYear(new Date(year, 0, 1));
    const yearEnd = endOfYear(yearStart);
    const days = eachDayOfInterval({ start: yearStart, end: yearEnd });
    const totalDaysInYear = days.length;

    let totalWeightedDays = 0;

    days.forEach(day => {
        const currentWorkDays = getWorkDaysForDate(day, workPeriods) || fallbackWorkDays || DEFAULT_WORK_DAYS;
        // Count how many days are worked in this week schedule
        const daysPerWeek = Object.values(currentWorkDays).filter(v => v === true).length;
        totalWeightedDays += daysPerWeek;
    });

    const averageDaysPerWeek = totalWeightedDays / totalDaysInYear;
    // Round to 0.5 for UX clarity (optional, but requested by some systems)
    return Math.round(averageDaysPerWeek * 5 * 2) / 2;
}

/**
 * Calculate the "normal" training allocation (1 week per year).
 * Rule: 1 week * (weighted average of days worked per week).
 */
export function calculateNormalTrainingAllocation(year, workPeriods = [], fallbackWorkDays = null) {
    const yearStart = startOfYear(new Date(year, 0, 1));
    const yearEnd = endOfYear(yearStart);
    const days = eachDayOfInterval({ start: yearStart, end: yearEnd });
    const totalDaysInYear = days.length;

    let totalWeightedDays = 0;

    days.forEach(day => {
        const currentWorkDays = getWorkDaysForDate(day, workPeriods) || fallbackWorkDays || DEFAULT_WORK_DAYS;
        const daysPerWeek = Object.values(currentWorkDays).filter(v => v === true).length;
        totalWeightedDays += daysPerWeek;
    });

    const averageDaysPerWeek = totalWeightedDays / totalDaysInYear;
    return Math.round(averageDaysPerWeek * 2) / 2;
}

export const DEFAULT_WORK_DAYS = {
    1: true, // Mon
    2: true, // Tue
    3: true, // Wed
    4: true, // Thu
    5: true, // Fri
};
