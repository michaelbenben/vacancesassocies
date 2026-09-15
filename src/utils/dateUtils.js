import { isWeekend, parseISO, eachDayOfInterval, startOfYear, endOfYear, format } from 'date-fns';
import { isWorkedHoliday } from './holidays.js';
import { stripPart, getDayValue } from './halfDays.js';
import { getWorkedWithException } from './exceptions.js';

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

        // Base travaillée avec ajustements (0 | 0.5 | 1).
        // Demi-ajustements (±0,5) valent 0.5 absolu.
        let workedBase = 0;
        if (exception !== undefined) {
            // true => 1 même sur WE/férié ; false => 0 ; demis => 0.5
            workedBase = getWorkedWithException(0, exception);
        } else {
            // weekends: no one works without exception
            if (isWeekend(day)) {
                workedBase = 0;
            } else {
                // public holidays (except pentecote) are off for deduction
                if (holidayName && !isWorkedHoliday(holidayName) && !countHolidaysAsLeave) {
                    workedBase = 0;
                } else {
                    const currentWorkDays = getWorkDaysForDate(day, workPeriods) || partnerWorkDays;
                    workedBase = currentWorkDays[dayOfWeek] === true ? 1 : 0;
                }
            }
        }

        if (workedBase <= 0) return;
        // Jour demi-travaillé (ajustement ±0,5) : on ne peut déduire que 0,5 max.
        if (workedBase === 0.5) {
            count += 0.5;
        } else {
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

        // Base travaillée (0 | 0.5 | 1) : week-ends et fériés (hors Pentecôte / forçage) = 0
        // true => 1, false => 0, ±0.5 => 0.5 (générique, sans distinction Matin/PM)
        let base = 0;
        const isWknd = isWeekend(day);
        const holidayName = holidays[dateStr];
        let isOffHoliday = false;
        if (holidayName && exception !== true && exception !== 0.5 && exception !== -0.5) {
            const isPentecote = holidayName.toLowerCase().includes('pentecôte');
            if (!isPentecote) isOffHoliday = true;
        }
        if (!isWknd && !isOffHoliday) {
            if (exception === true) base = 1;
            else if (exception === false) base = 0;
            else if (exception === 0.5 || exception === -0.5) base = 0.5;
            else {
                const currentWorkDays = getWorkDaysForDate(day, workPeriods) || partnerWorkDays;
                base = currentWorkDays[dayOfWeek] === true ? 1 : 0;
            }
        } else if (exception === true) {
            base = 1;
        } else if (exception === 0.5 || exception === -0.5) {
            // Demi-ajout sur WE/férié => 0.5 travaillé
            base = 0.5;
        }

        if (trainingVal > 0) {
            // Demi-formation : 0.5 si posé sur repos, sinon journée complète
            // base 0.5 (demi-ajustement) + demi-formation => 0.5 minimum, 1 si base pleine
            if (base === 0) {
                count += 0.5;
            } else if (base === 0.5) {
                count += trainingVal >= 1 ? 1 : 0.5;
            } else {
                count += 1;
            }
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
 * Les ajustements manuels (workDayExceptions) ne modifient PAS l'objectif :
 * ce sont des écarts constatés (1er chiffre) par rapport à une cible stable (2e chiffre).
 * Ex : 188/192 avec un jour retiré -> 187/192 (et non 187/191).
 *
 * @param {number} year
 * @param {Object} partnerWorkDays
 * @param {Object} holidays
 * @param {Array} workPeriods
 * @param {Object} _workDayExceptions - ignoré (gardé pour compatibilité d'appel)
 * @returns {number}
 */
export function calculateExpectedWorkedDays(year, partnerWorkDays, holidays, workPeriods = [], _workDayExceptions = {}) {
    const yearStart = startOfYear(new Date(year, 0, 1));
    const yearEnd = endOfYear(yearStart);
    const days = eachDayOfInterval({ start: yearStart, end: yearEnd });

    let count = 0;

    days.forEach(day => {
        if (isWeekend(day)) return;

        const dateStr = format(day, 'yyyy-MM-dd');

        const holidayName = holidays[dateStr];
        if (holidayName) {
            const isPentecote = holidayName.toLowerCase().includes('pentecôte');
            if (!isPentecote) return;
        }

        const dayOfWeek = day.getDay();
        const currentWorkDays = getWorkDaysForDate(day, workPeriods) || partnerWorkDays;
        if (currentWorkDays[dayOfWeek] === true) {
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
