/**
 * Header component
 * Shows title, notifications, profile
 */
import { Bell, List, SignOut } from "phosphor-react";
import PropTypes from "prop-types";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

export const Header = ({ title, notificationsCount = 0, user, bgClass = "bg-white/90 backdrop-blur-md border border-slate-200/70", textClass = "text-udck-dark", onToggleSidebar, onLogout }) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationTab, setNotificationTab] = useState("all");
  const [notifications, setNotifications] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();
  const bellRef = useRef(null);


  const getPageTitle = () => {
    switch (location.pathname) {
      case "/student/dashboard":
        return "Dashboard";
      case "/student/dashboard/search":
        return "Tìm kiếm giảng viên";
      case "/student/dashboard/appointments":
        return "Lịch hẹn của tôi";
      case "/student/dashboard/notifications":
        return "Thông báo";
      case "/lecturer/dashboard":
        return "Dashboard";
      case "/lecturer/dashboard/profile":
        return "Thông tin cá nhân";
      case "/lecturer/dashboard/slots":
        return "Quản lý lịch rảnh";
      case "/lecturer/dashboard/requests":
        return "Yêu cầu tư vấn";
      case "/lecturer/dashboard/appointments":
        return "Lịch hẹn đã xác nhận";
      case "/lecturer/dashboard/notifications":
        return "Thông báo";
      default:
        return "Trang";
    }
  };

  const isRequestPage = location.pathname === "/lecturer/dashboard/requests";
  const pageTitle = title || getPageTitle();
  const isStudentArea = location.pathname.startsWith("/student");
  const isLecturerArea = location.pathname.startsWith("/lecturer");
  const isAdminArea = location.pathname.startsWith("/admin");

  useEffect(() => {
    const onClickOutside = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        if (isStudentArea) {
          const token = localStorage.getItem("Student jwtToken");
          if (!token) return setNotifications([]);
          const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/v1/student/notifications`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setNotifications(Array.isArray(res.data?.data) ? res.data.data : []);
          return;
        }

        if (isLecturerArea) {
          const token = localStorage.getItem("Teacher jwtToken");
          if (!token) return setNotifications([]);
          const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/v1/teachers/notifications`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setNotifications(Array.isArray(res.data?.data) ? res.data.data : []);
          return;
        }

        setNotifications([]);
      } catch {
        setNotifications([]);
      }
    };

    loadNotifications();
  }, [isStudentArea, isLecturerArea]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const currentNotificationsPath = isStudentArea
    ? "/student/dashboard/notifications"
    : isLecturerArea
    ? "/lecturer/dashboard/notifications"
    : "/admin/dashboard/notifications";

  useEffect(() => {
    if (location.pathname === currentNotificationsPath) {
      setShowNotifications(false);
    }
  }, [location.pathname, currentNotificationsPath]);

  const handleBellClick = () => {
    if (isAdminArea) {
      navigate("/admin/dashboard/notifications");
      return;
    }

    const willOpen = !showNotifications;
    setShowNotifications((prev) => !prev);

    if (willOpen && unreadCount > 0) {
      handleMarkAllRead();
    }
  };

  const filteredNotifications = useMemo(() => {
    if (notificationTab === "unread") return notifications.filter((n) => !n.read);
    return notifications;
  }, [notificationTab, notifications]);

  const handleMarkAllRead = async () => {
    try {
      const token = isStudentArea
        ? localStorage.getItem("Student jwtToken")
        : isLecturerArea
        ? localStorage.getItem("Teacher jwtToken")
        : null;
      if (!token) return;

      const url = `${import.meta.env.VITE_BACKEND_URL}/api/v1/${isStudentArea ? "student" : "teachers"}/notifications/mark-all-read`;
      await axios.patch(url, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      if (err.response?.status === 404) {
        try {
          const token = isStudentArea
            ? localStorage.getItem("Student jwtToken")
            : localStorage.getItem("Teacher jwtToken");
          if (!token) return;
          const url = `${import.meta.env.VITE_BACKEND_URL}/api/v1/${isStudentArea ? "student" : "teachers"}/notifications/mark-all-read`;
          await axios.post(url, {}, {
            headers: { Authorization: `Bearer ${token}` },
          });
        } catch (innerErr) {
          console.error("Unable to mark notifications read fallback:", innerErr);
          return;
        }
      } else {
        console.error("Unable to mark notifications read:", err);
        return;
      }
    }

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const formatAgo = (dateInput) => {
    const d = new Date(dateInput);
    if (Number.isNaN(d.getTime())) return "";
    const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
    if (diffMin < 1) return "Vừa xong";
    if (diffMin < 60) return `${diffMin} phút trước`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} giờ trước`;
    return `${Math.floor(diffHour / 24)} ngày trước`;
  };

  return (
    <header className={`relative z-20 flex flex-col sm:flex-row sm:items-center justify-between ${bgClass} px-3 py-4 sm:px-6 sm:py-5 shadow-lg`}> 
      <div className={`flex items-center ${isRequestPage ? "mb-3 sm:mb-0" : ""}`}>
        {typeof onToggleSidebar === "function" && (
          <button
            onClick={onToggleSidebar}
            className="mr-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200/80 bg-white/80 text-slate-800 shadow-sm backdrop-blur transition hover:bg-white"
          >
            <List size={20} weight="duotone" />
          </button>
        )}
        {isRequestPage ? (
          <div className="space-y-1">
            <h1 className={`text-3xl font-semibold tracking-wide ${textClass} flex items-center gap-2`}>
              
              Yêu cầu tư vấn
            </h1>
            <p className="text-sm text-gray-600">Quản lý các yêu cầu tư vấn từ sinh viên</p>
          </div>
        ) : (
          <h1 className={`text-3xl font-semibold tracking-wide ${textClass}`}>{pageTitle}</h1>
        )}
      </div>
      <div className="flex items-center justify-end gap-6">
        <div className="relative hidden sm:block" ref={bellRef}>
          <button
            onClick={handleBellClick}
            className="relative text-gray-600 hover:text-udck-dark transition"
          >
          <Bell size={24} weight="duotone" />
          {((isStudentArea || isLecturerArea) ? unreadCount : notificationsCount) > 0 && (
            <span className="absolute top-0 right-0 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-600 rounded-full">
              {(isStudentArea || isLecturerArea) ? unreadCount : notificationsCount}
            </span>
          )}
        </button>
        {showNotifications && (isStudentArea || isLecturerArea) && (
          <div className="absolute left-0 right-0 top-full z-60 mt-2 mx-auto w-full max-w-[calc(100vw-1.5rem)] sm:right-0 sm:left-auto sm:w-[360px] rounded-3xl border border-white/20 bg-white/90 backdrop-blur-md p-3 shadow-2xl">
            <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Thông báo</h3>
                <p className="text-xs text-slate-500">Xem nhanh các thông báo mới nhất của bạn</p>
              </div>
              <button
                onClick={() => {
                  setShowNotifications(false);
                  setNotificationTab("all");
                  navigate(isLecturerArea ? "/lecturer/dashboard/notifications" : "/student/dashboard/notifications");
                }}
                className="text-sm font-semibold text-slate-700 hover:text-slate-900"
              >
                Xem tất cả
              </button>
            </div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <button
                onClick={() => setNotificationTab("all")}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold ${notificationTab === "all" ? "bg-slate-100 text-slate-900" : "bg-slate-50 text-slate-600 hover:bg-slate-100"}`}
              >
                Tất cả
              </button>
              <button
                onClick={() => setNotificationTab("unread")}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold ${notificationTab === "unread" ? "bg-slate-100 text-slate-900" : "bg-slate-50 text-slate-600 hover:bg-slate-100"}`}
              >
                Chưa đọc
              </button>
            </div>
            <div className="max-h-80 space-y-3 overflow-y-auto">
              {filteredNotifications.length === 0 ? (
                <div className="rounded-3xl border border-slate-200/80 bg-slate-50 p-4 text-sm text-slate-600">
                  Không có thông báo mới.
                </div>
              ) : (
                filteredNotifications.map((n) => (
                  <div key={n.id} className="rounded-3xl border border-slate-200/80 bg-white/80 p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
                    <p className="text-sm font-semibold text-slate-900">{n.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{n.message}</p>
                    <p className="mt-2 text-xs text-slate-400">{formatAgo(n.createdAt)}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
        </div>
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu((p) => !p)}
            className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/80 text-slate-900 shadow-sm transition hover:bg-white"
          >
            <span className="text-sm font-semibold">
              {user?.name || "Người dùng"}
            </span>
          </button>
          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-48 rounded-3xl border border-white/60 bg-white/90 backdrop-blur-md shadow-2xl overflow-hidden">
              <button 
                onClick={() => {
                  if (typeof onLogout === "function") onLogout();
                  setShowProfileMenu(false);
                }}
                className="w-full text-left px-4 py-3 hover:bg-red-50 text-red-600 font-semibold flex items-center gap-2 transition"
              >
                <SignOut size={18} weight="bold" />
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

Header.propTypes = {
  title: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  notificationsCount: PropTypes.number,
  user: PropTypes.shape({
    name: PropTypes.string,
  }),
  bgClass: PropTypes.string,
  textClass: PropTypes.string,
  onToggleSidebar: PropTypes.func,
  onLogout: PropTypes.func,
};

export default Header;
