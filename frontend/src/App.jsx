import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';

// 12 Navigation Pages
import Dashboard from './pages/Dashboard';
import ChennaiMapPage from './pages/ChennaiMapPage';
import HouseholdManagement from './pages/HouseholdManagement';
import LiveMonitoring from './pages/LiveMonitoring';
import DemandForecasting from './pages/DemandForecasting';
import RainfallIntelligence from './pages/RainfallIntelligence';
import ShortageRisk from './pages/ShortageRisk';
import ReservoirManagement from './pages/ReservoirManagement';
import EventManagement from './pages/EventManagement';
import CommandCenter from './pages/CommandCenter';
import ReportsAnalytics from './pages/ReportsAnalytics';
import SettingsPage from './pages/SettingsPage';

const pageTitles = {
  dashboard: 'Smart Water Resilience Dashboard',
  map: 'Chennai Water Intelligence Map',
  households: 'Household Water Monitoring & GIS',
  monitoring: 'Live Water Network Telemetry',
  forecasting: 'AI Water Demand Forecasting',
  rainfall: 'Yearly Rainfall Intelligence',
  shortage_risk: 'Water Shortage & Demand Pressure Risk',
  reservoirs: 'Reservoir & Storage Infrastructure',
  events: 'Event-Based Water Demand Management',
  command_center: 'Human + AI Command Center',
  reports: 'Reports & Comparative Analytics',
  settings: 'System Settings & Database Controls'
};

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const renderActivePage = () => {
    switch (activePage) {
      case 'dashboard':
        return (
          <Dashboard
            onNavigateToMap={() => setActivePage('map')}
            onNavigateToHouseholds={() => setActivePage('households')}
          />
        );
      case 'map':
        return <ChennaiMapPage />;
      case 'households':
        return <HouseholdManagement />;
      case 'monitoring':
        return <LiveMonitoring />;
      case 'forecasting':
        return <DemandForecasting />;
      case 'rainfall':
        return <RainfallIntelligence />;
      case 'shortage_risk':
        return <ShortageRisk />;
      case 'reservoirs':
        return <ReservoirManagement />;
      case 'events':
        return <EventManagement />;
      case 'command_center':
        return <CommandCenter />;
      case 'reports':
        return <ReportsAnalytics />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <Dashboard onNavigateToMap={() => setActivePage('map')} />;
    }
  };

  return (
    <div className="min-h-screen bg-navy-950 text-slate-100 flex">
      {/* 12-Item Navigation Sidebar */}
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          isCollapsed ? 'pl-20' : 'pl-64'
        }`}
      >
        {/* Top Navbar */}
        <Navbar
          activePageTitle={pageTitles[activePage] || 'AquaGuard AI'}
          isCollapsed={isCollapsed}
        />

        {/* Page Content Body */}
        <main className="flex-1 p-6 mt-16 max-w-7xl w-full mx-auto">
          {renderActivePage()}
        </main>
      </div>
    </div>
  );
}

