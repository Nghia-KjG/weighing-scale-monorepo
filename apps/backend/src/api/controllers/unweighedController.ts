// apps/backend/src/api/controllers/unweighedController.ts
import { Request, Response } from 'express';
import { getPool } from '../../config/db';
import sql from 'mssql';

/**
 * API: GET /api/unweighed/summary
 * Trả về tóm tắt các mã code chưa cân (nhập/xuất), nhóm theo OVNO
 */
export const getUnweighedSummary = async (req: Request, res: Response) => {
 try {
  const pool = getPool();

  // Query này sẽ tính tổng khối lượng đã xuất và so sánh với khối lượng mẻ
  const summaryQuery = `
   WITH MaCodeXuat AS (
    SELECT 
     S.OVNO,
     S.QRCode,
     S.Qty AS khoiLuongMe,
     COALESCE(SUM(H_xuat.KhoiLuongCan), 0) AS tongKLDaXuat,
     S.Qty - COALESCE(SUM(H_xuat.KhoiLuongCan), 0) AS khoiLuongConLai
    FROM 
     Outsole_VML_WorkS AS S
    LEFT JOIN 
     Outsole_VML_History AS H_xuat ON S.QRCode = H_xuat.QRCode AND H_xuat.loai = 'xuat'
    GROUP BY 
     S.OVNO, S.QRCode, S.Qty
   ),
   MaCodeNhap AS (
    SELECT 
     S.QRCode,
     COUNT(H_nhap.QRCode) AS daNhap
    FROM 
     Outsole_VML_WorkS AS S
    LEFT JOIN 
     Outsole_VML_History AS H_nhap ON S.QRCode = H_nhap.QRCode AND H_nhap.loai = 'nhap'
    GROUP BY 
     S.QRCode
   )
   SELECT 
    W.OVNO,
    W.FormulaF1,
    W.Memo,
    W.Qty AS totalTargetQty,
    COUNT(MX.QRCode) AS totalPackages,
    
    -- Đếm số lượng mã code CHƯA CÓ trong bảng History (với loai = 'nhap')
    COUNT(CASE WHEN MN.daNhap = 0 OR MN.daNhap IS NULL THEN 1 END) AS chuaCanNhap,
    
    -- Đếm số lượng mã code còn khối lượng có thể xuất (khoiLuongConLai > 0)
    COUNT(CASE WHEN MX.khoiLuongConLai > 0 THEN 1 END) AS chuaCanXuat
   
   FROM 
    Outsole_VML_Work AS W
   LEFT JOIN 
    MaCodeXuat AS MX ON W.OVNO = MX.OVNO
   LEFT JOIN 
    MaCodeNhap AS MN ON MX.QRCode = MN.QRCode
   
   GROUP BY 
    W.OVNO, W.FormulaF1, W.Memo, W.Qty
   
   -- Chỉ hiển thị các OVNO có mã còn khối lượng có thể xuất
   HAVING 
    COUNT(CASE WHEN MX.khoiLuongConLai > 0 THEN 1 END) > 0
   
   ORDER BY 
    W.OVNO DESC
  `;

  const result = await pool.request().query(summaryQuery);

  // Format dữ liệu trả về
  const responseData = result.recordset.map(item => ({
   ovNO: item.OVNO,
   tenPhoiKeo: item.FormulaF1,
   memo: item.Memo,
   totalTargetQty: parseFloat(item.totalTargetQty.toFixed(2)),
   totalPackages: item.totalPackages,
   chuaCanNhap: item.chuaCanNhap,
   chuaCanXuat: item.chuaCanXuat
  }));

  res.json(responseData);

 } catch (err: unknown) {
  console.error('Lỗi khi lấy dữ liệu chưa cân:');
  if (err instanceof Error) {
   console.error(err.message);
  } else {
   console.error(err);
  }
  res.status(500).send({ message: 'Lỗi máy chủ nội bộ khi lấy dữ liệu chưa cân' });
 }
};

/**
 * API MỚI: GET /api/unweighed/details/:ovno
 * Trả về danh sách chi tiết các mã code chưa cân cho một OVNO cụ thể
 */
export const getUnweighedDetails = async (req: Request, res: Response) => {
  try {
    const { ovno } = req.params; // Lấy ovno từ URL

    if (!ovno) {
      return res.status(400).send({ message: 'Thiếu tham số OVNO' });
    }

    const pool = getPool();

    // Query này tìm các mã code thuộc OVNO
      // tính tổng khối lượng đã xuất và khối lượng còn lại
    const detailsQuery = `
      SELECT 
        S.QRCode AS maCode,
        S.Qty AS khoiLuongMe,
        S.Package AS soLo,
        COALESCE(SUM(H_xuat.KhoiLuongCan), 0) AS khoiLuongDaXuat,
        S.Qty - COALESCE(SUM(H_xuat.KhoiLuongCan), 0) AS khoiLuongConLai,
        CASE
          WHEN NOT EXISTS (SELECT 1 FROM Outsole_VML_History WHERE QRCode = S.QRCode AND loai = 'nhap') THEN 'chua nhap'
          WHEN S.Qty - COALESCE(SUM(H_xuat.KhoiLuongCan), 0) > 0 THEN 'chua xuat het'
          ELSE 'da xuat het'
        END AS trangThai
      FROM 
        Outsole_VML_WorkS AS S
      LEFT JOIN 
        Outsole_VML_History AS H_xuat 
        ON S.QRCode = H_xuat.QRCode AND H_xuat.loai = 'xuat'
      WHERE 
        S.OVNO = @ovnoParam
      GROUP BY
        S.QRCode, S.Qty, S.Package
      HAVING
        -- Chỉ hiển thị mã chưa nhập HOẶC còn khối lượng có thể xuất
        NOT EXISTS (SELECT 1 FROM Outsole_VML_History WHERE QRCode = S.QRCode AND loai = 'nhap')
        OR (S.Qty - COALESCE(SUM(H_xuat.KhoiLuongCan), 0) > 0)
      ORDER BY 
        S.Package;
    `;

    const result = await pool.request()
    .input('ovnoParam', sql.VarChar, ovno)
    .query(detailsQuery);

    res.json(result.recordset);

  } catch (err: unknown) {
      console.error('Lỗi khi lấy chi tiết chưa cân:');
      if (err instanceof Error) {
        console.error(err.message);
    } else {
      console.error(err);
    }
    res.status(500).send({ message: 'Lỗi máy chủ nội bộ khi lấy chi tiết chưa cân' });
  }
};