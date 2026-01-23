// src/server.ts
import 'dotenv/config';
import express, { } from 'express';
import cors from 'cors';
import morgan, { } from 'morgan';
import { connectDb, closeDb } from './config/db';
// Import các routes
import scanRoutes from './api/routes/weighStation/scanRoutes';
import weighingRoutes from './api/routes/weighStation/weighingRoutes';
import historyRoutes from './api/routes/weighStation/historyRoutes';
import authRoutes from './api/routes/weighStation/authRoutes';
import syncRoutes from './api/routes/weighStation/syncRoutes';
import pingRoutes from './api/routes/weighStation/pingRoutes';
import dashboardRoutes from './api/routes/weighStation/dashboardRoutes';
import unweighedRoutes from './api/routes/weighStation/unweighedRoutes';
import deviceRoutes from './api/routes/weighStation/deviceRoutes';
import appUpdateRoutes from './api/routes/weighStation/appUpdateRoutes';


async function startServer() {
  // Khởi tạo kết nối DB trước khi khởi động server
  await connectDb();

  // Hàm helper để thêm số 0 (vd: 7 -> "07")
  const pad = (num: number): string => (num < 10 ? '0' + num : num.toString());
  // Hàm helper để tạo chuỗi ngày giờ theo giờ ĐỊA PHƯƠNG
  const getLocalClfDate = (): string => {
    const d = new Date();
    const day = pad(d.getDate());
    const month = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'][d.getMonth()];
    const year = d.getFullYear();
    const hour = pad(d.getHours());
    const minute = pad(d.getMinutes());
    const second = pad(d.getSeconds());

    // Tính toán Timezone offset (ví dụ: +0700)
    const offset = -d.getTimezoneOffset(); // Lấy offset (phút) và đảo dấu
    const offsetSign = offset >= 0 ? '+' : '-';
    const offsetHours = pad(Math.floor(Math.abs(offset) / 60));
    const offsetMinutes = pad(Math.abs(offset) % 60);
    const timezone = `${offsetSign}${offsetHours}${offsetMinutes}`;

    // Format: [03/Nov/2025:15:54:26 +0700]
    return `[${day}/${month}/${year}--${hour}:${minute}:${second} ${timezone}]`;
  };

  const app = express();
  morgan.token('local-date', getLocalClfDate);
  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(morgan(':remote-addr - :local-date ":method :status :url - :response-time ms'));

  // API Routes
  app.use('/api', scanRoutes); // Gắn route api scan
  app.use('/api', weighingRoutes); // Gắn route api weighing
  app.use('/api', historyRoutes); // Gắn route api history 
  app.use('/api/auth', authRoutes);
  app.use('/api', syncRoutes);
  app.use('/api', pingRoutes);
  app.use('/api', dashboardRoutes);
  app.use('/api', unweighedRoutes);
  app.use('/api', deviceRoutes);
  app.use('/api', appUpdateRoutes);

  // Basic root route (optional)
  app.get('/', (req, res) => {
    res.send('Weighing Station API is running!');
  });

  // 404 Not Found
  app.use((req, res) => {
    res.status(404).send({ message: "Endpoint not found" });
  });

  // Start Listening
  const PORT = Number(process.env.PORT);
  const server = app.listen(PORT, '0.0.0.0', () => { // <-- THÊM '0.0.0.0'
    console.log(`🚀 Server TS running at http://localhost:${PORT}`);
    // Bạn cũng có thể thêm IP LAN vào đây để tiện theo dõi:
    console.log(`🚀 Và trên mạng LAN tại http://192.168.30.175:${PORT}`);
  });

  // Tắt lắng nghe và đóng kết nối DB khi ứng dụng tắt
  process.on('SIGTERM', async () => {
    console.log('SIGTERM signal received: closing HTTP server and DB connection');
    server.close(async () => {
      await closeDb();
      console.log('HTTP server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', async () => { // Handle Ctrl+C
    console.log('SIGINT signal received: closing HTTP server and DB connection');
    server.close(async () => {
      await closeDb();
      console.log('HTTP server closed');
      process.exit(0);
    });
  });

}

startServer().catch(err => {
  console.error("Failed to start server:", err);
});