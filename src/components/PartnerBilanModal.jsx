import { useEffect, useMemo, useRef } from 'react';
import { X, Briefcase, Plane, CalendarDays, GraduationCap, BookOpen, Stethoscope, SlidersHorizontal, RefreshCw } from 'lucide-react';
import { sumDays, formatDays } from '../utils/halfDays';
import { getFirstName } from '../utils/names';

export default function PartnerBilanModal({ partner, stats, year, onClose }) {
    const closeRef = useRef(null);

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        closeRef.current?.focus();
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = prevOverflow;
        };
    }, [onClose]);

    const afvacDays = sumDays(partner.afvac || []);
    const sickDays = sumDays(partner.sickLeave || []);
    const trainingReceivedDays = sumDays(partner.trainingsReceived || []);
    const trainingGivenDays = sumDays(partner.trainingsGiven || []);
    const totalConges = stats.usedVacationDays + stats.holidayDaysDeducted;
    const quotaConges = partner.allocations?.vacation ?? 0;
    const quotaTrainingReceived = partner.allocations?.trainingReceive ?? 0;
    const quotaTrainingGiven = partner.allocations?.trainingGive ?? 0;

    const adjustments = useMemo(() => {
        let added = 0, removed = 0;
        Object.values(partner.workDayExceptions || {}).forEach((v) => {
            if (v === true) added += 1;
            else if (v === 0.5) added += 0.5;
            else if (v === false) removed += 1;
            else if (v === -0.5) removed += 0.5;
        });
        return {
            added: Math.round(added * 2) / 2,
            removed: Math.round(removed * 2) / 2,
        };
    }, [partner.workDayExceptions]);

    const recovery = stats.recovery || { earned: 0, taken: 0, remaining: 0 };

    const rows = [
        {
            icon: Briefcase,
            label: 'Jours travaillés',
            value: `${formatDays(stats.workedDays)}j`,
            detail: `objectif : ${formatDays(stats.expectedWorkedDays)}j`,
        },
        {
            icon: Plane,
            label: 'Congés pris',
            value: `${formatDays(stats.usedVacationDays)}j`,
            detail: stats.holidayDaysDeducted > 0
                ? `+ ${formatDays(stats.holidayDaysDeducted)}j fériés décomptés · total : ${formatDays(totalConges)}j / quota ${formatDays(quotaConges)}j`
                : `quota : ${formatDays(quotaConges)}j`,
        },
        {
            icon: CalendarDays,
            label: 'AFVAC',
            value: `${formatDays(afvacDays)}j`,
        },
        {
            icon: GraduationCap,
            label: 'Formation reçue',
            value: `${formatDays(trainingReceivedDays)}j`,
            detail: `quota : ${formatDays(quotaTrainingReceived)}j`,
        },
        {
            icon: BookOpen,
            label: 'Formation donnée',
            value: `${formatDays(trainingGivenDays)}j`,
            detail: `quota : ${formatDays(quotaTrainingGiven)}j`,
        },
        {
            icon: Stethoscope,
            label: 'Arrêt maladie',
            value: `${formatDays(sickDays)}j`,
        },
        {
            icon: SlidersHorizontal,
            label: 'Ajustements manuels',
            value: adjustments.added && adjustments.removed
                ? `+${formatDays(adjustments.added)} / -${formatDays(adjustments.removed)}j`
                : adjustments.added
                    ? `+${formatDays(adjustments.added)}j`
                    : adjustments.removed
                        ? `-${formatDays(adjustments.removed)}j`
                        : '—',
        },
        {
            icon: RefreshCw,
            label: 'Récupération (solde)',
            value: `${formatDays(recovery.remaining)}j`,
            detail: `${formatDays(recovery.earned)}j gagnés · ${formatDays(recovery.taken)}j pris`,
        },
    ];

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="bilan-title"
                className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="sticky top-0 flex items-center justify-between p-5 border-b border-gray-100 bg-white rounded-t-2xl">
                    <div>
                        <h2 id="bilan-title" className="text-lg font-bold text-gray-900">{getFirstName(partner.name)}</h2>
                        <p className="text-xs font-medium text-gray-400">Bilan de l'année {year}</p>
                    </div>
                    <button
                        ref={closeRef}
                        onClick={onClose}
                        title="Fermer"
                        aria-label="Fermer le bilan"
                        className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Rows */}
                <div className="p-2">
                    {rows.map((row) => {
                        const Icon = row.icon;
                        return (
                            <div
                                key={row.label}
                                className="flex items-center justify-between px-3 py-3 rounded-xl hover:bg-gray-50/80 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                                        <Icon className="w-4 h-4 text-gray-500" />
                                    </div>
                                    <p className="text-sm font-medium text-gray-700">{row.label}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold tabular-nums text-gray-900">{row.value}</p>
                                    {row.detail && <p className="text-[10px] text-gray-400">{row.detail}</p>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}