import { usePartnerContext } from '../context/PartnerContext';
import PartnerRow from './PartnerRow';

export default function Dashboard() {
    const { partners, settings, setSettings } = usePartnerContext();

    return (
        <div className="space-y-6">
            {/* Global Settings Toggle - Removed as per request (always active) */}
            <div className="flex justify-end">
                {/* Empty spacer or status if needed, but for now just empty to maintain layout or remove completely */}
            </div>

            {partners.map(partner => (
                <PartnerRow key={partner.id} partner={partner} />
            ))}
        </div>
    );
}
