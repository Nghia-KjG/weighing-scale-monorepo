/* eslint-disable @typescript-eslint/no-explicit-any */
// apps/frontend/src/components/DashBoard/DashBoard.tsx

import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, LabelList 
} from 'recharts';
import { useDashboard } from '../../hooks/useDashboard';

function DashboardPage() {
  const {
    setSelectedDate,
    selectedDate,
    inventorySummary,
    twoLevelPieData,
    hourlyShiftData,
    weighingTrendData,
    // Refresh functionality
    lastRefresh,
    refreshData,
    formatLastRefresh,
    selectedYear, // 1. Lấy selectedYear
    setSelectedYear, // 1. Lấy setSelectedYear
  } = useDashboard();

  //Tạo danh sách năm (ví dụ: từ 5 năm trước đến 1 năm sau)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 7 }, (_, i) => (currentYear - 3) + i);

  const safePercent = (value: number | undefined, total: number | undefined) => {
    const val = value || 0;
    const tot = total || 0;
    if (tot === 0) return "0.0"; // Tránh chia cho 0
    return ((val / tot) * 100).toFixed(1);
  };
  
  // Tính tổng
  const totalOverview = (inventorySummary?.summary.totalTon || 0) + (inventorySummary?.summary.totalXuat || 0);

  // 2. (Tùy chọn) Hàm render label
  const renderBarLabel = (props: any) => {
    const { x, y, width, value } = props;
    if (value <= 0) return null; // Không hiển thị label nếu = 0

    return (
      <text x={x + width / 2} y={y} fill="#666" textAnchor="middle" dy={-6} fontSize={12}>
        {value.toFixed(2)}
      </text>
    );
  };
  
  return (
    <div className="px-8 py-4">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard - Tổng Quan</h1>
        
        <div className="flex items-center gap-3 mt-4 sm:mt-0">
          <span className="text-xs text-gray-500">
            Cập nhật lần cuối: {formatLastRefresh(lastRefresh)}
          </span>
          <button
            onClick={refreshData}
            className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
            title={`Làm mới dữ liệu (lần cuối: ${formatLastRefresh()})`}
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* THÔNG TIN TỔNG QUAN */}
      {inventorySummary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Tổng Nhập</p>
                <p className="text-3xl font-bold mt-2">{inventorySummary.summary.totalNhap.toFixed(2)} Kg</p>
              </div>
              <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v14m0 0l4-4m-4 4l-4-4m-6 8h20"/>
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-xl shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Tồn Kho</p>
                <p className="text-3xl font-bold mt-2">{inventorySummary.summary.totalTon.toFixed(2)} Kg</p>
              </div>
              <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-500 to-red-600 text-white p-6 rounded-xl shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm font-medium">Đã Xuất</p>
                <p className="text-3xl font-bold mt-2">{inventorySummary.summary.totalXuat.toFixed(2)} Kg</p>
              </div>
              <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 20V6m0 0l4 4m-4-4l-4 4M6 22h12" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}
        
      {/* KHU VỰC BIỂU ĐỒ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Biểu đồ cột - Cân theo giờ */}
        <div className="bg-white p-6 rounded-xl shadow">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
            <h2 className="text-xl font-bold mb-2 sm:mb-0">
              Tổng Khối Lượng Theo Ca
            </h2>
            <div className="relative">
              <input
                type="date"
                id="date-filter"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-sky-500 focus:border-sky-500 block w-full p-2.5"
              />
            </div>
          </div>
          
          <ResponsiveContainer width="100%" height={500}>
            <BarChart data={hourlyShiftData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="Ca" /> {/* <-- Sửa dataKey */}
              <YAxis />
              <Tooltip formatter={(value: number) => [`${value.toFixed(1)} kg`, "Khối lượng"]} />
              <Legend />
              
              {/* Cột Nhập (Màu xanh lá) */}
              <Bar dataKey="Khối lượng cân nhập" fill="#3b82f6">
                <LabelList dataKey="Khối lượng cân nhập" content={renderBarLabel} />
              </Bar>
              
              {/* Cột Xuất (Màu đỏ) */}
              <Bar dataKey="Khối lượng cân xuất" fill="#ef4444">
                <LabelList dataKey="Khối lượng cân xuất" content={renderBarLabel} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Biểu đồ tròn 2 tầng - Tồn kho */}
        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="text-xl font-bold mb-4">Tổng Quan Kho</h2>
          
          {twoLevelPieData ? (
            <>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  {/* Vòng trong - Tổng quan 
                  <Pie
                    data={twoLevelPieData.innerData}
                    cx="50%"
                    cy="50%"
                    innerRadius={0}
                    outerRadius={60}
                    dataKey="value"
                  >
                    {twoLevelPieData.innerData.map((entry, index) => (
                      <Cell key={`inner-${index}`} fill={entry.fill} />
                    ))}
                  </Pie> */}
                  
                  {/* Vòng ngoài - Chi tiết theo loại */}
                  <Pie
                    data={twoLevelPieData.outerData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    dataKey="value"
                    label={(props: any) => {
                      const { name, value, percent } = props;
                      return `${name}\n${value.toFixed(1)}kg\n(${(percent * 100).toFixed(1)}%)`;
                    }}
                  >
                    {twoLevelPieData.outerData.map((entry, index) => (
                      <Cell key={`outer-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  
                  <Tooltip formatter={(value: number) => `${value.toFixed(2)} kg`} />
                  {/*<Legend />*/}
                </PieChart>
              </ResponsiveContainer>

              {/* Chú thích bổ sung */}
              <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-2">
                <div className="flex items-start gap-6">
                {/* Nhóm 1: Tồn */}
                <div className="flex items-start gap-2"> {/* Sửa gap-6 thành gap-2 */}
                  <div className="w-4 h-4 rounded-full bg-green-500 mt-0.5 flex-shrink-0" style={{backgroundColor: '#10b981'}}></div>
                  <p className="text-sm font-semibold text-gray-600">
                  Tổng Tồn: {inventorySummary?.summary.totalTon.toFixed(2)}kg (
                                {/* Dùng hàm tính an toàn */}
                  {safePercent(inventorySummary?.summary.totalTon, totalOverview)}
                  %)
                  </p>
                </div>

                {/* Nhóm 2: Đã xuất 
                <div className="flex items-start gap-2">
                    <div className="w-4 h-4 rounded-full bg-red-500 mt-0.5 flex-shrink-0" style={{backgroundColor: '#ef4444'}}></div>
                  <p className="text-sm font-semibold text-gray-600">
                  Đã xuất: {inventorySummary?.summary.totalXuat.toFixed(2)}kg (
                                {/* Dùng hàm tính an toàn 
                  {safePercent(inventorySummary?.summary.totalXuat, totalOverview)}
                  %)
                  </p>
                </div>
                */}
              </div>
            </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-400">
              <p>Đang tải dữ liệu...</p>
            </div>
          )}
        </div>

        {/* Biểu đồ xu hướng theo thời gian */}
       <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow mt-6 relative">
          <div className="flex items-center mb-4"> 
            <h2 className="text-xl font-bold flex-shrink-0">
              Tổng Khối Lượng Cân (Kg) Theo Tháng Trong Năm
            </h2>

          </div>

          {/* dropdown chọn năm  */}
          <div className="absolute top-6 right-6 z-10">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              // Style nhỏ gọn giống như trong hình
              className="bg-white border border-gray-500 text-gray-700 text-sm font-bold rounded-md focus:ring-sky-500 focus:border-sky-500 block px-3 py-1 appearance-none cursor-pointer"
            >
              {yearOptions.map(year => (
                <option key={year} value={year.toString()}>
                  Năm {year}
                </option>
              ))}
            </select>
          </div>
          
          {/* BIỂU ĐỒ AREA */}
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={weighingTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorNhap" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorXuat" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 'auto']} /> 
              <Tooltip formatter={(value: number) => [`${value.toFixed(1)} kg`, "Khối lượng"]} />
              <Legend verticalAlign="top" height={36} />
              
              {/* dataKey VÀ NAME */}
              <Area 
                type="monotone" 
                dataKey="Tổng nhập (kg)" 
                stroke="#3b82f6" 
                fillOpacity={1} 
                fill="url(#colorNhap)" 
                name="Tổng nhập (kg)"
              />
              <Area 
                type="monotone" 
                dataKey="Tổng xuất (kg)" 
                stroke="#ef4444" 
                fillOpacity={1} 
                fill="url(#colorXuat)"
                name="Tổng xuất (kg)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>  
      </div>
    </div>
  );
}

export default DashboardPage;