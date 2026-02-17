// src/App.js
import React from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { Box, Container } from '@chakra-ui/react';

// Import your other components here
import Login from './components/Login'; // Import your Rekha component
import Header from './components/Header';
import Head from './components/Head';
import Installer from './components/Installer';
import Dashboard from './components/Dashboard';
import StatePage from './components/StatePage';
import DistrictPage from './components/DistrictPage';
import AssemblyPage from './components/AssemblyPage';
import Attendance from './components/Attendance';
import Eci from './components/Eci';
import AutoInstaller from './components/AutoInstaller';
import Installed from './components/Installed';
import ElectionInstaller from './components/ElectionInstaller';
import Support from './components/support';
import Tripura from './components/Tripura';
import Punjab from './components/Punjab';
import Ai from './components/Ai';
import Gpt from './components/Gpt';
import Aifeed from './components/Aifeed';
import AiDashboard from './components/AiDashboard';
import DidInfo from './components/didInfo';
import EleUserDetails from './components/EleUserDetails';
import BiharUsers from './components/BiharUsers';

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

function AppContent() {
  const location = useLocation();
  const isLoginPage = location.pathname === '/';

  return (
    <Container maxW="100vw" p='0'>
      <Box pb="env(safe-area-inset-bottom)">
        {!isLoginPage && <Header />}

        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/installer" element={<AutoInstaller />} />
          <Route path="/autoinstaller" element={<AutoInstaller />} />
          <Route path="/eleuserdetails" element={<EleUserDetails />} />
          <Route path="/didinfo" element={<DidInfo />} />
          <Route path="/punjabinstaller" element={<AutoInstaller />} />
          {/* <Route path="/ai" element={<Ai />} /> */}
          {/* <Route path="/aid" element={<AiDashboard />} /> */}
          {/* <Route path="/aifeed" element={<Aifeed />} />  */}
          <Route path="/pb" element={<Tripura />} />
          <Route path="/head" element={<Head />} />
          <Route path="/" element={<Login />} />
          {/* <Route path="/attendance" element={<Attendance />} />  */}
          <Route path="/eci" element={<Eci />} />
          <Route path="/installed" element={<Installed />} />
          <Route path="/eleuser" element={<ElectionInstaller />} />
          <Route path="/support" element={<Support />} />

          <Route path="/state/:state" element={<StatePage />} />
          <Route path="/bihar/:state" element={<BiharUsers />} />
          <Route path="/state/:state/:district" element={<DistrictPage />} />
          <Route path="/state/:state/:district/:assemblyName" element={<AssemblyPage />} />
        </Routes>
      </Box>
    </Container>
  );
}

export default App;
