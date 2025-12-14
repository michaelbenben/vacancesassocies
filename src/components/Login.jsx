import { useState } from 'react';
import { Lock } from 'lucide-react';

export default function Login({ onLogin }) {
    const [password, setPassword] = useState('');
    const [error, setError] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        // Simple client-side check. 
        // Password is now loaded from environment variable
        const expectedPassword = import.meta.env.VITE_APP_PASSWORD;
        if (password === expectedPassword) {
            localStorage.setItem('isAuthenticated', 'true');
            onLogin();
        } else {
            setError(true);
            setPassword('');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-bg-body p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                <div className="bg-primary p-8 text-center">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                        <Lock className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Accès Réservé</h1>
                    <p className="text-primary-light mt-2 text-sm">Veuillez vous authentifier pour continuer</p>
                </div>

                <div className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Code d'accès
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    setError(false);
                                }}
                                className={`
                                    w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none
                                    ${error ? 'border-red-300 bg-red-50 text-red-900 placeholder-red-300' : 'border-gray-200 bg-gray-50 text-gray-900'}
                                `}
                                placeholder="Entrez le mot de passe..."
                                autoFocus
                            />
                            {error && (
                                <p className="mt-2 text-sm text-red-600 font-medium animate-in slide-in-from-left-2">
                                    Mot de passe incorrect
                                </p>
                            )}
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3.5 rounded-xl transition-all transform active:scale-95 shadow-lg shadow-primary/25"
                        >
                            Accéder à l'application
                        </button>
                    </form>
                </div>

                <div className="p-4 bg-gray-50 text-center border-t border-gray-100">
                    <p className="text-xs text-gray-400">© 2026 Gestion Vacances Associés</p>
                </div>
            </div>
        </div>
    );
}
