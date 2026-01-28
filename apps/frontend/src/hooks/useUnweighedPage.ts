// apps/frontend/src/hooks/useUnweighedPage.ts
import { useState, useCallback, useEffect } from "react";
import { useAutoRefresh } from "./useAutoRefresh";
import apiClient from "../api/apiClient";
//import { useSettings } from "./useSettings"; // Dùng chung context

// Định nghĩa kiểu dữ liệu trả về từ API mới
export interface UnweighedSummary {
  ovNO: string;
  tenPhoiKeo: string;
  memo: string | null;
  totalTargetQty: number;
  totalPackages: number;
  chuaCanNhap: number;
  chuaCanXuat: number;
}

export interface UnweighedDetail {
  maCode: string;
  khoiLuongMe: number;
  soMe: number;
  khoiLuongDaNhap: number;      // Mới: RKQty từ WorkS
  khoiLuongConLai: number;       // CurrentQty từ WorkS
  thoiGianCanNhap: string | null; // Mới: MixTime từ WorkS
  trangThai: 'chua nhap' | 'chua xuat het' | 'da xuat het' | 'khong xac dinh';
  trangThaiCode: number;         // Mới: isEmpty từ WorkS (-1, 0, 1)
}

export function useUnweighedPage() {
  // Lấy state cài đặt chung
  //const { isAutoRefresh, setIsAutoRefresh } = useSettings();

  // State của trang
  const [data, setData] = useState<UnweighedSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedOvno, setSelectedOvno] = useState<string | null>(null);
  const [details, setDetails] = useState<UnweighedDetail[]>([]);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);

  // Logic fetch
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
    const response = await apiClient.get<UnweighedSummary[]>('/unweighed/summary');
    setData(response.data);
    } catch (error) {
    console.error("Lỗi khi lấy dữ liệu chưa cân:", error);
    setData([]);
    } finally {
    setIsLoading(false);
    }
  }, []);

  // Lấy dữ liệu lần đầu
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Tự động làm mới
  const { 
    lastRefresh, 
    formatLastRefresh,
    refreshData,
  } = useAutoRefresh(fetchData, { 
      //isAutoRefresh,
      //setIsAutoRefresh 
  });

  // THÊM HÀM MỚI ĐỂ XỬ LÝ CLICK
  const handleSelectOvno = useCallback(async (ovno: string) => {
    // Nếu click vào OVNO đang mở, hãy đóng nó lại
    if (selectedOvno === ovno) {
      setSelectedOvno(null);
      setDetails([]);
      return;
    }

    // Nếu click vào OVNO mới
    setSelectedOvno(ovno);
    setIsDetailsLoading(true);
    setDetails([]); // Xóa chi tiết cũ

    try {
      const response = await apiClient.get<UnweighedDetail[]>(`/unweighed/details/${ovno}`);
      setDetails(response.data);
    } catch (error) {
      console.error("Lỗi khi lấy chi tiết mã chưa cân:", error);
      setDetails([]); // Đặt lại thành mảng rỗng nếu lỗi
    } finally {
      setIsDetailsLoading(false);
    }
  }, [selectedOvno]);

  return {
    data,
    isLoading,
    refreshData,
    lastRefresh,
    formatLastRefresh,

    selectedOvno,
    details,
    isDetailsLoading,
    handleSelectOvno,
  };
}