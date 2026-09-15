/**
 * Service to manage French public holidays.
 * Source: https://calendrier.api.gouv.fr/jours-feries/metropole/{year}.json
 */

const CACHE = new Map();

export async function getFrenchHolidays(year) {
    if (CACHE.has(year)) {
        return CACHE.get(year);
    }

    try {
        const response = await fetch(`https://calendrier.api.gouv.fr/jours-feries/metropole/${year}.json`);
        if (!response.ok) throw new Error('Failed to fetch holidays');

        const data = await response.json();
        CACHE.set(year, data);
        return data;
    } catch (error) {
        console.error('Error fetching holidays:', error);
        return {};
    }
}

/**
 * Checks if a holiday name is the Lundi de Pentecôte.
 */
export function isPentecote(holidayName) {
    if (!holidayName) return false;
    return holidayName.toLowerCase().includes('pentecôte');
}

/**
 * Par défaut, la Pentecôte est fériée (non travaillée) à partir de 2027.
 * Avant 2027, elle reste travaillée (comportement historique).
 */
export function defaultPentecoteOff(year) {
    return Number(year) >= 2027;
}

/**
 * Réglage commun par année : settings.pentecoteOffByYear = { "2026": false, ... }.
 * true = fériée (repos), false/absent = voir défaut par année.
 */
export function isPentecoteOff(settings, year) {
    const map = settings?.pentecoteOffByYear || {};
    const key = String(year);
    if (Object.prototype.hasOwnProperty.call(map, key)) return !!map[key];
    return defaultPentecoteOff(year);
}

/**
 * Checks if a specific holiday should be worked (e.g., Lundi de Pentecôte).
 * @param {string} holidayName
 * @param {boolean} pentecoteWorked - false si la Pentecôte est fériée cette année-là.
 * @returns {boolean}
 */
export function isWorkedHoliday(holidayName, pentecoteWorked = true) {
    if (!holidayName) return false;
    if (!isPentecote(holidayName)) return false;
    return !!pentecoteWorked;
}
