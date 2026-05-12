const User = require("../models/User2");
const Student = require("../models/Student");
const Lecturer = require("../models/Lecturer");
const Admin = require("../models/Admin");
const { AppointmentModel: Appointment } = require("../models/Appointment");
const AvailableSlot = require("../models/AvailableSlot");
const Department = require("../models/Department");
const Major = require("../models/Major");
const Notification = require("../models/Notification");
const { sequelize } = require("../db");
const { Op, QueryTypes } = require("sequelize");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const bcrypt = require("bcrypt");
// Middleware setRole
exports.setRole = function (role) {
  return (req, res, next) => {
    req.body.Role = role;
    next();
  };
};

// Middleware allow
exports.allow = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError("User not authenticated", 401));
    }
    
    const userRole = (req.user.role || req.user.Role || "").toString().toLowerCase();
    
    if (!userRole) {
      return next(new AppError("User role not found", 401));
    }
    
    const allowed = roles.some((r) => {
      const rLow = r.toLowerCase();
      if (rLow === userRole) {
        return true;
      }
      if ((userRole === "teacher" && rLow === "lecturer") || (userRole === "lecturer" && rLow === "teacher")) {
        return true;
      }
      return false;
    });
    
    if (allowed) {
      next();
    } else {
      next(new AppError("Unauthorized access", 403));
    }
  };
};
// ---------------- Student ----------------

// CREATE STUDENT
exports.createStudent = catchAsync(async (req, res, next) => {
  const rawStudentId = req.body.Student_ID ?? req.body.Username ?? req.body.studentId ?? req.body.username;
  const Password = req.body.Password || req.body.password;
  const Email = req.body.Email || req.body.email;
  const Full_Name = req.body.Full_Name || req.body.FullName || req.body.name;
  const Major_ID = req.body.Major_ID != null ? req.body.Major_ID : req.body.majorId;
  const ClassName = req.body.ClassName || req.body.className || null;

  if (rawStudentId == null || rawStudentId === "" || Password == null || !Password || !Email || !Full_Name) {
    return res.status(400).json({ status: "FAIL", message: "Thiếu Student_ID, Password, Email hoặc Full_Name" });
  }

  const studentId = Number(rawStudentId);
  if (Number.isNaN(studentId) || !Number.isInteger(studentId) || studentId <= 0) {
    return res.status(400).json({ status: "FAIL", message: "Student_ID phải là số nguyên dương" });
  }

  const Username = String(studentId);

  const existingStudentId = await Student.findOne({ where: { Student_ID: studentId } });
  if (existingStudentId) return res.status(400).json({ status: "FAIL", message: "Student_ID đã tồn tại" });

  const existingUser = await User.findOne({ where: { Username } });
  if (existingUser) return res.status(400).json({ status: "FAIL", message: "Username đã tồn tại" });

  const existingEmail = await Student.findOne({ where: { Email } });
  if (existingEmail) return res.status(400).json({ status: "FAIL", message: "Email đã tồn tại" });

  const newUser = await User.create({
    Username,
    Password: await bcrypt.hash(Password, 10),
    Role: "Student",
    Status: "Active"
  });

  const newStudent = await Student.create({
    Student_ID: studentId,
    User_ID: newUser.ID,
    Email,
    Full_Name,
    Major_ID: Major_ID || null,
    ClassName: ClassName || null
  });

  res.status(200).json({
    status: "SUCCESS",
    message: "Đã tạo tài khoản sinh viên",
    data: { user: newUser, student: newStudent }
  });
});

exports.getAllStudents = catchAsync(async (req, res, next) => {
  const students = await Student.findAll({
    include: [
      { model: User, as: 'StudentUser' },
      { model: Major, as: 'StudentMajor', required: false, include: [{ model: Department, as: 'MajorDepartment' }] }
    ]
  });

  const list = students.map(s => ({
    _id: s.Student_ID,
    Username: s.StudentUser?.Username || null,
    Status: s.StudentUser?.Status || "Active",
    Full_Name: s.Full_Name,
    Email: s.Email,
    ClassName: s.ClassName,
    Password: s.StudentUser?.Password || null,
    Major: s.StudentMajor ? { 
      MajorName: s.StudentMajor.MajorName, 
      DeptName: s.StudentMajor.MajorDepartment?.DeptName 
    } : null
  }));

  res.status(200).json({ status: "SUCCESS", data: { students: list } });
});

exports.toggleStudentStatus = catchAsync(async (req, res, next) => {
  const student = await Student.findByPk(req.params.id, { include: [{ model: User, as: 'StudentUser' }] });
  if (!student) return next(new AppError("Student not found", 404));

  const user = student.StudentUser;
  if (!user) return next(new AppError("Associated user not found", 404));

  user.Status = user.Status === "Active" ? "Locked" : "Active";
  await user.save();

  res.status(200).json({ status: "SUCCESS", data: { Status: user.Status } });
});

exports.updateStudent = catchAsync(async (req, res, next) => {
  const { Full_Name, ClassName, Major_ID } = req.body;
  const student = await Student.findByPk(req.params.id);
  if (!student) return next(new AppError("Student not found", 404));

  const updateData = {};
  if (Full_Name != null) updateData.Full_Name = Full_Name;
  if (ClassName != null) updateData.ClassName = ClassName;
  if (Major_ID != null) updateData.Major_ID = Major_ID || null;

  await student.update(updateData);

  res.status(200).json({ status: "SUCCESS", data: { student } });
});

exports.updateStudentPassword = catchAsync(async (req, res, next) => {
  const { newPassword } = req.body;
  if (!newPassword) return next(new AppError("Vui lòng nhập mật khẩu mới", 400));

  const student = await Student.findByPk(req.params.id, { include: [{ model: User, as: 'StudentUser' }] });
  if (!student) return next(new AppError("Student not found", 404));
  const user = student.StudentUser;
  if (!user) return next(new AppError("Associated user not found", 404));

  user.Password = await bcrypt.hash(newPassword, 10);
  await user.save();

  res.status(200).json({ status: "SUCCESS", message: "Đã cập nhật mật khẩu sinh viên" });
});

// ---------------- Teacher ----------------

// CREATE TEACHER
exports.createTeacher = catchAsync(async (req, res, next) => {
  const Username = req.body.Username || (req.body.email || "").split("@")[0] || req.body.name;
  const Password = req.body.Password || req.body.password;
  const Email = req.body.Email || req.body.email;
  const Full_Name = req.body.Full_Name || req.body.name;
  const Dept_ID = req.body.Dept_ID != null ? req.body.Dept_ID : (req.body.department ? Number(req.body.department) : null);
  const Major_ID = req.body.Major_ID != null ? req.body.Major_ID : (req.body.subject ? Number(req.body.subject) : null);
  const Academic_Rank = req.body.Academic_Rank || req.body.academicRank || null;
  const Office_Room = req.body.Office_Room || req.body.officeRoom || null;

  if (!Username || !Password || !Email || !Full_Name) {
    return res.status(400).json({ status: "FAIL", message: "Thiếu Username, Password, Email hoặc Họ tên" });
  }

  const existing = await Lecturer.findOne({ where: { Email } });
  if (existing) return res.status(400).json({ status: "FAIL", message: "Email already in use" });

  const newUser = await User.create({
    Username,
    Password: await bcrypt.hash(Password, 10),
    Role: "Lecturer",
    Status: "Active"
  });

  const newLecturer = await Lecturer.create({
    User_ID: newUser.ID,
    Email,
    Full_Name,
    Dept_ID,
    Major_ID,
    Academic_Rank,
    Office_Room
  });

  res.status(200).json({ status: "SUCCESS", data: { user: newUser, lecturer: newLecturer } });
});

// GET ALL TEACHERS
exports.getAllTeachers = catchAsync(async (req, res, next) => {
  const where = {};
  if (req.query.deptId) where.Dept_ID = req.query.deptId;
  if (req.query.q) where.Full_Name = { [Op.like]: `%${req.query.q}%` };

  const lecturers = await Lecturer.findAll({
    where: Object.keys(where).length ? where : undefined,
    include: [
      { model: User, as: 'LecturerUser' },
      { model: Department, as: 'LecturerDepartment', required: false },
      { model: Major, as: 'LecturerMajor', required: false }
    ],
  });

  // Filter by major if provided in query
  let filteredLecturers = lecturers;
  if (req.query.major) {
    const majorFilter = req.query.major.toLowerCase();
    filteredLecturers = lecturers.filter(l => {
      const majorName = l.LecturerMajor ? l.LecturerMajor.MajorName : "";
      return majorName.toLowerCase() === majorFilter;
    });
  }

  const users = filteredLecturers.map((l) => ({
    _id: l.Lecturer_ID,
    Username: l.LecturerUser?.Username || null,
    Status: l.LecturerUser?.Status || "Active",
    name: l.Full_Name,
    email: l.Email,
    avatar: l.Picture,
    phone: l.Phone,
    academicRank: l.Academic_Rank,
    officeRoom: l.Office_Room,
    subject: l.LecturerMajor ? l.LecturerMajor.MajorName : "-",
    major: l.LecturerMajor ? l.LecturerMajor.MajorName : "-",
    department: l.LecturerDepartment ? l.LecturerDepartment.DeptName : null,
    Dept_ID: l.Dept_ID,
    Major_ID: l.Major_ID,
    Password: l.LecturerUser?.Password || null,
  }));

  res.status(200).json({ status: "SUCCESS", data: { users } });
});

exports.toggleTeacherStatus = catchAsync(async (req, res, next) => {
  const lecturer = await Lecturer.findByPk(req.params.id, { include: [{ model: User, as: 'LecturerUser' }] });
  if (!lecturer) return next(new AppError("Teacher not found", 404));

  const user = lecturer.LecturerUser;
  if (!user) return next(new AppError("Associated user not found", 404));

  user.Status = user.Status === "Active" ? "Locked" : "Active";
  await user.save();

  res.status(200).json({ status: "SUCCESS", data: { Status: user.Status } });
});

exports.updateTeacherPassword = catchAsync(async (req, res, next) => {
  const { newPassword } = req.body;
  if (!newPassword) return next(new AppError("Vui lòng nhập mật khẩu mới", 400));

  const lecturer = await Lecturer.findByPk(req.params.id, { include: [{ model: User, as: 'LecturerUser' }] });
  if (!lecturer) return next(new AppError("Teacher not found", 404));
  const user = lecturer.LecturerUser;
  if (!user) return next(new AppError("Associated user not found", 404));

  user.Password = await bcrypt.hash(newPassword, 10);
  await user.save();

  res.status(200).json({ status: "SUCCESS", message: "Đã cập nhật mật khẩu giảng viên" });
});

// UPDATE TEACHER
exports.updateTeacher = catchAsync(async (req, res, next) => {
  const lecturer = await Lecturer.findByPk(req.params.id);
  if (!lecturer) return next(new AppError("Teacher not found", 404));

  await lecturer.update(req.body);

  res.status(200).json({
    status: "SUCCESS",
    data: { lecturer }
  });
});
// GET TEACHER BY ID
exports.getTeacher = catchAsync(async (req, res, next) => {
  const lecturer = await Lecturer.findByPk(req.params.id, {
    include: [
      { model: User, as: 'LecturerUser' },
      { model: Department, as: 'LecturerDepartment' },
      { model: Major, as: 'LecturerMajor' }
    ]
  });
  if (!lecturer) return next(new AppError("Teacher not found", 404));
  res.status(200).json({ status: "SUCCESS", data: { lecturer } });
});
// ---------------- Department ----------------

// GET ALL DEPARTMENTS
exports.getDepartments = catchAsync(async (req, res) => {
  const list = await Department.findAll({ order: [['Dept_ID', 'ASC']] });
  res.status(200).json({ status: "SUCCESS", data: { departments: list } });
});

// CREATE DEPARTMENT
exports.createDepartment = catchAsync(async (req, res) => {
  const DeptName = req.body.DeptName || req.body.Name || '';
  const Dept_ID = req.body.Dept_ID != null ? Number(req.body.Dept_ID) : (req.body.DeptCode != null ? Number(req.body.DeptCode) : undefined);
  const payload = { DeptName };
  if (Number.isFinite(Dept_ID)) payload.Dept_ID = Dept_ID;
  const row = await Department.create(payload);
  res.status(200).json({ status: "SUCCESS", data: { department: row } });
});

// UPDATE DEPARTMENT
exports.updateDepartment = catchAsync(async (req, res, next) => {
  const row = await Department.findByPk(req.params.id);
  if (!row) return next(new AppError("Department not found", 404));
  const DeptName = req.body.DeptName ?? req.body.Name;
  if (DeptName != null) await row.update({ DeptName });
  res.status(200).json({ status: "SUCCESS", data: { department: row } });
});

// DELETE DEPARTMENT
exports.deleteDepartment = catchAsync(async (req, res, next) => {
  const row = await Department.findByPk(req.params.id);
  if (!row) return next(new AppError("Department not found", 404));
  await row.destroy();
  res.status(200).json({ status: "SUCCESS", message: "Department deleted" });
});


// ---------------- Major ----------------

// GET ALL MAJORS
exports.getMajors = catchAsync(async (req, res) => {
  const list = await Major.findAll({
    include: [{ model: Department, as: 'MajorDepartment' }],
    order: [['Major_ID', 'ASC']]
  });
  res.status(200).json({ status: "SUCCESS", data: { majors: list } });
});

// SEARCH/FILTER MAJORS
exports.searchMajors = catchAsync(async (req, res) => {
  const { q, deptId } = req.query;
  const where = {};
  
  // Filter by major name if search query provided
  if (q && q.trim()) {
    where.MajorName = {
      [Op.like]: `%${q.trim()}%`
    };
  }
  
  // Filter by department if provided
  if (deptId) {
    where.Dept_ID = deptId;
  }
  
  const list = await Major.findAll({
    where,
    include: [{ model: Department, as: 'MajorDepartment' }],
    order: [['Major_ID', 'ASC']]
  });
  
  res.status(200).json({ status: "SUCCESS", data: { majors: list } });
});

// CREATE MAJOR
exports.createMajor = catchAsync(async (req, res) => {
  const MajorName = req.body.MajorName || req.body.Name || '';
  const Dept_ID = req.body.Dept_ID != null ? req.body.Dept_ID : null;
  const Major_ID = req.body.Major_ID != null ? Number(req.body.Major_ID) : (req.body.MajorCode != null ? Number(req.body.MajorCode) : undefined);
  const payload = { MajorName, Dept_ID };
  if (Number.isFinite(Major_ID)) payload.Major_ID = Major_ID;
  const row = await Major.create(payload);
  res.status(200).json({ status: "SUCCESS", data: { major: row } });
});

// UPDATE MAJOR
exports.updateMajor = catchAsync(async (req, res, next) => {
  const row = await Major.findByPk(req.params.id);
  if (!row) return next(new AppError("Major not found", 404));

  const updates = {};
  if (req.body.MajorName != null) updates.MajorName = req.body.MajorName;
  else if (req.body.Name != null) updates.MajorName = req.body.Name;
  if (req.body.Dept_ID != null) updates.Dept_ID = req.body.Dept_ID;

  const newMajorId = req.body.Major_ID != null ? Number(req.body.Major_ID) : undefined;
  if (Number.isFinite(newMajorId) && newMajorId !== row.Major_ID) {
    const existing = await Major.findByPk(newMajorId);
    if (existing) return next(new AppError("Major code already exists", 400));
    updates.Major_ID = newMajorId;
  }

  if (Object.keys(updates).length) {
    await sequelize.transaction(async (transaction) => {
      if (updates.Major_ID) {
        const oldMajorId = row.Major_ID;
        await Student.update({ Major_ID: updates.Major_ID }, { where: { Major_ID: oldMajorId }, transaction });
        await Lecturer.update({ Major_ID: updates.Major_ID }, { where: { Major_ID: oldMajorId }, transaction });
      }
      await row.update(updates, { transaction });
    });
  }

  res.status(200).json({ status: "SUCCESS", data: { major: row } });
});

// DELETE MAJOR
exports.deleteMajor = catchAsync(async (req, res, next) => {
  const row = await Major.findByPk(req.params.id);
  if (!row) return next(new AppError("Major not found", 404));
  await row.destroy();
  res.status(200).json({ status: "SUCCESS", message: "Major deleted" });
});


// ---------------- Admin Dashboard ----------------

const normalizeTargetRole = (role) => {
  if (!role) return null;
  const normalized = String(role).trim().toLowerCase();
  if (normalized === 'student' || normalized === 'sinh viên' || normalized === 'sinh vien') return 'Student';
  if (normalized === 'lecturer' || normalized === 'giảng viên' || normalized === 'giang vien') return 'Lecturer';
  if (normalized === 'all' || normalized === 'tất cả' || normalized === 'tat ca') return 'All';
  return null;
};

exports.getAppointments = catchAsync(async (req, res) => {
  const appointments = await Appointment.findAll();

  const payload = appointments.map((apt) => ({
    Appoint_ID: apt.Appoint_ID,
    Slot_ID: apt.Slot_ID,
    Student_ID: apt.Student_ID,
    Status: apt.Status,
    Reason: apt.Reason || null
  }));

  res.status(200).json({ status: 'SUCCESS', data: { appointments: payload } });
});

exports.getNotifications = catchAsync(async (req, res, next) => {
  const notifications = await Notification.findAll({
    order: [['Created_At', 'DESC']],
  });

  const payload = notifications.map((note) => ({
    id: note.Noti_ID,
    title: note.Title,
    content: note.Content,
    Target_Role: note.Target_Role,
    Created_At: note.Created_At,
  }));

  res.status(200).json({ status: 'SUCCESS', data: { notifications: payload } });
});

exports.createNotification = catchAsync(async (req, res, next) => {
  const { Title, Content, Target_Role } = req.body;
  if (!Title || !Content || !Target_Role) {
    return next(new AppError('Thiếu Title, Content hoặc Target_Role', 400));
  }

  const normalizedRole = normalizeTargetRole(Target_Role);
  if (!normalizedRole) {
    return next(new AppError('Target_Role phải là Student, Lecturer hoặc All', 400));
  }

  const admin = await Admin.findOne({ where: { User_ID: req.user.id } });
  if (!admin) {
    return next(new AppError('Admin profile not found', 404));
  }

  const notification = await Notification.create({
    Admin_ID: admin.Admin_ID,
    Title,
    Content,
    Target_Role: normalizedRole,
  });

  res.status(201).json({ status: 'SUCCESS', data: { notification } });
});

exports.updateNotification = catchAsync(async (req, res, next) => {
  const { Title, Content, Target_Role } = req.body;
  const notification = await Notification.findByPk(req.params.id);
  if (!notification) return next(new AppError('Notification not found', 404));

  const updates = {};
  if (Title != null) updates.Title = Title;
  if (Content != null) updates.Content = Content;
  if (Target_Role != null) {
    const normalizedRole = normalizeTargetRole(Target_Role);
    if (!normalizedRole) return next(new AppError('Target_Role phải là Student, Lecturer hoặc All', 400));
    updates.Target_Role = normalizedRole;
  }

  await notification.update(updates);
  res.status(200).json({ status: 'SUCCESS', data: { notification } });
});

exports.deleteNotification = catchAsync(async (req, res, next) => {
  const notification = await Notification.findByPk(req.params.id);
  if (!notification) return next(new AppError('Notification not found', 404));
  await notification.destroy();
  res.status(200).json({ status: 'SUCCESS', message: 'Notification deleted' });
});

exports.getReports = catchAsync(async (req, res) => {
  const view = (req.query.view || 'year').toString().toLowerCase();
  const validViews = ['week', 'month', 'year'];
  const selectedView = validViews.includes(view) ? view : 'year';

  const [pendingCount, approvedCount, rejectedCount, totalAppointments] = await Promise.all([
    Appointment.count({ where: { Status: 'Pending' } }),
    Appointment.count({ where: { Status: 'Approved' } }),
    Appointment.count({ where: { Status: 'Rejected' } }),
    Appointment.count()
  ]);

  const now = new Date();
  let chartData = [];
  let sql = '';
  let replacements = {};

  if (selectedView === 'week') {
    const today = new Date(now);
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    sql = `SELECT DAYOFWEEK(RequestedAt) AS weekdayIndex, Status, COUNT(*) AS count
           FROM APPOINTMENTS
           WHERE DATE(RequestedAt) BETWEEN :startDate AND :endDate
           GROUP BY weekdayIndex, Status`;
    replacements = {
      startDate: monday.toISOString().slice(0, 10),
      endDate: sunday.toISOString().slice(0, 10)
    };

    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    chartData = labels.map((label) => ({ label, Pending: 0, Approved: 0, Rejected: 0, Total: 0 }));
  } else if (selectedView === 'month') {
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const daysInMonth = new Date(year, month, 0).getDate();
    sql = `SELECT DAY(RequestedAt) AS dayIndex, Status, COUNT(*) AS count
           FROM APPOINTMENTS
           WHERE YEAR(RequestedAt) = :year AND MONTH(RequestedAt) = :month
           GROUP BY dayIndex, Status`;
    replacements = { year, month };
    chartData = Array.from({ length: daysInMonth }, (_, index) => ({
      label: `${index + 1}`,
      Pending: 0,
      Approved: 0,
      Rejected: 0,
      Total: 0
    }));
  } else {
    const year = now.getFullYear();
    sql = `SELECT MONTH(RequestedAt) AS monthIndex, Status, COUNT(*) AS count
           FROM APPOINTMENTS
           WHERE YEAR(RequestedAt) = :year
           GROUP BY monthIndex, Status`;
    replacements = { year };
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    chartData = monthNames.map((month) => ({ label: month, Pending: 0, Approved: 0, Rejected: 0, Total: 0 }));
  }

  const rows = await sequelize.query(sql, { replacements, type: QueryTypes.SELECT });

  rows.forEach((row) => {
    const statusKey = (row.Status || '').toLowerCase();
    const count = Number(row.count) || 0;
    if (!['pending', 'approved', 'rejected'].includes(statusKey)) return;

    const fieldName = statusKey.charAt(0).toUpperCase() + statusKey.slice(1);
    let bucketIndex = -1;
    if (selectedView === 'week') {
      const weekdayIndex = Number(row.weekdayIndex);
      // MySQL DAYOFWEEK: Sunday=1, Monday=2, ..., Saturday=7
      if (weekdayIndex === 1) bucketIndex = 6;
      else bucketIndex = weekdayIndex - 2;
    } else if (selectedView === 'month') {
      const dayIndex = Number(row.dayIndex);
      if (dayIndex >= 1 && dayIndex <= chartData.length) bucketIndex = dayIndex - 1;
    } else {
      const monthIndex = Number(row.monthIndex);
      if (monthIndex >= 1 && monthIndex <= 12) bucketIndex = monthIndex - 1;
    }

    if (bucketIndex >= 0 && bucketIndex < chartData.length) {
      chartData[bucketIndex][fieldName] = count;
      chartData[bucketIndex].Total += count;
    }
  });

  const reports = [
    { id: 'report-1', title: 'Tổng số lịch hẹn', summary: `${totalAppointments} lịch hẹn hiện có`, status: 'All', count: totalAppointments },
    { id: 'report-2', title: 'Lịch hẹn chờ duyệt', summary: `${pendingCount} yêu cầu đang chờ`, status: 'Pending', count: pendingCount },
    { id: 'report-3', title: 'Lịch hẹn đã duyệt', summary: `${approvedCount} yêu cầu đã duyệt`, status: 'Approved', count: approvedCount },
    { id: 'report-4', title: 'Lịch hẹn bị từ chối', summary: `${rejectedCount} yêu cầu bị từ chối`, status: 'Rejected', count: rejectedCount }
  ];

  const statusDistribution = [
    { name: 'Đã duyệt', value: approvedCount, color: '#22c55e' },
    { name: 'Từ chối', value: rejectedCount, color: '#ef4444' },
    { name: 'Chờ duyệt', value: pendingCount, color: '#f59e0b' }
  ];

  const topInstructorsSql = `
    SELECT
      l.Lecturer_ID AS lecturerId,
      COALESCE(l.Full_Name, u.Username) AS lecturerName,
      d.DeptName AS department,
      COUNT(*) AS approvedCount
    FROM APPOINTMENTS a
    LEFT JOIN AVAILABLE_SLOTS slot ON a.Slot_ID = slot.Slot_ID
    LEFT JOIN LECTURER l ON slot.Lecturer_ID = l.Lecturer_ID
    LEFT JOIN USERS u ON l.User_ID = u.ID
    LEFT JOIN DEPARTMENTS d ON l.Dept_ID = d.Dept_ID
    WHERE a.Status = 'Approved'
    GROUP BY l.Lecturer_ID, lecturerName, d.DeptName
    ORDER BY approvedCount DESC
    LIMIT 3`;

  const topInstructorRows = await sequelize.query(topInstructorsSql, {
    type: QueryTypes.SELECT
  });

  const topInstructors = topInstructorRows.map((row) => ({
    lecturerName: row.lecturerName || 'N/A',
    department: row.department || 'Chưa xác định',
    approvedCount: Number(row.approvedCount) || 0
  }));

  res.status(200).json({ status: 'SUCCESS', data: { reports, chartData, view: selectedView, topInstructors, statusDistribution } });
});

exports.getReportAppointments = catchAsync(async (req, res, next) => {
  const statusParam = (req.query.status || 'All').toString();
  const validStatuses = ['All', 'Pending', 'Approved', 'Rejected'];
  if (!validStatuses.includes(statusParam)) {
    return next(new AppError('Trạng thái không hợp lệ', 400));
  }

  const replacements = {};
  let sql = `
    SELECT
      a.Appoint_ID,
      a.Status,
      a.RequestedAt,
      a.StuStartTime,
      a.StuEndTime,
      a.Location AS AppointmentLocation,
      a.Reason,
      s.Full_Name AS StudentFullName,
      u.Username AS StudentUsername,
      COALESCE(l.Full_Name, lu.Username, lslot.Full_Name, luslot.Username) AS LecturerName,
      slot.Date AS SlotDate,
      slot.StartTime AS SlotStartTime,
      slot.EndTime AS SlotEndTime
    FROM APPOINTMENTS a
    LEFT JOIN STUDENT s ON a.Student_ID = s.Student_ID
    LEFT JOIN USERS u ON s.User_ID = u.ID
    LEFT JOIN LECTURER l ON a.Lecturer_ID = l.Lecturer_ID
    LEFT JOIN USERS lu ON l.User_ID = lu.ID
    LEFT JOIN AVAILABLE_SLOTS slot ON a.Slot_ID = slot.Slot_ID
    LEFT JOIN LECTURER lslot ON slot.Lecturer_ID = lslot.Lecturer_ID
    LEFT JOIN USERS luslot ON lslot.User_ID = luslot.ID
  `;

  if (statusParam !== 'All') {
    sql += ' WHERE a.Status = :status';
    replacements.status = statusParam;
  }
  sql += ' ORDER BY a.RequestedAt DESC';

  const appointments = await sequelize.query(sql, {
    replacements,
    type: QueryTypes.SELECT
  });

  const data = appointments.map((plain) => {
    return {
      id: plain.Appoint_ID,
      studentName: plain.StudentFullName || plain.StudentUsername || 'N/A',
      lecturerName: plain.LecturerName || 'N/A',
      status: plain.Status,
      requestedAt: plain.RequestedAt,
      date: plain.SlotDate || null,
      startTime: plain.StuStartTime || plain.SlotStartTime || null,
      endTime: plain.StuEndTime || plain.SlotEndTime || null,
      location: plain.AppointmentLocation || 'N/A',
      reason: plain.Reason || 'N/A'
    };
  });

  res.status(200).json({ status: 'SUCCESS', data: { appointments: data } });
});

// ---------------- Stats ----------------

// GET APPOINTMENT STATS
exports.getStats = catchAsync(async (req, res) => {
  const [studentCount, lecturerCount, majorCount, pendingCount, approvedCount, rejectedCount, totalAppointments] = await Promise.all([
    Student.count(),
    Lecturer.count(),
    Major.count(),
    Appointment.count({ where: { Status: "Pending" } }),
    Appointment.count({ where: { Status: "Approved" } }),
    Appointment.count({ where: { Status: "Rejected" } }),
    Appointment.count()
  ]);

  const stats = {
    students: studentCount,
    lecturers: lecturerCount,
    majors: majorCount,
    appointments: totalAppointments,
    pending: pendingCount,
    approved: approvedCount,
    rejected: rejectedCount,
    total: totalAppointments
  };

  res.status(200).json({
    status: "SUCCESS",
    data: stats
  });
});