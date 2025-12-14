import { useState } from 'react';
import { usePartnerContext } from '../context/PartnerContext';
import PartnerRow from './PartnerRow';

export default function Dashboard() {
    const { partners } = usePartnerContext();
    const [expandedPartnerId, setExpandedPartnerId] = useState(null);

    const handleToggle = (partnerId) => {
        setExpandedPartnerId(current => current === partnerId ? null : partnerId);
    };

    return (
        <div className="space-y-6">
            {partners.map(partner => (
                <PartnerRow
                    key={partner.id}
                    partner={partner}
                    isExpanded={expandedPartnerId === partner.id}
                    onToggle={() => handleToggle(partner.id)}
                />
            ))}
        </div>
    );
}
