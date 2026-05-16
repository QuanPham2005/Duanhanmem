const express = require('express');
const router = express.Router();

const teacherController = require('../controllers/teacherController');
const authController = require('../controllers/authController');
const adminController = require('../controllers/adminController');

// Đăng nhập giảng viên (dùng chung authController.login với student)
router.post('/login', authController.login);

const teacherAuth = [authController.verifyToken, adminController.allow('Admin', 'teacher', 'Lecturer')];

router.get('/profile', ...teacherAuth, teacherController.getProfile);
router.patch('/profile', ...teacherAuth, teacherController.updateProfile);
router.patch('/change-password', ...teacherAuth, teacherController.changePassword);

// Khung giờ rảnh
router.route('/slots').get(...teacherAuth, teacherController.getMySlots).post(...teacherAuth, teacherController.createSlot);
router.route('/slots/:id').patch(...teacherAuth, teacherController.updateSlot).delete(...teacherAuth, teacherController.deleteSlot);

// Lịch hẹn: danh sách, chi tiết, duyệt/từ chối
router.get('/appointments', ...teacherAuth, teacherController.getAllAppointments);
router.get('/notifications', ...teacherAuth, teacherController.getNotifications);
router.patch('/notifications/:id/read', ...teacherAuth, teacherController.markNotificationRead);
router.patch('/notifications/mark-all-read', ...teacherAuth, teacherController.markAllNotificationsRead);
router.post('/notifications/mark-all-read', ...teacherAuth, teacherController.markAllNotificationsRead);
router.get('/appointments/pending', ...teacherAuth, teacherController.getPendingAppointments);
router.get('/appointments/:id', ...teacherAuth, teacherController.getAppointmentById);
router.patch('/appointments/:id/adjust', ...teacherAuth, teacherController.adjustAppointment);
router.delete('/appointments/:id', ...teacherAuth, teacherController.cancelAppointment);
router.patch('/appointments/:id/reject', ...teacherAuth, teacherController.disapproveAppointment);
router.route('/changeApprovalStatus/:id')
  .patch(...teacherAuth, teacherController.approveAppointment)
  .delete(...teacherAuth, teacherController.disapproveAppointment);

// Debug endpoint
router.get('/debug-info', authController.verifyToken, async (req, res) => {
  try {
    const User = require('../models/User2');
    const Lecturer = require('../models/Lecturer');
    
    const user = await User.findByPk(req.user.id);
    const lecturer = await Lecturer.findOne({ where: { User_ID: req.user.id } });
    
    res.json({
      user: user ? user.get({ plain: true }) : null,
      lecturer: lecturer ? lecturer.get({ plain: true }) : null,
      req_user: req.user
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Public debug - returns first lecturer row (no auth)
router.get('/debug-public', async (req, res) => {
  try {
    const Lecturer = require('../models/Lecturer');
    const lecturer = await Lecturer.findOne();
    res.json({ lecturer: lecturer ? lecturer.get({ plain: true }) : null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
module.exports = router;