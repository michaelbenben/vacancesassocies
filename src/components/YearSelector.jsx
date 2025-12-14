import { ChevronLeft, ChevronRight } from 'lucide-react';
import { usePartnerContext } from '../context/PartnerContext';

export default function YearSelector() {
    const { year, setYear } = usePartnerContext();

    return (
        <div className="flex items-center gap-4 mb-8">
            <div className="flex items-center bg-white rounded-full p-1 shadow-sm border border-gray-100">
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
        </div>
    );
}
