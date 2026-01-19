import { Request, Response } from 'express';
import sql from 'mssql';
import { getPool } from '../../../config/db';

export const login = async (req: Request, res: Response) => {
  // 1. Lấy mUserID (Số thẻ) từ body
  const { mUserID } = req.body;

  if (!mUserID) {
    return res.status(400).send({ message: 'Vui lòng nhập Số thẻ (mUserID).' });
  }

  try {
    const pool = getPool();

    // 2. Kiểm tra trong bảng Busers trước
    const busersResult = await pool.request()
      .input('userIDParam', sql.VarChar(20), mUserID)
      .query('SELECT UserID, UserName FROM Busers WHERE UserID = @userIDParam');

    if (busersResult.recordset.length > 0) {
      // Tìm thấy trong Busers
      const user = busersResult.recordset[0];
      
      return res.status(200).json({
        message: `Đăng nhập thành công! Chào ${user.UserName}`,
        userData: {
          UserID: user.UserID,
          UserName: user.UserName
        },
      });
    }

    // 3. Nếu không tìm thấy trong Busers, kiểm tra trong bảng Outsole_VML_Persion
    const persionResult = await pool.request()
      .input('mUserIDParam', sql.VarChar(20), mUserID)
      .query('SELECT MUserID, UserName FROM Outsole_VML_Persion WHERE MUserID = @mUserIDParam');

    if (persionResult.recordset.length === 0) {
      // Không tìm thấy ở cả 2 bảng
      return res.status(404).send({ message: 'Số thẻ không tồn tại hoặc không hợp lệ.' });
    }

    // 4. Tìm thấy trong Persion
    const user = persionResult.recordset[0];
    res.status(200).json({
      message: `Đăng nhập thành công! Chào ${user.UserName}`,
      userData: {
        UserID: user.MUserID,
        UserName: user.UserName
      },
    });

  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error(`Lỗi khi đăng nhập ${mUserID}:`, err.message);
    } else {
      console.error(`Lỗi không xác định khi đăng nhập ${mUserID}:`, err);
    }
    res.status(500).send({ message: 'Lỗi máy chủ nội bộ khi đăng nhập' });
  }
};

export const checkRole = async (req: Request, res: Response) => {
  const { userID } = req.body;

  if (!userID) {
    return res.status(400).send({ message: 'Vui lòng cung cấp UserID.' });
  }

  try {
    const pool = getPool();

    // Kiểm tra trong bảng Busers
    const busersResult = await pool.request()
      .input('userIDParam', sql.VarChar(20), userID)
      .query('SELECT UserID, IsIT FROM Busers WHERE UserID = @userIDParam');

    if (busersResult.recordset.length > 0) {
      // Tìm thấy trong Busers
      const user = busersResult.recordset[0];
      // Xử lý cả trường hợp IsIT là bit (true/false) hoặc số (1/0)
      const role = (user.IsIT === 1 || user.IsIT === true) ? 'admin' : 'user';
      
      return res.status(200).json({
        userID: user.UserID,
        role: role
      });
    }

    // Nếu không tìm thấy trong Busers, role mặc định là user
    res.status(200).json({
      userID: userID,
      role: 'user'
    });

  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error(`Lỗi khi kiểm tra role ${userID}:`, err.message);
    } else {
      console.error(`Lỗi không xác định khi kiểm tra role ${userID}:`, err);
    }
    res.status(500).send({ message: 'Lỗi máy chủ nội bộ khi kiểm tra role' });
  }
};