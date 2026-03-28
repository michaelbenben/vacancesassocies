import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getFrenchHolidays } from '../utils/holidays';
import { DEFAULT_WORK_DAYS, calculateAnnualVacationAllocation, getWorkDaysForDate } from '../utils/dateUtils';
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
                    workDayExceptions: p.yearSpecific[yearKey].workDayExceptions || {}
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
            workDayExceptions: data.workDayExceptions || {}
        };
    }, []);

    const partners = useMemo(() => {
        return database.partners.map(p => ({
            ...p,
            ...getYearData(p, year)
        }));
    }, [database.partners, year, getYearData]);

    const settings = database.settings || { countHolidaysAsLeave: true };

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

    const toggleVacation = (id, dateStr) => {
        const partner = database.partners.find(p => p.id === id);
        if (!partner) return;
        const current = getYearData(partner, year);

        let newVacations = [...current.vacations];
        let newGiven = [...current.trainingsGiven];
        let newReceived = [...current.trainingsReceived];
        let newExceptions = { ...(current.workDayExceptions || {}) };

        if (newVacations.includes(dateStr)) {
            newVacations = newVacations.filter(d => d !== dateStr);
        } else {
            newVacations.push(dateStr);
            newGiven = newGiven.filter(d => d !== dateStr);
            newReceived = newReceived.filter(d => d !== dateStr);
            delete newExceptions[dateStr];
        }

        updateYearSpecific(id, year, {
            vacations: newVacations,
            trainingsGiven: newGiven,
            trainingsReceived: newReceived,
            afvac: (current.afvac || []).filter(d => d !== dateStr),
            sickLeave: (current.sickLeave || []).filter(d => d !== dateStr),
            workDayExceptions: newExceptions
        });
    };

    const toggleTraining = (id, dateStr, type = 'given') => {
        const partner = database.partners.find(p => p.id === id);
        if (!partner) return;
        const current = getYearData(partner, year);

        let newVacations = current.vacations.filter(d => d !== dateStr);
        let newGiven = [...current.trainingsGiven];
        let newReceived = [...current.trainingsReceived];
        let newExceptions = { ...(current.workDayExceptions || {}) };

        if (type === 'given') {
            if (newGiven.includes(dateStr)) {
                newGiven = newGiven.filter(d => d !== dateStr);
            } else {
                newGiven.push(dateStr);
                newReceived = newReceived.filter(d => d !== dateStr);
                delete newExceptions[dateStr];
            }
        } else {
            if (newReceived.includes(dateStr)) {
                newReceived = newReceived.filter(d => d !== dateStr);
            } else {
                newReceived.push(dateStr);
                newGiven = newGiven.filter(d => d !== dateStr);
                delete newExceptions[dateStr];
            }
        }

        updateYearSpecific(id, year, {
            vacations: newVacations,
            trainingsGiven: newGiven,
            trainingsReceived: newReceived,
            afvac: (current.afvac || []).filter(d => d !== dateStr),
            sickLeave: (current.sickLeave || []).filter(d => d !== dateStr),
            workDayExceptions: newExceptions
        });
    };

    const toggleAFVAC = (id, dateStr) => {
        const partner = database.partners.find(p => p.id === id);
        if (!partner) return;
        const current = getYearData(partner, year);

        let newAFVAC = [...(current.afvac || [])];
        let newVacations = current.vacations.filter(d => d !== dateStr);
        let newGiven = current.trainingsGiven.filter(d => d !== dateStr);
        let newReceived = current.trainingsReceived.filter(d => d !== dateStr);
        let newSick = (current.sickLeave || []).filter(d => d !== dateStr);
        let newExceptions = { ...(current.workDayExceptions || {}) };

        if (newAFVAC.includes(dateStr)) {
            newAFVAC = newAFVAC.filter(d => d !== dateStr);
        } else {
            newAFVAC.push(dateStr);
            delete newExceptions[dateStr];
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

    const toggleSickLeave = (id, dateStr) => {
        const partner = database.partners.find(p => p.id === id);
        if (!partner) return;
        const current = getYearData(partner, year);

        let newSick = [...(current.sickLeave || [])];
        let newVacations = current.vacations.filter(d => d !== dateStr);
        let newGiven = current.trainingsGiven.filter(d => d !== dateStr);
        let newReceived = current.trainingsReceived.filter(d => d !== dateStr);
        let newAFVAC = (current.afvac || []).filter(d => d !== dateStr);
        let newExceptions = { ...(current.workDayExceptions || {}) };

        if (newSick.includes(dateStr)) {
            newSick = newSick.filter(d => d !== dateStr);
        } else {
            newSick.push(dateStr);
            delete newExceptions[dateStr];
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

    const toggleWorkDayException = (id, dateStr) => {
        const partner = database.partners.find(p => p.id === id);
        if (!partner) return;
        
        const current = getYearData(partner, year);

        // Check for ANY other status on this day. If exists, block adjustment.
        const hasOtherAction = 
            current.vacations.includes(dateStr) || 
            current.trainingsGiven.includes(dateStr) || 
            current.trainingsReceived.includes(dateStr) || 
            current.afvac.includes(dateStr) || 
            current.sickLeave.includes(dateStr);

        if (hasOtherAction) return;

        const newExceptions = { ...(current.workDayExceptions || {}) };
        
        // Determine if day is already worked in base schedule
        const dayOfWeek = new Date(dateStr).getDay();
        const currentWorkDays = getWorkDaysForDate(dateStr, current.workPeriods) || current.workDays || {};
        const isNormallyWorked = currentWorkDays[dayOfWeek] === true;

        const currentValue = newExceptions[dateStr];

        if (currentValue === undefined) {
            // If normally worked, we can only subtract
            if (isNormallyWorked) {
                newExceptions[dateStr] = false; // Forced Off (-)
            } else {
                // Not worked (off day or weekend), we can only add
                newExceptions[dateStr] = true; // Forced Worked (+)
            }
        } else {
            // Revert to normal
            delete newExceptions[dateStr];
        }

        updateYearSpecific(id, year, {
            workDayExceptions: newExceptions
        });
    };

    const applyBatchDates = (id, dates, mode, action) => {
        // action: 'add' or 'remove'
        const partner = database.partners.find(p => p.id === id);
        if (!partner) return;
        const current = getYearData(partner, year);
        
        let newVacations = [...current.vacations];
        let newGiven = [...current.trainingsGiven];
        let newReceived = [...current.trainingsReceived];
        let newAFVAC = [...(current.afvac || [])];
        let newSick = [...(current.sickLeave || [])];
        let newExceptions = { ...(current.workDayExceptions || {}) };

        dates.forEach(dateStr => {
            if (mode === 'vacation') {
                if (action === 'remove') {
                    newVacations = newVacations.filter(d => d !== dateStr);
                } else {
                    if (!newVacations.includes(dateStr)) newVacations.push(dateStr);
                    newGiven = newGiven.filter(d => d !== dateStr);
                    newReceived = newReceived.filter(d => d !== dateStr);
                    delete newExceptions[dateStr];
                }
            } else if (mode === 'given') {
                if (action === 'remove') {
                    newGiven = newGiven.filter(d => d !== dateStr);
                } else {
                    if (!newGiven.includes(dateStr)) newGiven.push(dateStr);
                    newVacations = newVacations.filter(d => d !== dateStr);
                    newReceived = newReceived.filter(d => d !== dateStr);
                    delete newExceptions[dateStr];
                }
            } else if (mode === 'received') {
                if (action === 'remove') {
                    newReceived = newReceived.filter(d => d !== dateStr);
                } else {
                    if (!newReceived.includes(dateStr)) newReceived.push(dateStr);
                    newVacations = newVacations.filter(d => d !== dateStr);
                    newGiven = newGiven.filter(d => d !== dateStr);
                    delete newExceptions[dateStr];
                }
            } else if (mode === 'afvac') {
                if (action === 'remove') {
                    newAFVAC = newAFVAC.filter(d => d !== dateStr);
                } else {
                    if (!newAFVAC.includes(dateStr)) newAFVAC.push(dateStr);
                    newVacations = newVacations.filter(d => d !== dateStr);
                    newGiven = newGiven.filter(d => d !== dateStr);
                    newReceived = newReceived.filter(d => d !== dateStr);
                    newSick = newSick.filter(d => d !== dateStr);
                    delete newExceptions[dateStr];
                }
            } else if (mode === 'sick') {
                if (action === 'remove') {
                    newSick = newSick.filter(d => d !== dateStr);
                } else {
                    if (!newSick.includes(dateStr)) newSick.push(dateStr);
                    newVacations = newVacations.filter(d => d !== dateStr);
                    newGiven = newGiven.filter(d => d !== dateStr);
                    newReceived = newReceived.filter(d => d !== dateStr);
                    newAFVAC = newAFVAC.filter(d => d !== dateStr);
                    delete newExceptions[dateStr];
                }
            } else if (mode === 'adjustment') {
                const hasOtherAction = 
                    current.vacations.includes(dateStr) || 
                    current.trainingsGiven.includes(dateStr) || 
                    current.trainingsReceived.includes(dateStr) || 
                    current.afvac.includes(dateStr) || 
                    current.sickLeave.includes(dateStr);
        
                if (hasOtherAction) return;
        
                const dayOfWeek = new Date(dateStr).getDay();
                const currentWorkDays = getWorkDaysForDate(dateStr, current.workPeriods) || current.workDays || {};
                const isNormallyWorked = currentWorkDays[dayOfWeek] === true;
        
                if (action === 'remove') {
                    delete newExceptions[dateStr];
                } else {
                    if (isNormallyWorked) {
                        newExceptions[dateStr] = false;
                    } else {
                        newExceptions[dateStr] = true;
                    }
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
            updatePartner,
            updateAllocation,
            toggleWorkDay,
            updateWorkPeriods,
            toggleVacation,
            toggleTraining,
            toggleAFVAC,
            toggleSickLeave,
            toggleWorkDayException,
            applyBatchDates,
            isSaving
        }}>
            {children}
        </PartnerContext.Provider>
    );
}

export const usePartnerContext = () => useContext(PartnerContext);
