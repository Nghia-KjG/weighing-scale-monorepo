/* eslint-disable @typescript-eslint/no-explicit-any */
// apps/backend/src/api/controllers/dashboardController.ts
import { Request, Response } from 'express';
import { getPool } from '../../../config/db';
import sql from 'mssql';

/**
 * API: GET /api/dashboard/inventory-summary
 * Trả về dữ liệu tổng quan tồn kho và phân bổ theo loại phôi keo
 * Dùng cho Two Level Pie Chart
 */
export const getInventorySummary = async (req: Request, res: Response) => {
  try {
    const pool = getPool();

    // Query 1: Lấy tổng quan tồn kho (Nhập, Xuất, Tồn) - Dùng cho vòng trong
    const inventorySummaryQuery = `
      SELECT 
        ISNULL(SUM(CASE WHEN H.loai = 'nhap' THEN H.KhoiLuongCan ELSE 0 END), 0) AS TotalNhap,
        ISNULL(SUM(CASE WHEN H.loai = 'xuat' THEN H.KhoiLuongCan ELSE 0 END), 0) AS TotalXuat
      FROM Outsole_VML_History AS H
    `;
    
    const summaryResult = await pool.request().query(inventorySummaryQuery);
    const { TotalNhap, TotalXuat } = summaryResult.recordset[0];
    const TotalTon = TotalNhap - TotalXuat;

    // Query 2: Lấy tồn kho theo từng loại phôi keo - Dùng cho vòng ngoài
    const inventoryByGlueTypeQuery = `
      SELECT 
        W.FormulaF1 AS tenPhoiKeo,
        ISNULL(SUM(CASE WHEN H.loai = 'nhap' THEN H.KhoiLuongCan ELSE 0 END), 0) AS Nhap,
        ISNULL(SUM(CASE WHEN H.loai = 'xuat' THEN H.KhoiLuongCan ELSE 0 END), 0) AS Xuat,
        ISNULL(SUM(CASE WHEN H.loai = 'nhap' THEN H.KhoiLuongCan ELSE 0 END), 0) - 
        ISNULL(SUM(CASE WHEN H.loai = 'xuat' THEN H.KhoiLuongCan ELSE 0 END), 0) AS Ton
      FROM 
        Outsole_VML_History AS H
      INNER JOIN 
        Outsole_VML_WorkS AS S ON H.QRCode = S.QRCode
      INNER JOIN 
        Outsole_VML_Work AS W ON S.OVNO = W.OVNO
      GROUP BY 
        W.FormulaF1
      HAVING 
        (ISNULL(SUM(CASE WHEN H.loai = 'nhap' THEN H.KhoiLuongCan ELSE 0 END), 0) - 
         ISNULL(SUM(CASE WHEN H.loai = 'xuat' THEN H.KhoiLuongCan ELSE 0 END), 0)) > 0
      ORDER BY 
        Ton DESC
    `;

    const glueTypeResult = await pool.request().query(inventoryByGlueTypeQuery);

    // Chuẩn bị dữ liệu trả về
    const responseData = {
      // Dữ liệu tổng quan (vòng trong)
      summary: {
        totalNhap: parseFloat(TotalNhap.toFixed(2)),
        totalXuat: parseFloat(TotalXuat.toFixed(2)),
        totalTon: parseFloat(TotalTon.toFixed(2))
      },
      // Dữ liệu chi tiết theo loại phôi keo (vòng ngoài)
      byGlueType: glueTypeResult.recordset.map(item => ({
        tenPhoiKeo: item.tenPhoiKeo || 'Không rõ',
        nhap: parseFloat(item.Nhap.toFixed(2)),
        xuat: parseFloat(item.Xuat.toFixed(2)),
        ton: parseFloat(item.Ton.toFixed(2))
      }))
    };

    res.json(responseData);

  } catch (err: unknown) {
    console.error('Lỗi khi lấy dữ liệu tồn kho:');

    if (err instanceof Error) {
      console.error(err.message);
    } else {
      console.error(err);
    }

    res.status(500).send({ message: 'Lỗi máy chủ nội bộ khi lấy dữ liệu tồn kho' });
  }
};

/**
 * API: GET /api/dashboard/hourly-weighing
 * Trả về dữ liệu cân theo giờ cho một ngày cụ thể
 * Query params: date (format: YYYY-MM-DD)
 */
export const getShiftWeighing = async (req: Request, res: Response) => {
 try {
  const { date } = req.query;
  
  if (!date || typeof date !== 'string') {
   return res.status(400).send({ message: 'Thiếu tham số date (YYYY-MM-DD)' });
  }

  const pool = getPool();

    // 1. Định nghĩa Ca 1, 2, 3
    // Ca 1: 06:00 (ngày @date) -> 13:59:59 (ngày @date)
    // Ca 2: 14:00 (ngày @date) -> 21:59:59 (ngày @date)
    // Ca 3: 22:00 (ngày @date) -> 05:59:59 (ngày HÔM SAU)
    
    // Bắt đầu từ 06:00 sáng ngày được chọn
    const startTime = `${date} 06:00:00`;
    // Kết thúc vào 06:00 sáng ngày hôm sau
    const endTimeQuery = `SELECT DATEADD(day, 1, @dateParam) AS EndTime`;
    const endTimeResult = await pool.request()
        .input('dateParam', sql.VarChar, startTime)
        .query(endTimeQuery);
    const endTime = endTimeResult.recordset[0].EndTime;


  // 2. Query: Nhóm theo Ca và tính tổng Nhập/Xuất
  const shiftQuery = `
   WITH ShiftData AS (
    SELECT 
     H.TimeWeigh,
     H.KhoiLuongCan,
     H.loai,
     CASE
      WHEN DATEPART(HOUR, H.TimeWeigh) >= 6 AND DATEPART(HOUR, H.TimeWeigh) < 14
       THEN 'Ca 1'
      WHEN DATEPART(HOUR, H.TimeWeigh) >= 14 AND DATEPART(HOUR, H.TimeWeigh) < 22
       THEN 'Ca 2'
      ELSE 'Ca 3' -- Gồm 22h-23h (ngày @date) và 00h-05h (ngày hôm sau)
     END AS Ca
    FROM 
     Outsole_VML_History AS H
    WHERE 
     H.TimeWeigh >= @startTime AND H.TimeWeigh < @endTime
   )
   SELECT
    Ca,
    ISNULL(SUM(CASE WHEN loai = 'nhap' THEN KhoiLuongCan ELSE 0 END), 0) AS KhoiLuongNhap,
    ISNULL(SUM(CASE WHEN loai = 'xuat' THEN KhoiLuongCan ELSE 0 END), 0) AS KhoiLuongXuat
   FROM
    ShiftData
   GROUP BY
    Ca
  `;

  const result = await pool.request()
   .input('startTime', sql.DateTime, new Date(startTime))
   .input('endTime', sql.DateTime, endTime)
   .query(shiftQuery);

  // 3. Đảm bảo 3 ca luôn tồn tại
  const shifts = ['Ca 1', 'Ca 2', 'Ca 3'];
  const shiftDataMap = new Map<string, any>();
  result.recordset.forEach(r => shiftDataMap.set(r.Ca, r));

  const finalShiftData = shifts.map(shiftName => {
   const found = shiftDataMap.get(shiftName);
   if (found) {
    return {
     Ca: shiftName,
     KhoiLuongNhap: parseFloat(found.KhoiLuongNhap.toFixed(2)),
     KhoiLuongXuat: parseFloat(found.KhoiLuongXuat.toFixed(2))
    };
   }
   return {
    Ca: shiftName,
    KhoiLuongNhap: 0,
    KhoiLuongXuat: 0
   };
  });

  res.json(finalShiftData);

  } catch (err: unknown) {
    console.error('Lỗi khi lấy dữ liệu cân theo giờ:');

    if (err instanceof Error) {
      console.error(err.message);
    } else {
      console.error(err);
    }

    res.status(500).send({ message: 'Lỗi máy chủ nội bộ khi lấy dữ liệu cân theo giờ' });
  }
};

/**
 * API: GET /api/dashboard/weighing-trend
 * Trả về xu hướng số lần cân theo tháng
 * Query params: months (số tháng muốn lấy, mặc định 6)
 */
export const getWeighingTrend = async (req: Request, res: Response) => {
  try {
    // 1. Lấy 'year' từ query, mặc định là năm hiện tại
    const { year } = req.query;
    const currentYear = new Date().getFullYear();
    const selectedYear = parseInt(year as string, 10) || currentYear;
      
    const pool = getPool();

    const trendQuery = `
      SELECT
        DATEPART(MONTH, TimeWeigh) AS Thang,
        ISNULL(SUM(CASE WHEN loai = 'nhap' THEN KhoiLuongCan ELSE 0 END), 0) AS TongKhoiLuongNhap,
        ISNULL(SUM(CASE WHEN loai = 'xuat' THEN KhoiLuongCan ELSE 0 END), 0) AS TongKhoiLuongXuat
      FROM
        Outsole_VML_History
      WHERE
        DATEPART(YEAR, TimeWeigh) = @selectedYearParam  -- 2. Dùng tham số năm
      GROUP BY
        DATEPART(MONTH, TimeWeigh)
      ORDER BY
        Thang
    `;

    const result = await pool.request()
    .input('selectedYearParam', sql.Int, selectedYear) // 3. Thêm tham số
    .query(trendQuery);

    // Tạo mảng kết quả cuối cùng với 12 tháng
    const monthlyDataMap = new Map<number, any>();
    result.recordset.forEach(r => monthlyDataMap.set(r.Thang, r));

    const finalMonthlyData = [];
    for (let i = 1; i <= 12; i++) {
      const data = monthlyDataMap.get(i);
      
      finalMonthlyData.push({
        Thang: i,
        TongKhoiLuongNhap: data ? parseFloat(data.TongKhoiLuongNhap.toFixed(2)) : 0,
        TongKhoiLuongXuat: data ? parseFloat(data.TongKhoiLuongXuat.toFixed(2)) : 0,
      });
    }

    res.json(finalMonthlyData);

  } catch (err: unknown) {
    console.error('Lỗi khi lấy xu hướng cân:');

    if (err instanceof Error) {
      console.error(err.message);
    } else {
      console.error(err);
    }

    res.status(500).send({ message: 'Lỗi máy chủ nội bộ khi lấy xu hướng cân' });
  }
};