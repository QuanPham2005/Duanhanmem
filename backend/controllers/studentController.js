const { Appointment, AppointmentModel } = require("../models/Appointment");
const User = require("../models/User2");
const Student = require("../models/Student");
const Lecturer = require("../models/Lecturer");
const Department = require("../models/Department");
const Major = require("../models/Major");
const AvailableSlot = require("../models/AvailableSlot");
const Notification = require("../models/Notification");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const { Op } = require('sequelize');
const { sequelize } = require("../db");
const { signToken } = require("./authController");
const {
  getReadMapForUser,
  markNotificationKeyAsRead,
  markNotificationKeysAsRead,
} = require("./notificationHelper");

// udck: JWT id là User.ID; APPOINTMENTS.Student_ID là STUDENT.Student_ID
const getStudentIdFromUserId = async (userId) => {
  const row = await Student.findOne({ where: { User_ID: userId } });
  return row ? row.Student_ID : null;
};

const getTeacherWithAppointments = async (userId) => {
  const studentId = await getStudentIdFromUserId(userId);
  const all = await Appointment.find({});
  if (studentId == null) return all;
  return all.filter(a => Number(a.Student_ID) !== Number(studentId));
};

const getRegisteredAppointments = async (userId) => {
  const studentId = await getStudentIdFromUserId(userId);
  if (studentId == null) return [];
  
  // Import models directly
  const { AppointmentModel } = require('../models/Appointment');
  const AvailableSlot = require('../models/AvailableSlot');
  const Lecturer = require('../models/Lecturer');
  const User = require('../models/User2');
  const Major = require('../models/Major');
  
  // Try direct model includes
  const rows = await AppointmentModel.findAll({
    where: { Student_ID: studentId },
    include: [
      {
        model: AvailableSlot,
        as: 'AvailableSlot',
        required: false,
        include: [
          {
            model: Lecturer,
            as: 'SlotLecturer',
            required: false,
            include: [
              {
                model: User,
                as: 'LecturerUser',
                required: false
              },
              {
                model: Major,
                as: 'LecturerMajor',
                required: false
              }
            ]
          }
        ]
      },
      {
        model: User,
        as: 'AdjustedUser',
        required: false
      }
    ],
    order: [
      ['RequestedAt', 'DESC'],
      ['Appoint_ID', 'DESC'],
    ],
  });

  const now = new Date();

  // Filter out appointments whose slot is expired or deleted
  return rows
    .map((row, idx) => {
      const p = row.get ? row.get({ plain: true }) : row;

      // Skip appointments with missing slots
      if (!p.AvailableSlot) return null;

      // Check if slot is expired
      const slotDate = p.AvailableSlot.Date;
      const slotEnd = p.AvailableSlot.EndTime;
      if (!slotDate || !slotEnd) return null;
      const slotEndDateTime = new Date(`${slotDate}T${slotEnd}`);
      if (slotEndDateTime < now) return null;

      let scheduleAt;
      try {
        if (p.AvailableSlot && p.AvailableSlot.Date) {
          const dateStr = p.AvailableSlot.Date;
          const timeStr = p.StuStartTime || p.AvailableSlot.StartTime || '00:00:00';
          scheduleAt = new Date(`${dateStr}T${timeStr}`).toISOString();
        } else {
          scheduleAt = new Date().toISOString();
        }
      } catch (e) {
        scheduleAt = new Date().toISOString();
      }

      // Get lecturer name from AvailableSlot.SlotLecturer.LecturerUser.Full_Name or SlotLecturer.Full_Name
      const lecturer = p.AvailableSlot?.SlotLecturer || {};
      const user = lecturer.LecturerUser || {};
      const major = lecturer.LecturerMajor || {};
      const lecturerName = lecturer.Full_Name || 'Giảng viên';
      const majorName = major.MajorName || null;

      return {
        ...p,
        _id: p.Appoint_ID,
        scheduleAt: scheduleAt,
        name: lecturerName,
        lecturerName: lecturerName,
        domain: majorName,
        // Chuẩn hóa cả 2 key để frontend cũ/mới đều đọc được
        Location: p.Location || p.location || "",
        location: p.location || p.Location || "",
      };
    })
    .filter(apt => apt !== null); // Remove null entries (missing/expired slots)
};

// Đăng ký sinh viên tự do đã tắt: chỉ admin cấp tài khoản
exports.register = catchAsync(async (req, res, next) => {
  return res.status(403).json({
    status: "FAIL",
    message: "Tài khoản do admin cấp. Vui lòng liên hệ phòng đào tạo.",
  });
});

exports.bookAppointment = catchAsync(async (req, res, next) => {
  const slotId = req.params.id;
  const studentId = await getStudentIdFromUserId(req.user.id);
  if (studentId == null) {
    return next(new AppError("Student profile not found", 404));
  }

  const requestedStart = req.body.StuStartTime;
  const requestedEnd = req.body.StuEndTime;

  const toMinutes = (t) => {
    if (!t) return null;
    const parts = String(t).split(":");
    const hh = Number(parts[0] || 0);
    const mm = Number(parts[1] || 0);
    return hh * 60 + mm;
  };

  await sequelize.transaction(async (transaction) => {
    const slot = await AvailableSlot.findByPk(slotId, { transaction });
    if (!slot) {
      throw new AppError("Slot not found", 404);
    }

    const finalStart = requestedStart || slot.StartTime;
    const finalEnd = requestedEnd || slot.EndTime;

    const slotStartMin = toMinutes(slot.StartTime);
    const slotEndMin = toMinutes(slot.EndTime);
    const reqStartMin = toMinutes(finalStart);
    const reqEndMin = toMinutes(finalEnd);

    if (reqStartMin == null || reqEndMin == null || reqStartMin >= reqEndMin) {
      throw new AppError("Invalid requested time range", 400);
    }
    if (reqStartMin < slotStartMin || reqEndMin > slotEndMin) {
      throw new AppError("Requested time is outside available slot range", 400);
    }

    // Check for overlap with any existing appointment of this student on the same date
    const studentAppointments = await AppointmentModel.findAll({
      where: {
        Student_ID: studentId,
        Status: { [Op.in]: ['Pending', 'Approved'] }
      },
      include: [{ model: AvailableSlot, as: 'AvailableSlot', required: true }],
      transaction
    });

    for (const row of studentAppointments) {
      const r = row.get ? row.get({ plain: true }) : row;
      if (!r.AvailableSlot || !r.AvailableSlot.Date) continue;

      const exDate = r.AvailableSlot.Date;
      if (exDate !== slot.Date) continue;

      // Skip existing appointment record for the same slot if the student is updating it
      if (r.Slot_ID === Number(slotId) && r.Student_ID === studentId) continue;

      const exStart = toMinutes(r.StuStartTime || r.AvailableSlot.StartTime);
      const exEnd = toMinutes(r.StuEndTime || r.AvailableSlot.EndTime);
      if (exStart == null || exEnd == null) continue;

      if (reqStartMin < exEnd && exStart < reqEndMin) {
        throw new AppError("Bạn Đã Có Lịch Hẹn Trùng Khớp", 400);
      }
    }

    // Check if student already has appointment in this slot
    let appointment = await AppointmentModel.findOne({
      where: { Slot_ID: slotId, Student_ID: studentId },
      transaction
    });

    let isNew = false;
    if (!appointment) {
      // Create new appointment
      isNew = true;
      appointment = await AppointmentModel.create({
        Slot_ID: Number(slotId),
        Student_ID: studentId,
        Location: req.body.location || "",
        StuStartTime: finalStart,
        StuEndTime: finalEnd,
        Reason: req.body.reason || "",
        Status: "Pending",
        RequestedAt: new Date()
      }, { transaction });
    } else {
      // Update existing appointment
      await appointment.update({
        StuStartTime: finalStart,
        StuEndTime: finalEnd,
        Reason: req.body.reason || appointment.Reason || "",
        Location: req.body.location || appointment.Location || "",
      }, { transaction });
    }

    const scheduledDate = new Date(`${slot.Date}T${finalStart}`);
    const formattedDate = scheduledDate.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "2-digit",
    });
    const formattedTime = scheduledDate.toLocaleString("en-US", {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    });

    res.status(200).json({
      status: "SUCCESS",
      message: isNew ? "Appointment created successfully" : "Appointment updated successfully",
      data: {
        appointment: appointment.get ? appointment.get({ plain: true }) : appointment,
      },
    });
  });
});

exports.getTeacherWithAppointments = catchAsync(async (req, res, next) => {
  const appointments = await getTeacherWithAppointments(req.user.id);
  res.status(200).json({
    status: "Success",
    appointments,
  });
});

// GET ALL LECTURERS for students
exports.getLecturers = catchAsync(async (req, res, next) => {
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
    name: l.Full_Name,
    email: l.Email,
    avatar: l.picture || null,
    picture: l.picture || null,
    phone: l.Phone,
    academicRank: l.Aademic_Rank,
    officeRoom: l.Office_Room,
    specialization: l.Specialization,
    subject: l.LecturerMajor ? l.LecturerMajor.MajorName : "-",
    major: l.LecturerMajor ? l.LecturerMajor.MajorName : "-",
    department: l.LecturerDepartment ? l.LecturerDepartment.DeptName : null,
    Dept_ID: l.Dept_ID,
    Major_ID: l.Major_ID,
  }));

  res.status(200).json({
    status: "SUCCESS",
    data: { users },
  });
});

exports.registeredAppointments = catchAsync(async (req, res, next) => {
  // Auto-reject pending appointments for expired slots
  const studentId = await getStudentIdFromUserId(req.user.id);
  if (studentId != null) {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const currentTime = now.toTimeString().slice(0, 8);
    
    // Find all student's pending appointments for expired slots
    const studentAppointments = await AppointmentModel.findAll({
      where: { Student_ID: studentId, Status: 'Pending' },
      include: [{ association: 'AvailableSlot', attributes: ['Date', 'EndTime'] }]
    });
    
    for (const apt of studentAppointments) {
      const p = apt.get ? apt.get({ plain: true }) : apt;
      if (p.AvailableSlot) {
        const slotDate = p.AvailableSlot.Date;
        const slotEnd = p.AvailableSlot.EndTime;
        
        // Check if appointment is past
        if (slotDate < today || (slotDate === today && slotEnd <= currentTime)) {
          await apt.update({ Status: 'Rejected' });
        }
      }
    }
  }

  const appointments = await getRegisteredAppointments(req.user.id);
  res.status(200).json({
    status: "Success",
    appointments,
  });
});

exports.getLecturerById = catchAsync(async (req, res, next) => {
  const lecturer = await Lecturer.findByPk(req.params.id, {
    include: [
      { model: User, as: 'LecturerUser', required: false },
      { model: Department, as: 'LecturerDepartment', required: false },
      { model: Major, as: 'LecturerMajor', required: false },
    ],
  });
  if (!lecturer) return next(new AppError("Giảng viên không tồn tại", 404));
  
  // Auto-reject pending appointments for expired slots
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const currentTime = now.toTimeString().slice(0, 8);
  
  // Find all pending appointments for this lecturer's expired slots
  const expiredSlots = await AvailableSlot.findAll({
    where: {
      Lecturer_ID: req.params.id,
      [Op.or]: [
        { Date: { [Op.lt]: today } },
        { Date: today, EndTime: { [Op.lte]: currentTime } },
      ],
    },
    attributes: ['Slot_ID']
  });
  
  const expiredSlotIds = expiredSlots.map(s => s.Slot_ID);
  if (expiredSlotIds.length > 0) {
    // Reject all pending appointments for expired slots
    await AppointmentModel.update(
      { Status: 'Rejected' },
      {
        where: {
          Slot_ID: { [Op.in]: expiredSlotIds },
          Status: 'Pending'
        }
      }
    );
  }
  
  const plain = lecturer.get ? lecturer.get({ plain: true }) : lecturer;
  res.status(200).json({
    status: "SUCCESS",
    data: {
      lecturer: {
        _id: plain.Lecturer_ID,
        name: plain.Full_Name,
        email: plain.Email,
        picture: plain.picture || null,
        avatar: plain.picture || null,
        phone: plain.Phone,
        academicRank: plain.Academic_Rank,
        officeRoom: plain.Office_Room,
        specialization: plain.Specialization,
        department: plain.LecturerDepartment ? plain.LecturerDepartment.DeptName : null,
        major: plain.LecturerMajor ? plain.LecturerMajor.MajorName : null,
        Dept_ID: plain.Dept_ID,
        Major_ID: plain.Major_ID,
        Bio: plain.Bio || null,
        bio: plain.Bio || null,
      },
    },
  });
});

exports.cancelAppointment = catchAsync(async (req, res, next) => {
  const appointmentId = req.params.id;
  const userId = req.user.id;
  const studentId = await getStudentIdFromUserId(userId);
  
  if (studentId == null) {
    return next(new AppError("Student profile not found", 404));
  }

  const appointment = await AppointmentModel.findByPk(appointmentId);
  if (!appointment) {
    return next(new AppError("Appointment not found", 404));
  }

  // Check if appointment belongs to current user
  if (Number(appointment.Student_ID) !== Number(studentId)) {
    return next(new AppError("Unauthorized - cannot delete other user's appointment", 403));
  }

  // Only allow cancellation if status is Pending (not Approved or Rejected)
  if (appointment.Status !== 'Pending') {
    return next(new AppError(`Cannot cancel appointment with status "${appointment.Status}"`, 400));
  }

  await appointment.destroy();

  res.status(200).json({
    status: "SUCCESS",
    message: "Appointment cancelled successfully",
    data: { appointmentId },
  });
});

exports.getLecturerSlots = catchAsync(async (req, res, next) => {
  const lecturerId = req.params.id;
  // IMPORTANT:
  // Không hard-delete trong GET endpoint (tránh side effects và lỗi FK).
  // Chỉ loại slot quá hạn khỏi kết quả trả về.
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const currentTime = now.toTimeString().slice(0, 8);
  
  // Find expired slots
  const expiredSlots = await AvailableSlot.findAll({
    where: {
      Lecturer_ID: lecturerId,
      [Op.or]: [
        { Date: { [Op.lt]: today } },
        { Date: today, EndTime: { [Op.lte]: currentTime } },
      ],
    },
  });
  
  // Reject pending appointments for expired slots
  for (const slot of expiredSlots) {
    await AppointmentModel.update(
      { Status: 'Rejected' },
      { where: { Slot_ID: slot.Slot_ID, Status: 'Pending' } }
    );
  }

  const slots = await AvailableSlot.findAll({
    where: {
      Lecturer_ID: lecturerId,
      [Op.or]: [
        { Date: { [Op.gt]: today } },
        { Date: today, EndTime: { [Op.gt]: currentTime } },
      ],
    },
    order: [
      ["Date", "ASC"],
      ["StartTime", "ASC"],
    ],
  });
  const list = slots.map((s) => (s.get ? s.get({ plain: true }) : s));
  res.status(200).json({ status: "SUCCESS", data: { slots: list }, meta: { removed: 0 } });
});

// Lấy các cuộc hẹn đã đặt cho một slot (include Student alias)
exports.getSlotAppointments = catchAsync(async (req, res, next) => {
  const slotId = req.params.id;
  const rows = await AppointmentModel.findAll({
    where: { Slot_ID: slotId },
    include: [{ model: Student, as: "AppointmentStudent" }]
  });
  const list = rows.map((r) => (r.get ? r.get({ plain: true }) : r));
  res.status(200).json({ status: "SUCCESS", data: { appointments: list } });
});

const buildStudentNotifications = async (studentId) => {
  const rows = await AppointmentModel.findAll({
    where: { Student_ID: studentId },
    include: [
      {
        model: AvailableSlot,
        as: "AvailableSlot",
        required: false,
        include: [
          {
            model: Lecturer,
            as: "SlotLecturer",
            required: false,
            include: [{ model: User, as: "LecturerUser", required: false }],
          },
        ],
      },
    ],
    order: [["Appoint_ID", "DESC"]],
  });

  const toViDateTime = (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return "N/A";
    const dt = new Date(`${dateStr}T${timeStr}`);
    if (Number.isNaN(dt.getTime())) return `${dateStr} ${String(timeStr).slice(0, 5)}`;
    return dt.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const appointmentNotifications = rows
    .map((row) => {
      const p = row.get ? row.get({ plain: true }) : row;
      const status = String(p.Status || "").toLowerCase();
      const lecturerName =
        p.AvailableSlot?.SlotLecturer?.Full_Name ||
        p.AvailableSlot?.SlotLecturer?.LecturerUser?.Full_Name ||
        "Giảng viên";
      const start = String(p.StuStartTime || p.AvailableSlot?.StartTime || "").slice(0, 5);
      const end = String(p.StuEndTime || p.AvailableSlot?.EndTime || "").slice(0, 5);
      const slotDate = p.AvailableSlot?.Date || null;
      const timeLabel = start && end ? `${start} - ${end}` : "N/A";
      const slotDateTime = toViDateTime(slotDate, p.StuStartTime || p.AvailableSlot?.StartTime);
      const locationLabel = p.Location ? ` tại ${p.Location}` : "";
      const adjustmentReason = p.AdjustmentNote ? ` Lý do điều chỉnh: ${p.AdjustmentNote}.` : "";
      const rejectionReason = p.RejectionReason ? ` Lý do: ${p.RejectionReason}.` : "";
      const createdAt = p.HandledAt || p.AdjustedAt || p.RequestedAt || `${slotDate || new Date().toISOString().slice(0, 10)}T${p.StuStartTime || "00:00:00"}`;

      if (p.AdjustedAt || p.AdjustmentNote || p.AdjustedBy) {
        return {
          id: `adjusted-${p.Appoint_ID}`,
          type: "appointment_adjusted",
          title: "Yêu cầu tư vấn đã được duyệt và điều chỉnh thời gian",
          message: `${lecturerName} đã duyệt yêu cầu tư vấn của bạn${locationLabel} và điều chỉnh thời gian thành ${timeLabel}${slotDate ? ` vào ${slotDate}` : ""}.${adjustmentReason}`,
          read: false,
          createdAt,
          appointmentId: p.Appoint_ID,
        };
      }

      if (status.includes("approved") || status.includes("đã duyệt")) {
        return {
          id: `approved-${p.Appoint_ID}`,
          type: "appointment_approved",
          title: "Yêu cầu tư vấn đã được duyệt",
          message: `${lecturerName} đã duyệt lịch tư vấn của bạn${locationLabel} (${timeLabel}) vào ${slotDateTime}.${adjustmentReason}`,
          read: false,
          createdAt,
          appointmentId: p.Appoint_ID,
        };
      }

      if (status.includes("rejected") || status.includes("từ chối")) {
        return {
          id: `rejected-${p.Appoint_ID}`,
          type: "appointment_rejected",
          title: "Yêu cầu tư vấn bị từ chối",
          message: `${lecturerName} đã từ chối lịch tư vấn của bạn${locationLabel}.${rejectionReason}`,
          read: false,
          createdAt,
          appointmentId: p.Appoint_ID,
        };
      }

      return null;
    })
    .filter(Boolean);

  const systemNotifications = await Notification.findAll({
    where: {
      Target_Role: { [Op.in]: ['Student', 'All'] },
    },
    order: [['Created_At', 'DESC']],
  });

  const systemNotes = systemNotifications.map((note) => ({
    id: `systemdb-${note.Noti_ID}`,
    type: 'system',
    title: note.Title,
    message: note.Content,
    createdAt: note.Created_At,
    read: false,
  }));

  return [...systemNotes, ...appointmentNotifications].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

const attachStudentReadStatus = async (notifications, userId) => {
  const notificationKeys = notifications.map((notification) => notification.id).filter(Boolean);
  const readMap = await getReadMapForUser(userId, notificationKeys);
  return notifications.map((notification) => ({
    ...notification,
    read: !!readMap[notification.id],
  }));
};

exports.getNotifications = catchAsync(async (req, res, next) => {
  const studentId = await getStudentIdFromUserId(req.user.id);
  if (studentId == null) {
    return next(new AppError("Student profile not found", 404));
  }

  const notifications = await buildStudentNotifications(studentId);
  const notificationsWithRead = await attachStudentReadStatus(notifications, req.user.id);

  res.status(200).json({ status: "SUCCESS", data: notificationsWithRead });
});

exports.markNotificationRead = catchAsync(async (req, res, next) => {
  const notificationKey = req.params.id;
  if (!notificationKey) {
    return next(new AppError("Notification id is required", 400));
  }

  await markNotificationKeyAsRead(req.user.id, notificationKey);
  res.status(200).json({ status: "SUCCESS", data: { id: notificationKey } });
});

exports.markAllNotificationsRead = catchAsync(async (req, res, next) => {
  const studentId = await getStudentIdFromUserId(req.user.id);
  if (studentId == null) {
    return next(new AppError("Student profile not found", 404));
  }

  const notifications = await buildStudentNotifications(studentId);
  const notificationKeys = notifications.map((notification) => notification.id).filter(Boolean);
  await markNotificationKeysAsRead(req.user.id, notificationKeys);

  res.status(200).json({ status: "SUCCESS", data: { marked: notificationKeys.length } });
});

exports.getDashboardStats = catchAsync(async (req, res, next) => {
  const studentId = await getStudentIdFromUserId(req.user.id);
  if (studentId == null) {
    return next(new AppError("Student profile not found", 404));
  }

  // Auto-reject pending appointments for expired slots
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const currentTime = now.toTimeString().slice(0, 8);
  
  // Find all student's pending appointments for expired slots
  const studentAppointments = await AppointmentModel.findAll({
    where: { Student_ID: studentId, Status: 'Pending' },
    include: [{ association: 'AvailableSlot', attributes: ['Date', 'EndTime'] }]
  });
  
  for (const apt of studentAppointments) {
    const p = apt.get ? apt.get({ plain: true }) : apt;
    if (p.AvailableSlot) {
      const slotDate = p.AvailableSlot.Date;
      const slotEnd = p.AvailableSlot.EndTime;
      
      // Check if appointment is past
      if (slotDate < today || (slotDate === today && slotEnd <= currentTime)) {
        await apt.update({ Status: 'Rejected' });
      }
    }
  }

  // Get all student appointments with lecturer info (only upcoming and valid ones)
  const appointments = await AppointmentModel.findAll({
    where: {
      Student_ID: studentId,
      Status: { [Op.in]: ['Pending', 'Approved'] } // Only get active appointments
    },
    include: [
      {
        association: 'AvailableSlot',
        include: [
          {
            association: 'SlotLecturer',
            include: [
              {
                association: 'LecturerUser',
                required: false
              },
              {
                association: 'LecturerMajor',
                required: false
              }
            ]
          }
        ]
      }
    ]
  });

  // Convert to legacy format and filter out expired appointments
  const formattedAppointmentsData = appointments.map(row => {
    const p = row.get ? row.get({ plain: true }) : row;

    // Skip appointments with missing slots
    if (!p.AvailableSlot) return null;

    let scheduleAt;
    try {
      if (p.AvailableSlot && p.AvailableSlot.Date) {
        const dateStr = p.AvailableSlot.Date;
        const timeStr = p.StuStartTime || p.AvailableSlot.StartTime || '00:00:00';
        scheduleAt = new Date(`${dateStr}T${timeStr}`).toISOString();
      } else {
        scheduleAt = new Date().toISOString();
      }
    } catch (e) {
      scheduleAt = new Date().toISOString();
    }

    // Check if appointment is expired (past due)
    const scheduleDate = new Date(scheduleAt);
    if (scheduleDate < now) {
      return null; // Skip expired appointments
    }

    // Get lecturer info using same logic as getRegisteredAppointments
    const lecturer = p.AvailableSlot?.SlotLecturer || {};
    const user = lecturer.LecturerUser || {};
    const major = lecturer.LecturerMajor || {};
    const lecturerName = lecturer.Full_Name || 'Giảng viên';
    const majorName = major.MajorName || null;

    return {
      ...p,
      Status: p.Status,
      scheduleAt: scheduleAt,
      lecturerName: lecturerName,
      domain: majorName
    };
  }).filter(apt => apt !== null); // Remove null entries (missing slots or expired appointments)

  // Get ALL student appointments for stats calculation
  const allAppointments = await AppointmentModel.findAll({
    where: { Student_ID: studentId },
    include: [
      {
        association: 'AvailableSlot',
        include: [
          {
            association: 'SlotLecturer',
            include: [
              {
                association: 'LecturerUser',
                required: false
              },
              {
                association: 'LecturerMajor',
                required: false
              }
            ]
          }
        ]
      }
    ]
  });

  // Calculate stats from ALL appointments
  const stats = {
    upcoming: 0,
    pending: 0,
    completed: 0,
    cancelled: 0,
    expired: 0,
  };

  allAppointments.forEach(row => {
    const p = row.get ? row.get({ plain: true }) : row;
    const status = p.Status || 'Pending';

    // Check if appointment has valid slot and is not expired
    let isUpcoming = false;
    if (p.AvailableSlot) {
      const slotDate = p.AvailableSlot.Date;
      const slotEnd = p.AvailableSlot.EndTime;
      if (slotDate && slotEnd) {
        const slotEndDateTime = new Date(`${slotDate}T${slotEnd}`);
        if (slotEndDateTime > now && (status === 'Pending' || status === 'Approved')) {
          isUpcoming = true;
        }
      }
    }

    if (status.toLowerCase().includes('completed')) {
      stats.completed++;
    } else if (status.toLowerCase().includes('cancelled') || status.toLowerCase().includes('rejected')) {
      stats.cancelled++;
    } else if (status.toLowerCase().includes('expired')) {
      stats.expired++;
    } else if (status.toLowerCase().includes('pending')) {
      stats.pending++;
      if (isUpcoming) stats.upcoming++;
    } else if (status.toLowerCase().includes('approved')) {
      if (isUpcoming) stats.upcoming++;
    }
  });

  // Return only upcoming appointments for display
  const recentAppointments = formattedAppointmentsData
    .filter(apt => apt.scheduleAt)
    .sort((a, b) => new Date(b.scheduleAt) - new Date(a.scheduleAt))
    .slice(0, 3);

  // Format recent appointments for frontend
  const formattedAppointments = recentAppointments.map(apt => {
    const scheduleDate = new Date(apt.scheduleAt);
    
    return {
      id: apt.Appoint_ID,
      Appoint_ID: apt.Appoint_ID,
      lecturerName: apt.lecturerName || 'Giảng viên',
      domain: apt.domain || 'Chưa xác định',
      date: scheduleDate.toLocaleDateString('vi-VN'),
      time: scheduleDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      location: apt.Location || 'Chưa xác định',
      status: apt.Status
    };
  });

  res.status(200).json({
    status: "SUCCESS",
    data: {
      ...stats,
      recentAppointments: formattedAppointments
    }
  });
});

exports.getDepartments = catchAsync(async (req, res, next) => {
  const list = await Department.findAll({ order: [["Dept_ID", "ASC"]] });
  res.status(200).json({ status: "SUCCESS", data: { departments: list } });
});

// Export getSlotById
exports.getSlotById = catchAsync(async (req, res, next) => {
  const slotId = req.params.id;
  
  const AvailableSlot = require('../models/AvailableSlot');
  
  const slot = await AvailableSlot.findOne({
    where: { Slot_ID: slotId },
    include: [
      {
        association: 'SlotLecturer',
        include: [
          { 
            association: 'LecturerUser',
            required: false 
          },
          {
            association: 'LecturerMajor',
            required: false
          }
        ]
      }
    ]
  });
  
  if (!slot) {
    return next(new AppError("Slot not found", 404));
  }
  
  const slotData = slot.get ? slot.get({ plain: true }) : slot;

  // check expiration and remove if necessary
  try {
    const endDateTime = new Date(`${slotData.Date}T${slotData.EndTime}`);
    if (endDateTime <= new Date()) {
      await slot.destroy();
      return next(new AppError("Slot has expired", 404));
    }
  } catch (e) {
    // ignore parsing errors
  }
  
  // Format lecturer info
  const lecturer = slotData.SlotLecturer || {};
  const user = lecturer.LecturerUser || {};
  const major = lecturer.LecturerMajor || {};
  
  const formattedSlot = {
    ...slotData,
    lecturer: {
      Lecturer_ID: lecturer.Lecturer_ID,
      Full_Name: user.Full_Name || lecturer.Full_Name,
      Major: {
        MajorName: major.MajorName
      }
    }
  };
  
  res.status(200).json({
    status: "SUCCESS",
    data: {
      slot: formattedSlot
    }
  });
});
