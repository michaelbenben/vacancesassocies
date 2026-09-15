import { ChevronLeft, ChevronRight } from 'lucide-react';
import { usePartnerContext } from '../context/PartnerContext';

export default function YearSelector() {
    const { year, setYear, pentecoteOff = false, setPentecoteOff } = usePartnerContext();

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

            <label
                className="flex items-center gap-3 bg-white rounded-full pl-4 pr-2 py-1.5 shadow-sm border border-gray-100 w-fit cursor-pointer select-none"
                title={year >= 2027 ? "Par défaut fériée à partir de 2027" : "Par défaut travaillée avant 2027"}
            >
                <span className="text-xs font-semibold text-gray-600">
                    Pentecôte fériée
                </span>
                <button
                    type="button"
                    role="switch"
                    aria-checked={!!pentecoteOff}
                    aria-label={`Pentecôte fériée ${year}`}
                    onClick={() => setPentecoteOff?.(!pentecoteOff)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${pentecoteOff ? 'bg-primary' : 'bg-gray-200'}`}
                >
                    <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${pentecoteOff ? 'translate-x-6' : 'translate-x-1'}`}
                    />
                </button>
            </label>

        </div>
    );
}
