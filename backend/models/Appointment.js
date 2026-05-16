const { sequelize } = require('../db');
const { DataTypes } = require('sequelize');

const AppointmentModel = sequelize.define('Appointment', {
  Appoint_ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  Slot_ID: { type: DataTypes.INTEGER },
  Student_ID: { type: DataTypes.INTEGER },
  Lecturer_ID: { type: DataTypes.INTEGER },
  Location: { type: DataTypes.STRING(100) },
  StuStartTime: { type: DataTypes.TIME },
  StuEndTime: { type: DataTypes.TIME },
  Reason: { type: DataTypes.STRING(255) },
  Status: { type: DataTypes.ENUM('Pending','Approved','Rejected','Cancelled'), defaultValue: 'Pending' },
  RejectionReason: { type: DataTypes.TEXT },
  CancellationReason: { type: DataTypes.TEXT },
  AdjustedBy: { type: DataTypes.INTEGER },
  AdjustedAt: { type: DataTypes.DATE },
  AdjustmentNote: { type: DataTypes.TEXT },
  HandledAt: { type: DataTypes.DATE },
  RequestedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  tableName: 'APPOINTMENTS',
  timestamps: false
});

// Legacy wrapper to support existing code that uses the old appointment helper API.
function toLegacy(row) {
  if (!row) return null;
  const p = row.get ? row.get({ plain: true }) : row;
  
  // Reconstruct full datetime from Date and Time
  let scheduleAt;
  try {
    if (p.AvailableSlot && p.AvailableSlot.Date) {
      const dateStr = p.AvailableSlot.Date; // YYYY-MM-DD format
      const timeStr = p.StuStartTime || p.AvailableSlot.StartTime || '00:00:00'; // HH:MM:SS format
      const isoString = `${dateStr}T${timeStr}`;
      scheduleAt = new Date(isoString).toISOString();
    } else {
      scheduleAt = p.StuStartTime ? new Date(p.StuStartTime).toISOString() : new Date().toISOString();
    }
  } catch (e) {
    console.error('Error creating scheduleAt:', e, { AvailableSlot: p.AvailableSlot, StuStartTime: p.StuStartTime });
    scheduleAt = new Date().toISOString();
  }
  
  return { ...p, _id: p.Appoint_ID, scheduleAt: scheduleAt, name: p.name || '' };
}

const Appointment = {
  async find(filter) {
    const rows = await AppointmentModel.findAll({ where: filter || {} });
    return rows.map(r => toLegacy(r));
  },
  async findByStudentId(studentId) {
    const rows = await AppointmentModel.findAll({ 
      where: { Student_ID: studentId },
      include: [{ association: 'AvailableSlot', required: false }]
    });
    return rows.map(r => toLegacy(r));
  },
  async findOneByStudentId(studentId) {
    const row = await AppointmentModel.findOne({ where: { Student_ID: studentId } });
    return toLegacy(row);
  },
  async findOneAndUpdate(filter, update) {
    const id = filter && filter._id;
    if (id == null) return null;
    const row = await AppointmentModel.findByPk(id);
    if (!row) return null;
    if (update.Status != null) await row.update({ Status: update.Status });
    return toLegacy(row);
  },
  async findByIdAndUpdate(id, update) {
    const row = await AppointmentModel.findByPk(id);
    if (!row) return null;
    await row.update(update);
    return toLegacy(row);
  },
  async findByIdAndDelete(id) {
    const row = await AppointmentModel.findByPk(id);
    if (!row) return null;
    await row.destroy();
    return toLegacy(row);
  },
  async create(doc) {
    const row = await AppointmentModel.create(doc);
    return toLegacy(row);
  },
  async deleteMany(filter) {
    const where = filter || {};
    return await AppointmentModel.destroy({ where });
  }
};

Appointment.findAll = (...args) => AppointmentModel.findAll(...args);
Appointment.findByPk = (...args) => AppointmentModel.findByPk(...args);
Appointment.destroy = (...args) => AppointmentModel.destroy(...args);
Appointment.update = (...args) => AppointmentModel.update(...args);
Appointment.create = (doc) => AppointmentModel.create(doc).then(toLegacy);

module.exports = { AppointmentModel, Appointment };


