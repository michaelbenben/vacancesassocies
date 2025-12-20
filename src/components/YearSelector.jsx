import { ChevronLeft, ChevronRight } from 'lucide-react';
import { usePartnerContext } from '../context/PartnerContext';

export default function YearSelector() {
    const { year, setYear, settings, setSettings } = usePartnerContext();

    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center bg-white rounded-full p-1 shadow-sm border border-gray-100 w-fit">
                <button
                    onClick={() => setYear(year - 1)}
                    className="p-2 hover:bg-gray-50 rounded-full text-text-muted hover:text-primary transition-colors"
                    aria-label="Previous year"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>

                <span className="px-6 py-1 text-lg font-semibold tabular-nums text-text-main">
                    {year}
                </span>

                <button
                    onClick={() => setYear(year + 1)}
                    className="p-2 hover:bg-gray-50 rounded-full text-text-muted hover:text-primary transition-colors"
                    aria-label="Next year"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            <button
                onClick={() => setSettings({ ...settings, countHolidaysAsLeave: !settings.countHolidaysAsLeave })}
                className={`
                    flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold transition-all
                    ${settings.countHolidaysAsLeave
                        ? 'bg-blue-50 text-blue-600 border border-blue-200'
                        : 'bg-white text-gray-400 border border-gray-100 hover:border-gray-200'}
                `}
            >
                <div className={`w-2 h-2 rounded-full ${settings.countHolidaysAsLeave ? 'bg-blue-600' : 'bg-gray-300'}`} />
                {settings.countHolidaysAsLeave ? 'Jours fériés inclus' : 'Jours fériés exclus'}
            </button>
        </div>
    );
}
