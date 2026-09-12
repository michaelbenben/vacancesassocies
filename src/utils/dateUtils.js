import { isWeekend, parseISO, eachDayOfInterval, startOfYear, endOfYear, format } from 'date-fns';
import { isWorkedHoliday } from './holidays.js';
import { stripPart, getDayValue } from './halfDays.js';

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
    // Support des clés demi-journées ("YYYY-MM-DD-AM/PM") : on calcule sur la date de base puis x0.5
    const rawStart = typeof start === 'string' ? stripPart(start) : start;
    const rawEnd = typeof end === 'string' ? stripPart(end) : end;
    const isHalfKey = (typeof start === 'string' && (start.endsWith('-AM') || start.endsWith('-PM')))
        || (typeof end === 'string' && (end.endsWith('-AM') || end.endsWith('-PM')));
    const factor = isHalfKey ? 0.5 : 1;

    const startDate = typeof rawStart === 'string' ? parseISO(rawStart) : rawStart;
    const endDate = typeof rawEnd === 'string' ? parseISO(rawEnd) : rawEnd;

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
            count += factor;
        }
    });

    return Math.round(count * 2) / 2;
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

    let count = 0;

    days.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const dayOfWeek = day.getDay();

        const trainingVal = Math.max(
            getDayValue(trainingsReceived, dateStr),
            getDayValue(trainingsGiven, dateStr)
        );
        const vacationVal = getDayValue(vacations, dateStr);
        const afvacVal = getDayValue(afvac, dateStr);
        const sickVal = getDayValue(sickLeave, dateStr);

        // Formations : comptent même sur jour non-travaillé / week-end / férié.
        // FULL -> 1j. HALF -> 0.5j si jour non-travaillé, sinon jour complet (0.5 travail + 0.5 formation).
        if (trainingVal >= 1) {
            count += 1;
            return;
        }

        const exception = workDayExceptions[dateStr];

        // Base travaillée (0 ou 1) : week-ends et fériés (hors Pentecôte / forçage +) = 0
        let base = 0;
        const isWknd = isWeekend(day);
        const holidayName = holidays[dateStr];
        let isOffHoliday = false;
        if (holidayName && exception !== true) {
            const isPentecote = holidayName.toLowerCase().includes('pentecôte');
            if (!isPentecote) isOffHoliday = true;
        }
        if (!isWknd && !isOffHoliday) {
            if (exception !== undefined) {
                base = exception === true ? 1 : 0;
            } else {
                const currentWorkDays = getWorkDaysForDate(day, workPeriods) || partnerWorkDays;
                base = currentWorkDays[dayOfWeek] === true ? 1 : 0;
            }
        } else if (exception === true) {
            base = 1;
        }

        if (trainingVal > 0) {
            // Demi-formation : 0.5 si posé sur repos, sinon journée complète
            count += base >= 1 ? 1 : 0.5;
            return;
        }

        if (base === 0) return;

        // Absences (congés / AFVAC / maladie) : FULL -> -1, HALF -> -0.5
        const absent = Math.max(vacationVal, afvacVal, sickVal);
        if (absent > 0) {
            count += Math.max(0, base - absent);
            return;
        }

        count += base;
    });

    return Math.round(count * 2) / 2;
}

/**
 * Calculate the expected total number of worked days in a year for a specific partner.
 * This is based purely on their configured schedule and public holidays,
 * before taking any vacations, sick leave, or extra training days into account.
 *
 * @param {number} year
 * @param {Object} partnerWorkDays
 * @param {Object} holidays
 * @param {Array} workPeriods
 * @returns {number}
 */
export function calculateExpectedWorkedDays(year, partnerWorkDays, holidays, workPeriods = [], workDayExceptions = {}) {
    const yearStart = startOfYear(new Date(year, 0, 1));
    const yearEnd = endOfYear(yearStart);
    const days = eachDayOfInterval({ start: yearStart, end: yearEnd });

    let count = 0;

    days.forEach(day => {
        if (isWeekend(day)) return;

        const dateStr = format(day, 'yyyy-MM-dd');
        const dayOfWeek = day.getDay();
        const exception = workDayExceptions[dateStr];

        const holidayName = holidays[dateStr];
        if (holidayName && exception !== true) {
            const isPentecote = holidayName.toLowerCase().includes('pentecôte');
            if (!isPentecote) return;
        }

        let isNormallyWorked = false;
        if (exception !== undefined) {
            isNormallyWorked = exception === true;
        } else {
            const currentWorkDays = getWorkDaysForDate(day, workPeriods) || partnerWorkDays;
            isNormallyWorked = currentWorkDays[dayOfWeek] === true;
        }

        if (isNormallyWorked) {
            count++;
        }
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
