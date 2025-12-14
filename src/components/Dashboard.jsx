import { usePartnerContext } from '../context/PartnerContext';
import PartnerRow from './PartnerRow';

export default function Dashboard() {
    const { partners, settings, setSettings } = usePartnerContext();

    return (
        <div className="space-y-6">
            {/* Global Settings Toggle */}
            <div className="flex justify-end">
                <div className="bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100 flex items-center gap-3">
                    <span className="text-sm font-medium text-text-muted">Déduire les jours fériés</span>
                    <button
                        onClick={() => setSettings(s => ({ ...s, countHolidaysAsLeave: !s.countHolidaysAsLeave }))}
                        className={`
                            relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2
                            ${settings.countHolidaysAsLeave ? 'bg-primary' : 'bg-gray-200'}
                        `}
                    >
                        <span
                            className={`
                                inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200
                                ${settings.countHolidaysAsLeave ? 'translate-x-6' : 'translate-x-1'}
                            `}
                        />
                    </button>
                </div>
            </div>

            {partners.map(partner => (
                <PartnerRow key={partner.id} partner={partner} />
            ))}
        </div>
    );
}
