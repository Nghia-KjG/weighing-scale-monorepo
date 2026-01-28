// apps/frontend/src/components/UnweighedPage/UnweighedDetailsTable.tsx
import React from 'react';
import type { UnweighedDetail } from '../../hooks/useUnweighedPage';

interface TableProps {
  data: UnweighedDetail[];
}

const UnweighedDetailsTable: React.FC<TableProps> = ({ data }) => {
  if (data.length === 0) {
    return <p className="text-center text-gray-500 p-4">Không có chi tiết.</p>;
  }

  const statusDisplay = {
    'chua nhap': {
      text: 'Chưa Cân Nhập',
      className: 'text-blue-600',
    },
    'chua xuat het': {
      text: 'Chưa Cân Xuất Hết',
      className: 'text-orange-600',
    },
    'da xuat het': {
      text: 'Đã Xuất Hết',
      className: 'text-green-600',
    },
    'khong xac dinh': {
      text: 'Không Xác Định',
      className: 'text-gray-500',
    }
  };

  // Format thời gian
  const formatTime = (time: string | null) => {
    if (!time) return '-';
    try {
      return new Date(time).toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return time;
    }
  };

  return (
    // Thêm style cho bảng, lồng bên trong
    <div className="py-2 px-4 bg-gray-50 shadow-inner">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Mã Code
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Số Mẻ
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              KL Mẻ (kg)
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              KL Đã Nhập (kg)
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              KL Còn Lại (kg)
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Thời Gian Nhập
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Trạng Thái
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((item) => {
            // Lấy thông tin hiển thị từ đối tượng map
            const display = statusDisplay[item.trangThai] || { text: item.trangThai, className: 'text-gray-500' };

            return (
              <tr key={item.maCode}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {item.maCode}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {item.soMe}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {item.khoiLuongMe.toFixed(3)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {item.khoiLuongDaNhap.toFixed(3)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                  {item.khoiLuongConLai.toFixed(3)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {formatTime(item.thoiGianCanNhap)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`font-medium ${display.className}`}>
                    {display.text}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default UnweighedDetailsTable;