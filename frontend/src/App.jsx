import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './apps/Login';
import { CitizenLayout } from './apps/citizen/CitizenLayout';
import { Home as CitizenHome } from './apps/citizen/Home';
import { FileComplaint } from './apps/citizen/FileComplaint';
import { TrackComplaint } from './apps/citizen/TrackComplaint';
import { Profile } from './apps/citizen/Profile';

import { OfficerLayout } from './apps/officer/OfficerLayout';
import { Dashboard as OfficerDashboard } from './apps/officer/Dashboard';
import { Queue } from './apps/officer/Queue';
import { Analytics } from './apps/officer/Analytics';
import { Escalations } from './apps/officer/Escalations';
import { OfficerProfile } from './apps/officer/OfficerProfile';
import { OfficerLogin } from './apps/officer/OfficerLogin';
import { CommanderLogin } from './apps/officer/CommanderLogin';
import { RouteGuard } from './components/RouteGuard';

function isOfficerPath(pathname) {
  return pathname.startsWith('/officer');
}

function CatchAllRoute() {
  const pathname = window.location.pathname;
  if (isOfficerPath(pathname)) {
    return <Navigate to="/officer/login" replace />;
  }
  return <Navigate to="/login" replace />;
}

function App() {
  const hostname = window.location.hostname;
  const port = window.location.port;
  const pathname = window.location.pathname;

  const isOfficerDomain = hostname.startsWith('officer.') || port === '5174' || port === '5175' || pathname.startsWith('/officer');

  if (isOfficerDomain) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/officer/login" replace />} />
          <Route path="/login" element={<Navigate to="/officer/login" replace />} />
          <Route path="/officer/login" element={<CommanderLogin />} />
          <Route path="/commander/login" element={<CommanderLogin />} />
          <Route path="/officer" element={<RouteGuard allowedRoles={['officer', 'admin']}><OfficerLayout /></RouteGuard>}>
            <Route index element={<OfficerDashboard />} />
            <Route path="dashboard" element={<OfficerDashboard />} />
            <Route path="queue" element={<Queue />} />
            <Route path="escalations" element={<Escalations />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="profile" element={<OfficerProfile />} />
          </Route>
          <Route path="*" element={<Navigate to="/officer/login" replace />} />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/citizen" element={<RouteGuard allowedRoles={['citizen']}><CitizenLayout /></RouteGuard>}>
          <Route index element={<CitizenHome />} />
          <Route path="home" element={<CitizenHome />} />
          <Route path="file" element={<FileComplaint />} />
          <Route path="track" element={<TrackComplaint />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        <Route path="/officer/login" element={<CommanderLogin />} />
        <Route path="/commander/login" element={<CommanderLogin />} />
        <Route path="/officer" element={<RouteGuard allowedRoles={['officer', 'admin']}><OfficerLayout /></RouteGuard>}>
          <Route index element={<OfficerDashboard />} />
          <Route path="dashboard" element={<OfficerDashboard />} />
          <Route path="queue" element={<Queue />} />
          <Route path="escalations" element={<Escalations />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="profile" element={<OfficerProfile />} />
        </Route>

        <Route path="*" element={<CatchAllRoute />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
