import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './Layout';
import Diagnose from './pages/Diagnose';
import ScanUnit from './pages/ScanUnit';
import Manuals from './pages/Manuals';
import HistoryPage from './pages/History';
import SettingsPage from './pages/Settings';
import OnboardingPage from './pages/Onboarding';
import { useNavigate } from 'react-router-dom';

const onboardingDone = () => !!(localStorage.getItem("onboarding_done") || localStorage.getItem("st_onboarding_complete"));

function OnboardingWrapper() {
  const navigate = useNavigate();
  return <OnboardingPage onComplete={() => navigate("/diagnose", { replace: true })} />;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to={onboardingDone() ? "/diagnose" : "/onboarding"} replace />} />
        <Route path="/onboarding" element={<OnboardingWrapper />} />
        <Route element={<Layout />}>
          <Route path="/diagnose" element={<Diagnose />} />
          <Route path="/scan" element={<ScanUnit />} />
          <Route path="/manuals" element={<Manuals />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </Router>
  );
}
