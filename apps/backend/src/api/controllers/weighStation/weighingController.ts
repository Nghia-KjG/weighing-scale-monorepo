// src/api/controllers/weighingController.ts
import { Request, Response } from 'express';
import sql from 'mssql';
import { getPool } from '../../../config/db';

export const completeWeighing = async (req: Request, res: Response) => {
  console.log(`📦 [POST /api/complete] Yêu cầu từ IP: ${req.ip} | Dữ liệu nhận được:`, req.body);
  console.log('🔍 Device value:', req.body.device, 'Type:', typeof req.body.device);
  
  // 1. Lấy dữ liệu (Giữ nguyên)
  const { maCode, khoiLuongCan, thoiGianCan, loai, WUserID, device } = req.body;
  const mixTime = new Date(thoiGianCan);

  // 2. Kiểm tra dữ liệu đầu vào (Giữ nguyên)
  if (!maCode || khoiLuongCan == null || !thoiGianCan || !loai || !WUserID) {
    return res.status(401).send({ message: 'Thiếu dữ liệu (maCode, khoiLuongCan, thoiGianCan, loai, WUserID).' });
  }
  
  // Device là optional, nếu không có thì để null
  const deviceValue = device || null;

  let pool: sql.ConnectionPool | undefined;
  let transaction: sql.Transaction | undefined;
  let ovNO: string; // --- Biến để giữ OVNO ---

  try {
    pool = getPool();

    // --- KIỂM TRA TRƯỚC KHI LƯU ---
    
    // Kiểm tra xem chính mã này đã cân chưa
    const preCheckRequest = pool.request();
    const preCheckResult = await preCheckRequest
      .input('maCodeParam', sql.VarChar(20), maCode)
      .query('SELECT RKQty, MixTime, OVNO FROM Outsole_VML_WorkS WHERE QRCode = @maCodeParam');

    if (preCheckResult.recordset.length === 0) {
      return res.status(404).send({ message: 'Lỗi: Không tìm thấy Mã Code để kiểm tra.' });
    }
    
    const currentData = preCheckResult.recordset[0];
    ovNO = currentData.OVNO; // Lấy OVNO để kiểm tra tổng
    
    // KIỂM TRA: CHỈ áp dụng cho NHẬP - chỉ cho phép cân nhập 1 lần duy nhất
    // XUẤT có thể cân nhiều lần cho đến khi hết hàng
    if (loai === 'nhap') {
      const historyCheckRequest = pool.request();
      const historyCheckResult = await historyCheckRequest
        .input('maCodeParam', sql.VarChar(20), maCode)
        .query('SELECT 1 FROM Outsole_VML_History WHERE QRCode = @maCodeParam AND loai = \'nhap\'');
      
      if (historyCheckResult.recordset.length > 0) {
        return res.status(402).send({ 
          message: `Mã QRCode này đã cân nhập rồi! Vui lòng dùng chức năng "Cân lại" thay vì "Cân mới".` 
        });
      }
    }

    // KIỂM TRA: Tổng khối lượng có vượt Qty của Work không?
    /*if (loai === 'nhap') {
      // Chạy 2 query song song để lấy tổng mục tiêu và tổng đã cân
      
      // Query: Lấy tổng Qty (mục tiêu) từ Outsole_VML_Work
      const targetPromise = pool.request()
        .input('ovNOParam', sql.NVarChar, ovNO) // Giả sử OVNO là NVarChar
        .query('SELECT Qty AS TargetQty FROM Outsole_VML_Work WHERE OVNO = @ovNOParam');

      // Query: Lấy tổng RKQty (đã cân) của TẤT CẢ mã code thuộc OVNO này
      const sumPromise = pool.request()
        .input('ovNOParam', sql.NVarChar, ovNO)
        .query('SELECT SUM(RKQty) AS TotalWeighed FROM Outsole_VML_WorkS WHERE OVNO = @ovNOParam AND RKQty IS NOT NULL');
      
      const [targetResult, sumResult] = await Promise.all([targetPromise, sumPromise]);
      const targetQty = targetResult.recordset[0]?.TargetQty;
      const totalWeighed = sumResult.recordset[0]?.TotalWeighed || 0.0;

      if (targetQty == null) {
        return res.status(405).send({ message: `Lỗi: Không tìm thấy tổng khối lượng (Qty) cho OVNO ${ovNO}.` });
      }

      const newTotal = totalWeighed + khoiLuongCan;
      if (newTotal > (targetQty + 0.001)) {
        return res.status(403).send({ 
          message: `Lỗi: Vượt quá tổng khối lượng cho phép! (Tổng đã cân: ${totalWeighed}kg / Lần này: ${khoiLuongCan}kg / Cho phép: ${targetQty}kg)` 
        });
      }
    }*/

    // KIỂM TRA: Tổng khối lượng cân xuất có vượt quá khối lượng đã nhập của chính mã này
    if (loai === 'xuat') {
      // Kiểm tra xem đã có bản ghi 'nhap' cho chính maCode này trong History chưa
      const nhapCheck = await pool.request()
        .input('maCodeParam', sql.VarChar(20), maCode)
        .query(`
          SELECT 1 AS NhapExists
          FROM Outsole_VML_History
          WHERE QRCode = @maCodeParam AND loai = 'nhap'
        `);

      if (nhapCheck.recordset.length === 0) {
        // Nếu không tìm thấy (length = 0), nghĩa là CHƯA CÂN NHẬP
        return res.status(406).send({ 
          message: `Lỗi: Mã QRCode này chưa được cân nhập!` 
        });
      }
      
      // Lấy khối lượng Nhập và tổng Xuất HIỆN TẠI của chính mã này
      const balanceCheck = await pool.request()
        .input('maCodeParam', sql.VarChar(20), maCode)
        .query(`
          SELECT 
            ISNULL(SUM(CASE WHEN loai = 'nhap' THEN KhoiLuongCan ELSE 0 END), 0) AS TotalNhap,
            ISNULL(SUM(CASE WHEN loai = 'xuat' THEN KhoiLuongCan ELSE 0 END), 0) AS TotalXuat
          FROM Outsole_VML_History
          WHERE QRCode = @maCodeParam
        `);
      
      const { TotalNhap, TotalXuat } = balanceCheck.recordset[0];
      const currentWeighAmount = parseFloat(khoiLuongCan); 
      const totalAfterWeighing = TotalXuat + currentWeighAmount;
      const remainingStock = TotalNhap - TotalXuat;

      if (totalAfterWeighing > (TotalNhap + 0.001)) {
        return res.status(406).send({ 
          message: `Lỗi: Khối lượng xuất vượt quá khối lượng đã nhập của mã này! (Còn lại: ${remainingStock.toFixed(3)}kg / Muốn xuất: ${khoiLuongCan}kg / Đã nhập: ${TotalNhap}kg)` 
        });
      }
    }
    // --- KẾT THÚC KIỂM TRA ---

    // 4. Bắt đầu Transaction (Giữ nguyên)
    transaction = pool.transaction();
    await transaction.begin();

    // 5. CẬP NHẬT Outsole_VML_WorkS (Giữ nguyên)
    const updateWorkSRequest = new sql.Request(transaction);
    await updateWorkSRequest
      .input('maCodeParam', sql.VarChar(20), maCode)
      .input('mixTimeParam', sql.SmallDateTime, mixTime)
      .input('khoiLuongCanParam', sql.Money, khoiLuongCan)
      .query(`
        UPDATE Outsole_VML_WorkS 
        SET MixTime = @mixTimeParam, RKQty = @khoiLuongCanParam
        WHERE QRCode = @maCodeParam
      `);
    
    // Kiểm tra CurrentQty hiện tại trong WorkS (để log debug)
    const checkWorkSRequest = new sql.Request(transaction);
    const checkWorkSResult = await checkWorkSRequest
      .input('maCodeParam', sql.VarChar(20), maCode)
      .query('SELECT CurrentQty FROM Outsole_VML_WorkS WHERE QRCode = @maCodeParam');
    
    const currentWorkSQty = checkWorkSResult.recordset[0]?.CurrentQty || 0;
    console.log(`📊 [${loai.toUpperCase()}] Mã ${maCode}: WorkS.CurrentQty hiện tại = ${currentWorkSQty}kg, Muốn ${loai} = ${khoiLuongCan}kg`);

    // 6. INSERT vào Outsole_VML_History (KHÔNG set CurrentQty, để trigger tự động tính)
    const insertHistoryRequest = new sql.Request(transaction);
    await insertHistoryRequest
      .input('maCodeParam', sql.VarChar(20), maCode)
      .input('timeWeighParam', sql.SmallDateTime, mixTime)
      .input('khoiLuongCanParam', sql.Money, khoiLuongCan)
      .input('loaiParam', sql.VarChar(10), loai)
      .input('wUserIDParam', sql.VarChar(50), WUserID)
      .input('deviceParam', sql.NVarChar(100), deviceValue)
      .query(`
        INSERT INTO Outsole_VML_History (QRCode, TimeWeigh, KhoiLuongCan, loai, WUserID, Device)
        VALUES (@maCodeParam, @timeWeighParam, @khoiLuongCanParam, @loaiParam, @wUserIDParam, @deviceParam)
      `);
    
    console.log(`✅ [${loai.toUpperCase()}] Đã INSERT vào History. Trigger sẽ tự động cập nhật CurrentQty.`);

    // 7. Commit (Giữ nguyên)
    await transaction.commit();
    
    // --- 8. LẤY DỮ LIỆU TÓM TẮT MỚI (SAU KHI COMMIT) ---
    // (Đây là code copy từ scanController)
    const workPromise = pool.request()
      .input('ovNOParam', sql.NVarChar, ovNO)
      .query('SELECT Qty AS TotalTargetQty, Memo FROM Outsole_VML_Work WHERE OVNO = @ovNOParam');
    
    const historySummaryPromise = pool.request()
      .input('ovNOParam', sql.NVarChar, ovNO)
      .query(`
        SELECT 
          ISNULL(SUM(CASE WHEN H.loai = 'nhap' THEN H.KhoiLuongCan ELSE 0 END), 0) AS TotalNhapWeighed,
          ISNULL(SUM(CASE WHEN H.loai = 'xuat' THEN H.KhoiLuongCan ELSE 0 END), 0) AS TotalXuatWeighed
        FROM Outsole_VML_History AS H
        INNER JOIN Outsole_VML_WorkS AS S ON H.QRCode = S.QRCode
        WHERE S.OVNO = @ovNOParam
      `);
      
    const [workResult, historySummaryResult] = await Promise.all([workPromise, historySummaryPromise]);

    const workRecord = workResult.recordset[0] || {};
    const historySummary = historySummaryResult.recordset[0] || {};
    
    // 9. Gửi dữ liệu tóm tắt MỚI về
    res.status(201).send({ 
      message: 'Đã lưu kết quả cân thành công.',
      // Gửi kèm 'summaryData'
      summaryData: {
        totalTargetQty: workRecord.TotalTargetQty || 0.0,
        totalNhapWeighed: historySummary.TotalNhapWeighed || 0.0,
        totalXuatWeighed: historySummary.TotalXuatWeighed || 0.0,
        memo: workRecord.Memo,
      }
    });
    // --- KẾT THÚC SỬA ---

  } catch (err: unknown) {
    console.error('Lỗi Transaction khi hoàn tất cân:');

    if (err instanceof Error) {
      console.error('❌ Error Message:', err.message);
      console.error('❌ Error Name:', err.name);
    } else {
      console.error(err);
    }

    // Rollback nếu lỗi
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rollbackErr) {
        console.error('Lỗi khi rollback:', rollbackErr);
      }
    }

    // Trả về message lỗi chi tiết hơn cho client
    const errorMessage = err instanceof Error ? err.message : 'Lỗi server khi lưu dữ liệu cân.';
    res.status(500).send({ message: errorMessage });
  }
};

export const reweighNhap = async (req: Request, res: Response) => {
  console.log(`🔄 [POST /api/reweigh] Yêu cầu cân lại từ IP: ${req.ip} | Dữ liệu:`, req.body);
  console.log('🔍 Device value:', req.body.device, 'Type:', typeof req.body.device);
  
  const { maCode, khoiLuongCan, thoiGianCan, loai, WUserID, device } = req.body;
  const mixTime = new Date(thoiGianCan);

  // Kiểm tra dữ liệu đầu vào
  if (!maCode || khoiLuongCan == null || !thoiGianCan || !loai || !WUserID) {
    return res.status(400).send({ message: 'Thiếu dữ liệu (maCode, khoiLuongCan, thoiGianCan, loai, WUserID).' });
  }

  // Kiểm tra loại cân lại hợp lệ
  if (loai !== 'nhapLai' && loai !== 'xuatLai') {
    return res.status(400).send({ message: 'Loại cân lại không hợp lệ. Chỉ chấp nhận "nhapLai" hoặc "xuatLai".' });
  }

  // Xác định loại gốc cần tìm và loại mới sẽ insert
  const loaiGoc = loai === 'nhapLai' ? 'nhap' : 'xuat';
  const loaiMoi = loai === 'nhapLai' ? 'nhap' : 'xuat';
  
  const deviceValue = device || null;

  let pool: sql.ConnectionPool | undefined;
  let transaction: sql.Transaction | undefined;
  let ovNO: string;

  try {
    pool = getPool();

    // Kiểm tra xem mã code có tồn tại không
    const preCheckRequest = pool.request();
    const preCheckResult = await preCheckRequest
      .input('maCodeParam', sql.VarChar(20), maCode)
      .query('SELECT RKQty, MixTime, OVNO FROM Outsole_VML_WorkS WHERE QRCode = @maCodeParam');

    if (preCheckResult.recordset.length === 0) {
      return res.status(404).send({ message: 'Lỗi: Không tìm thấy Mã Code.' });
    }
    
    const currentData = preCheckResult.recordset[0];
    ovNO = currentData.OVNO;

    // Kiểm tra xem đã có bản ghi với loại tương ứng trong History chưa
    const historyCheck = await pool.request()
      .input('maCodeParam', sql.VarChar(20), maCode)
      .input('loaiGocParam', sql.VarChar(10), loaiGoc)
      .query(`
        SELECT 1 AS RecordExists
        FROM Outsole_VML_History
        WHERE QRCode = @maCodeParam AND loai = @loaiGocParam
      `);

    if (historyCheck.recordset.length === 0) {
      return res.status(400).send({ message: `Mã này chưa được cân ${loaiGoc} lần nào. Vui lòng cân ${loaiGoc} trước.` });
    }

    // Bắt đầu Transaction
    transaction = pool.transaction();
    await transaction.begin();

    if (loai === 'nhapLai') {
      // === LOGIC CÂN NHẬP LẠI ===
      // Cập nhật TẤT CẢ bản ghi 'nhap' thành 'modified' và set CurrentQty = 0
      const updateHistoryRequest = new sql.Request(transaction);
      const updateResult = await updateHistoryRequest
        .input('maCodeParam', sql.VarChar(20), maCode)
        .query(`
          UPDATE Outsole_VML_History 
          SET loai = 'modified', CurrentQty = 0
          WHERE QRCode = @maCodeParam AND loai = 'nhap'
        `);
      
      console.log(`✏️ [NHẬP LẠI] Đã cập nhật ${updateResult.rowsAffected[0]} bản ghi 'nhap' thành 'modified' và set CurrentQty = 0`);

      // Reset WorkS.CurrentQty = 0 trước để trigger tính đúng
      const updateWorkSRequest = new sql.Request(transaction);
      await updateWorkSRequest
        .input('maCodeParam', sql.VarChar(20), maCode)
        .input('mixTimeParam', sql.SmallDateTime, mixTime)
        .input('khoiLuongCanParam', sql.Money, khoiLuongCan)
        .query(`
          UPDATE Outsole_VML_WorkS 
          SET MixTime = @mixTimeParam, RKQty = @khoiLuongCanParam, CurrentQty = 0
          WHERE QRCode = @maCodeParam
        `);
      
      console.log(`🔄 [NHẬP LẠI] Đã reset WorkS.CurrentQty = 0 cho mã ${maCode}`);
      console.log(`📊 [NHẬP LẠI] Trigger sẽ tự động tính CurrentQty = 0 + ${khoiLuongCan} = ${khoiLuongCan}`);
      
    } else if (loai === 'xuatLai') {
      // === LOGIC CÂN XUẤT LẠI ===
      // Tìm bản ghi 'xuat' GẦN NHẤT
      const findLastXuatRequest = new sql.Request(transaction);
      const lastXuatResult = await findLastXuatRequest
        .input('maCodeParam', sql.VarChar(20), maCode)
        .query(`
          SELECT TOP 1 HistoryID, KhoiLuongCan 
          FROM Outsole_VML_History 
          WHERE QRCode = @maCodeParam AND loai = 'xuat'
          ORDER BY HistoryID DESC
        `);
      
      if (lastXuatResult.recordset.length === 0) {
        await transaction.rollback();
        return res.status(400).send({ message: 'Không tìm thấy bản ghi xuất để cân lại.' });
      }
      
      const lastXuat = lastXuatResult.recordset[0];
      const oldKhoiLuongXuat = parseFloat(lastXuat.KhoiLuongCan);
      
      console.log(`🔍 [XUẤT LẠI] Tìm thấy bản ghi xuất gần nhất: HistoryID=${lastXuat.HistoryID}, KhoiLuong=${oldKhoiLuongXuat}kg`);

      // Update bản ghi xuất gần nhất thành 'xModified' và set CurrentQty = 0
      const updateXuatRequest = new sql.Request(transaction);
      await updateXuatRequest
        .input('historyIDParam', sql.Int, lastXuat.HistoryID)
        .query(`
          UPDATE Outsole_VML_History 
          SET loai = 'xModified', CurrentQty = 0
          WHERE HistoryID = @historyIDParam
        `);
      
      console.log(`✏️ [XUẤT LẠI] Đã update bản ghi xuất thành 'xModified' và set CurrentQty = 0`);

      // Cộng lại số lượng xuất cũ vào WorkS.CurrentQty (khôi phục trạng thái trước khi xuất)
      // Sau đó trigger sẽ tự động trừ số lượng xuất mới
      const updateWorkSRequest = new sql.Request(transaction);
      await updateWorkSRequest
        .input('maCodeParam', sql.VarChar(20), maCode)
        .input('mixTimeParam', sql.SmallDateTime, mixTime)
        .input('khoiLuongCanParam', sql.Money, khoiLuongCan)
        .input('oldKhoiLuongXuatParam', sql.Money, oldKhoiLuongXuat)
        .query(`
          UPDATE Outsole_VML_WorkS 
          SET MixTime = @mixTimeParam, 
              RKQty = @khoiLuongCanParam,
              CurrentQty = CurrentQty + @oldKhoiLuongXuatParam
          WHERE QRCode = @maCodeParam
        `);
      
      console.log(`🔄 [XUẤT LẠI] Đã cộng lại ${oldKhoiLuongXuat}kg vào WorkS.CurrentQty`);
      console.log(`📊 [XUẤT LẠI] Trigger sẽ tự động trừ ${khoiLuongCan}kg từ WorkS.CurrentQty`);
    }

    // INSERT bản ghi mới vào History (CurrentQty sẽ được trigger tự động tính)
    // Trigger sẽ: WorkS.CurrentQty (0) + KhoiLuongCan → CurrentQty chính xác
    const insertHistoryRequest = new sql.Request(transaction);
    await insertHistoryRequest
      .input('maCodeParam', sql.VarChar(20), maCode)
      .input('timeWeighParam', sql.SmallDateTime, mixTime)
      .input('khoiLuongCanParam', sql.Money, khoiLuongCan)
      .input('loaiMoiParam', sql.VarChar(10), loaiMoi)
      .input('wUserIDParam', sql.VarChar(50), WUserID)
      .input('deviceParam', sql.NVarChar(100), deviceValue)
      .query(`
        INSERT INTO Outsole_VML_History (QRCode, TimeWeigh, KhoiLuongCan, loai, WUserID, Device)
        VALUES (@maCodeParam, @timeWeighParam, @khoiLuongCanParam, @loaiMoiParam, @wUserIDParam, @deviceParam)
      `);
    
    console.log(`✅ [REWEIGH] Đã INSERT bản ghi mới. Trigger đã tự động cập nhật CurrentQty.`);

    // Commit
    await transaction.commit();
    
    // Lấy dữ liệu tóm tắt mới
    const workPromise = pool.request()
      .input('ovNOParam', sql.NVarChar, ovNO)
      .query('SELECT Qty AS TotalTargetQty, Memo FROM Outsole_VML_Work WHERE OVNO = @ovNOParam');
    
    const historySummaryPromise = pool.request()
      .input('ovNOParam', sql.NVarChar, ovNO)
      .query(`
        SELECT 
          ISNULL(SUM(CASE WHEN H.loai = 'nhap' THEN H.KhoiLuongCan ELSE 0 END), 0) AS TotalNhapWeighed,
          ISNULL(SUM(CASE WHEN H.loai = 'xuat' THEN H.KhoiLuongCan ELSE 0 END), 0) AS TotalXuatWeighed
        FROM Outsole_VML_History AS H
        INNER JOIN Outsole_VML_WorkS AS S ON H.QRCode = S.QRCode
        WHERE S.OVNO = @ovNOParam
      `);
      
    const [workResult, historySummaryResult] = await Promise.all([workPromise, historySummaryPromise]);

    const workRecord = workResult.recordset[0] || {};
    const historySummary = historySummaryResult.recordset[0] || {};
    
    res.status(200).send({ 
      message: 'Đã cân lại thành công.',
      summaryData: {
        totalTargetQty: workRecord.TotalTargetQty || 0.0,
        totalNhapWeighed: historySummary.TotalNhapWeighed || 0.0,
        totalXuatWeighed: historySummary.TotalXuatWeighed || 0.0,
        memo: workRecord.Memo,
      }
    });

  } catch (err: unknown) {
    console.error('Lỗi khi cân lại:');

    if (err instanceof Error) {
      console.error(err.message);
    } else {
      console.error(err);
    }

    if (transaction) {
      await transaction.rollback();
    }

    res.status(500).send({ message: 'Lỗi server khi cân lại.' });
  }
};