/**
 * Hook useAutoRefresh
 * Quản lý việc tự động làm mới dữ liệu định kỳ
 * Hỗ trợ bật/tắt tự động làm mới và điều chỉnh khoảng thời gian
 */

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Các tùy chọn cấu hình cho hook useAutoRefresh
 */
interface UseAutoRefreshOptions {
  defaultInterval?: number; // Khoảng thời gian làm mới mặc định (giây)
  autoStart?: boolean; // Có tự động bắt đầu làm mới ngay khi component mount không
}

/**
 * Giá trị trả về từ hook useAutoRefresh
 */
interface UseAutoRefreshReturn {
  // === Trạng thái ===
  isAutoRefresh: boolean; // Trạng thái bật/tắt tự động làm mới
  refreshInterval: number; // Khoảng thời gian làm mới hiện tại (giây)
  lastRefresh: Date; // Thời điểm lần cuối cùng làm mới dữ liệu
  
  // === Hành động ===
  refreshData: () => void; // Hàm gọi refresh dữ liệu ngay lập tức
  setIsAutoRefresh: (enabled: boolean) => void; // Bật/tắt tự động làm mới
  setRefreshInterval: (seconds: number) => void; // Thay đổi khoảng thời gian làm mới
  
  // === Tiện ích ===
  formatLastRefresh: (date?: Date) => string; // Format thời gian làm mới lần cuối thành chuỗi
}

export function useAutoRefresh(
  dataRefreshCallback: () => void, // Callback được gọi khi refresh dữ liệu
  options: UseAutoRefreshOptions = {} // Các tùy chọn cấu hình
): UseAutoRefreshReturn {
  // Lấy giá trị từ options với giá trị mặc định
  const {
    defaultInterval = 300, // Mặc định là 5 phút (300 giây)
    autoStart = true // Mặc định tự động bắt đầu
  } = options;

  // ===== Khởi tạo các state =====
  // Trạng thái bật/tắt tự động làm mới
  const [isAutoRefresh, setIsAutoRefresh] = useState(autoStart);
  // Khoảng thời gian làm mới (giây)
  const [refreshInterval, setRefreshInterval] = useState(defaultInterval);
  // Thời điểm lần cuối cùng làm mới
  const [lastRefresh, setLastRefresh] = useState(new Date());

  /**
   * useRef lưu trữ phiên bản mới nhất của dataRefreshCallback
   * Giải quyết vấn đề stale closures (closure cũ không có access tới callback mới nhất)
   * Lợi ích: Tránh phải thêm callback vào dependency array của setInterval
   */
  const savedCallback = useRef<() => void>(() => {});
  
  // Cập nhật savedCallback mỗi khi dataRefreshCallback thay đổi
  useEffect(() => {
    savedCallback.current = dataRefreshCallback;
  }, [dataRefreshCallback]);

  /**
   * Hàm refreshData gọi callback mới nhất và cập nhật thời gian làm mới
   * Sử dụng useCallback để tránh tạo hàm mới mỗi lần render
   */
  const refreshData = useCallback(() => {
    // Gọi phiên bản mới nhất của callback
    savedCallback.current();
    // Cập nhật thời điểm làm mới cuối cùng
    setLastRefresh(new Date());
  }, []);

  /**
   * Hàm format thời gian làm mới lần cuối thành chuỗi dễ đọc
   * Sử dụng định dạng giờ:phút:giây theo tiêu chuẩn Việt Nam
   */
  const formatLastRefresh = useCallback((date: Date = lastRefresh) => {
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }, [lastRefresh]);

  /**
   * Effect quản lý auto refresh interval
   * Tạo setInterval khi isAutoRefresh = true
   * Hủy interval khi component unmount hoặc khi isAutoRefresh = false
   */
  useEffect(() => {
    // Nếu tắt auto refresh, không làm gì
    if (!isAutoRefresh) return;

    // Tạo interval để gọi refreshData định kỳ
    const interval = setInterval(() => {
      // Gọi refreshData (sẽ sử dụng phiên bản mới nhất của callback)
      refreshData();
    }, refreshInterval * 1000); // Chuyển đổi giây thành milliseconds

    // Hàm cleanup: xóa interval khi dependency thay đổi hoặc component unmount
    return () => clearInterval(interval);
  }, [isAutoRefresh, refreshInterval, refreshData]);

  // Trả về các state và function cho component sử dụng
  return {
    // === Trạng thái ===
    isAutoRefresh,
    refreshInterval,
    lastRefresh,
    
    // === Hành động ===
    refreshData,
    setIsAutoRefresh,
    setRefreshInterval,
    
    // === Tiện ích ===
    formatLastRefresh,
  };
}