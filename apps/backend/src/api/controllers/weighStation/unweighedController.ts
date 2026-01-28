// apps/backend/src/api/controllers/unweighedController.ts
import { Request, Response } from 'express';
import { getPool } from '../../../config/db';
import sql from 'mssql';

/**
 * API: GET /api/unweighed/summary
 * Trả về tóm tắt các mã code chưa cân (nhập/xuất), nhóm theo OVNO
 */
export const getUnweighedSummary = async (req: Request, res: Response) => {
 try {
  const pool = getPool();

  // Query đơn giản hóa sử dụng các cột isEmpty và CurrentQty trong WorkS
  const summaryQuery = `
   SELECT 
    W.OVNO,
    W.FormulaF1,
    W.Memo,
    W.Qty AS totalTargetQty,
    COUNT(S.QRCode) AS totalPackages,
    
    -- Đếm số mã code chưa cân nhập (isEmpty = -1)
    COUNT(CASE WHEN S.isEmpty = -1 THEN 1 END) AS chuaCanNhap,
    
    -- Đếm số mã code còn khối lượng trong kho (CurrentQty > 0 hoặc isEmpty = 0)
    COUNT(CASE WHEN S.CurrentQty > 0 OR S.isEmpty = 0 THEN 1 END) AS chuaCanXuat
   
   FROM 
    Outsole_VML_Work AS W
   INNER JOIN 
    Outsole_VML_WorkS AS S ON W.OVNO = S.OVNO
   
   GROUP BY 
    W.OVNO, W.FormulaF1, W.Memo, W.Qty
   
   -- Chỉ hiển thị các OVNO có mã chưa cân nhập hoặc còn khối lượng có thể xuất
   HAVING 
    COUNT(CASE WHEN S.isEmpty = -1 THEN 1 END) > 0
    OR COUNT(CASE WHEN S.CurrentQty > 0 OR S.isEmpty = 0 THEN 1 END) > 0
   
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

    // Query đơn giản hóa sử dụng các cột trong WorkS
    const detailsQuery = `
      SELECT 
        S.QRCode AS maCode,
        S.Qty AS khoiLuongMe,
        S.Package AS [soMe],
        ISNULL(S.RKQty, 0) AS khoiLuongDaNhap,
        ISNULL(S.CurrentQty, 0) AS khoiLuongConLai,
        S.MixTime AS thoiGianCanNhap,
        CASE
          WHEN S.isEmpty = -1 THEN 'chua nhap'
          WHEN S.isEmpty = 0 THEN 'chua xuat het'
          WHEN S.isEmpty = 1 THEN 'da xuat het'
          ELSE 'khong xac dinh'
        END AS trangThai,
        S.isEmpty AS trangThaiCode
      FROM 
        Outsole_VML_WorkS AS S
      WHERE 
        S.OVNO = @ovnoParam
        -- Chỉ hiển thị mã chưa nhập (isEmpty = -1) HOẶC còn khối lượng trong kho (isEmpty = 0)
        AND (S.isEmpty = -1 OR S.isEmpty = 0)
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