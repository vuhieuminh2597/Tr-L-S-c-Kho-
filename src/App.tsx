import { Loader2 } from 'lucide-react';
import React, { Suspense, lazy } from 'react';
import { Layout } from './components/Layout';
import { AppProvider, useApp } from './context/AppContext';
import { CheckinPage } from './pages/CheckinPage';
import { ChatPage } from './pages/ChatPage';
import { DashboardPage } from './pages/DashboardPage';
import { GoalsPage } from './pages/GoalsPage';
import { SettingsPage } from './pages/SettingsPage';

// Tải lười (Code-splitting) thư viện biểu đồ Recharts để màn hình chính trên iPhone 17 mở tức thì
const AnalyticsPage = lazy(() =>
  import('./pages/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage }))
);

const ActiveScreen: React.FC = () => {
  const { activeTab } = useApp();

  switch (activeTab) {
    case 'checkin':
      return <CheckinPage />;
    case 'goals':
      return <GoalsPage />;
    case 'analytics':
      return (
        <Suspense
          fallback={
            <div className="py-20 flex flex-col items-center justify-center gap-2 text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              <span className="text-xs font-medium">Đang tải bộ máy phân tích đa năm...</span>
            </div>
          }
        >
          <AnalyticsPage />
        </Suspense>
      );
    case 'chat':
      return <ChatPage />;
    case 'settings':
      return <SettingsPage />;
    case 'dashboard':
    default:
      return <DashboardPage />;
  }
};

export const App: React.FC = () => {
  return (
    <AppProvider>
      <Layout>
        <ActiveScreen />
      </Layout>
    </AppProvider>
  );
};

export default App;
