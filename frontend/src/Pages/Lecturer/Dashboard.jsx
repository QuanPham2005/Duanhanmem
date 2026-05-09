import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import LecturerLayout from "../../components/Layouts/LecturerLayout";
import { Card } from "../../components/UI/Card";
import { Button } from "../../components/UI/Button";
import { ClipboardList, Calendar, CheckCircle, Clock } from "lucide-react";

const LecturerDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ pending: 0, today: 0, week: 0, approved: 0 });
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("pending");

  const jwt = () => localStorage.getItem("Teacher jwtToken");
  const userName = localStorage.getItem("Teacher Name") || "Giảng viên";

  const isAppointmentExpired = (appointment) => {
    const slot = appointment?.AvailableSlot;
    if (!slot?.Date || slot.EndTime == null) return false;
    const [year, month, day] = String(slot.Date).slice(0, 10).split("-").map(Number);
    const parts = String(slot.EndTime).split(":").map((n) => Number(n) || 0);
    const [hours, minutes, seconds] = [parts[0], parts[1] ?? 0, parts[2] ?? 0];
    if (!year || !month || !day || Number.isNaN(hours)) return false;
    const slotEnd = new Date(year, month - 1, day, hours, minutes, seconds, 0);
    return slotEnd.getTime() <= Date.now();
  };

  useEffect(() => {
    if (!jwt()) {
      navigate("/teacher/login");
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const [pendingRes, allRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/v1/teachers/appointments/pending`, { headers: { Authorization: `Bearer ${jwt()}` } }),
          axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/v1/teachers/appointments`, { headers: { Authorization: `Bearer ${jwt()}` } }),
        ]);
        const pending = pendingRes.data.data?.appointments || [];
        const all = allRes.data.data?.appointments || [];
        
        // Lọc bỏ các appointments đã quá hạn
        const validAppointments = all.filter(a => !isAppointmentExpired(a));

        // Lọc lịch hẹn đã xác nhận trong ngày hôm nay
        const today = new Date();
        const todayAppointments = validAppointments.filter(a => {
          if (a.Status !== 'Approved' || !a.AvailableSlot) return false;
          const slotDate = a.AvailableSlot.Date;
          if (!slotDate) return false;
          const [year, month, day] = slotDate.split('-').map(Number);
          return (
            year === today.getFullYear() &&
            month === today.getMonth() + 1 &&
            day === today.getDate()
          );
        });

        setStats({ 
          pending: pending.length, 
          today: todayAppointments.length,
          week: 0, // TODO: Calculate this week's appointments
          approved: todayAppointments.length
        });
        setRecent(pending.slice(0, 5));
      } catch (err) {
        setError('Unable to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center p-6">Đang tải...</div>
  );
  
  if (error) return (
    <div className="p-6 text-red-600">{error}</div>
  );

  const statsCards = [
    { label: "Yêu cầu chờ duyệt", value: stats.pending, icon: ClipboardList, color: "bg-pink-100 text-pink-600" },
    { label: "Lịch hẹn hôm nay", value: stats.today, icon: Calendar, color: "bg-blue-100 text-blue-600" },
    { label: "Tuần này", value: stats.week, icon: Calendar, color: "bg-green-100 text-green-600" },
    { label: "Đã xác nhận", value: stats.approved, icon: CheckCircle, color: "bg-purple-100 text-purple-600" },
  ];

  return (
    <>
      <div className="bg-gradient-to-br from-blue-600 via-blue-500 to-teal-500 rounded-3xl p-8 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] relative overflow-hidden mb-8">
        {/* Animated background effect */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-50"></div>
        <div className="relative z-10">
          <h1 className="text-4xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-white to-teal-100">
            Chào buổi sáng, {userName}!
          </h1>
          <p className="text-white/90 text-lg mb-8">
            Bạn có {stats.pending} yêu cầu tư vấn đang chờ xử lý
          </p>
          <Link
            to="/lecturer/dashboard/requests"
            className="bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/30 hover:border-white/50 inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <ClipboardList className="h-5 w-5" />
            <span>Xem yêu cầu</span>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statsCards.map((stat, idx) => (
          <div key={idx} className="rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.03] p-6 border-0 bg-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
                  {stat.label}
                </div>
                <div className="text-3xl font-bold text-gray-900">
                  {stat.value}
                </div>
              </div>
              <div className="p-3 rounded-xl shadow-lg">
                <stat.icon className={
                  idx === 0 ? "text-pink-600 text-4xl" :
                  idx === 1 ? "text-blue-600 text-4xl" :
                  idx === 2 ? "text-green-600 text-4xl" :
                  idx === 3 ? "text-purple-600 text-4xl" : "text-gray-400 text-4xl"
                } />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-lg p-1 mb-8 hover:shadow-xl transition-all duration-300">
        <div className="flex">
          <button
            onClick={() => setActiveTab("pending")}
            className={`flex-1 py-3 px-6 rounded-xl font-semibold transition-all duration-200 ${
              activeTab === "pending"
                ? "bg-blue-900 text-white shadow-md"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Yêu cầu chờ duyệt
          </button>
          <button
            onClick={() => setActiveTab("all")}
            className={`flex-1 py-3 px-6 rounded-xl font-semibold transition-all duration-200 ${
              activeTab === "all"
                ? "bg-blue-900 text-white shadow-md"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Tất cả lịch hẹn
          </button>
        </div>
      </div>

      {/* Content based on tab */}
      <div className="rounded-2xl shadow-lg border-0 bg-white hover:shadow-xl transition-all duration-300">
        <div className="p-8">
          <h3 className="text-xl font-bold mb-6 text-gray-900">
            {activeTab === "pending" ? "Yêu cầu gần đây" : "Tất cả lịch hẹn"}
          </h3>
          {activeTab === "pending" ? (
            recent.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <ClipboardList className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-lg">Không có yêu cầu gần đây</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recent.map((r) => (
                  <div key={r.Appoint_ID || r.id} className="bg-gray-50 rounded-xl p-6 hover:bg-gray-100 transition-colors duration-300 hover:shadow-md">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center hover:bg-blue-200 transition-colors duration-300">
                          <Clock className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">
                            {r.AppointmentStudent?.Full_Name || `Sinh viên ${r.Student_ID}`}
                          </div>
                          <div className="text-sm text-gray-600">{r.Reason || "Không có lý do"}</div>
                        </div>
                      </div>
                      <Link 
                        to={`/lecturer/dashboard/requests?open=${encodeURIComponent(r.Appoint_ID || r.id)}`}
                        className="bg-blue-900 text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition-colors duration-300 font-medium hover:shadow-lg transform hover:scale-105"
                      >
                        Xem
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-lg">Tính năng xem tất cả lịch hẹn sẽ sớm có</p>
              <Link 
                to="/lecturer/dashboard/appointments"
                className="inline-block mt-4 bg-blue-900 text-white px-6 py-2 rounded-lg hover:bg-blue-800 transition-colors duration-300 hover:shadow-lg transform hover:scale-105"
              >
                Xem tất cả lịch hẹn
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Section mới giống hình 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <Link to="slots" className="block">
          <Card className="flex items-center gap-4 p-6 cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
            <div className="bg-blue-100 rounded-full p-4">
              <Calendar className="text-blue-500 w-8 h-8" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Quản lý lịch rảnh</h2>
              <p className="text-gray-500 text-sm">Cập nhật khung giờ tư vấn</p>
            </div>
          </Card>
        </Link>
        <Link to="profile" className="block">
          <Card className="flex items-center gap-4 p-6 cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
            <div className="bg-green-100 rounded-full p-4">
              <CheckCircle className="text-green-500 w-8 h-8" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Cập nhật hồ sơ</h2>
              <p className="text-gray-500 text-sm">Chỉnh sửa thông tin cá nhân</p>
            </div>
          </Card>
        </Link>
      </div>
    </>
  );
};

export default LecturerDashboard;
