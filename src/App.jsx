import { useState, useEffect } from 'react';
import { PartnerProvider } from './context/PartnerContext';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import YearSelector from './components/YearSelector';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check local storage for auth token
    const auth = localStorage.getItem('isAuthenticated');
    if (auth === 'true') {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  if (isLoading) return null; // Prevent flash of login screen

  if (!isAuthenticated) {
    return <Login onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <PartnerProvider>
      <Layout>
        <YearSelector />
        <Dashboard />
      </Layout>
    </PartnerProvider>
  );
}

export default App;
