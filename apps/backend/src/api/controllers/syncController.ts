// src/api/controllers/syncController.ts
import { Request, Response } from 'express';
import { getPool } from '../../config/db';

export const getUnweighedData = async (req: Request, res: Response) => {
  try {
    const pool = getPool();

    // Query này lấy TẤT CẢ các mã CHƯA CÂN (RKQty IS NULL)
    // và JOIN với các bảng khác để lấy tất cả thông tin
    const result = await pool.request().query(`
      -- 1. Lấy TẤT CẢ các mã code...
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

        -- Thêm cột loại, nếu null thì 'chua'
        COALESCE(H.loai, 'chua') AS loai

      FROM 
          Outsole_VML_WorkS AS S
      LEFT JOIN 
          Outsole_VML_Work AS W ON S.OVNO = W.OVNO
      LEFT JOIN 
          Outsole_VML_Persion AS P ON S.MUserID = P.MUserID
      LEFT JOIN 
          Outsole_VML_History AS H ON S.QRCode = H.QRCode

      -- Loại bỏ các mã đã có trong History với loai = 'xuat'
      WHERE NOT EXISTS (
          SELECT 1
          FROM Outsole_VML_History AS H2
          WHERE H2.QRCode = S.QRCode 
            AND H2.loai = 'xuat'
    );
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