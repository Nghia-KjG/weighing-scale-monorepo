// apps/backend/src/api/controllers/warehouseController.ts
import { Request, Response } from 'express';
import { getPool } from '../../../config/db';
import sql from 'mssql';

/**
 * API: GET /api/warehouse/summary
 * Trả về tóm tắt các OVNO có tồn kho
 */
export const getWarehouseSummary = async (req: Request, res: Response) => {
  try {
    const pool = getPool();

    // Query tính tổng nhập và tổng xuất theo OVNO, chỉ lấy OVNO có tồn kho
    const summaryQuery = `
      SELECT 
        W.OVNO,
        W.FormulaF1 AS tenPhoiKeo,
        ISNULL(SUM(S.RKQty), 0) AS tongNhap,
        ISNULL(SUM(S.Qty - S.CurrentQty), 0) AS tongXuat,
        ISNULL(SUM(S.CurrentQty), 0) AS tonKho
      FROM 
        Outsole_VML_Work AS W
      INNER JOIN 
        Outsole_VML_WorkS AS S ON W.OVNO = S.OVNO
      WHERE 
        S.isEmpty IN (0, 1)  -- Chỉ lấy mã đã cân nhập (0: còn hàng, 1: đã xuất hết nhưng đã từng nhập)
      GROUP BY 
        W.OVNO, W.FormulaF1
      HAVING 
        ISNULL(SUM(S.CurrentQty), 0) > 0  -- Chỉ lấy OVNO có tồn kho > 0
      ORDER BY 
        W.OVNO DESC
    `;

    const result = await pool.request().query(summaryQuery);

    // Format dữ liệu trả về
    const responseData = result.recordset.map(item => ({
      ovNO: item.OVNO,
      tenPhoiKeo: item.tenPhoiKeo,
      tongNhap: parseFloat(item.tongNhap.toFixed(3)),
      tongXuat: parseFloat(item.tongXuat.toFixed(3)),
      tonKho: parseFloat(item.tonKho.toFixed(3))
    }));

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
 * API: GET /api/warehouse/details/:ovno
 * Trả về danh sách chi tiết TẤT CẢ các mã code thuộc một OVNO (bao gồm cả mã đã xuất hết)
 */
export const getWarehouseDetails = async (req: Request, res: Response) => {
  try {
    const { ovno } = req.params;

    if (!ovno) {
      return res.status(400).send({ message: 'Thiếu tham số OVNO' });
    }

    const pool = getPool();

    // Query lấy tất cả các mã code thuộc OVNO (bao gồm cả mã đã xuất hết)
    const detailsQuery = `
      SELECT 
        S.QRCode,
        S.Qty,
        ISNULL(S.RKQty, 0) AS RKQty,
        S.Package,
        S.MixTime,
        ISNULL(S.CurrentQty, 0) AS CurrentQty,
        ISNULL(S.LossQty, 0) AS LossQty,
        CASE
          WHEN S.isEmpty = -1 THEN 'chua can nhap'
          WHEN S.isEmpty = 0 THEN 'con hang'
          WHEN S.isEmpty = 1 THEN 'da xuat het'
          ELSE 'khong xac dinh'
        END AS trangThaiText
      FROM 
        Outsole_VML_WorkS AS S
      WHERE 
        S.OVNO = @ovnoParam
      ORDER BY 
        S.Package;
    `;

    const result = await pool.request()
      .input('ovnoParam', sql.VarChar, ovno)
      .query(detailsQuery);

    res.json(result.recordset);

  } catch (err: unknown) {
    console.error('Lỗi khi lấy chi tiết kho:');
    if (err instanceof Error) {
      console.error(err.message);
    } else {
      console.error(err);
    }
    res.status(500).send({ message: 'Lỗi máy chủ nội bộ khi lấy chi tiết kho' });
  }
};
