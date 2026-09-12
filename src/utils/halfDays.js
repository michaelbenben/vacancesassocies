/**
 * Helpers demi-journées.
 * Convention stockage (rétro-compatible) :
 *  "2026-05-04"     -> journée entière
 *  "2026-05-05-AM"  -> demi matin
 *  "2026-05-05-PM"  -> demi après-midi
 * Les anciens tableaux string[] continuent de fonctionner.
 */

export const FULL = 'FULL';
export const AM = 'AM';
export const PM = 'PM';

export function parseDayKey(key) {
  if (typeof key !== 'string') return { date: key, part: FULL };
  if (key.endsWith('-AM')) return { date: key.slice(0, -3), part: AM };
  if (key.endsWith('-PM')) return { date: key.slice(0, -3), part: PM };
  return { date: key, part: FULL };
}

export function toDayKey(dateStr, quantity = FULL) {
  if (quantity === AM) return `${dateStr}-AM`;
  if (quantity === PM) return `${dateStr}-PM`;
  return dateStr;
}

export function stripPart(key) {
  return parseDayKey(key).date;
}

/** Toutes les clés d'une liste correspondant à une date calendaire */
export function keysForDate(list = [], dateStr) {
  return (list || []).filter(
    (k) => k === dateStr || k === `${dateStr}-AM` || k === `${dateStr}-PM`
  );
}

/** 0 | 0.5 | 1 — valeur posée pour cette date dans cette liste */
export function getDayValue(list = [], dateStr) {
  const keys = keysForDate(list, dateStr);
  if (keys.includes(dateStr)) return 1;
  if (keys.length > 0) {
    // AM + PM ne devrait jamais coexister (auto-fusion), mais si oui -> 1
    if (keys.includes(`${dateStr}-AM`) && keys.includes(`${dateStr}-PM`)) return 1;
    return 0.5;
  }
  return 0;
}

/** 'FULL' | 'AM' | 'PM' | null */
export function getDayPart(list = [], dateStr) {
  if ((list || []).includes(dateStr)) return FULL;
  if ((list || []).includes(`${dateStr}-AM`)) return AM;
  if ((list || []).includes(`${dateStr}-PM`)) return PM;
  return null;
}

export function hasAnyOnDate(list = [], dateStr) {
  return getDayValue(list, dateStr) > 0;
}

/** Retire FULL + AM + PM pour cette date */
export function removeDate(list = [], dateStr) {
  return (list || []).filter(
    (k) => k !== dateStr && k !== `${dateStr}-AM` && k !== `${dateStr}-PM`
  );
}

/**
 * Ajoute une quantité sur une date (en supposant les autres types déjà nettoyés).
 * Gère la fusion AM + PM -> FULL.
 */
export function addDate(list = [], dateStr, quantity = FULL) {
  const current = list || [];
  if (quantity === FULL) {
    if (current.includes(dateStr)) return current;
    return [...removeDate(current, dateStr), dateStr];
  }
  const targetKey = toDayKey(dateStr, quantity);
  if (current.includes(targetKey)) return current;
  const opposite = quantity === AM ? `${dateStr}-PM` : `${dateStr}-AM`;
  if (current.includes(opposite)) {
    // AM + PM = journée entière
    return [...removeDate(current, dateStr), dateStr];
  }
  // Remplace un FULL existant par la demi demandée
  return [...removeDate(current, dateStr), targetKey];
}

/** Somme d'une liste (ex: 2 FULL + 1 AM = 2.5) */
export function sumDays(list = []) {
  let total = 0;
  (list || []).forEach((k) => {
    total += k.endsWith('-AM') || k.endsWith('-PM') ? 0.5 : 1;
  });
  // Arrondi au 0.5 pour éviter les flottants
  return Math.round(total * 2) / 2;
}

/** Format FR : 2 -> "2", 2.5 -> "2,5" */
export function formatDays(value) {
  return String(value).replace('.', ',');
}
