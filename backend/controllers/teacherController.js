const User = require("../models/User2");
const Student = require("../models/Student");
const Lecturer = require("../models/Lecturer");
const { Appointment, AppointmentModel } = require("../models/Appointment");
const AvailableSlot = require("../models/AvailableSlot");
const Notification = require("../models/Notification");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const { Op } = require("sequelize");
const {
  getReadMapForUser,
  markNotificationKeyAsRead,
  markNotificationKeysAsRead,
} = require("./notificationHelper");

const getLecturerIdFromUserId = async (userId) => {
  const row = await Lecturer.findOne({ where: { User_ID: userId } });
  return row ? row.Lecturer_ID : null;
};

const getCurrentDateTimeStrings = () => {
  const now = new Date();
  return {
    today: now.toISOString().slice(0, 10),
    currentTime: now.toTimeString().slice(0, 8),
  };
};

const isSlotExpired = (slot) => {
  if (!slot || !slot.Date || !slot.EndTime) return false;
  const { today, currentTime } = getCurrentDateTimeStrings();
  return slot.Date < today || (slot.Date === today && slot.EndTime <= currentTime);
};

const rejectPendingAppointmentsForSlots = async (slotIds) => {
  if (!slotIds || slotIds.length === 0) return;
  await AppointmentModel.update(
    {
      Status: 'Rejected',
      RejectionReason: 'Khung giờ đã quá hạn',
      HandledAt: new Date(),
    },
    {
      where: {
        Slot_ID: { [Op.in]: slotIds },
        Status: 'Pending',
      },
    }
  );
};

const deleteRejectedAppointmentsForSlot = async (slotId) => {
  await AppointmentModel.destroy({
    where: { Slot_ID: slotId, Status: 'Rejected' },
  });
};

// Lấy tất cả sinh viên
exports.getAllStudents = catchAsync(async (req, res, next) => {
  const students = await Student.findAll({ include: [User] });
  res.status(200).json({ status: "SUCCESS", data: { students } });
});

// Lấy tất cả lịch hẹn của giảng viên (qua Slot_ID thuộc các slot của GV)
exports.getAllAppointments = catchAsync(async (req, res, next) => {
  const lecturerId = await getLecturerIdFromUserId(req.user.id);
  if (!lecturerId) return res.status(404).json({ status: "FAIL", message: "Lecturer profile not found" });
  const slots = await AvailableSlot.findAll({ where: { Lecturer_ID: lecturerId }, attributes: ["Slot_ID"] });
  const slotIds = slots.map((s) => s.Slot_ID);
  if (slotIds.length === 0) return res.status(200).json({ status: "SUCCESS", data: { appointments: [] } });
  const rows = await Appointment.findAll({ 
    where: { Slot_ID: { [Op.in]: slotIds } }, 
    include: [
      { model: Student, as: 'AppointmentStudent' },
      { model: User, as: 'AdjustedUser' },
      { model: AvailableSlot, as: 'AvailableSlot' }
    ],
    order: [
      ['HandledAt', 'DESC'],
      ['AdjustedAt', 'DESC'],
      ['RequestedAt', 'DESC'],
      ['Appoint_ID', 'DESC'],
    ]
  });
  const appointments = rows.map((r) => (r.get ? r.get({ plain: true }) : r));
  res.status(200).json({ status: "SUCCESS", data: { appointments } });
});

// Tạo lịch hẹn
exports.createAppointment = catchAsync(async (req, res, next) => {
  const { Slot_ID, Student_ID, Location, StuStartTime, StuEndTime, Reason } = req.body;

  const newAppointment = await Appointment.create({
    Lecturer_ID: req.user.id,
    Slot_ID,
    Student_ID,
    Location,
    StuStartTime,
    StuEndTime,
    Reason,
    Status: "Pending"
  });

  res.status(200).json({ status: "SUCCESS", data: { newAppointment } });
});

// Xóa lịch hẹn
exports.deleteAppointment = catchAsync(async (req, res, next) => {
  await Appointment.destroy({ where: { Appoint_ID: req.params.id } });
  res.status(200).json({ status: "SUCCESS", message: "Appointment deleted" });
});

// Duyệt lịch hẹn
exports.approveAppointment = catchAsync(async (req, res, next) => {
  try {
    const locationValue = String(req.body?.Location || req.body?.location || "").trim();
    await Appointment.update(
      { Status: "Approved", ...(locationValue ? { Location: locationValue } : {}), HandledAt: new Date() },
      { where: { Appoint_ID: req.params.id } }
    );

    const appointment = await Appointment.findByPk(req.params.id, { include: [{ model: Student, as: 'AppointmentStudent' }] });
    if (!appointment) {
      console.error("Appointment not found for ID:", req.params.id);
      return res.status(404).json({ status: "FAIL", message: "Appointment not found" });
    }

    res.status(200).json({ status: "SUCCESS", message: "Appointment approved" });
  } catch (error) {
    console.error("Error in approveAppointment:", error);
    next(new AppError("Internal Server Error", 500));
  }
});

// Từ chối lịch hẹn với lý do
exports.disapproveAppointment = catchAsync(async (req, res, next) => {
  try {
    const { rejectionReason } = req.body;
    await Appointment.update(
      { 
        Status: "Rejected", 
        RejectionReason: rejectionReason || "Không có lý do cụ thể",
        HandledAt: new Date(),
      },
      { where: { Appoint_ID: req.params.id } }
    );

    const appointment = await Appointment.findByPk(req.params.id, { include: [{ model: Student, as: 'AppointmentStudent' }] });
    res.status(200).json({ status: "SUCCESS", message: "Appointment rejected" });
  } catch (error) {
    console.error("Error in disapproveAppointment:", error);
    next(new AppError("Internal Server Error", 500));
  }
});

// Điều chỉnh thời gian lịch hẹn
exports.adjustAppointment = catchAsync(async (req, res, next) => {
  try {
    const { StuStartTime, StuEndTime, adjustmentNote } = req.body;
    const lecturerId = await getLecturerIdFromUserId(req.user.id);
    if (!lecturerId) {
      console.error("Lecturer profile not found for user ID:", req.user.id);
      return next(new AppError("Lecturer profile not found", 404));
    }

    const appointment = await Appointment.findByPk(req.params.id, { 
      include: [{ model: AvailableSlot, as: 'AvailableSlot' }] 
    });

    if (!appointment) {
      console.error("Appointment not found for ID:", req.params.id);
      return next(new AppError("Appointment not found", 404));
    }

    await Appointment.update(
      { StuStartTime, StuEndTime, AdjustmentNote: adjustmentNote, AdjustedAt: new Date(), HandledAt: new Date() },
      { where: { Appoint_ID: req.params.id } }
    );

    res.status(200).json({ status: "SUCCESS", message: "Appointment adjusted successfully" });
  } catch (error) {
    console.error("Error in adjustAppointment:", error);
    next(new AppError("Internal Server Error", 500));
  }
});

// Danh sách yêu cầu chờ duyệt (Pending)
exports.getPendingAppointments = catchAsync(async (req, res, next) => {
  const lecturerId = await getLecturerIdFromUserId(req.user.id);
  if (!lecturerId) return res.status(404).json({ status: "FAIL", message: "Lecturer profile not found" });
  const slots = await AvailableSlot.findAll({ where: { Lecturer_ID: lecturerId }, attributes: ["Slot_ID"] });
  const slotIds = slots.map((s) => s.Slot_ID);
  if (slotIds.length === 0) return res.status(200).json({ status: "SUCCESS", data: { appointments: [] } });
  const rows = await Appointment.findAll({
    where: { Slot_ID: { [Op.in]: slotIds }, Status: "Pending" },
    include: [
      { model: Student, as: 'AppointmentStudent' },
      { model: User, as: 'AdjustedUser' }
    ],
    order: [
      ['RequestedAt', 'DESC'],
      ['Appoint_ID', 'DESC'],
    ]
  });
  const appointments = rows.map((r) => (r.get ? r.get({ plain: true }) : r));
  res.status(200).json({ status: "SUCCESS", data: { appointments } });
});

// Chi tiết yêu cầu tư vấn (1 appointment)
exports.getAppointmentById = catchAsync(async (req, res, next) => {
  const lecturerId = await getLecturerIdFromUserId(req.user.id);
  if (!lecturerId) return next(new AppError("Lecturer profile not found", 404));
  const appointment = await Appointment.findByPk(req.params.id, { include: [{ model: Student, as: 'AppointmentStudent' }] });
  if (!appointment) return next(new AppError("Appointment not found", 404));
  const slotIds = (await AvailableSlot.findAll({ where: { Lecturer_ID: lecturerId }, attributes: ["Slot_ID"] })).map((s) => s.Slot_ID);
  if (!slotIds.includes(appointment.Slot_ID)) return next(new AppError("Not your appointment", 403));
  res.status(200).json({ status: "SUCCESS", data: { appointment: appointment.get ? appointment.get({ plain: true }) : appointment } });
});

// ---- Khung giờ rảnh (slots) ----
exports.getMySlots = catchAsync(async (req, res, next) => {
  const lecturerId = await getLecturerIdFromUserId(req.user.id);
  if (!lecturerId) return next(new AppError("Lecturer profile not found", 404));

  // Quá hạn: ngày cũ hoặc đã qua giờ kết thúc trong ngày hiện tại
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const currentTime = now.toTimeString().slice(0, 8); // HH:MM:SS

  // Tìm các slot quá hạn của giảng viên
  const expiredSlots = await AvailableSlot.findAll({
    where: {
      Lecturer_ID: lecturerId,
      [Op.or]: [
        { Date: { [Op.lt]: today } },
        { Date: today, EndTime: { [Op.lte]: currentTime } },
      ],
    },
  });

  const expiredSlotIds = expiredSlots.map((s) => s.Slot_ID);

  // Tự động chuyển các yêu cầu pending thuộc slot quá hạn thành rejected
  await rejectPendingAppointmentsForSlots(expiredSlotIds);

  // IMPORTANT:
  // GET endpoint không được xóa dữ liệu để tránh side effect và tránh lỗi FK.
  // Slot quá hạn sẽ được loại khỏi kết quả trả về thay vì hard-delete tại đây.
  const removedCount = expiredSlotIds.length;

  // Chỉ trả về slot còn hợp lệ để frontend không thấy slot đã quá hạn/ngày cũ
  const slots = await AvailableSlot.findAll({
    where: {
      Lecturer_ID: lecturerId,
      [Op.or]: [
        { Date: { [Op.gt]: today } },
        { Date: today, EndTime: { [Op.gt]: currentTime } },
      ],
    },
    order: [["Date", "ASC"], ["StartTime", "ASC"]],
  });

  const slotsWithFlag = slots.map((s) => (s.get ? s.get({ plain: true }) : s));

  res.status(200).json({
    status: "SUCCESS",
    data: { slots: slotsWithFlag },
    meta: { removed: removedCount }
  });
});

exports.createSlot = catchAsync(async (req, res, next) => {
  const lecturerId = await getLecturerIdFromUserId(req.user.id);
  if (!lecturerId) return next(new AppError("Lecturer profile not found", 404));
  const { Date: slotDate, StartTime, EndTime } = req.body;

  // prevent creating slots in the past
  const now = new Date();
  const slotDateObj = new Date(slotDate);
  if (
    slotDateObj < new Date(now.toISOString().slice(0, 10)) ||
    (slotDateObj.toISOString().slice(0, 10) === now.toISOString().slice(0, 10) && EndTime <= now.toTimeString().slice(0, 8))
  ) {
    return next(new AppError("Cannot create a slot that has already ended", 400));
  }

  const slot = await AvailableSlot.create({
    Lecturer_ID: lecturerId,
    Date: slotDate,
    StartTime,
    EndTime,
    IsBooked: false,
  });
  res.status(200).json({ status: "SUCCESS", data: { slot: slot.get ? slot.get({ plain: true }) : slot } });
});

exports.updateSlot = catchAsync(async (req, res, next) => {
  const lecturerId = await getLecturerIdFromUserId(req.user.id);
  if (!lecturerId) return next(new AppError("Lecturer profile not found", 404));
  const slot = await AvailableSlot.findByPk(req.params.id);
  if (!slot || slot.Lecturer_ID !== lecturerId) return next(new AppError("Slot not found", 404));

  // if updating to a past time remove or reject
  if (req.body.Date || req.body.EndTime) {
    const newDate = req.body.Date || slot.Date;
    const newEnd = req.body.EndTime || slot.EndTime;
    const now = new Date();
    const slotDateObj = new Date(newDate);
    if (
      slotDateObj < new Date(now.toISOString().slice(0, 10)) ||
      (slotDateObj.toISOString().slice(0, 10) === now.toISOString().slice(0, 10) && newEnd <= now.toTimeString().slice(0, 8))
    ) {
      return next(new AppError("Cannot update slot to a time that has already ended", 400));
    }
  }

  await slot.update(req.body);
  res.status(200).json({ status: "SUCCESS", data: { slot: slot.get ? slot.get({ plain: true }) : slot } });
});

exports.deleteSlot = catchAsync(async (req, res, next) => {
  const lecturerId = await getLecturerIdFromUserId(req.user.id);
  if (!lecturerId) return next(new AppError("Lecturer profile not found", 404));
  const slot = await AvailableSlot.findByPk(req.params.id);
  if (!slot || slot.Lecturer_ID !== lecturerId) return next(new AppError("Slot not found", 404));

  if (isSlotExpired(slot)) {
    await rejectPendingAppointmentsForSlots([slot.Slot_ID]);
  }

  const relatedAppointments = await AppointmentModel.findAll({ where: { Slot_ID: slot.Slot_ID } });
  const activeAppointments = relatedAppointments.filter((appointment) =>
    appointment.Status === 'Pending' || appointment.Status === 'Approved'
  );

  if (activeAppointments.length > 0) {
    return next(new AppError(
      "Không thể xóa khung giờ vì vẫn còn lịch hẹn đã duyệt hoặc đang chờ. Vui lòng xử lý những lịch hẹn này trước khi xóa.",
      400
    ));
  }

  if (relatedAppointments.length > 0) {
    await deleteRejectedAppointmentsForSlot(slot.Slot_ID);
  }

  await slot.destroy();
  res.status(200).json({ status: "SUCCESS", message: "Slot deleted" });
});

exports.getAllPendingStudents = exports.getPendingAppointments;

exports.getProfile = catchAsync(async (req, res, next) => {
  if (!req.user || !req.user.id) {
    return next(new AppError("User not authenticated or missing ID", 401));
  }

  const lecturerId = await getLecturerIdFromUserId(req.user.id);
  if (!lecturerId) {
    return next(new AppError("Lecturer profile not found", 404));
  }
  const lecturer = await Lecturer.findByPk(lecturerId, {
    include: [
      { model: require("../models/Department"), attributes: ["DeptName"] },
      { model: require("../models/Major"), attributes: ["MajorName"] }
    ]
  });

  if (!lecturer) {
    return next(new AppError("Lecturer not found", 404));
  }

  const plainLecturer = lecturer.get ? lecturer.get({ plain: true }) : lecturer;
  // Attach department and major names
  plainLecturer.DepartmentName = lecturer.Department ? lecturer.Department.DeptName : null;
  plainLecturer.MajorName = lecturer.Major ? lecturer.Major.MajorName : null;

  const response = { status: "SUCCESS", data: { lecturer: plainLecturer } };
  res.status(200).json(response);
});

exports.updateProfile = catchAsync(async (req, res, next) => {
  const lecturerId = await getLecturerIdFromUserId(req.user.id);
  if (!lecturerId) return next(new AppError("Lecturer profile not found", 404));
  const lecturer = await Lecturer.findByPk(lecturerId);
  if (!lecturer) return next(new AppError("Lecturer not found", 404));
  const { Full_Name, Email, profileImage, Phone, Academic_Rank, Office_Room, Specialization, Bio } = req.body;

  const updateData = {};
  if (Full_Name != null) updateData.Full_Name = Full_Name;
  if (Email != null) updateData.Email = Email;
  if (profileImage != null) updateData.picture = profileImage;
  if (Phone != null) updateData.Phone = Phone;
  if (Academic_Rank != null) updateData.Academic_Rank = Academic_Rank;
  if (Office_Room != null) updateData.Office_Room = Office_Room;
  if (Specialization != null) updateData.Specialization = Specialization;
  if (Bio != null) updateData.Bio = Bio;

  if (Object.keys(updateData).length > 0) {
    await lecturer.update(updateData);
  }

  // Reload from database to get the latest data
  const updatedLecturer = await Lecturer.findByPk(lecturerId);
  res.status(200).json({ status: "SUCCESS", data: { lecturer: updatedLecturer.get ? updatedLecturer.get({ plain: true }) : updatedLecturer } });
});

exports.changePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return next(new AppError("Please provide current and new password", 400));
  }
  const user = await User.findByPk(req.user.id);
  if (!user) return next(new AppError("User not found", 404));
  const isPasswordCorrect = await user.comparePassword(currentPassword);
  if (!isPasswordCorrect) {
    return next(new AppError("Current password is incorrect", 401));
  }
  user.Password = newPassword;
  await user.save();
  res.status(200).json({ status: "SUCCESS", message: "Password changed successfully" });
});

const buildLecturerNotifications = async (lecturerId) => {
  const slots = await AvailableSlot.findAll({
    where: { Lecturer_ID: lecturerId },
    attributes: ["Slot_ID"],
  });
  const slotIds = slots.map((s) => s.Slot_ID);
  if (slotIds.length === 0) {
    return [];
  }

  const rows = await Appointment.findAll({
    where: { Slot_ID: { [Op.in]: slotIds } },
    include: [
      { model: Student, as: "AppointmentStudent", required: false },
      { model: AvailableSlot, as: "AvailableSlot", required: false },
    ],
    order: [["Appoint_ID", "DESC"]],
  });

  const appointmentNotifications = rows.map((row) => {
    const p = row.get ? row.get({ plain: true }) : row;
    const studentName = p.AppointmentStudent?.Full_Name || `SV #${p.Student_ID || "N/A"}`;
    const status = String(p.Status || "").toLowerCase();
    const start = String(p.StuStartTime || p.AvailableSlot?.StartTime || "").slice(0, 5);
    const end = String(p.StuEndTime || p.AvailableSlot?.EndTime || "").slice(0, 5);
    const timeLabel = start && end ? `${start} - ${end}` : "N/A";
    const dateLabel = p.AvailableSlot?.Date ? new Date(p.AvailableSlot.Date).toLocaleDateString("vi-VN") : "";
    const locationLabel = p.Location ? ` tại ${p.Location}` : "";
    const adjustmentNote = p.AdjustmentNote ? ` Lý do: ${p.AdjustmentNote}.` : "";
    const rejectionReason = p.RejectionReason ? ` Lý do: ${p.RejectionReason}.` : "";
    const createdAt =
      p.HandledAt ||
      p.AdjustedAt ||
      p.RequestedAt ||
      (p.AvailableSlot?.Date ? `${p.AvailableSlot.Date}T${p.StuStartTime || p.AvailableSlot?.StartTime || "00:00:00"}` : new Date().toISOString());

    if (p.AdjustedAt) {
      return {
        id: `adjusted-${p.Appoint_ID}`,
        type: "request",
        title: "Yêu cầu tư vấn đã được điều chỉnh",
        message: `Yêu cầu của ${studentName} đã được điều chỉnh${locationLabel}. Thời gian mới: ${timeLabel}${dateLabel ? ` vào ${dateLabel}` : ""}.${adjustmentNote}`,
        createdAt,
        read: false,
        appointmentId: p.Appoint_ID,
      };
    }

    if (status.includes("pending") || status.includes("chờ")) {
      return {
        id: `pending-${p.Appoint_ID}`,
        type: "request",
        title: "Yêu cầu tư vấn mới",
        message: `${studentName} vừa gửi yêu cầu tư vấn${locationLabel} (${timeLabel})${dateLabel ? ` vào ${dateLabel}` : ""}.`,
        createdAt,
        read: false,
        appointmentId: p.Appoint_ID,
      };
    }

    if (status.includes("approved") || status.includes("đã duyệt")) {
      return {
        id: `approved-${p.Appoint_ID}`,
        type: "confirmed",
        title: "Yêu cầu đã được duyệt",
        message: `Bạn đã duyệt yêu cầu của ${studentName}${locationLabel}. Thời gian: ${timeLabel}${dateLabel ? ` vào ${dateLabel}` : ""}.${adjustmentNote}`,
        createdAt,
        read: false,
        appointmentId: p.Appoint_ID,
      };
    }

    if (status.includes("rejected") || status.includes("từ chối")) {
      return {
        id: `rejected-${p.Appoint_ID}`,
        type: "cancelled",
        title: "Yêu cầu đã bị từ chối",
        message: `Bạn đã từ chối yêu cầu của ${studentName}.${locationLabel}${rejectionReason}`,
        createdAt,
        read: false,
        appointmentId: p.Appoint_ID,
      };
    }

    return {
      id: `system-${p.Appoint_ID}`,
      type: "system",
      title: "Cập nhật lịch hẹn",
      message: `${studentName} (${timeLabel})${locationLabel}.${adjustmentNote}`,
      createdAt,
      read: false,
      appointmentId: p.Appoint_ID,
    };
  });

  const systemNotifications = await Notification.findAll({
    where: {
      Target_Role: { [Op.in]: ['Lecturer', 'All'] },
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

const attachLecturerReadStatus = async (notifications, userId) => {
  const notificationKeys = notifications.map((notification) => notification.id).filter(Boolean);
  const readMap = await getReadMapForUser(userId, notificationKeys);
  return notifications.map((notification) => ({
    ...notification,
    read: !!readMap[notification.id],
  }));
};

// Get notifications for lecturer (derived from appointment requests/status)
exports.getNotifications = catchAsync(async (req, res, next) => {
  const lecturerId = await getLecturerIdFromUserId(req.user.id);
  if (!lecturerId) {
    return next(new AppError("Lecturer profile not found", 404));
  }

  const notifications = await buildLecturerNotifications(lecturerId);
  const notificationsWithRead = await attachLecturerReadStatus(notifications, req.user.id);

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
  const lecturerId = await getLecturerIdFromUserId(req.user.id);
  if (!lecturerId) {
    return next(new AppError("Lecturer profile not found", 404));
  }

  const notifications = await buildLecturerNotifications(lecturerId);
  const notificationKeys = notifications.map((notification) => notification.id).filter(Boolean);
  await markNotificationKeysAsRead(req.user.id, notificationKeys);

  res.status(200).json({ status: "SUCCESS", data: { marked: notificationKeys.length } });
});