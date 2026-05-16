# Student-Teacher Booking Appointment System

Ứng dụng đặt lịch giữa sinh viên và giảng viên, gồm quản trị viên, giảng viên và sinh viên.

## Kiến trúc dự án

- Kiến trúc: `client-server` tách biệt frontend và backend
- Frontend: React + Vite
- Backend: Node.js + Express
- ORM: Sequelize
- Cơ sở dữ liệu: MySQL
- Token/cache hỗ trợ: Redis (ioredis, jwt-redis)

## Công nghệ chính

### Frontend
- React
- Vite
- Tailwind CSS
- react-router-dom
- axios
- react-icons
- react-toastify

### Backend
- Node.js
- Express
- Sequelize
- bcrypt
- jsonwebtoken
- dotenv
- cors
- mysql2
- ioredis
- jwt-redis

### Database
- MySQL

## Cấu trúc thư mục chính

- `frontend/` – ứng dụng React + Vite
- `backend/` – API server Express, kết nối MySQL qua Sequelize

## Tính năng chính

- Quản trị viên:
  - Đăng nhập
  - Quản lý giảng viên, sinh viên
  - Xem lịch hẹn
- Giảng viên:
  - Đăng nhập
  - Quản lý khung giờ trống
  - Xét duyệt yêu cầu đặt lịch
  - Xem thông báo
- Sinh viên:
  - Đăng nhập
  - Xem giảng viên và khung giờ trống
  - Đặt lịch, hủy lịch
  - Xem trạng thái lịch hẹn

## Cài đặt

### 1. Chuẩn bị môi trường

Đảm bảo đã cài Node.js và npm.

```bash
node --version
npm --version
```

### 2. Cài dependencies backend

```bash
cd backend
npm install
```

### 3. Cài dependencies frontend

```bash
cd frontend
npm install
```

## Cấu hình môi trường

### Backend
Tạo file `backend/.env` với nội dung:

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASS=yourpassword
DB_NAME=booking_system
DB_PORT=3306
JWT_KEY=your-secret-key
```

### Frontend
Tạo file `frontend/.env.local` với nội dung:

```env
VITE_BACKEND_URL=http://localhost:5000
```

## Khởi động Database

Dự án dùng MySQL. Tạo database nếu chưa có:

```sql
CREATE DATABASE booking_system;
```

> Nếu dự án dùng Redis, hãy đảm bảo Redis cũng đang chạy.

## Chạy dự án

### Backend

```bash
cd backend
npm run dev
```

### Frontend

```bash
cd frontend
npm run dev
```

Mở trình duyệt và truy cập địa chỉ do Vite cung cấp (mặc định `http://localhost:5173`).

## Thông tin đăng nhập mẫu

| Vai trò    | Tài khoản             | Mật khẩu |
|------------|------------------------|----------|
| Admin      | admin                 | admin123 |
| Giảng viên | gv001@kontum.udn.vn   | pass123  |
| Sinh viên  | sv001@kontum.udn.vn   | pass123  |

> Lưu ý: backend hiện vẫn có thể lưu mật khẩu ở dạng plain text nếu chưa dùng hash.

## Ghi chú

- Dự án không dùng MongoDB; README trước đó ghi MERN là không chính xác.
- Đây là ứng dụng full-stack React + Node/Express với database MySQL.

