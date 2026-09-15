import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getFrenchHolidays, isWorkedHoliday, isPentecoteOff } from '../utils/holidays';
import { DEFAULT_WORK_DAYS, calculateAnnualVacationAllocation } from '../utils/dateUtils';
import { getDayValue, getDayPart, removeDate, addDate, stripPart } from '../utils/halfDays';
import { sanitizeExceptions, getBaseWorked, getHalfAdjustmentValue } from '../utils/exceptions.js';
import { getVacationData, saveVacationData, subscribeToVacationData } from '../firebase';

const PartnerContext = createContext();

const INITIAL_PARTNERS = [
    { id: '1', name: 'Nina' },
    { id: '2', name: 'Claire' },
    { id: '3', name: 'Michael' },
    { id: '4', name: 'Emilie' },
    { id: '5', name: 'Pauline' },
];

const DEFAULT_ALLOCATION = {
    vacation: 25,
    vacationBonus: 0,
    trainingGive: 0,
    trainingReceive: 0,
    hasAFVAC: true,
    hasSickLeave: true,
};

function createDefaultData() {
    return {
        partners: INITIAL_PARTNERS.map(p => ({
            ...p,
            workDays: { ...DEFAULT_WORK_DAYS },
            workPeriods: [
                { startDate: `${new Date().getFullYear()}-01-01`, workDays: { ...DEFAULT_WORK_DAYS } }
            ],
            allocations: { ...DEFAULT_ALLOCATION },
            vacations: [],
            trainingsGiven: [],
            trainingsReceived: [],
            afvac: [],
            sickLeave: [],
        })),
        settings: {
            countHolidaysAsLeave: true,
            pentecoteOffByYear: {},
        },
        year: 2026,
    };
}

function sanitizeDatabase(data) {
    if (!data || !data.partners) return data;
    return {
        ...data,
        partners: data.partners.map(p => ({
            ...p,
            allocations: {
                ...DEFAULT_ALLOCATION,
                ...p.allocations,
                hasAFVAC: p.allocations?.hasAFVAC !== undefined ? p.allocations.hasAFVAC : true,
                hasSickLeave: p.allocations?.hasSickLeave !== undefined ? p.allocations.hasSickLeave : true
            },
            yearSpecific: Object.keys(p.yearSpecific || {}).reduce((acc, yearKey) => {
                acc[yearKey] = {
                    ...p.yearSpecific[yearKey],
                    workDayExceptions: sanitizeExceptions(p.yearSpecific[yearKey].workDayExceptions || {})
                };
                return acc;
            }, {})
        }))
    };
}

export function PartnerProvider({ children }) {
    const [year, setYear] = useState(2026);
    const [holidays, setHolidays] = useState({});
    const [database, setDatabase] = useState({ partners: [] }); // { partners: [], settings: {} }
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const isSavingRef = useRef(false);

    // Initial load
    useEffect(() => {
        async function loadData() {
            try {
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Firebase timeout')), 5000)
                );

                const data = await Promise.race([getVacationData(), timeoutPromise]);

                if (data && data.partners) {
                    const sanitizedData = sanitizeDatabase(data);
                    setDatabase(sanitizedData);
                    if (data.year) setYear(data.year);
                } else {
                    const defaultData = createDefaultData();
                    await saveVacationData(defaultData);
                    setDatabase(defaultData);
                    setYear(defaultData.year);
                }
            } catch (error) {
                console.error('Error loading data from Firebase:', error);
            } finally {
                setIsLoading(false);
            }
        }
        loadData();
    }, []);

    // Subscribe to updates
    useEffect(() => {
        if (isLoading) return;

        const unsubscribe = subscribeToVacationData((data, hasPendingWrites) => {
            if (data && !hasPendingWrites && !isSavingRef.current && data.partners) {
                setDatabase(sanitizeDatabase(data));
            }
        });

        return () => unsubscribe();
    }, [isLoading]);

    // Fetch holidays
    useEffect(() => {
        getFrenchHolidays(year).then(data => setHolidays(data));
    }, [year]);

    const persistData = useCallback(async (newDb) => {
        isSavingRef.current = true;
        setIsSaving(true);
        try {
            await saveVacationData(newDb);
        } catch (error) {
            console.error('Error saving:', error);
        } finally {
            setTimeout(() => {
                isSavingRef.current = false;
                setIsSaving(false);
            }, 1000);
        }
    }, []);

    // Helper to get current view data for a specific partner and year
    // Helper to get current view data for a specific partner and year
    const getYearData = useCallback((p, y) => {
        const ys = p.yearSpecific || {};
        const data = ys[y] || {};
        const workPeriods = data.workPeriods || p.workPeriods || [
            { startDate: `${y}-01-01`, workDays: data.workDays || p.workDays || { ...DEFAULT_WORK_DAYS } }
        ];
        
        const allocations = { ... (data.allocations || p.allocations || DEFAULT_ALLOCATION ) };
        
        // Auto-calculate vacation allocation based on periods
        const baseVacation = calculateAnnualVacationAllocation(y, workPeriods, data.workDays || p.workDays);
        allocations.vacation = baseVacation + (allocations.vacationBonus || 0);
        
        return {
            workDays: data.workDays || p.workDays || { ...DEFAULT_WORK_DAYS },
            workPeriods,
            allocations,
            vacations: data.vacations || [],
            trainingsGiven: data.trainingsGiven || [],
            trainingsReceived: data.trainingsReceived || [],
            afvac: data.afvac || [],
            sickLeave: data.sickLeave || [],
            workDayExceptions: sanitizeExceptions(data.workDayExceptions || {})
        };
    }, []);

    const partners = useMemo(() => {
        return database.partners.map(p => ({
            ...p,
            ...getYearData(p, year)
        }));
    }, [database.partners, year, getYearData]);

    const settings = useMemo(() => ({
        countHolidaysAsLeave: true,
        pentecoteOffByYear: {},
        ...(database.settings || {}),
    }), [database.settings]);

    const pentecoteOff = isPentecoteOff(settings, year);
    const pentecoteWorked = !pentecoteOff;

    const setPentecoteOff = useCallback((off) => {
        const prevMap = settings.pentecoteOffByYear || {};
        const nextMap = { ...prevMap, [String(year)]: !!off };
        const updated = { ...settings, pentecoteOffByYear: nextMap };
        const newDb = { ...database, settings: updated };
        setDatabase(newDb);
        persistData(newDb);
    }, [settings, year, database, persistData]);

    const updateYear = (newYear) => {
        setYear(newYear);
        const newDb = { ...database, year: newYear };
        setDatabase(newDb);
        persistData(newDb);
    };

    const updateYearSpecific = (id, yearKey, updates) => {
        const newPartners = database.partners.map(p => {
            if (p.id !== id) return p;
            const ys = { ...(p.yearSpecific || {}) };
            const currentYearData = ys[yearKey] || getYearData(p, yearKey);
            ys[yearKey] = { ...currentYearData, ...updates };
            return { ...p, yearSpecific: ys };
        });
        const newDb = { ...database, partners: newPartners };
        setDatabase(newDb);
        persistData(newDb);
    };

    const updatePartner = (id, updates) => {
        const newPartners = database.partners.map(p => p.id === id ? { ...p, ...updates } : p);
        const newDb = { ...database, partners: newPartners };
        setDatabase(newDb);
        persistData(newDb);
    };

    const updateAllocation = (id, field, value) => {
        const partner = database.partners.find(p => p.id === id);
        if (!partner) return;
        const current = getYearData(partner, year);
        updateYearSpecific(id, year, {
            allocations: { ...current.allocations, [field]: value }
        });
    };

    const toggleWorkDay = (id, dayIndex, periodIndex = 0) => {
        const partner = database.partners.find(p => p.id === id);
        if (!partner) return;
        const current = getYearData(partner, year);
        
        const newPeriods = [...current.workPeriods];
        if (newPeriods[periodIndex]) {
            newPeriods[periodIndex] = {
                ...newPeriods[periodIndex],
                workDays: {
                    ...newPeriods[periodIndex].workDays,
                    [dayIndex]: !newPeriods[periodIndex].workDays[dayIndex]
                }
            };
        }

        updateYearSpecific(id, year, {
            workPeriods: newPeriods,
            workDays: newPeriods[0].workDays // Fallback for old code
        });
    };

    const updateWorkPeriods = (id, newPeriods) => {
        updateYearSpecific(id, year, {
            workPeriods: newPeriods
        });
    };

    const clearDateFromAll = (current, base, except = null) => {
        const out = {};
        out.vacations = except === 'vacations' ? [...current.vacations] : removeDate(current.vacations, base);
        out.trainingsGiven = except === 'given' ? [...current.trainingsGiven] : removeDate(current.trainingsGiven, base);
        out.trainingsReceived = except === 'received' ? [...current.trainingsReceived] : removeDate(current.trainingsReceived, base);
        out.afvac = except === 'afvac' ? [...(current.afvac || [])] : removeDate(current.afvac || [], base);
        out.sickLeave = except === 'sick' ? [...(current.sickLeave || [])] : removeDate(current.sickLeave || [], base);
        return out;
    };

    const hasAnyStatus = (current, base) => {
        return getDayValue(current.vacations, base) > 0 ||
            getDayValue(current.trainingsGiven, base) > 0 ||
            getDayValue(current.trainingsReceived, base) > 0 ||
            getDayValue(current.afvac || [], base) > 0 ||
            getDayValue(current.sickLeave || [], base) > 0;
    };

    const normalizeQuantity = (q) => (q === 'HALF' ? 'AM' : q);

    const toggleVacation = (id, dateStr, quantity = 'FULL') => {
        const partner = database.partners.find(p => p.id === id);
        if (!partner) return;
        const current = getYearData(partner, year);
        const base = stripPart(dateStr);
        quantity = normalizeQuantity(quantity);

        let newExceptions = { ...(current.workDayExceptions || {}) };

        let newVacations = [...current.vacations];
        if (getDayValue(newVacations, base) > 0) {
            // toggle simple legacy : si déjà posé (FULL ou même ½), on retire
            newVacations = removeDate(newVacations, base);
        } else {
            const cleared = clearDateFromAll(current, base, 'vacations');
            newVacations = addDate(cleared.vacations, base, quantity);
            updateYearSpecific(id, year, {
                vacations: newVacations,
                trainingsGiven: cleared.trainingsGiven,
                trainingsReceived: cleared.trainingsReceived,
                afvac: cleared.afvac,
                sickLeave: cleared.sickLeave,
                workDayExceptions: (() => { delete newExceptions[base]; return newExceptions; })()
            });
            return;
        }

        updateYearSpecific(id, year, {
            vacations: newVacations,
            trainingsGiven: [...current.trainingsGiven],
            trainingsReceived: [...current.trainingsReceived],
            afvac: [...(current.afvac || [])],
            sickLeave: [...(current.sickLeave || [])],
            workDayExceptions: newExceptions
        });
    };

    const toggleTraining = (id, dateStr, type = 'given', quantity = 'FULL') => {
        const partner = database.partners.find(p => p.id === id);
        if (!partner) return;
        const current = getYearData(partner, year);
        const base = stripPart(dateStr);
        quantity = normalizeQuantity(quantity);

        let newExceptions = { ...(current.workDayExceptions || {}) };
        delete newExceptions[base];

        const clearedVac = removeDate(current.vacations, base);
        const clearedAfvac = removeDate(current.afvac || [], base);
        const clearedSick = removeDate(current.sickLeave || [], base);

        let newGiven = [...current.trainingsGiven];
        let newReceived = [...current.trainingsReceived];

        if (type === 'given') {
            if (getDayValue(newGiven, base) > 0) {
                newGiven = removeDate(newGiven, base);
            } else {
                const cleared = clearDateFromAll(current, base, 'given');
                newGiven = addDate(cleared.trainingsGiven, base, quantity);
                newReceived = cleared.trainingsReceived;
            }
        } else {
            if (getDayValue(newReceived, base) > 0) {
                newReceived = removeDate(newReceived, base);
            } else {
                const cleared = clearDateFromAll(current, base, 'received');
                newReceived = addDate(cleared.trainingsReceived, base, quantity);
                newGiven = cleared.trainingsGiven;
            }
        }

        updateYearSpecific(id, year, {
            vacations: clearedVac,
            trainingsGiven: newGiven,
            trainingsReceived: newReceived,
            afvac: clearedAfvac,
            sickLeave: clearedSick,
            workDayExceptions: newExceptions
        });
    };

    const toggleAFVAC = (id, dateStr, quantity = 'FULL') => {
        const partner = database.partners.find(p => p.id === id);
        if (!partner) return;
        const current = getYearData(partner, year);
        const base = stripPart(dateStr);
        quantity = normalizeQuantity(quantity);

        let newExceptions = { ...(current.workDayExceptions || {}) };
        delete newExceptions[base];

        let newAFVAC = [...(current.afvac || [])];
        if (getDayValue(newAFVAC, base) > 0) {
            newAFVAC = removeDate(newAFVAC, base);
        } else {
            const cleared = clearDateFromAll(current, base, 'afvac');
            newAFVAC = addDate(cleared.afvac, base, quantity);
            updateYearSpecific(id, year, {
                vacations: cleared.vacations,
                trainingsGiven: cleared.trainingsGiven,
                trainingsReceived: cleared.trainingsReceived,
                afvac: newAFVAC,
                sickLeave: cleared.sickLeave,
                workDayExceptions: newExceptions
            });
            return;
        }

        updateYearSpecific(id, year, {
            vacations: removeDate(current.vacations, base),
            trainingsGiven: removeDate(current.trainingsGiven, base),
            trainingsReceived: removeDate(current.trainingsReceived, base),
            afvac: newAFVAC,
            sickLeave: removeDate(current.sickLeave || [], base),
            workDayExceptions: newExceptions
        });
    };

    const toggleSickLeave = (id, dateStr, quantity = 'FULL') => {
        const partner = database.partners.find(p => p.id === id);
        if (!partner) return;
        const current = getYearData(partner, year);
        const base = stripPart(dateStr);
        quantity = normalizeQuantity(quantity);

        let newExceptions = { ...(current.workDayExceptions || {}) };
        delete newExceptions[base];

        let newSick = [...(current.sickLeave || [])];
        if (getDayValue(newSick, base) > 0) {
            newSick = removeDate(newSick, base);
        } else {
            const cleared = clearDateFromAll(current, base, 'sick');
            newSick = addDate(cleared.sickLeave, base, quantity);
            updateYearSpecific(id, year, {
                vacations: cleared.vacations,
                trainingsGiven: cleared.trainingsGiven,
                trainingsReceived: cleared.trainingsReceived,
                afvac: cleared.afvac,
                sickLeave: newSick,
                workDayExceptions: newExceptions
            });
            return;
        }

        updateYearSpecific(id, year, {
            vacations: removeDate(current.vacations, base),
            trainingsGiven: removeDate(current.trainingsGiven, base),
            trainingsReceived: removeDate(current.trainingsReceived, base),
            afvac: removeDate(current.afvac || [], base),
            sickLeave: newSick,
            workDayExceptions: newExceptions
        });
    };

    const toggleWorkDayException = (id, dateStr, quantity = 'FULL') => {
        const partner = database.partners.find(p => p.id === id);
        if (!partner) return;
        
        const current = getYearData(partner, year);
        const base = stripPart(dateStr);

        // Check for ANY other status on this day (FULL ou ½). If exists, block adjustment.
        if (hasAnyStatus(current, base)) return;

        const newExceptions = { ...(current.workDayExceptions || {}) };
        const currentValue = newExceptions[base];

        if (quantity === 'HALF') {
            // Cycle demi générique (sans distinction Matin/PM) : vide <-> ±0,5
            // FULL existant -> demi de même sens (true -> +0,5 / false -> -0,5)
            if (currentValue === undefined) {
                newExceptions[base] = getHalfAdjustmentValue(
                    base,
                    current.workDays,
                    holidays,
                    current.workPeriods,
                    pentecoteWorked
                );
            } else if (currentValue === true) {
                newExceptions[base] = 0.5;
            } else if (currentValue === false) {
                newExceptions[base] = -0.5;
            } else {
                // 0.5 / -0.5 -> retour à la normale
                delete newExceptions[base];
            }
        } else {
            // Mode FULL : comportement historique, mais base tenant compte
            // fériés/WE via getBaseWorked (plus fiable que planning seul)
            if (currentValue === undefined) {
                const baseWorked = getBaseWorked(base, current.workDays, holidays, current.workPeriods, pentecoteWorked);
                newExceptions[base] = baseWorked >= 1 ? false : true;
            } else {
                // Toute valeur existante (FULL ou demi) -> retour à la normale
                delete newExceptions[base];
            }
        }

        updateYearSpecific(id, year, {
            workDayExceptions: newExceptions
        });
    };

    /**
     * Cycle demi-journée au clic unitaire (drag désactivé en HALF).
     * Congés/formations/AFVAC/maladie : vide -> AM -> PM -> vide (FULL -> AM).
     * Ajustements : vide <-> ±0,5 (FULL -> demi même sens).
     */
    const cycleHalfDay = (id, dateStr, mode) => {
        const partner = database.partners.find(p => p.id === id);
        if (!partner) return;
        const current = getYearData(partner, year);
        const base = stripPart(dateStr);

        if (mode === 'adjustment') {
            toggleWorkDayException(id, base, 'HALF');
            return;
        }

        const getListForMode = (m) => {
            if (m === 'vacation') return current.vacations;
            if (m === 'given') return current.trainingsGiven;
            if (m === 'received') return current.trainingsReceived;
            if (m === 'afvac') return current.afvac || [];
            if (m === 'sick') return current.sickLeave || [];
            return [];
        };

        const currentList = getListForMode(mode);
        const part = getDayPart(currentList, base);

        let newVacations = [...current.vacations];
        let newGiven = [...current.trainingsGiven];
        let newReceived = [...current.trainingsReceived];
        let newAFVAC = [...(current.afvac || [])];
        let newSick = [...(current.sickLeave || [])];
        let newExceptions = { ...(current.workDayExceptions || {}) };

        const applyToMode = (m, newList) => {
            if (m === 'vacation') newVacations = newList;
            else if (m === 'given') newGiven = newList;
            else if (m === 'received') newReceived = newList;
            else if (m === 'afvac') newAFVAC = newList;
            else if (m === 'sick') newSick = newList;
        };

        if (part === null) {
            // Vide (pour ce mode) -> AM. Si un autre statut occupe le jour, on l'écrase.
            const cleared = clearDateFromAll(current, base, mode === 'vacation' ? 'vacations' : mode === 'given' ? 'given' : mode === 'received' ? 'received' : mode === 'afvac' ? 'afvac' : mode === 'sick' ? 'sick' : null);
            newVacations = cleared.vacations;
            newGiven = cleared.trainingsGiven;
            newReceived = cleared.trainingsReceived;
            newAFVAC = cleared.afvac;
            newSick = cleared.sickLeave;
            const target = mode === 'vacation' ? cleared.vacations : mode === 'given' ? cleared.trainingsGiven : mode === 'received' ? cleared.trainingsReceived : mode === 'afvac' ? cleared.afvac : cleared.sickLeave;
            applyToMode(mode, addDate(target, base, 'AM'));
            delete newExceptions[base];
        } else if (part === 'AM') {
            // AM -> PM (remplace dans la même liste)
            applyToMode(mode, addDate(removeDate(currentList, base), base, 'PM'));
            delete newExceptions[base];
        } else if (part === 'PM') {
            // PM -> vide
            applyToMode(mode, removeDate(currentList, base));
        } else {
            // FULL -> AM (écrase, choix validé)
            const cleared = clearDateFromAll(current, base, mode === 'vacation' ? 'vacations' : mode === 'given' ? 'given' : mode === 'received' ? 'received' : mode === 'afvac' ? 'afvac' : mode === 'sick' ? 'sick' : null);
            newVacations = cleared.vacations;
            newGiven = cleared.trainingsGiven;
            newReceived = cleared.trainingsReceived;
            newAFVAC = cleared.afvac;
            newSick = cleared.sickLeave;
            const target = mode === 'vacation' ? cleared.vacations : mode === 'given' ? cleared.trainingsGiven : mode === 'received' ? cleared.trainingsReceived : mode === 'afvac' ? cleared.afvac : cleared.sickLeave;
            applyToMode(mode, addDate(target, base, 'AM'));
            delete newExceptions[base];
        }

        updateYearSpecific(id, year, {
            vacations: newVacations,
            trainingsGiven: newGiven,
            trainingsReceived: newReceived,
            afvac: newAFVAC,
            sickLeave: newSick,
            workDayExceptions: newExceptions
        });
    };

    const applyBatchDates = (id, dates, mode, action, quantity = 'FULL') => {
        // action: 'add' or 'remove'
        // quantity: 'FULL' | 'HALF' (nouveau) | 'AM' | 'PM' (legacy, encore supporté)
        // En HALF, le drag multi-jours est désactivé côté UI : on ignore les plages >1 jour
        // pour éviter tout écrasement massif. Le cycle unitaire passe par cycleHalfDay.
        if (quantity === 'HALF' && dates.length > 1) return;
        if (quantity === 'HALF' && dates.length === 1) {
            if (action === 'remove') {
                // En HALF, "remove" = retour à vide (compatible drag legacy)
                const partner = database.partners.find(p => p.id === id);
                if (!partner) return;
                const current = getYearData(partner, year);
                const base = stripPart(dates[0]);
                if (mode === 'adjustment') {
                    const newExceptions = { ...(current.workDayExceptions || {}) };
                    delete newExceptions[base];
                    updateYearSpecific(id, year, { workDayExceptions: newExceptions });
                    return;
                }
                // Pour les autres modes, remove = retire FULL+AM+PM
                // Réutilise la logique FULL remove
                quantity = 'FULL';
            } else {
                cycleHalfDay(id, stripPart(dates[0]), mode);
                return;
            }
        }
        const partner = database.partners.find(p => p.id === id);
        if (!partner) return;
        const current = getYearData(partner, year);
        
        let newVacations = [...current.vacations];
        let newGiven = [...current.trainingsGiven];
        let newReceived = [...current.trainingsReceived];
        let newAFVAC = [...(current.afvac || [])];
        let newSick = [...(current.sickLeave || [])];
        let newExceptions = { ...(current.workDayExceptions || {}) };

        dates.forEach(raw => {
            const base = stripPart(raw);
            const q = mode === 'adjustment' ? 'FULL' : quantity;
            // Filtre anti-parasites pour le drag multi-jours (B1 tester) :
            // même règles que isDisabled côté calendrier (Pentecôte posable).
            // Les suppressions (remove) restent toujours autorisées pour nettoyer.
            // Note holidays race (B3) : si holidays pas encore chargés ({}), le filtre
            // fériés est inopérant sur ~11j/an pendant ~1-2s ; le WE reste filtré.
            // Direction des ajustements utilise getBaseWorked avec fallback planning.
            if (action === 'add') {
                const dow = new Date(`${base}T12:00:00`).getDay();
                const isWknd = dow === 0 || dow === 6;
                const holName = holidays[base];
                const isOffHol = !!holName && !isWorkedHoliday(holName, pentecoteWorked);
                if (mode === 'vacation' && (isWknd || isOffHol)) return;
                if (mode === 'afvac' && (!current.allocations?.hasAFVAC || isWknd || isOffHol)) return;
                if (mode === 'sick' && (isWknd || isOffHol)) return;
            }
            if (mode === 'vacation') {
                if (action === 'remove') {
                    newVacations = removeDate(newVacations, base);
                } else {
                    newVacations = addDate(newVacations, base, q);
                    newGiven = removeDate(newGiven, base);
                    newReceived = removeDate(newReceived, base);
                    newAFVAC = removeDate(newAFVAC, base);
                    newSick = removeDate(newSick, base);
                    delete newExceptions[base];
                }
            } else if (mode === 'given') {
                if (action === 'remove') {
                    newGiven = removeDate(newGiven, base);
                } else {
                    newGiven = addDate(newGiven, base, q);
                    newVacations = removeDate(newVacations, base);
                    newReceived = removeDate(newReceived, base);
                    newAFVAC = removeDate(newAFVAC, base);
                    newSick = removeDate(newSick, base);
                    delete newExceptions[base];
                }
            } else if (mode === 'received') {
                if (action === 'remove') {
                    newReceived = removeDate(newReceived, base);
                } else {
                    newReceived = addDate(newReceived, base, q);
                    newVacations = removeDate(newVacations, base);
                    newGiven = removeDate(newGiven, base);
                    newAFVAC = removeDate(newAFVAC, base);
                    newSick = removeDate(newSick, base);
                    delete newExceptions[base];
                }
            } else if (mode === 'afvac') {
                if (action === 'remove') {
                    newAFVAC = removeDate(newAFVAC, base);
                } else {
                    newAFVAC = addDate(newAFVAC, base, q);
                    newVacations = removeDate(newVacations, base);
                    newGiven = removeDate(newGiven, base);
                    newReceived = removeDate(newReceived, base);
                    newSick = removeDate(newSick, base);
                    delete newExceptions[base];
                }
            } else if (mode === 'sick') {
                if (action === 'remove') {
                    newSick = removeDate(newSick, base);
                } else {
                    newSick = addDate(newSick, base, q);
                    newVacations = removeDate(newVacations, base);
                    newGiven = removeDate(newGiven, base);
                    newReceived = removeDate(newReceived, base);
                    newAFVAC = removeDate(newAFVAC, base);
                    delete newExceptions[base];
                }
            } else if (mode === 'adjustment') {
                if (hasAnyStatus({ vacations: newVacations, trainingsGiven: newGiven, trainingsReceived: newReceived, afvac: newAFVAC, sickLeave: newSick }, base)) return;
        
                if (action === 'remove') {
                    delete newExceptions[base];
                } else {
                    // FULL : base tenant compte fériés/WE (getBaseWorked)
                    const baseWorked = getBaseWorked(base, current.workDays, holidays, current.workPeriods, pentecoteWorked);
                    newExceptions[base] = baseWorked >= 1 ? false : true;
                }
            }
        });

        updateYearSpecific(id, year, {
            vacations: newVacations,
            trainingsGiven: newGiven,
            trainingsReceived: newReceived,
            afvac: newAFVAC,
            sickLeave: newSick,
            workDayExceptions: newExceptions
        });
    };

    const updateSettings = (newSettings) => {
        const updated = typeof newSettings === 'function' ? newSettings(settings) : newSettings;
        const newDb = { ...database, settings: updated };
        setDatabase(newDb);
        persistData(newDb);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-bg-body">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-text-muted">Chargement des données...</p>
                </div>
            </div>
        );
    }

    return (
        <PartnerContext.Provider value={{
            year,
            setYear: updateYear,
            partners,
            holidays,
            settings,
            setSettings: updateSettings,
            pentecoteOff,
            pentecoteWorked,
            setPentecoteOff,
            updatePartner,
            updateAllocation,
            toggleWorkDay,
            updateWorkPeriods,
            toggleVacation,
            toggleTraining,
            toggleAFVAC,
            toggleSickLeave,
            toggleWorkDayException,
            cycleHalfDay,
            applyBatchDates,
            isSaving
        }}>
            {children}
        </PartnerContext.Provider>
    );
}

export const usePartnerContext = () => useContext(PartnerContext);
