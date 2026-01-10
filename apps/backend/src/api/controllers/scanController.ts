// src/api/controllers/scanController.ts
import { Request, Response } from 'express';
import sql from 'mssql';
import { getPool } from '../../config/db';

export const getScanData = async (req: Request, res: Response) => {
  const maCode = req.params.maCode;

  if (!maCode) {
    return res.status(400).send({ message: 'Missing maCode parameter' });
  }

  try {
    const pool = getPool();

    // Query WorkS (Lấy thông tin cơ bản)
    const workSResult = await pool.request()
      .input('maCodeParam', sql.VarChar(20), maCode)
      .query('SELECT OVNO, Package, MUserID, Qty AS QtyS FROM Outsole_VML_WorkS WHERE QRCode = @maCodeParam');

    if (workSResult.recordset.length === 0) {
      return res.status(404).send({ message: `Không tìm thấy mã "${maCode}".` });
    }
    const workSRecord = workSResult.recordset[0];
    const { OVNO: ovNO, Package: packageNum, MUserID: mUserID, QtyS: qtys } = workSRecord;

    // --- BẮT ĐẦU THÊM LOGIC TỔNG HỢP ---

    // Query Work (Lấy thông tin chung + TỔNG QTY MỤC TIÊU)
    const workPromise = pool.request()
      .input('ovNOParam', sql.VarChar(15), ovNO) // Giả sử OVNO là NVarChar
      .query('SELECT FormulaF1, Machine_NO, Memo, Qty AS TotalTargetQty, Batch FROM Outsole_VML_Work WHERE OVNO = @ovNOParam');

    // Query Persion (Lấy người thao tác)
    const persionalPromise = pool.request()
      .input('mUserIDParam', sql.VarChar(20), mUserID)
      .query('SELECT UserName FROM Outsole_VML_Persion WHERE MUserID = @mUserIDParam');

    // Query History (TÍNH TỔNG NHẬP/XUẤT cho OVNO này)
    const historySummaryPromise = pool.request()
      .input('ovNOParam', sql.NVarChar, ovNO)
      .query(`
        SELECT 
          ISNULL(SUM(CASE WHEN H.loai = 'nhap' THEN H.KhoiLuongCan ELSE 0 END), 0) AS TotalNhapWeighed,
          ISNULL(SUM(CASE WHEN H.loai = 'xuat' THEN H.KhoiLuongCan ELSE 0 END), 0) AS TotalXuatWeighed
        FROM 
          Outsole_VML_History AS H
        INNER JOIN 
          Outsole_VML_WorkS AS S ON H.QRCode = S.QRCode
        WHERE 
          S.OVNO = @ovNOParam
      `);

    // Query tính số mẻ đã cân
    const packageCountPromise = pool.request()
      .input('ovNOParam', sql.NVarChar, ovNO)
      .query(`
        -- Đếm Y (Tổng số package)
        DECLARE @TotalPackages INT = (
          SELECT COUNT(*) 
          FROM Outsole_VML_WorkS 
          WHERE OVNO = @ovNOParam
        );

        -- Đếm X (Tổng số package đã CÂN NHẬP)
        DECLARE @WeighedNhapPackages INT = (
          SELECT COUNT(DISTINCT S.QRCode) 
          FROM Outsole_VML_WorkS AS S
          INNER JOIN Outsole_VML_History AS H ON S.QRCode = H.QRCode
          WHERE S.OVNO = @ovNOParam AND H.loai = 'nhap'
        );

        SELECT @TotalPackages AS Y_TotalPackages, @WeighedNhapPackages AS X_WeighedNhap;
      `);
      
    // THÊM QUERY MỚI: Kiểm tra trạng thái cân của CHÍNH MÃ NÀY và lấy trọng lượng
    const historyCheckPromise = pool.request()
      .input('maCodeParam', sql.VarChar(20), maCode)
      .query(`
        SELECT 
          ISNULL(SUM(CASE WHEN loai = 'nhap' THEN KhoiLuongCan ELSE 0 END), 0) AS weighedNhapAmount,
          ISNULL(SUM(CASE WHEN loai = 'xuat' THEN KhoiLuongCan ELSE 0 END), 0) AS weighedXuatAmount
        FROM Outsole_VML_History 
        WHERE QRCode = @maCodeParam
      `);

    // Chờ cả 5 query song song
    const [workResult, persionalResult, historySummaryResult, packageCountResult, historyCheckResult] = await Promise.all([
      workPromise, 
      persionalPromise, 
      historySummaryPromise,
      packageCountPromise,
      historyCheckPromise,
    ]);

    // Xử lý Work Result
    const workRecord = workResult.recordset[0] || {};
    const tenPhoiKeo = workRecord.FormulaF1 || 'Không rõ';
    const soMay = workRecord.Machine_NO?.toString() || 'N/A';
    const memo = workRecord.Memo;
    const totalTargetQty = workRecord.TotalTargetQty || 0.0; // Lấy tổng Qty từ Work
    const soLo = workRecord.Batch || packageNum; // Lấy Batch từ Work, fallback to Package

    // Xử lý Persion Result
    const persionalRecord = persionalResult.recordset[0] || {};
    const nguoiThaoTac = persionalRecord.UserName || 'Không rõ';
    
    // Xử lý History Summary Result
    const historySummary = historySummaryResult.recordset[0] || {};
    const totalNhapWeighed = historySummary.TotalNhapWeighed || 0.0;
    const totalXuatWeighed = historySummary.TotalXuatWeighed || 0.0;

    // Xử lý package Count Result
    const packageCount = packageCountResult.recordset[0] || {};
    const x_WeighedNhap = packageCount.X_WeighedNhap || 0;
    const y_TotalPackages = packageCount.Y_TotalPackages || 0;

    // Xử lý History Check Result (Lấy trọng lượng đã cân của chính mã này)
    const historyCheckRecord = historyCheckResult.recordset[0] || {};
    const weighedNhapAmount = historyCheckRecord.weighedNhapAmount || 0;
    const weighedXuatAmount = historyCheckRecord.weighedXuatAmount || 0;
    
    // Kiểm tra trạng thái cân
    const isNhapWeighed = weighedNhapAmount > 0;
    const isXuatWeighed = weighedXuatAmount > 0;

    // Combine results
    const responseData = {
      // Dữ liệu của mã code
      maCode: maCode, ovNO: ovNO, package: packageNum, mUserID: mUserID,
      qtys: qtys, // KL Mẻ/Tồn (từ WorkS)
      tenPhoiKeo: tenPhoiKeo,
      soMay: soMay,
      nguoiThaoTac: nguoiThaoTac,
      soLo: soLo,
      memo: memo,
      
      // Dữ liệu TỔNG HỢP cho OVNO
      totalTargetQty: totalTargetQty, // Tổng Qty mục tiêu (từ Work)
      totalNhapWeighed: totalNhapWeighed, // Tổng Nhập đã cân (từ History)
      totalXuatWeighed: totalXuatWeighed, // Tổng Xuất đã cân (từ History)
      x_WeighedNhap: x_WeighedNhap,
      y_TotalPackages: y_TotalPackages,
      isNhapWeighed: isNhapWeighed,
      isXuatWeighed: isXuatWeighed,
      
      // Trọng lượng đã cân của chính mã này
      weighedNhapAmount: weighedNhapAmount,
      weighedXuatAmount: weighedXuatAmount,
    };

    res.json(responseData);

  } catch (err: unknown) {
    console.error(`Lỗi khi xử lý scan ${maCode}:`);

    if (err instanceof Error) {
      console.error(err.message);
    } else {
      console.error(err);
    }

    res.status(500).send({ message: 'Lỗi máy chủ nội bộ khi xử lý scan' });
  }
};