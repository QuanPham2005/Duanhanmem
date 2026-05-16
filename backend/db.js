require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');

// Lấy thông tin kết nối từ .env
const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_NAME = process.env.DB_NAME || 'udck';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASS = process.env.DB_PASS ?? '';
const DB_PORT = process.env.DB_PORT || 3306;

// URL kết nối
const envUrl = (process.env.DATABASE_URL || process.env.DB_URL || '').trim();
const DATABASE_URL =
  envUrl || `mysql://${DB_USER}:${encodeURIComponent(DB_PASS)}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;

const sequelize = new Sequelize(DATABASE_URL, {
  logging: false,
  dialectOptions: {
    charset: 'utf8mb4',
    supportBigNumbers: true,
    bigNumberStrings: true,
    ssl: {
      minVersion: 'TLSv1.2',
      rejectUnauthorized: false
    }
  }
});

const connectToDB = async () => {
  try {
    await sequelize.authenticate();

    require('./models/User2');
    require('./models/Student');
    require('./models/Lecturer');
    require('./models/Admin');
    require('./models/Appointment');
    require('./models/Department');
    require('./models/Major');
    require('./models/AvailableSlot');
    require('./models/Notification');
    require('./models/NotificationRead');

    await sequelize.sync({ alter: false });

    const [cols] = await sequelize.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'USERS' AND COLUMN_NAME = 'loginAttempts'`
    );
    if (!cols.length) {
      await sequelize.query(`ALTER TABLE USERS ADD COLUMN loginAttempts INT NOT NULL DEFAULT 0`);
    }

    const [notificationCols] = await sequelize.query(
      `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'NOTIFICATIONS' AND COLUMN_NAME = 'Target_Role'`
    );
    if (notificationCols.length && !notificationCols[0].COLUMN_TYPE.includes("'All'")) {
      await sequelize.query(
        `ALTER TABLE NOTIFICATIONS MODIFY Target_Role ENUM('Admin','Student','Lecturer','All') NOT NULL DEFAULT 'All'`
      );
    }

    const [appointmentHandledCols] = await sequelize.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'APPOINTMENTS' AND COLUMN_NAME = 'HandledAt'`
    );
    if (!appointmentHandledCols.length) {
      await sequelize.query(`ALTER TABLE APPOINTMENTS ADD COLUMN HandledAt DATETIME NULL`);
    }

    const [appointmentCancellationCols] = await sequelize.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'APPOINTMENTS' AND COLUMN_NAME = 'CancellationReason'`
    );
    if (!appointmentCancellationCols.length) {
      await sequelize.query(`ALTER TABLE APPOINTMENTS ADD COLUMN CancellationReason TEXT NULL`);
    }

    const [appointmentStatusType] = await sequelize.query(
      `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'APPOINTMENTS' AND COLUMN_NAME = 'Status'`
    );
    if (appointmentStatusType.length && !appointmentStatusType[0].COLUMN_TYPE.includes("'Cancelled'")) {
      await sequelize.query(
        `ALTER TABLE APPOINTMENTS MODIFY Status ENUM('Pending','Approved','Rejected','Cancelled') NOT NULL DEFAULT 'Pending'`
      );
    }
  } catch (err) {
    console.error(
      'Unable to connect to MySQL. Check your `.env` values for DB_URL/DATABASE_URL or DB_HOST/DB_NAME/DB_USER/DB_PASS/DB_PORT.'
    );
    throw err;
  }
};

module.exports = { connectToDB, sequelize, DataTypes };