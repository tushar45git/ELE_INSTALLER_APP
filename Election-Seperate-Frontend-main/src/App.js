// src/App.js
import React from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  useLocation,
  Navigate,
} from "react-router-dom";
import { Box, Container } from "@chakra-ui/react";

// Import your other components here
import Login from "./components/Login"; // Import your Rekha component
import Header from "./components/Header";
import Head from "./components/Head";
import Installer from "./components/Installer";
import Dashboard from "./components/Dashboard";
import StatePage from "./components/StatePage";
import DistrictPage from "./components/DistrictPage";
import AssemblyPage from "./components/AssemblyPage";
import Attendance from "./components/Attendance";
import AttendanceManagement from "./components/AttendanceManagement";
import Eci from "./components/Eci";
import AutoInstaller from "./components/AutoInstaller";
import Installed from "./components/Installed";
import ElectionInstaller from "./components/ElectionInstaller";
import Support from "./components/support";
import Tripura from "./components/Tripura";
import Punjab from "./components/Punjab";
import Ai from "./components/Ai";
import Gpt from "./components/Gpt";
import Aifeed from "./components/Aifeed";
import AiDashboard from "./components/AiDashboard";
import DidInfo from "./components/didInfo";
import EleUserDetails from "./components/EleUserDetails";
import BiharUsers from "./components/BiharUsers";
import KycVerification from "./components/KycVerification";
import AdminKycPanel from "./components/AdminKycPanel";

const ProtectedRoute = ({ children }) => {
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";

  if (!isLoggedIn) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

function AppContent() {
  const location = useLocation();
  const isLoginPage = location.pathname === "/";

  return (
    <Container maxW="100vw" p="0">
      <Box pb="env(safe-area-inset-bottom)">
        {!isLoginPage && <Header />}

        <Routes>
          <Route path="/" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/installer"
            element={
              <ProtectedRoute>
                <AutoInstaller />
              </ProtectedRoute>
            }
          />
          <Route
            path="/autoinstaller"
            element={
              <ProtectedRoute>
                <AutoInstaller />
              </ProtectedRoute>
            }
          />
          <Route
            path="/eleuserdetails"
            element={
              <ProtectedRoute>
                <EleUserDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/didinfo"
            element={
              <ProtectedRoute>
                <DidInfo />
              </ProtectedRoute>
            }
          />
          <Route
            path="/punjabinstaller"
            element={
              <ProtectedRoute>
                <AutoInstaller />
              </ProtectedRoute>
            }
          />
          {/* <Route path="/ai" element={<ProtectedRoute><Ai /></ProtectedRoute>} /> */}
          {/* <Route path="/aid" element={<ProtectedRoute><AiDashboard /></ProtectedRoute>} /> */}
          {/* <Route path="/aifeed" element={<ProtectedRoute><Aifeed /></ProtectedRoute>} />  */}
          <Route
            path="/pb"
            element={
              <ProtectedRoute>
                <Tripura />
              </ProtectedRoute>
            }
          />
          <Route
            path="/head"
            element={
              <ProtectedRoute>
                <Head />
              </ProtectedRoute>
            }
          />
          {/* <Route path="/attendance" element={<ProtectedRoute><Attendance /></ProtectedRoute>} />  */}
          <Route
            path="/attendance"
            element={
              <ProtectedRoute>
                <AttendanceManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/eci"
            element={
              <ProtectedRoute>
                <Eci />
              </ProtectedRoute>
            }
          />
          <Route
            path="/installed"
            element={
              <ProtectedRoute>
                <Installed />
              </ProtectedRoute>
            }
          />
          <Route
            path="/eleuser"
            element={
              <ProtectedRoute>
                <ElectionInstaller />
              </ProtectedRoute>
            }
          />
          <Route
            path="/support"
            element={
              <ProtectedRoute>
                <Support />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kyc"
            element={
              <ProtectedRoute>
                <KycVerification />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/kyc"
            element={
              <ProtectedRoute>
                <AdminKycPanel />
              </ProtectedRoute>
            }
          />
          <Route
            path="/state/:state"
            element={
              <ProtectedRoute>
                <StatePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bihar/:state"
            element={
              <ProtectedRoute>
                <BiharUsers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/state/:state/:district"
            element={
              <ProtectedRoute>
                <DistrictPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/state/:state/:district/:assemblyName"
            element={
              <ProtectedRoute>
                <AssemblyPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Box>
    </Container>
  );
}

export default App;
