const express = require("express");
const app = express();
const net = require("net");
const cors = require("cors");
const dotenv = require("dotenv");

// ⚠️ IMPORTANT: Load .env FIRST before any other code
dotenv.config({ path: "./.env" });

// Verify JWT_KEY is loaded
if (!process.env.JWT_KEY) {
  process.env.JWT_KEY = "dev_jwt_secret_change_me";
}

// middleware
app.use(express.json({ limit: "50mb" }));
// Cấu hình CORS chi tiết
const allowedOrigins = [
  'https://booking-ten-silk.vercel.app', // Domain frontend bạn đang dùng
  
  'https://booking.vercel.app',          // Domain khác (nếu có)
  'http://localhost:5173',               // Để bạn vẫn test được ở máy local
  'http://localhost:3000'
];


app.use(cors({
  origin: function (origin, callback) {
    // Cho phép Postman hoặc các ứng dụng không có origin
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Chặn bởi CORS: Origin không hợp lệ'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Xử lý preflight requests cho tất cả routes
app.options('*', cors());

// Connect to MySQL (Sequelize)
const { connectToDB } = require("./db");

// 👉 Load associations để Sequelize biết các quan hệ
require("./models/associations");

// Helper function to check if port is available
const isPortAvailable = (port) => {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", (err) => {
      if (err.code === "EADDRINUSE") {
        resolve(false);
      }
    });
    server.once("listening", () => {
      server.close();
      resolve(true);
    });
    server.listen(port);
  });
};

// Helper function to find available port
const findAvailablePort = (startPort) => {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(startPort, () => {
      server.close(() => resolve(startPort));
    });
    server.on('error', () => {
      // Port is in use, try next port
      resolve(findAvailablePort(startPort + 1));
    });
  });
};

const startServer = async () => {
  await connectToDB();

  const port = parseInt(process.env.PORT) || 5003;
  const portAvailable = await isPortAvailable(port);
  if (!portAvailable) {
    console.error(`Port ${port} is already in use. Please stop the service using that port or set a different PORT in backend/.env.`);
    process.exit(1);
  }

  app.listen(port, () => {
    console.info(`App listening on port ${port}`);
  }).on('error', (err) => {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  });
};

app.get("/", (req, res) => {
  res.send("Welcome to the Tutor-Time API!");
});

// mounting routes
const adminRoutes = require("./routes/adminRoutes");
const teacherRoutes = require("./routes/teacherRoutes");
const studentRoutes = require("./routes/studentRoutes");

app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/teachers", teacherRoutes);
app.use("/api/v1/student", studentRoutes);

// Global error handler (JSON)
const errorController = require("./controllers/errorController");
app.use(errorController);

startServer().catch((err) => {
  console.error(err);
  process.exit(1);
});