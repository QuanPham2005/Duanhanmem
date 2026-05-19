import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Clock, Envelope, Eye, EyeSlash, Info, Lock, Phone, User, X } from "phosphor-react";
import axios from "axios";
import toast from "react-hot-toast";
import Spinner from "../UI/Spinner";
import LockoutModal from "../UI/LockoutModal";

const LOGIN_OPTIONS = [
  {
    label: "Sinh viên",
    url: "/api/v1/student/login",
    validateRole: (role) => role === "student",
    onSuccess: (response, identifier, navigate) => {
      const token = response.data.token;
      const name = response.data.data.user.name;
      localStorage.setItem("Student jwtToken", token);
      localStorage.setItem("Student Name", name);
      localStorage.setItem("email", identifier);
      if (response.data.data.user.admissionStatus !== false) {
        navigate("/student/dashboard");
      } else {
        navigate("/student/notapproved");
      }
    },
  },
  {
    label: "Giảng viên",
    url: "/api/v1/teachers/login",
    validateRole: (role) => role === "teacher" || role === "lecturer",
    onSuccess: (response, identifier, navigate) => {
      const token = response.data.token;
      const name = response.data.data.user.name;
      localStorage.setItem("Teacher jwtToken", token);
      localStorage.setItem("Teacher Name", name);
      localStorage.setItem("email", identifier);
      navigate("/lecturer/dashboard");
    },
  },
  {
    label: "Admin",
    url: "/api/v1/admin/login",
    validateRole: (role) => role === "admin",
    onSuccess: (response, identifier, navigate) => {
      const token = response.data.token;
      const name = response.data.data.user.name;
      localStorage.setItem("jwtToken", token);
      localStorage.setItem("Admin Name", name);
      localStorage.setItem("email", identifier);
      navigate("/admin/dashboard");
    },
  },
];

function UnifiedLogin() {
  const navigate = useNavigate();
  const [spinner, setSpinner] = useState(false);
  const [formData, setFormData] = useState({ identifier: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [lockedAccount, setLockedAccount] = useState(null);
  const [forgotOpen, setForgotOpen] = useState(false);

  const changeHandler = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const attemptLogin = async (option, identifier) => {
    const payload = { password: formData.password };

    const isEmail = typeof identifier === "string" && /\S+@\S+\.\S+/.test(identifier);

    // Admin expects username field explicitly; for others send email when value looks like an email
    if (option.label === "Admin") {
      payload.username = identifier;
    } else if (isEmail) {
      // ensure we do NOT include a username key when sending email
      payload.email = identifier;
    } else {
      payload.username = identifier;
    }

    const url = `${import.meta.env.VITE_BACKEND_URL}${option.url}`;
    try {
      const response = await axios.post(url, payload);
      const role = (response.data.data.user?.roles ?? response.data.data.user?.Role ?? "").toString().toLowerCase();
      if (!option.validateRole(role)) {
        throw new Error("Access denied for this account type.");
      }
      return response;
    } catch (err) {
      throw err;
    }
  };

  const submitHandler = async (event) => {
    event.preventDefault();
    const identifier = formData.identifier.trim();

    if (!identifier || !formData.password.trim()) {
      toast.error("Vui lòng nhập tên đăng nhập/email và mật khẩu.");
      return;
    }

    setSpinner(true);
    let lastError = null;

    for (const option of LOGIN_OPTIONS) {
      try {
        const response = await attemptLogin(option, identifier);
        option.onSuccess(response, identifier, navigate);
        toast.success(`Đăng nhập thành công với tài khoản ${option.label}`);
        setSpinner(false);
        return;
      } catch (error) {
          lastError = error;
        if (error.response?.data?.data?.locked) {
          setLockedAccount({
            email: error.response.data.data.email || identifier,
            reason: error.response.data.data.reason || "Vượt quá 3 lần đăng nhập sai",
          });
          setSpinner(false);
          return;
        }
        // continue trying next login type
      }
    }

    setSpinner(false);
    const errorMessage =
      lastError?.response?.data?.message ||
      lastError?.message ||
      "Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin.";
    toast.error(errorMessage);
  };

  return (
    <>
      {spinner ? (
        <Spinner />
      ) : (
        <section className="min-h-screen bg-white px-4 py-10 text-slate-900">
          <div className="mx-auto flex max-w-md flex-col gap-8">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_30px_80px_rgba(15,23,42,0.08)]"
            >
              <div className="mx-auto mb-8 flex max-w-xs flex-col items-center text-center">
                <div className="mb-6 flex h-40 w-full items-center justify-center">
                  <img src="/assets/logo2.png" alt="UDCK logo" className="h-36 w-auto object-contain" />
                </div>
                <p className="mt-3 text-base font-medium text-slate-600">Hệ thống đặt lịch tư vấn</p>
                <p className="mt-1 text-sm text-slate-500">Phân hiệu Đại học Đà Nẵng tại Kontum</p>
              </div>
              <form className="space-y-5" onSubmit={submitHandler}>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Email / Tên đăng nhập</label>
                  <input
                    name="identifier"
                    value={formData.identifier}
                    onChange={changeHandler}
                    placeholder="example@kontum.udn.vn"
                    className="mt-3 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Mật khẩu</label>
                  <div className="relative mt-3">
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={changeHandler}
                      placeholder="••••••••"
                      className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900"
                    >
                      {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  className="flex w-full items-center justify-center rounded-3xl bg-gradient-to-r from-emerald-500 to-sky-500 px-5 py-3 text-base font-semibold text-white shadow-lg shadow-emerald-500/15 transition duration-300 hover:scale-[1.02]"
                >
                  Đăng nhập
                </button>
                <div className="mt-2 text-center">
                  <button
                    type="button"
                    onClick={() => setForgotOpen(true)}
                    className="text-sm text-sky-600 hover:underline"
                  >
                    Quên mật khẩu?
                  </button>
                </div>
              </form>
              <div className="mt-6 rounded-3xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-100">
                <p className="font-semibold text-slate-900">Demo - Tài khoản mẫu</p>
                <div className="mt-4 space-y-3 rounded-3xl bg-white p-4 shadow-sm">
                  <div className="space-y-2 text-sm text-slate-700">
                    <div className="flex items-center justify-between rounded-full bg-slate-100 px-3 py-2">
                      <span className="font-medium">Sinh viên</span>
                      <span className="text-slate-500">sv001@udck.udn.vn</span>
                    </div>
                    <div className="flex items-center justify-between rounded-full bg-slate-100 px-3 py-2">
                      <span className="font-medium">Giảng viên</span>
                      <span className="text-slate-500">gv001@udck.udn.vn</span>
                    </div>
                    <div className="flex items-center justify-between rounded-full bg-slate-100 px-3 py-2">
                      <span className="font-medium">Admin</span>
                      <span className="text-slate-500">admin</span>
                    </div>
                  </div>
                  <div className="rounded-3xl bg-slate-50 px-4 py-3 text-slate-600">
                    <p>
                      <span className="font-medium text-slate-900">Mật khẩu SV / GV:</span> pass123
                    </p>
                    <p className="mt-1">
                      <span className="font-medium text-slate-900">Mật khẩu Admin:</span> admin123
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      )}
      <LockoutModal
        open={Boolean(lockedAccount)}
        accountValue={lockedAccount?.email || formData.identifier}
        reason={lockedAccount?.reason}
        contact="admin@udck.edu.vn - 0260.123.4567"
        onClose={() => setLockedAccount(null)}
      />

      {forgotOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-900/80 via-[#0f2744]/75 to-emerald-950/70 p-4 backdrop-blur-sm"
          onClick={() => setForgotOpen(false)}
        >
          <motion.div
            role="dialog"
            aria-labelledby="forgot-password-title"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-[480px] overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative bg-[#1a4b8c] px-5 py-5">
              <div className="flex items-start gap-3 pr-8">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
                  <Lock size={22} weight="regular" className="text-white" />
                </div>
                <div>
                  <h3 id="forgot-password-title" className="text-lg font-bold text-white">
                    Quên mật khẩu?
                  </h3>
                  <p className="mt-0.5 text-sm text-blue-100/90">Hướng dẫn lấy lại mật khẩu</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setForgotOpen(false)}
                className="absolute right-4 top-4 rounded-lg p-1 text-white/80 transition hover:bg-white/10 hover:text-white"
                aria-label="Đóng"
              >
                <X size={20} weight="bold" />
              </button>
            </div>

            <div className="max-h-[min(70vh,640px)] space-y-5 overflow-y-auto p-5">
              <div className="flex gap-3 rounded-xl border border-amber-400/70 bg-[#fffbeb] p-4">
                <Info size={22} weight="fill" className="mt-0.5 shrink-0 text-amber-600" />
                <div className="text-sm leading-relaxed text-amber-800">
                  <p className="font-bold text-amber-700">Lưu ý quan trọng</p>
                  <p className="mt-1">
                    Hệ thống không hỗ trợ tự động đặt lại mật khẩu. Vui lòng liên hệ bộ phận IT Support để được hỗ trợ.
                  </p>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <User size={18} weight="bold" className="text-[#1a4b8c]" />
                  <p className="font-bold text-[#1e293b]">Để lấy lại mật khẩu, vui lòng:</p>
                </div>
                <ol className="mt-3 list-decimal space-y-2.5 pl-5 text-sm leading-relaxed text-[#2563eb] marker:font-semibold marker:text-[#1a4b8c]">
                  <li>Chuẩn bị thông tin: Mã số sinh viên/giảng viên hoặc email</li>
                  <li>Liên hệ bộ phận IT Support theo thông tin bên dưới</li>
                  <li>Xuất trình giấy tờ tùy thân để xác minh danh tính</li>
                  <li>Nhận mật khẩu mới từ admin và đăng nhập lại</li>
                </ol>
              </div>

              <div className="rounded-2xl border border-sky-100 bg-[#f0f7ff] p-4">
                <p className="font-bold text-[#1e293b]">Thông tin liên hệ IT Support:</p>
                <ul className="mt-4 space-y-4">
                  <li className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100">
                      <Envelope size={18} weight="fill" className="text-sky-600" />
                    </span>
                    <div className="min-w-0 text-sm">
                      <p className="text-[#64748b]">Email</p>
                      <p className="font-medium text-sky-700">itsupport@udck.edu.vn</p>
                    </div>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                      <Phone size={18} weight="fill" className="text-emerald-600" />
                    </span>
                    <div className="min-w-0 text-sm">
                      <p className="text-[#64748b]">Điện thoại</p>
                      <p className="font-medium text-teal-700">0260.123.4567 (Ext: 102)</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
                      <Clock size={18} weight="fill" className="text-amber-600" />
                    </span>
                    <div className="min-w-0 text-sm">
                      <p className="text-[#64748b]">Giờ làm việc</p>
                      <p className="font-medium leading-relaxed text-[#334155]">
                        Thứ 2 - Thứ 6: 7:30 - 11:30 | 13:30 - 17:00
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                onClick={() => setForgotOpen(false)}
                className="w-full rounded-full bg-gradient-to-r from-[#2563eb] to-[#1a4b8c] px-4 py-3.5 text-base font-bold text-white shadow-md transition hover:opacity-95"
              >
                Đã hiểu
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}

export default UnifiedLogin;
