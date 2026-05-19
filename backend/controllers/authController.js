const User = require("../models/User2");
const Student = require("../models/Student");
const Lecturer = require("../models/Lecturer");
const Admin = require("../models/Admin");
const AppError = require("../utils/AppError");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const util = require("util");
const { Op } = require("sequelize");
const catchAsync = require("../utils/catchAsync");   // 👉 thêm dòng này

// Hàm kiểm tra mật khẩu: bcrypt hoặc plain
const isBcryptHash = (val) =>
  typeof val === "string" && (val.startsWith("$2a$") || val.startsWith("$2b$") || val.startsWith("$2y$"));

const verifyPassword = async (candidatePassword, userPassword) => {
  if (isBcryptHash(userPassword)) return await bcrypt.compare(candidatePassword, userPassword);
  return String(candidatePassword) === String(userPassword);
};

// Tạo JWT token
const signToken = (id, role, username, email) => {
  const secretKey = process.env.JWT_KEY || "dev_jwt_secret_change_me";
  return jwt.sign({ id, role, username, email }, secretKey, { expiresIn: "90d" });
};

exports.signToken = signToken;

// LOGIN: cho phép login bằng Username **hoặc** Email
exports.login = catchAsync(async (req, res, next) => {
  const { username: rawUsername, email: rawEmail, password } = req.body;
  let username = typeof rawUsername === 'string' ? rawUsername.trim() : rawUsername;
  let email = typeof rawEmail === 'string' ? rawEmail.trim() : rawEmail;

  // Normalize: if client accidentally sent an email inside `username`, treat it as email
  if (!email && typeof username === 'string' && username.includes('@')) {
    email = username;
    username = undefined;
  }

  const identifier = username || email;
  const isEmailInput = typeof identifier === 'string' && identifier.includes('@');

  if (!identifier || !password) {
    return next(new AppError("Không được bỏ trống tên đăng nhập/email hoặc mật khẩu", 400));
  }

  let user;
  let userEmail = null;
  let profile = null; // Student hoặc Lecturer để lấy Full_Name

  if (username) {
    // Login bằng Username explicit
    user = await User.findOne({ where: { Username: username } });
    if (user) {
      if (user.Role === "Admin") {
        const adminRow = await Admin.findOne({ where: { User_ID: user.ID } });
        if (adminRow) profile = adminRow;
      } else if (user.Role === "Student") {
        const student = await Student.findOne({ where: { User_ID: user.ID } });
        if (student) {
          profile = student;
          userEmail = student.Email;
        }
      } else if (user.Role === "Lecturer") {
        const lecturer = await Lecturer.findOne({ where: { User_ID: user.ID } });
        if (lecturer) {
          profile = lecturer;
          userEmail = lecturer.Email;
        }
      }
    }

    if (!user) {
      const student = await Student.findOne({
        where: { Full_Name: identifier },
        include: [{ model: User, as: "StudentUser" }],
      });
      if (student) {
        user = student.StudentUser;
        userEmail = student.Email;
        profile = student;
      } else {
        const lecturer = await Lecturer.findOne({
          where: { Full_Name: identifier },
          include: [{ model: User, as: "LecturerUser" }],
        });
        if (lecturer) {
          user = lecturer.LecturerUser;
          userEmail = lecturer.Email;
          profile = lecturer;
        }
      }
    }

    userEmail = userEmail || null;
  } else {
    // Login bằng email hoặc username qua trường email/identifier
    if (isEmailInput) {
      const student = await Student.findOne({
        where: { Email: email },
        include: [{ model: User, as: "StudentUser" }]   // 👉 alias khớp associations
      });
      if (student) {
        user = student.StudentUser;
        userEmail = student.Email;
        profile = student;
      } else {
        const lecturer = await Lecturer.findOne({
          where: { Email: email },
          include: [{ model: User, as: "LecturerUser" }]  // 👉 alias khớp associations
        });
        if (lecturer) {
          user = lecturer.LecturerUser;
          userEmail = lecturer.Email;
          profile = lecturer;
        }
      }
    } else {
      const student = await Student.findOne({
        include: [{
          model: User,
          as: "StudentUser",
          where: { Username: identifier },
        }],
      });
      if (student) {
        user = student.StudentUser;
        userEmail = student.Email;
        profile = student;
      } else {
        const lecturer = await Lecturer.findOne({
          include: [{
            model: User,
            as: "LecturerUser",
            where: { Username: identifier },
          }],
        });
        if (lecturer) {
          user = lecturer.LecturerUser;
          userEmail = lecturer.Email;
          profile = lecturer;
        }
      }

      if (!user) {
        const studentByName = await Student.findOne({
          where: { Full_Name: identifier },
          include: [{ model: User, as: "StudentUser" }],
        });
        if (studentByName) {
          user = studentByName.StudentUser;
          userEmail = studentByName.Email;
          profile = studentByName;
        } else {
          const lecturerByName = await Lecturer.findOne({
            where: { Full_Name: identifier },
            include: [{ model: User, as: "LecturerUser" }],
          });
          if (lecturerByName) {
            user = lecturerByName.LecturerUser;
            userEmail = lecturerByName.Email;
            profile = lecturerByName;
          }
        }
      }
    }
  }

  if (!user) {
    return next(new AppError("Tên đăng nhập, email hoặc họ tên không đúng", 401));
  }

  if (String(user.Status || "").toLowerCase() === "locked") {
    return next(
      new AppError(
        "Tài khoản bị khóa do vượt quá 3 lần đăng nhập sai",
        423,
        {
          locked: true,
          email: userEmail || user.Username,
          reason: "Vượt quá 3 lần đăng nhập sai"
        }
      )
    );
  }

  // Kiểm tra mật khẩu
  const isPasswordValid = await verifyPassword(password, user.Password);
  if (!isPasswordValid) {
    user.loginAttempts = (Number(user.loginAttempts) || 0) + 1;
    if (user.loginAttempts >= 3) {
      user.Status = "Locked";
      await user.save();
      return next(
        new AppError(
          "Tài khoản bị khóa do vượt quá 3 lần đăng nhập sai",
          423,
          {
            locked: true,
            email: userEmail || user.Username,
            reason: "Vượt quá 3 lần đăng nhập sai"
          }
        )
      );
    }

    await user.save();
    return next(new AppError("Sai mật khẩu, vui lòng nhập lại", 401));
  }

  if (user.loginAttempts && Number(user.loginAttempts) > 0) {
    user.loginAttempts = 0;
    await user.save();
  }

  // Tạo token; frontend mong đợi "student" / "teacher" / "admin"
  const roleRaw = (user.Role || "").toLowerCase();
  const roleFrontend = roleRaw === "lecturer" ? "teacher" : roleRaw;
  const token = signToken(user.ID, roleFrontend, user.Username, userEmail);

  // Sinh viên (Student) luôn được vào dashboard; giảng viên/admin theo Status
  const isStudent = roleRaw === "student";
  const admissionStatus = isStudent ? true : (user.Status || "").toString().toLowerCase() === "active";

  // Trả về user đúng format frontend mong đợi
  const frontendUser = {
    id: user.ID,
    _id: user.ID,
    roles: roleFrontend,
    role: roleFrontend,
    name: profile ? profile.Full_Name : user.Username,
    email: userEmail || undefined,
    admissionStatus,
    Username: user.Username,
    Role: user.Role,
    Status: user.Status
  };

  res.status(200).json({
    status: "SUCCESS",
    message: "Login successful",
    data: { user: frontendUser },
    token
  });
});

// VERIFY TOKEN middleware
exports.verifyToken = catchAsync(async (req, res, next) => {
  let token = "";

  // Extract token from header
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(new AppError("You are not logged in to gain access", 401));
  }

  const secretKey = process.env.JWT_KEY || "dev_jwt_secret_change_me";

  try {
    const decoded = await util.promisify(jwt.verify)(token, secretKey);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError("Invalid token", 401));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new AppError("Token expired", 401));
    }
    return next(error);
  }
});