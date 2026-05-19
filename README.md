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
node --version  # Kiểm tra phiên bản Node.js
npm --version   # Kiểm tra phiên bản npm
```

### 2. Cài đặt backend dependencies

```bash
cd backend
npm install
```

### 3. Cài đặt frontend dependencies

```bash
cd frontend
npm install
```

### 4. Cấu hình biến môi trường cho Backend

Tạo file `.env` trong thư mục `backend/` với nội dung sau:

```env
# Cổng server
PORT=5000

# Chuỗi kết nối database MySQL
DB_HOST=localhost
DB_USER=root
DB_PASS=yourpassword
DB_NAME=booking_system
DB_PORT=3306

# Khóa JWT để mã hóa token
JWT_KEY='your-secret-key-change-in-production'
```

### 5. Cấu hình biến môi trường cho Frontend

Tạo file `.env.local` trong thư mục `frontend/` với nội dung sau:

```env
# URL backend API
VITE_BACKEND_URL='http://localhost:5000'
```

### 6. Khởi động Database

Đảm bảo **MySQL** đang chạy trên máy:

```bash
# Khởi động MySQL Server
mysql.server start

# Tạo database nếu chưa có
mysql -u root -p
CREATE DATABASE booking_system;
```

> Nếu dự án dùng Redis, hãy đảm bảo Redis cũng đang chạy.

## Chạy dự án

### 1. Chạy Backend Server

```bash
cd backend
npm run dev
```

Backend sẽ chạy tại: `http://localhost:5000`

### 2. Chạy Frontend Server

Mở terminal mới và chạy:

```bash
cd frontend
npm run dev
```

Mở trình duyệt và truy cập địa chỉ do Vite cung cấp (mặc định `http://localhost:5173`).

## Thông tin đăng nhập mẫu

| Vai trò    | Tài khoản             | Mật khẩu |
|------------|------------------------|----------|
| Admin      | admin                 | admin123 |
| Giảng viên | gv001@udck.udn.vn   | pass123  |
| Sinh viên  | sv001@udck.udn.vn   | pass123  |

> Lưu ý: hiện tại backend cho phép lưu mật khẩu dạng plain text trong bảng `USERS` và sẽ so sánh trực tiếp nếu mật khẩu không phải hash.

### SQL tạo tài khoản mẫu

```sql
USE udck;

INSERT INTO USERS (Username, Password, Role, Status) VALUES
  ('admin', 'admin123', 'Admin', 'Active');
SET @admin_user_id = LAST_INSERT_ID();

INSERT INTO ADMIN (Full_Name, User_ID) VALUES
  ('Admin System', @admin_user_id);

INSERT INTO USERS (Username, Password, Role, Status) VALUES
  ('gv001', 'pass123', 'Lecturer', 'Active');
SET @lecturer_user_id = LAST_INSERT_ID();

INSERT INTO LECTURER (User_ID, Email, Full_Name) VALUES
  (@lecturer_user_id, 'gv001@kontum.udn.vn', 'Giảng viên 001');

INSERT INTO USERS (Username, Password, Role, Status) VALUES
  ('sv001', 'pass123', 'Student', 'Active');
SET @student_user_id = LAST_INSERT_ID();

INSERT INTO STUDENT (Student_ID, User_ID, Email, Full_Name, ClassName) VALUES
  (1, @student_user_id, 'sv001@kontum.udn.vn', 'Sinh viên 001', 'CNTT');
```

## Screenshots

Landing Page 

![landing_Page](https://github.com/user-attachments/assets/f0ff301b-ea86-4a49-8e06-c22bc717f7d7)

Student Dashboard

![student dashboard](https://github.com/user-attachments/assets/fb4e5a37-6062-4db6-a1aa-2dc9cd4fbc49)

Teacher Dashboard

![teacher dashboard](https://github.com/user-attachments/assets/d9e034fa-5d25-4490-9179-5296b19b3536)


Admin Dashboard

![admin](https://github.com/user-attachments/assets/f1dd4c78-bf81-4ca8-9a7a-b803b303d474)

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create your feature branch: `git checkout -b feature/YourFeature`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/YourFeature`
5. Open a pull request.

## Thank You 

**Keep Coding**
Create By PTQ thor
