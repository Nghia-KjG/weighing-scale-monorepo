// src/App.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { scaleService } from './services/scaleService';

import Header from './components/ui/Header';
import LoginPage from './components/LoginPage/LoginPage';
import WeighingStation from './components/WeighingStation/WeighingStation';
import WeighingStationNew from './components/WeighingStation/WeighingStationNew';
import DashboardPage from './components/DashBoard/DashBoard';
import HistoryPage from './components/HistoryPage/HistoryPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminProtectedRoute from './components/auth/AdminProtectedRoute';
import NotFoundPage from './components/404/NotFoundPage';
import SettingsModal from './components/ui/SettingsModal/SettingsModal';
import { useAdminPageLogic } from './hooks/useHistoryPage';
import UnweighedPage from './components/UnweighedPage/UnweighedPage';
import DeviceManager from './components/DeviceManager/DeviceManager';

function App() {
  const historyLogic = useAdminPageLogic();

  // 🔹 Track current route để disconnect/reconnect khi chuyển trang
  const [currentRoute, setCurrentRoute] = useState(window.location.pathname);

  // (Không cần sync scaleConnected state, SettingsModal query từ scaleService trực tiếp)

  // 🔹 Theo dõi route change
  useEffect(() => {
    const handleRouteChange = () => {
      const newRoute = window.location.pathname;
      console.log('[App] Route changed from', currentRoute, 'to', newRoute);

      // Nếu route thay đổi
      if (newRoute !== currentRoute) {
        // Nếu cân đang kết nối
        if (scaleService.isConnected()) {
          console.log('[App] Disconnecting scale before navigation...');
          scaleService.disconnect();
        }
        setCurrentRoute(newRoute);
      }
    };

    // Listen popstate event (khi user bấm back/forward)
    window.addEventListener('popstate', handleRouteChange);

    // Observer cho route change trong SPA (check every 100ms)
    const routeCheckInterval = setInterval(() => {
      const newRoute = window.location.pathname;
      if (newRoute !== currentRoute) {
        handleRouteChange();
      }
    }, 100);

    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      clearInterval(routeCheckInterval);
    };
  }, [currentRoute]);

  // Hàm kết nối cân
  const handleConnectScale = useCallback(async () => {
    if (!scaleService.isSupported()) {
      alert('Trình duyệt không hỗ trợ Web Serial API. Vui lòng dùng Chrome hoặc Edge.');
      return;
    }

    try {
      const portSelected = await scaleService.requestPort();
      if (!portSelected) return;

      const baudRate = Number(localStorage.getItem('scaleBaudRate')) || 9600;
      const connected = await scaleService.connect(baudRate);

      // scaleConnected sẽ auto-update qua listener ở useEffect trên
      // setScaleConnected(connected); // Không cần dòng này nữa

      // Báo cho các hook khác (như useWeighingStation) biết là cân đã được BẬT
      if (connected) {
        localStorage.setItem('scaleEnabled', 'true');
        // 🔹 Dispatch storage event để hook detect (vì storage event không fire trong tab hiện tại)
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'scaleEnabled',
          newValue: 'true',
          oldValue: 'false',
          storageArea: localStorage
        }));
        console.log('[App] Dispatch storage event: scaleEnabled=true');
      }

    } catch (error) {
      console.error('Lỗi kết nối cân:', error);
    }
  }, []);

  // Hàm ngắt kết nối cân
  const handleDisconnectScale = useCallback(async () => {
    await scaleService.disconnect();
    // scaleConnected sẽ auto-update qua listener ở useEffect trên
    // setScaleConnected(false); // Không cần dòng này nữa

    // Báo cho các hook khác biết là cân đã TẮT
    localStorage.setItem('scaleEnabled', 'false');
    // 🔹 Dispatch storage event để hook detect
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'scaleEnabled',
      newValue: 'false',
      oldValue: 'true',
      storageArea: localStorage
    }));
    console.log('[App] Dispatch storage event: scaleEnabled=false');
  }, []);

  return (
    <div className="min-h-screen bg-sky-200 flex flex-col">
      <Header />

      <SettingsModal
        isAutoRefresh={historyLogic.isAutoRefresh}
        setIsAutoRefresh={historyLogic.setIsAutoRefresh}
        refreshData={historyLogic.refreshData}
        formatLastRefresh={historyLogic.formatLastRefresh}
        dateRange={historyLogic.dateRange}
        setDateRange={historyLogic.setDateRange}
        onConnectScale={handleConnectScale}
        onDisconnectScale={handleDisconnectScale}
      />

      <main className="flex-grow pt-[70px]">
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/WeighingStation"
            element={
              <ProtectedRoute>
                <WeighingStation />
              </ProtectedRoute>
            }
          />
          <Route
            path="/WeighingStationNew"
            element={
              <ProtectedRoute>
                <WeighingStationNew />
              </ProtectedRoute>
            }
          />

          <Route
            path="/history"
            element={
              <AdminProtectedRoute>
                <HistoryPage {...historyLogic} />
              </AdminProtectedRoute>
            }
          />

          <Route
            path="/dashboard"
            element={
              <AdminProtectedRoute>
                <DashboardPage />
              </AdminProtectedRoute>
            }
          />

          <Route
            path="/unweighed"
            element={
              <AdminProtectedRoute>
                <UnweighedPage />
              </AdminProtectedRoute>
            }
          />

          <Route
            path="/devices"
            element={
              <AdminProtectedRoute>
                <DeviceManager />
              </AdminProtectedRoute>
            }
          />

          <Route path="/" element={<Navigate to="/WeighingStationNew" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;