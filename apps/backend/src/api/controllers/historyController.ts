/* eslint-disable @typescript-eslint/no-explicit-any */
// src/api/controllers/historyController.ts
import { Request, Response } from 'express';
import { getPool } from '../../config/db';
import sql from 'mssql';

export const getHistory = async (req: Request, res: Response) => {
  try {
    // 1. Lấy 'days' từ query, mặc định là '7'
    const { days = '7' } = req.query;

    const pool = getPool();
    const request = pool.request(); // Tạo request

    // --- 2. LOGIC LỌC NGÀY ---
    let dateFilterSubQuery = ""; // Mặc định là không lọc (lấy 'all')
    if (days !== 'all') {
      const numDays = parseInt(days as string, 10);
   
      if (!isNaN(numDays) && numDays > 0) {
        // Tạo một câu subquery để lọc các OVNO có chứa maCode trong khoảng thời gian
        dateFilterSubQuery = `
        WHERE S.OVNO IN (
          SELECT DISTINCT S_sub.OVNO
          FROM Outsole_VML_History AS H_sub
          INNER JOIN Outsole_VML_WorkS AS S_sub ON H_sub.QRCode = S_sub.QRCode
          WHERE H_sub.TimeWeigh >= DATEADD(day, -@daysParam, GETDATE())
        )
        `;
        // Thêm tham số (parameter)
        request.input('daysParam', sql.Int, numDays);
      }
    }

    // 3. Lấy TẤT CẢ bản ghi lịch sử (với WHERE động)
    const historyQuery = `
      SELECT 
        H.QRCode AS maCode, CONVERT(VARCHAR, H.TimeWeigh, 120) AS mixTime, H.KhoiLuongCan AS realQty, H.loai, H.Device AS device,
        S.OVNO AS ovNO, S.Package AS package, S.MUserID, S.Qty AS qtys,
        W.FormulaF1 AS tenPhoiKeo, W.Machine_NO AS soMay, W.Qty AS totalTargetQty, W.Memo,
        P.UserName AS nguoiThaoTac,
        S.Package AS soLo 
      FROM 
        Outsole_VML_History AS H
      LEFT JOIN Outsole_VML_WorkS AS S ON H.QRCode = S.QRCode
      LEFT JOIN Outsole_VML_Work AS W ON S.OVNO = W.OVNO
      LEFT JOIN Outsole_VML_Persion AS P ON S.MUserID = P.MUserID
      WHERE H.loai != 'modified'
     ${dateFilterSubQuery.replace('WHERE', 'AND')} 
      ORDER BY 
        S.OVNO, H.TimeWeigh DESC 
    `;
    
    // Thực thi query
    const historyResult = await request.query(historyQuery);
    const records = historyResult.recordset;

    // --- LẤY DỮ LIỆU ĐẾM PACKAGE (Tất cả OVNO) ---
    // (Query này chạy 1 lần lấy hết)
    const packageCountResult = await pool.request().query(`
      SELECT 
        OVNO, 
        COUNT(*) AS Y_TotalPackages
      FROM Outsole_VML_WorkS
      GROUP BY OVNO
    `);
    // Tạo Map để tra cứu Y (Tổng package)
    const yTotalMap = new Map<string, number>();
    for (const row of packageCountResult.recordset) {
      yTotalMap.set(row.OVNO, row.Y_TotalPackages);
    }

    // Xử lý và Nhóm dữ liệu trong Node.js
    const groupedData: any = {};

    for (const record of records) {
      const ovNO = record.ovNO;

      // Nếu chưa có nhóm này, tạo nhóm
      if (!groupedData[ovNO]) {
        const y_Total = yTotalMap.get(ovNO) || 0;
        groupedData[ovNO] = {
          ovNO: ovNO,
          memo: record.Memo,
          totalTargetQty: record.totalTargetQty,
          totalNhap: 0.0,
          totalXuat: 0.0,
          y_TotalPackages: y_Total,
          weighedNhapPackages: new Set<string>(),
          records: [], // Danh sách chứa các bản ghi con
        };
      }

      // Format soLo thành "Package/TotalPackages"
      //const y_Total = groupedData[ovNO].y_TotalPackages;
      //record.soLo = `${record.package}/${y_Total}`;

      // Thêm bản ghi vào nhóm
      groupedData[ovNO].records.push(record);

      // Tính toán tổng cho hàng tóm tắt
      if (record.loai === 'nhap' && record.realQty) {
        groupedData[ovNO].totalNhap += record.realQty;
        groupedData[ovNO].weighedNhapPackages.add(record.maCode);
      } else if (record.loai === 'xuat' && record.realQty) {
        groupedData[ovNO].totalXuat += record.realQty;
      }
    }

    // Chuyển đổi từ Object sang Array để trả về
    const responseArray = Object.values(groupedData).map((group: any) => {
      // Đếm X (số lượng maCode đã cân nhập)
      group.x_WeighedNhap = group.weighedNhapPackages.size;
      delete group.weighedNhapPackages; // Xóa Set đi
      return group;
    });

    // *** THÊM BƯỚC SẮP XẾP MỚI ***
    // Sắp xếp mảng các nhóm dựa trên thời gian cân gần nhất.
    // Vì SQL đã sắp xếp H.TimeWeigh DESC,
    // bản ghi đầu tiên (index 0) trong 'records' của mỗi nhóm chính là bản ghi gần nhất.
    responseArray.sort((a, b) => {
      // Lấy thời gian gần nhất của nhóm A (an toàn nếu mảng rỗng)
      const timeA = a.records.length > 0 
        ? new Date(a.records[0].mixTime).getTime() 
        : 0;
        
      // Lấy thời gian gần nhất của nhóm B
      const timeB = b.records.length > 0 
        ? new Date(b.records[0].mixTime).getTime() 
        : 0;

      // Sắp xếp giảm dần (thời gian mới nhất lên đầu)
      return timeB - timeA;
    });

    res.json(responseArray);

  } catch (err: unknown) {
    console.error('Lỗi khi truy vấn lịch sử (đã nhóm):');

    if (err instanceof Error) {
      console.error(err.message);
    } else {
      console.error(err);
    }

    res.status(500).send({ message: 'Lỗi máy chủ nội bộ khi lấy lịch sử' });
  }
};