import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getFrenchHolidays } from '../utils/holidays';
import { DEFAULT_WORK_DAYS } from '../utils/dateUtils';
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
    trainingGive: 0,
    trainingReceive: 0,
};

function createDefaultData() {
    return {
        partners: INITIAL_PARTNERS.map(p => ({
            ...p,
            workDays: { ...DEFAULT_WORK_DAYS },
            allocations: { ...DEFAULT_ALLOCATION },
            vacations: [],
            trainingsGiven: [],
            trainingsReceived: [],
        })),
        settings: {
            countHolidaysAsLeave: true,
        },
        year: 2026,
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
                    setDatabase(data);
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
                setDatabase(data);
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
    const getYearData = useCallback((p, y) => {
        const ys = p.yearSpecific || {};
        const data = ys[y] || {};
        return {
            workDays: data.workDays || p.workDays || { ...DEFAULT_WORK_DAYS },
            allocations: data.allocations || p.allocations || { ...DEFAULT_ALLOCATION },
            vacations: data.vacations || [],
            trainingsGiven: data.trainingsGiven || [],
            trainingsReceived: data.trainingsReceived || []
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

    const toggleWorkDay = (id, dayIndex) => {
        const partner = database.partners.find(p => p.id === id);
        if (!partner) return;
        const current = getYearData(partner, year);
        updateYearSpecific(id, year, {
            workDays: { ...current.workDays, [dayIndex]: !current.workDays[dayIndex] }
        });
    };

    const toggleVacation = (id, dateStr) => {
        const partner = database.partners.find(p => p.id === id);
        if (!partner) return;
        const current = getYearData(partner, year);

        let newVacations = [...current.vacations];
        let newGiven = [...current.trainingsGiven];
        let newReceived = [...current.trainingsReceived];

        if (newVacations.includes(dateStr)) {
            newVacations = newVacations.filter(d => d !== dateStr);
        } else {
            newVacations.push(dateStr);
            newGiven = newGiven.filter(d => d !== dateStr);
            newReceived = newReceived.filter(d => d !== dateStr);
        }

        updateYearSpecific(id, year, {
            vacations: newVacations,
            trainingsGiven: newGiven,
            trainingsReceived: newReceived
        });
    };

    const toggleTraining = (id, dateStr, type = 'given') => {
        const partner = database.partners.find(p => p.id === id);
        if (!partner) return;
        const current = getYearData(partner, year);

        let newVacations = current.vacations.filter(d => d !== dateStr);
        let newGiven = [...current.trainingsGiven];
        let newReceived = [...current.trainingsReceived];

        if (type === 'given') {
            if (newGiven.includes(dateStr)) {
                newGiven = newGiven.filter(d => d !== dateStr);
            } else {
                newGiven.push(dateStr);
                newReceived = newReceived.filter(d => d !== dateStr);
            }
        } else {
            if (newReceived.includes(dateStr)) {
                newReceived = newReceived.filter(d => d !== dateStr);
            } else {
                newReceived.push(dateStr);
                newGiven = newGiven.filter(d => d !== dateStr);
            }
        }

        updateYearSpecific(id, year, {
            vacations: newVacations,
            trainingsGiven: newGiven,
            trainingsReceived: newReceived
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
            toggleVacation,
            toggleTraining,
            isSaving
        }}>
            {children}
        </PartnerContext.Provider>
    );
}

export const usePartnerContext = () => useContext(PartnerContext);
