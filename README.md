# Student-Teacher Booking Appointment System

This is a MERN stack project designed to facilitate the booking of appointments between students and teachers. The system includes functionalities for admins to manage teachers, for teachers to manage their appointments, and for students to book appointments with teachers.

## Table of Contents
- [Features](#features)
- [System Modules](#system-modules)
  - [Admin](#admin)
  - [Teacher](#teacher)
  - [Student](#student)
- [Tech-Stack-Used](#tech-stack-used)
- [Installation](#installation)
- [Usage](#usage)
- [Screenshots](#screenshots)
- [Login Acess](#login)
- [Contributing](#contributing)

## Features
- Admin management for adding, updating, and deleting teachers and approving student registrations.
- Teacher functionalities for managing their appointment schedules, approving/cancelling appointments, sending email alerts to students, viewing messages, and viewing all appointments.
- Student functionalities for registering, booking appointments with teachers, sending email alerts to teachers, and sending messages.

## System Modules

### Admin
- Add Teacher (Name, Department, Subject, etc.)
- Update/Delete Teacher
- Approve Registration Student

### Teacher
- Login
- Schedule Appointment
- Approve/Cancel Appointment
- Send Email Alerts to Students
- View Messages
- View All Appointments

### Student
- Register
- Login
- Book Appointment
- Send Email Alert to Teacher
- Send Message

## Tech-Stack-Used

**Frontend**
```bash
vite (bundler-react)
tailwindcss (styling)
react-icons (icons)
react-router-dom (routing)
react-toastify (notify)
axios (API)
```
**Backend**
```bash
express (API)
mysql2 (MySQL driver)
jwt-token (token)
nodemailer (MAIL)
bcrypt (encryption)
```

## Installation

Để chạy dự án này trên máy local, làm theo các bước sau:

### 1. Cài đặt Node.js

Đảm bảo máy đã cài đặt **Node.js** (phiên bản 18 trở lên) và **npm**.

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

# Cấu hình gửi email (SMTP)
MAIL_HOST=smtp.gmail.com
MAIL_USER='your-email@gmail.com'
MAIL_PASS='your-app-password'
```

> **Lưu ý:** Để lấy `MAIL_PASS`, bạn cần bật "Less secure app access" trên Google Account hoặc sử dụng **App Password** (nếu bật xác thực 2 bước).

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

---

## Usage

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

Frontend sẽ chạy tại: `http://localhost:5173`

### 3. Truy cập ứng dụng

Mở trình duyệt và truy cập: `http://localhost:5173`

---

## Tài khoản mặc định

Sau khi chạy lần đầu, hệ thống sẽ tự tạo các tài khoản mặc định sau:

| Vai trò   | Email                | Mật khẩu   |
|-----------|----------------------|------------|
| Admin     | admin@gmail.com      | admin123   |
| Giảng viên| teacher@gmail.com    | teacher123 |
| Sinh viên | student@gmail.com    | student123 |

> **Lưu ý:** Đây là tài khoản demo. Trong môi trường production, hãy thay đổi mật khẩu mặc định.

## Screenshots

Landing Page 

![landingpage](https://github.com/user-attachments/assets/80681180-c318-4aa8-bce4-25f7b1dcec5b)

Student Dashboard

![student dashboard](https://github.com/user-attachments/assets/fb4e5a37-6062-4db6-a1aa-2dc9cd4fbc49)

Teacher Dashboard

![teacher dashboard](https://github.com/user-attachments/assets/d9e034fa-5d25-4490-9179-5296b19b3536)


Admin Dashboard

![admin](https://github.com/user-attachments/assets/80681180-c318-4aa8-bce4-25f7b1dcec5b)

## Tài khoản mặc định

Sau khi chạy lần đầu, hệ thống sẽ tự tạo các tài khoản mặc định sau:

| Vai trò   | Email                | Mật khẩu   |
|-----------|----------------------|------------|
| Admin     | admin@gmail.com      | admin123   |
| Giảng viên| teacher@gmail.com    | teacher123 |
| Sinh viên | student@gmail.com    | student123 |

> **Lưu ý:** Đây là tài khoản demo. Trong môi trường production, hãy thay đổi mật khẩu mặc định.

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create your feature branch: `git checkout -b feature/YourFeature`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/YourFeature`
5. Open a pull request.

## Thank You 

**Keep Coding**

