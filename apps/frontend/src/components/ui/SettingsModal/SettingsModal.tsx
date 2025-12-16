// src/components/ui/SettingsModal/SettingsModal.tsx
import React, { useState, useEffect } from 'react';
import { useSettings } from '../../../hooks/useSettings';
import { scaleService } from '../../../services/scaleService';

interface SettingsModalProps {
  isAutoRefresh: boolean;
  setIsAutoRefresh: (enabled: boolean) => void;
  refreshData: () => void;
  formatLastRefresh: () => string;
  dateRange: string;
  setDateRange: (days: string) => void;
  // Props cho cân
  onConnectScale?: () => Promise<void>;
  onDisconnectScale?: () => Promise<void>;
}

function SettingsModal({
  refreshData,
  isAutoRefresh, 
  setIsAutoRefresh, 
  dateRange, 
  setDateRange,
  onConnectScale,
  onDisconnectScale,
}: SettingsModalProps) {
  const { showSettingsModal, closeSettingsModal } = useSettings();
  
  // 🔹 State riêng cho trạng thái cân (query từ scaleService thay vì dùng props)
  const [localScaleConnected, setLocalScaleConnected] = useState(() => {
    return scaleService.isConnected();
  });
  
  // State cho baud rate
  const [baudRate, setBaudRate] = useState(() => {
    return localStorage.getItem('scaleBaudRate') || '9600';
  });

  const [isConnecting, setIsConnecting] = useState(false);

  // 🔹 Listen connection status từ scaleService
  useEffect(() => {
    // Ngay khi mount, query lại trạng thái
    setLocalScaleConnected(scaleService.isConnected());
    
    // Listen thay đổi trạng thái
    const unsubscribe = scaleService.onConnectionStatus((connected) => {
      console.log('[SettingsModal] Scale connection changed:', connected);
      setLocalScaleConnected(connected);
    });

    return () => unsubscribe();
  }, []);

  const handleSaveSettings = () => {
    localStorage.setItem('scaleBaudRate', baudRate);
  };

  const handleToggleScale = async () => {
    if (localScaleConnected) {
      // Ngắt kết nối
      if (onDisconnectScale) {
        setIsConnecting(true);
        await onDisconnectScale();
        setIsConnecting(false);
      }
    } else {
      // Kết nối
      if (onConnectScale) {
        setIsConnecting(true);
        await onConnectScale();
        setIsConnecting(false);
      }
    }
  };

  if (!showSettingsModal) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={closeSettingsModal}
      ></div>
      
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-90vh overflow-y-auto">
          <div className="flex justify-between items-center p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">
              Cài đặt
            </h3>
            <button
              onClick={closeSettingsModal}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Phạm vi lịch sử */}
            <div>
              <label htmlFor="date-range" className="block text-sm font-medium text-gray-700 mb-2">
                Phạm vi lịch sử
              </label>
              <select
                id="date-range"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="7">7 ngày qua</option>
                <option value="15">15 ngày qua</option>
                <option value="30">30 ngày qua</option>
                <option value="90">90 ngày qua</option>
                <option value="all">Tất cả lịch sử</option>
              </select>
            </div>

            {/* Tự động làm mới */}
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-sm font-medium text-gray-700">Tự động làm mới</h4>
                <p className="text-sm text-gray-500">Tự động tải lại dữ liệu sau mỗi 5 phút.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={isAutoRefresh}
                  onChange={(e) => setIsAutoRefresh(e.target.checked)}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
              </label>
            </div>

            <hr className="border-gray-200" />

            {/* CÀI ĐẶT CÂN */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Cài đặt Cân
              </h4>

              {/* Trạng thái kết nối */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${localScaleConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {localScaleConnected ? 'Đã kết nối với cân' : 'Chưa kết nối'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {localScaleConnected ? 'Nhận dữ liệu tự động' : 'Nhấn nút để kết nối'}
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={handleToggleScale}
                  disabled={isConnecting}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-wait ${
                    localScaleConnected
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-green-500 hover:bg-green-600 text-white'
                  }`}
                >
                  {isConnecting ? 'Đang xử lý...' : (localScaleConnected ? 'Ngắt kết nối' : 'Kết nối')}
                </button>
              </div>

              {/* Baud Rate */}
              <div>
                <label htmlFor="baud-rate" className="block text-sm font-medium text-gray-700 mb-2">
                  Baud Rate
                </label>
                <select
                  id="baud-rate"
                  value={baudRate}
                  onChange={(e) => setBaudRate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  disabled={localScaleConnected}
                >
                  <option value="4800">4800</option>
                  <option value="9600">9600</option>
                  <option value="19200">19200</option>
                  <option value="38400">38400</option>
                  <option value="57600">57600</option>
                  <option value="115200">115200</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Tốc độ truyền dữ liệu (mặc định: 9600)
                </p>
              </div>

              {/* Hướng dẫn */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800">
                  <strong>💡 Hướng dẫn kết nối:</strong><br/>
                  1. Kết nối cân với máy tính qua Bluetooth<br/>
                  2. Chọn Baud Rate phù hợp (thường là 9600)<br/>
                  3. Nhấn nút "Kết nối"<br/>
                  4. Chọn cổng COM của cân trong hộp thoại (thường là Dev B)<br/>
                  5. Trọng lượng sẽ tự động cập nhật khi cân ổn định
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
            <button
              onClick={closeSettingsModal}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={() => {
                handleSaveSettings();
                closeSettingsModal();
                refreshData();
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Lưu & Làm mới
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default SettingsModal;