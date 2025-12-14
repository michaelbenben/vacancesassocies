import { PartnerProvider } from './context/PartnerContext';
import Layout from './components/Layout';
import YearSelector from './components/YearSelector';
import Dashboard from './components/Dashboard';

function App() {
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
