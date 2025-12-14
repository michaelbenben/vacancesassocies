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
 * Checks if a specific holiday should be worked (e.g., Lundi de Pentecôte).
 * In this specific company context, Lundi de Pentecôte is worked.
 * @param {string} holidayName 
 * @returns {boolean}
 */
export function isWorkedHoliday(holidayName) {
    if (!holidayName) return false;
    return holidayName.toLowerCase().includes('pentecôte');
}
