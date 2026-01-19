import { Request, Response } from 'express';
import { getPool } from '../../../config/db';

/**
 * API: GET /api/sync/devices
 * Lấy dữ liệu từ bảng Outsole_VML_Devices (STT, Name, Address)
 */
export const getDevicesData = async (req: Request, res: Response) => {
    try {
        const pool = getPool();

        const result = await pool.request().query(`
      SELECT
        STT,
        Name,
        Address,
        Loai
      FROM Outsole_VML_Devices
      ORDER BY STT
    `);

        res.json(result.recordset);

    } catch (err: unknown) {
        console.error('Lỗi khi lấy dữ liệu devices:');

        if (err instanceof Error) {
            console.error(err.message);
        } else {
            console.error(err);
        }

        res.status(500).send({ message: 'Lỗi máy chủ nội bộ khi lấy dữ liệu devices' });
    }
};

/**
 * API: POST /api/devices
 * Thêm mới device
 */
export const createDevice = async (req: Request, res: Response) => {
    try {
        const { Name, Address, Loai } = req.body;

        if (!Name || !Address) {
            return res.status(400).send({ message: 'Thiếu thông tin Name hoặc Address' });
        }

        const pool = getPool();

        // STT là Identity column, không cần insert thủ công
        // Sử dụng OUTPUT Inserted.STT để lấy ID vừa tạo
        const result = await pool.request()
            .input('name', Name)
            .input('address', Address)
            .input('loai', Loai || null)
            .query(`
            INSERT INTO Outsole_VML_Devices (Name, Address, Loai)
            OUTPUT Inserted.STT
            VALUES (@name, @address, @loai)
        `);

        const newStt = result.recordset[0].STT;

        res.status(201).json({ message: 'Thêm device thành công', data: { STT: newStt, Name, Address, Loai } });
    } catch (err: unknown) {
        console.error('Lỗi khi thêm device:', err);
        res.status(500).send({ message: 'Lỗi máy chủ nội bộ khi thêm device' });
    }
};

/**
 * API: PUT /api/devices/:stt
 * Cập nhật device
 */
export const updateDevice = async (req: Request, res: Response) => {
    try {
        const { stt } = req.params;
        const { Name, Address, Loai } = req.body;

        if (!Name || !Address) {
            return res.status(400).send({ message: 'Thiếu thông tin Name hoặc Address' });
        }

        const pool = getPool();

        const result = await pool.request()
            .input('stt', stt)
            .input('name', Name)
            .input('address', Address)
            .input('loai', Loai || null)
            .query(`
            UPDATE Outsole_VML_Devices
            SET Name = @name, Address = @address, Loai = @loai
            WHERE STT = @stt
        `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).send({ message: 'Không tìm thấy device để cập nhật' });
        }

        res.json({ message: 'Cập nhật device thành công' });
    } catch (err: unknown) {
        console.error('Lỗi khi cập nhật device:', err);
        res.status(500).send({ message: 'Lỗi máy chủ nội bộ khi cập nhật device' });
    }
};

/**
 * API: DELETE /api/devices/:stt
 * Xóa device
 */
export const deleteDevice = async (req: Request, res: Response) => {
    try {
        const { stt } = req.params;

        const pool = getPool();

        const result = await pool.request()
            .input('stt', stt)
            .query(`
            DELETE FROM Outsole_VML_Devices
            WHERE STT = @stt
        `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).send({ message: 'Không tìm thấy device để xóa' });
        }

        res.json({ message: 'Xóa device thành công' });
    } catch (err: unknown) {
        console.error('Lỗi khi xóa device:', err);
        res.status(500).send({ message: 'Lỗi máy chủ nội bộ khi xóa device' });
    }
};
