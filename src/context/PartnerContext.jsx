import { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
    const [partners, setPartners] = useState([]);
    const [settings, setSettings] = useState({ countHolidaysAsLeave: true });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Enforce "countHolidaysAsLeave" to true if it's ever false (Migration/Enforcement)
    useEffect(() => {
        if (!isLoading && settings && !settings.countHolidaysAsLeave) {
            updateSettings({ ...settings, countHolidaysAsLeave: true });
        }
    }, [isLoading, settings]);

    // Load initial data from Firebase with timeout
    useEffect(() => {
        async function loadData() {
            try {
                // Add timeout to prevent infinite loading
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Firebase timeout')), 5000)
                );

                const data = await Promise.race([getVacationData(), timeoutPromise]);

                if (data && data.partners) {
                    // Ensure all partners have new array fields
                    const validPartners = data.partners.map(p => ({
                        ...p,
                        trainingsGiven: p.trainingsGiven || [],
                        trainingsReceived: p.trainingsReceived || [],
                        vacations: p.vacations || []
                    }));
                    setPartners(validPartners);
                    // Force true setting on load
                    setSettings({ ...(data.settings || {}), countHolidaysAsLeave: true });
                    setYear(data.year || 2026);
                } else {
                    // Initialize with default data
                    const defaultData = createDefaultData();
                    await saveVacationData(defaultData);
                    setPartners(defaultData.partners);
                    setSettings(defaultData.settings);
                    setYear(defaultData.year);
                }
            } catch (error) {
                console.error('Error loading data from Firebase:', error);
                // Fallback to localStorage
                const saved = localStorage.getItem('vacation_partners');
                const savedSettings = localStorage.getItem('vacation_settings');
                if (saved) {
                    setPartners(JSON.parse(saved));
                } else {
                    setPartners(createDefaultData().partners);
                }
                if (savedSettings) {
                    setSettings(JSON.parse(savedSettings));
                }
            } finally {
                setIsLoading(false);
            }
        }
        loadData();
    }, []);

    // Subscribe to real-time updates from Firebase
    useEffect(() => {
        if (isLoading) return;

        const unsubscribe = subscribeToVacationData((data) => {
            if (data && !isSaving && data.partners) {
                const validPartners = data.partners.map(p => ({
                    ...p,
                    trainingsGiven: p.trainingsGiven || [],
                    trainingsReceived: p.trainingsReceived || [],
                    vacations: p.vacations || []
                }));
                setPartners(validPartners);
                setSettings(data.settings || { countHolidaysAsLeave: false });
                setYear(data.year || 2026);
            }
        });

        return () => unsubscribe();
    }, [isLoading, isSaving]);

    // Save to Firebase when data changes
    const saveToFirebase = useCallback(async (newPartners, newSettings, newYear) => {
        setIsSaving(true);
        try {
            await saveVacationData({
                partners: newPartners,
                settings: newSettings,
                year: newYear,
            });
        } catch (error) {
            console.error('Error saving to Firebase:', error);
        } finally {
            setTimeout(() => setIsSaving(false), 500);
        }
    }, []);

    // Fetch holidays when year changes
    useEffect(() => {
        getFrenchHolidays(year).then(data => setHolidays(data));
    }, [year]);

    // Update year with Firebase sync
    const updateYear = useCallback((newYear) => {
        setYear(newYear);
        saveToFirebase(partners, settings, newYear);
    }, [partners, settings, saveToFirebase]);

    const updatePartner = (id, updates) => {
        setPartners(prev => {
            const newPartners = prev.map(p => p.id === id ? { ...p, ...updates } : p);
            saveToFirebase(newPartners, settings, year);
            return newPartners;
        });
    };

    const updateAllocation = (id, field, value) => {
        setPartners(prev => {
            const newPartners = prev.map(p =>
                p.id === id ? { ...p, allocations: { ...p.allocations, [field]: value } } : p
            );
            saveToFirebase(newPartners, settings, year);
            return newPartners;
        });
    };

    const toggleWorkDay = (id, dayIndex) => {
        setPartners(prev => {
            const newPartners = prev.map(p => {
                if (p.id !== id) return p;
                const newWorkDays = { ...p.workDays, [dayIndex]: !p.workDays[dayIndex] };
                return { ...p, workDays: newWorkDays };
            });
            saveToFirebase(newPartners, settings, year);
            return newPartners;
        });
    };

    const toggleVacation = (id, dateStr) => {
        setPartners(prev => {
            const newPartners = prev.map(p => {
                if (p.id !== id) return p;

                // Clear from trainings if adding to vacation
                let newGiven = p.trainingsGiven || [];
                let newReceived = p.trainingsReceived || [];

                if (newGiven.includes(dateStr)) newGiven = newGiven.filter(d => d !== dateStr);
                if (newReceived.includes(dateStr)) newReceived = newReceived.filter(d => d !== dateStr);

                if (p.vacations.includes(dateStr)) {
                    return { ...p, vacations: p.vacations.filter(d => d !== dateStr) };
                } else {
                    return {
                        ...p,
                        vacations: [...p.vacations, dateStr],
                        trainingsGiven: newGiven,
                        trainingsReceived: newReceived
                    };
                }
            });
            saveToFirebase(newPartners, settings, year);
            return newPartners;
        });
    };

    const toggleTraining = (id, dateStr, type = 'given') => {
        setPartners(prev => {
            const newPartners = prev.map(p => {
                if (p.id !== id) return p;

                // Remove from vacation if present
                const newVacations = p.vacations.filter(d => d !== dateStr);

                // Initialize arrays if missing
                const currentGiven = p.trainingsGiven || [];
                const currentReceived = p.trainingsReceived || [];

                let newGiven = [...currentGiven];
                let newReceived = [...currentReceived];

                if (type === 'given') {
                    // Toggle in Given
                    if (newGiven.includes(dateStr)) {
                        newGiven = newGiven.filter(d => d !== dateStr);
                    } else {
                        // Check logic: Can we add? (Optional: Add limit check here)
                        newGiven.push(dateStr);
                        // Ensure exclusive: remove from Received if present
                        newReceived = newReceived.filter(d => d !== dateStr);
                    }
                } else {
                    // Toggle in Received
                    if (newReceived.includes(dateStr)) {
                        newReceived = newReceived.filter(d => d !== dateStr);
                    } else {
                        newReceived.push(dateStr);
                        // Ensure exclusive: remove from Given if present
                        newGiven = newGiven.filter(d => d !== dateStr);
                    }
                }

                return {
                    ...p,
                    vacations: newVacations,
                    trainingsGiven: newGiven,
                    trainingsReceived: newReceived
                };
            });
            saveToFirebase(newPartners, settings, year);
            return newPartners;
        });
    };

    const updateSettings = (newSettings) => {
        const updated = typeof newSettings === 'function' ? newSettings(settings) : newSettings;
        setSettings(updated);
        saveToFirebase(partners, updated, year);
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
            toggleWorkDay,
            toggleVacation,
            toggleTraining,
        }}>
            {children}
        </PartnerContext.Provider>
    );
}

export const usePartnerContext = () => useContext(PartnerContext);
