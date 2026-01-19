// src/api/controllers/syncController.ts
import { Request, Response } from 'express';
import { getPool } from '../../../config/db';

export const getUnweighedData = async (req: Request, res: Response) => {
  try {
    const pool = getPool();

    // Query này lấy TẤT CẢ các mã thuộc OVNO chưa cân xuất hết
    // Bao gồm cả các mã đã cân xuất và chưa cân xuất trong OVNO đó
    const result = await pool.request().query(`
      WITH UnfinishedOVNO AS (
        -- Tìm các OVNO còn ít nhất 1 mã chưa cân xuất hết
        SELECT DISTINCT S.OVNO
        FROM Outsole_VML_WorkS AS S
        WHERE NOT EXISTS (
          SELECT 1
          FROM Outsole_VML_History AS H
          WHERE H.QRCode = S.QRCode 
            AND H.loai = 'xuat'
            AND H.CurrentQty <= 0
        )
      )
      
      -- Lấy TẤT CẢ các mã thuộc các OVNO chưa hoàn thành
      SELECT 
        S.QRCode AS maCode,
        S.OVNO AS ovNO,
        S.Package AS package,
        S.MUserID AS mUserID,
        S.Qty AS qtys,
        S.RKQty AS realQty,
        S.MixTime AS mixTime,
        
        W.FormulaF1 AS tenPhoiKeo,
        W.Machine_NO AS soMay,
        W.Memo AS memo,
        W.Qty AS totalTargetQty,
        
        P.UserName AS nguoiThaoTac,
        W.Batch AS soLo,

        -- Kiểm tra trạng thái cân của từng mã
        ISNULL(SUM(CASE WHEN H.loai = 'nhap' THEN H.KhoiLuongCan ELSE 0 END), 0) AS weighedNhapAmount,
        ISNULL(SUM(CASE WHEN H.loai = 'xuat' THEN H.KhoiLuongCan ELSE 0 END), 0) AS weighedXuatAmount,
        CASE 
          WHEN EXISTS (SELECT 1 FROM Outsole_VML_History WHERE QRCode = S.QRCode AND loai = 'nhap') THEN 1
          ELSE 0
        END AS isNhapWeighed,
        CASE 
          WHEN EXISTS (SELECT 1 FROM Outsole_VML_History WHERE QRCode = S.QRCode AND loai = 'xuat') THEN 1
          ELSE 0
        END AS isXuatWeighed

      FROM 
        Outsole_VML_WorkS AS S
      INNER JOIN 
        UnfinishedOVNO AS U ON S.OVNO = U.OVNO
      LEFT JOIN 
        Outsole_VML_Work AS W ON S.OVNO = W.OVNO
      LEFT JOIN 
        Outsole_VML_Persion AS P ON S.MUserID = P.MUserID
      LEFT JOIN 
        Outsole_VML_History AS H ON S.QRCode = H.QRCode
      
      GROUP BY 
        S.QRCode, S.OVNO, S.Package, S.MUserID, S.Qty, S.RKQty, S.MixTime,
        W.FormulaF1, W.Machine_NO, W.Memo, W.Qty, P.UserName, W.Batch
      
      ORDER BY 
        S.OVNO, S.Package
  `);

    // Trả về một mảng lớn chứa tất cả dữ liệu
    res.json(result.recordset);

  } catch (err: unknown) {
    console.error('Lỗi khi đồng bộ dữ liệu chưa cân:');

    if (err instanceof Error) {
      console.error(err.message);
    } else {
      console.error(err);
    }

    res.status(500).send({ message: 'Lỗi máy chủ nội bộ khi đồng bộ' });
  }
};

/**
 * API: GET /api/sync/persons
 * Lấy dữ liệu từ bảng Outsole_VML_Persion (danh sách người dùng)
 */
export const getPersonsData = async (req: Request, res: Response) => {
  try {
    const pool = getPool();

    const result = await pool.request().query(`
      SELECT 
        MUserID,
        UserName
      FROM Outsole_VML_Persion
      ORDER BY MUserID
    `);

    res.json(result.recordset);

  } catch (err: unknown) {
    console.error('Lỗi khi lấy dữ liệu người dùng:');

    if (err instanceof Error) {
      console.error(err.message);
    } else {
      console.error(err);
    }

    res.status(500).send({ message: 'Lỗi máy chủ nội bộ khi lấy dữ liệu người dùng' });
  }
};