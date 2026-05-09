const express = require('express');
const router = express.Router();

const adminController = require('../controllers/adminController');
const authController = require('../controllers/authController');

// Đăng nhập Admin
router.post('/login', authController.login);

// ---------------- Teachers ----------------
// Lấy danh sách giảng viên
router.route('/teachers')
  .get(authController.verifyToken, adminController.allow('Admin', 'student'), adminController.getAllTeachers)
  .post(authController.verifyToken, adminController.allow('Admin'), adminController.setRole('Lecturer'), adminController.createTeacher);

// Lấy, sửa, xóa giảng viên theo id
router.route('/teachers/:id')
  .get(authController.verifyToken, adminController.allow('Admin'), adminController.getTeacher)
  .patch(authController.verifyToken, adminController.allow('Admin'), adminController.updateTeacher);

router.patch('/teachers/:id/status', authController.verifyToken, adminController.allow('Admin'), adminController.toggleTeacherStatus);
router.patch('/teachers/:id/password', authController.verifyToken, adminController.allow('Admin'), adminController.updateTeacherPassword);

// ---------------- Students ----------------
// Tạo tài khoản sinh viên
router.post('/students', authController.verifyToken, adminController.allow('Admin'), adminController.createStudent);
router.patch('/students/:id/status', authController.verifyToken, adminController.allow('Admin'), adminController.toggleStudentStatus);
router.patch('/students/:id', authController.verifyToken, adminController.allow('Admin'), adminController.updateStudent);
router.patch('/students/:id/password', authController.verifyToken, adminController.allow('Admin'), adminController.updateStudentPassword);

// Lấy danh sách sinh viên
router.get('/students', authController.verifyToken, adminController.allow('Admin'), adminController.getAllStudents);

// ---------------- Departments ----------------
router.route('/departments')
  .get(authController.verifyToken, adminController.allow('Admin'), adminController.getDepartments)
  .post(authController.verifyToken, adminController.allow('Admin'), adminController.createDepartment);

router.route('/departments/:id')
  .patch(authController.verifyToken, adminController.allow('Admin'), adminController.updateDepartment)
  .delete(authController.verifyToken, adminController.allow('Admin'), adminController.deleteDepartment);

// ---------------- Majors ----------------
router.route('/majors')
  .get(authController.verifyToken, adminController.allow('Admin'), adminController.getMajors)
  .post(authController.verifyToken, adminController.allow('Admin'), adminController.createMajor);

router.route('/majors/:id')
  .patch(authController.verifyToken, adminController.allow('Admin'), adminController.updateMajor)
  .delete(authController.verifyToken, adminController.allow('Admin'), adminController.deleteMajor);

// ---------------- Admin Dashboard ----------------
router.get('/appointments', authController.verifyToken, adminController.allow('Admin'), adminController.getAppointments);
router.get('/notifications', authController.verifyToken, adminController.allow('Admin'), adminController.getNotifications);
router.post('/notifications', authController.verifyToken, adminController.allow('Admin'), adminController.createNotification);
router.patch('/notifications/:id', authController.verifyToken, adminController.allow('Admin'), adminController.updateNotification);
router.delete('/notifications/:id', authController.verifyToken, adminController.allow('Admin'), adminController.deleteNotification);
router.get('/reports', authController.verifyToken, adminController.allow('Admin'), adminController.getReports);
router.get('/reports/appointments', authController.verifyToken, adminController.allow('Admin'), adminController.getReportAppointments);

// ---------------- Stats ----------------
router.get('/stats', authController.verifyToken, adminController.allow('Admin'), adminController.getStats);

module.exports = router;