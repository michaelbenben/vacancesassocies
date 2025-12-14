import { Calendar, Users } from 'lucide-react';
import { usePartnerContext } from '../context/PartnerContext';

export default function Layout({ children }) {
  const { year } = usePartnerContext();

  return (
    <div className="min-h-screen bg-bg-body text-text-main pb-20 font-sans selection:bg-primary/20 selection:text-primary-dark">
      {/* Abstract Background Decoration */}
      <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-secondary/5 blur-[120px]" />
      </div>

      <header className="sticky top-0 z-50 transition-all duration-300 backdrop-blur-md bg-white/70 border-b border-white/50 shadow-sm supports-[backdrop-filter]:bg-white/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-gradient-to-br from-primary to-primary-dark rounded-xl shadow-lg shadow-primary/25 text-white ring-1 ring-white/50">
                <Calendar className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-xl sm:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 tracking-tight">
                  Gestion Vacances
                </h1>
                <div className="flex items-center gap-2 text-xs font-semibold text-text-muted">
                  <span className="uppercase tracking-wider">Associés</span>
                  <span className="w-1 h-1 rounded-full bg-gray-300" />
                  <span className="text-primary">{year}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 px-4 py-2 bg-white/50 rounded-full border border-white/60 shadow-sm">
              <Users className="w-4 h-4 text-text-muted" />
              <span className="text-sm font-medium text-text-main">5 Associés</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {children}
      </main>
    </div>
  );
}
