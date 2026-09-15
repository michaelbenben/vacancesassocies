/**
 * Helpers ajustements (workDayExceptions).
 *
 * Valeurs supportées (rétro-compatible) :
 *  true  -> jour forcé travaillé (+1, absolu 1)
 *  false -> jour forcé repos (-1, absolu 0)
 *  0.5   -> demi-ajout (+0,5) — posé sur jour non-travaillé, absolu 0.5
 *  -0.5  -> demi-retrait (-0,5) — posé sur jour travaillé, absolu 0.5
 *
 * Les demis sont génériques : pas de distinction Matin / Après-midi
 * (choix utilisateur validé). Le signe sert uniquement à l'affichage
 * (+½ / -½), le calcul utilise la valeur absolue 0.5.
 */
import { isWeekend, format } from 'date-fns';
import { isWorkedHoliday } from './holidays.js';

export const FULL_ADD = true;
export const FULL_REMOVE = false;
export const HALF_ADD = 0.5;
export const HALF_REMOVE = -0.5;

export function isHalfException(v) {
  return v === 0.5 || v === -0.5;
}

export function isValidException(v) {
  return v === true || v === false || v === 0.5 || v === -0.5;
}

/** Nettoie une map d'exceptions (Firestore peut contenir des valeurs parasites). */
export function sanitizeExceptions(map = {}) {
  if (!map || typeof map !== 'object') return {};
  const out = {};
  Object.entries(map).forEach(([k, v]) => {
    if (isValidException(v)) out[k] = v;
  });
  return out;
}

function toDateStr(date) {
  return typeof date === 'string' ? date.slice(0, 10) : format(date, 'yyyy-MM-dd');
}

/** Planning applicable à une date (copie locale pour éviter cycle d'imports). */
export function getWorkDaysForDateLocal(date, workPeriods = []) {
  if (!workPeriods || workPeriods.length === 0) return null;
  const sorted = [...workPeriods].sort((a, b) => b.startDate.localeCompare(a.startDate));
  const dateStr = toDateStr(date);
  const period = sorted.find((p) => p.startDate <= dateStr);
  return period ? period.workDays : null;
}

/**
 * Base travaillée SANS exception : 0 ou 1.
 * Tient compte week-ends, fériés (Pentecôte travaillée) et planning.
 */
export function getBaseWorked(date, workDays, holidays = {}, workPeriods = []) {
  const d = typeof date === 'string' ? new Date(`${date.slice(0, 10)}T12:00:00`) : date;
  const dateStr = toDateStr(date);
  if (isWeekend(d)) return 0;
  const holidayName = holidays[dateStr];
  if (holidayName && !isWorkedHoliday(holidayName)) return 0;
  const current = getWorkDaysForDateLocal(d, workPeriods) || workDays || {};
  return current[d.getDay()] === true ? 1 : 0;
}

/**
 * Valeur travaillée AVEC exception : 0 | 0.5 | 1.
 * Les demis valent toujours 0.5 absolu, quel que soit le signe.
 */
export function getWorkedWithException(base, exception) {
  if (exception === true) return 1;
  if (exception === false) return 0;
  if (exception === 0.5 || exception === -0.5) return 0.5;
  return base;
}

/** Valeur travaillée d'un jour en tenant compte de la map d'exceptions. */
export function getDailyWorked(date, { workDays, holidays = {}, workPeriods = [], workDayExceptions = {} } = {}) {
  const dateStr = toDateStr(date);
  const base = getBaseWorked(dateStr, workDays, holidays, workPeriods);
  const exception = workDayExceptions[dateStr];
  const val = getWorkedWithException(base, exception);
  return Math.round(val * 2) / 2;
}

/** Signe à poser pour un demi-ajustement : -0.5 si travaillé, +0.5 sinon. */
export function getHalfAdjustmentValue(date, workDays, holidays = {}, workPeriods = []) {
  const base = getBaseWorked(date, workDays, holidays, workPeriods);
  return base >= 1 ? HALF_REMOVE : HALF_ADD;
}

/** Libellé FR pour tooltip/badge. */
export function formatExceptionLabel(v) {
  if (v === true) return 'Ajustement (Jour travaillé)';
  if (v === false) return 'Ajustement (Jour de repos)';
  if (v === 0.5) return 'Ajustement (+0,5j)';
  if (v === -0.5) return 'Ajustement (-0,5j)';
  return '';
}
