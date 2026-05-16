import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, CalendarBlank, Clock, MapPin, User, X, Funnel } from "phosphor-react";
import StudentLayout from "../../components/Layouts/StudentLayout";
import { Card } from "../../components/UI/Card";
import { Button } from "../../components/UI/Button";
import ConfirmModal from "../../components/UI/ConfirmModal";

const MyAppointments = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [dataFetched, setDataFetched] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [selectedCancelId, setSelectedCancelId] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  const jwt_token = useCallback(() => localStorage.getItem("Student jwtToken"), []);

  useEffect(() => {
    if (dataFetched) return;

    const token = jwt_token();
    if (!token) {
      navigate("/student/login");
      return;
    }

    const fetchAppointments = async () => {
      try {
        setLoading(true);
        const res = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/v1/student/appointments/registered`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        let appointmentsData = res.data.appointments || [];
        
        // If no lecturer info, try to fetch it separately
        if (appointmentsData.length > 0 && !appointmentsData[0].lecturerName) {
          appointmentsData = await enrichAppointmentsWithLecturerInfo(appointmentsData);
        }
        
        setAppointments(appointmentsData);
        setFilteredAppointments(appointmentsData);
        setDataFetched(true);
      } catch (err) {
        console.error("Error fetching appointments:", err);
        setAppointments([]);
        setFilteredAppointments([]);
      } finally {
        setLoading(false);
      }
    };

    // Fallback method to enrich appointments with lecturer info
    const enrichAppointmentsWithLecturerInfo = async (appointments) => {
      try {
        const enrichedAppointments = await Promise.all(
          appointments.map(async (apt) => {
            // Try to get lecturer info from AvailableSlot if it exists
            if (apt.AvailableSlot && apt.AvailableSlot.Lecturer_ID) {
              try {
                // Use the same token from the main request
                const lecturerRes = await axios.get(
                  `${import.meta.env.VITE_BACKEND_URL}/api/v1/student/lecturers/${apt.AvailableSlot.Lecturer_ID}`,
                  { headers: { Authorization: `Bearer ${token}` } }
                );
                
                const lecturerData = lecturerRes.data.data?.lecturer;
                if (lecturerData) {
                  // Backend returns 'major' not 'Major'
                  const domain = lecturerData.major || 
                                lecturerData.department ||
                                apt.domain ||
                                'Chuyên ngành';
                  
                  return {
                    ...apt,
                    lecturerName: lecturerData.name || lecturerData.Full_Name || 'Giảng viên',
                    domain: domain
                  };
                }
              } catch (lecturerErr) {
                // Silent fail - don't log errors
              }
            }
            
            // Return original appointment with enhanced fallback values
            const domain = apt.domain || 
                          apt.major || // Backend uses lowercase 'major'
                          apt.department || // Backend uses lowercase 'department'
                          apt.Major?.MajorName || 
                          apt.major?.MajorName || 
                          apt.Major?.majorName ||
                          apt.major?.majorName ||
                          apt.MajorName ||
                          apt.majorName ||
                          apt.Department?.DeptName ||
                          apt.department?.DeptName ||
                          'Chuyên ngành';
            
            return {
              ...apt,
              lecturerName: apt.lecturerName || apt.name || 'Giảng viên',
              domain: domain
            };
          })
        );
        
        return enrichedAppointments;
      } catch (err) {
        return appointments;
      }
    };

    fetchAppointments();
  }, [dataFetched, jwt_token, navigate]);

  // Filter appointments based on status
  useEffect(() => {
    let filtered = appointments;
    
    switch (statusFilter) {
      case "pending":
        filtered = appointments.filter(apt => 
          apt.Status?.toLowerCase().includes("pending") || 
          apt.Status?.toLowerCase().includes("chờ")
        );
        break;
      case "approved":
        filtered = appointments.filter(apt => 
          apt.Status?.toLowerCase().includes("approved") || 
          apt.Status?.toLowerCase().includes("đã duyệt")
        );
        break;
      case "expired":
        filtered = appointments.filter(apt => 
          apt.Status?.toLowerCase().includes("expired") || 
          apt.Status?.toLowerCase().includes("quá hạn")
        );
        break;
      case "completed":
        filtered = appointments.filter(apt => 
          apt.Status?.toLowerCase().includes("completed") || 
          apt.Status?.toLowerCase().includes("hoàn thành")
        );
        break;
      case "rejected":
        filtered = appointments.filter(apt => 
          apt.Status?.toLowerCase().includes("rejected") || 
          apt.Status?.toLowerCase().includes("từ chối") ||
          apt.Status?.toLowerCase().includes("cancelled")
        );
        break;
      default:
        filtered = appointments;
    }

    const sortedNewestFirst = [...filtered].sort((a, b) => {
      const aRequested = a.RequestedAt ? new Date(a.RequestedAt).getTime() : 0;
      const bRequested = b.RequestedAt ? new Date(b.RequestedAt).getTime() : 0;
      if (aRequested !== bRequested) return bRequested - aRequested;
      return (b.Appoint_ID || 0) - (a.Appoint_ID || 0);
    });

    setFilteredAppointments(sortedNewestFirst);
  }, [appointments, statusFilter]);

  const statusTabs = [
    { id: "all", label: "Tất cả", color: "bg-gray-100 text-gray-700" },
    { id: "pending", label: "Chờ duyệt", color: "bg-amber-50 text-amber-700 border-amber-200" },
    { id: "approved", label: "Đã duyệt", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    { id: "expired", label: "Quá hạn", color: "bg-orange-50 text-orange-700 border-orange-200" },
    { id: "rejected", label: "Từ chối", color: "bg-red-50 text-red-700 border-red-200" },
  ];

  const getStatusBadge = (status) => {
    const s = status?.toLowerCase() || "";
    if (s.includes("approved") || s.includes("đã duyệt")) {
      return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    }
    if (s.includes("pending") || s.includes("chờ")) {
      return "bg-amber-50 text-amber-700 border border-amber-200";
    }
    if (s.includes("expired") || s.includes("quá hạn")) {
      return "bg-orange-50 text-orange-700 border border-orange-200";
    }
    if (s.includes("completed") || s.includes("hoàn thành")) {
      return "bg-blue-50 text-blue-700 border border-blue-200";
    }
    if (s.includes("rejected") || s.includes("từ chối") || s.includes("cancelled")) {
      return "bg-red-50 text-red-700 border border-red-200";
    }
    return "bg-gray-50 text-gray-700 border border-gray-200";
  };

  const getStatusText = (status) => {
    const s = status?.toLowerCase() || "";
    if (s.includes("approved") || s.includes("đã duyệt")) return "Đã duyệt";
    if (s.includes("pending") || s.includes("chờ")) return "Chờ duyệt";
    if (s.includes("expired") || s.includes("quá hạn")) return "Quá hạn";
    if (s.includes("completed") || s.includes("hoàn thành")) return "Hoàn thành";
    if (s.includes("rejected") || s.includes("từ chối") || s.includes("cancelled")) return "Từ chối";
    return status || "Chờ duyệt";
  };

  const formatDateTime = (appointment) => {
    const formatTimeOnly = (t) => (t ? String(t).slice(0, 5) : null);
    const start = formatTimeOnly(appointment.StuStartTime);
    const end = formatTimeOnly(appointment.StuEndTime);

    if (appointment.scheduleAt) {
      const date = new Date(appointment.scheduleAt);
      return {
        date: date.toLocaleDateString("vi-VN"),
        // Ưu tiên giờ đã lưu thực tế trong DB (StuStartTime/StuEndTime)
        startTime: start || date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
        endTime: end,
      };
    }

    // Fallback cho dữ liệu legacy
    return {
      date: appointment.date || "Chưa xác định",
      startTime: start || appointment.time || "00:00",
      endTime: end,
    };
  };

  const handleCancelAppointment = (appointmentId) => {
    setSelectedCancelId(appointmentId);
    setCancelReason("");
    setCancelError(null);
    setShowCancelConfirm(true);
  };

  const confirmCancelAppointment = async () => {
    if (!selectedCancelId) return;
    if (!cancelReason.trim()) {
      setCancelError("Vui lòng nhập lý do hủy lịch.");
      return;
    }

    setCancelLoading(true);
    try {
      await axios.delete(
        `${import.meta.env.VITE_BACKEND_URL}/api/v1/student/appointments/${selectedCancelId}`,
        {
          headers: { Authorization: `Bearer ${jwt_token()}` },
          data: { reason: cancelReason.trim() },
        }
      );
      setDataFetched(false);
      setShowCancelConfirm(false);
      setSelectedCancelId(null);
      setCancelReason("");
      setCancelError(null);
    } catch (err) {
      console.error("Error cancelling appointment:", err);
      setCancelError(
        err.response?.data?.message || "Không thể hủy lịch hẹn. Vui lòng thử lại."
      );
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <StudentLayout
      title={
        <div className="flex items-center gap-3">
          <Link to="/student/dashboard" className="hover:bg-gray-100 p-2 rounded-lg transition-colors">
            <ArrowLeft size={20} className="text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Lịch hẹn của tôi</h1>
            <p className="text-sm text-gray-500">Quản lý các lịch tư vấn của bạn</p>
          </div>
        </div>
      }
      user={{ name: localStorage.getItem("Student Name") || "Sinh viên" }}
    >
      <div className="space-y-6">
        {/* Filter Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Funnel size={20} className="text-gray-500" />
            </div>
            <div className="flex gap-2 flex-wrap">
              {statusTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 whitespace-nowrap ${
                    statusFilter === tab.id
                      ? `${tab.color} shadow-sm border-2 border-current`
                      : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Appointments List */}
        {loading ? (
          <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-0 rounded-2xl p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-gray-600 ml-3">Đang tải dữ liệu...</p>
            </div>
          </Card>
        ) : filteredAppointments.length === 0 ? (
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-0 rounded-2xl p-8 text-center">
            <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <CalendarBlank size={32} className="text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Không có lịch hẹn</h3>
            <p className="text-gray-600 mb-4">
              {statusFilter === "all" 
                ? "Bạn chưa có lịch hẹn nào. Hãy tìm kiếm giảng viên để đặt lịch tư vấn!"
                : `Không có lịch hẹn nào ở trạng thái "${statusTabs.find(t => t.id === statusFilter)?.label}"`
              }
            </p>
            {statusFilter === "all" && (
              <Link to="/student/dashboard/search">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  Tìm kiếm giảng viên
                </Button>
              </Link>
            )}
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredAppointments.map((apt) => {
              const dateTime = formatDateTime(apt);
              const lowerStatus = apt.Status?.toLowerCase() || "";
              const canCancel = lowerStatus.includes("pending") ||
                                lowerStatus.includes("chờ") ||
                                lowerStatus.includes("approved") ||
                                lowerStatus.includes("đã duyệt");
              
              return (
                <Card
                  key={apt.Appoint_ID || apt._id}
                  className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <User size={18} className="text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900 text-sm">
                          {apt.lecturerName || apt.name || "Giảng viên"}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {(() => {
                            // Prioritize backend data structure first
                            const domain = apt.major || // Backend returns 'major'
                                          apt.department || // Backend returns 'department'
                                          apt.domain || 
                                          apt.Major?.MajorName || 
                                          apt.major?.MajorName || 
                                          apt.Major?.majorName ||
                                          apt.major?.majorName ||
                                          apt.MajorName ||
                                          apt.majorName ||
                                          apt.Department?.DeptName ||
                                          apt.department?.DeptName ||
                                          null;
                            
                            // If no domain found, show a temporary indicator
                            if (!domain) {
                              return "Đang cập nhật chuyên ngành";
                            }
                            
                            return domain;
                          })()}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(apt.Status)}`}>
                      {getStatusText(apt.Status)}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-600 mb-2">
                    <div className="flex items-center gap-1">
                      <CalendarBlank size={12} className="text-gray-400" />
                      <span>{dateTime.date}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock size={12} className="text-gray-400" />
                      <span>
                        {dateTime.startTime}
                        {dateTime.endTime && ` - ${dateTime.endTime}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin size={12} className="text-gray-400" />
                      <span>{apt.Location || apt.location || "Chờ xác nhận"}</span>
                    </div>
                  </div>

                  {apt.Reason && (
                    <div className="bg-gray-50 rounded p-2 mb-2 border border-gray-100">
                      <p className="text-xs text-gray-500 mb-1">Nội dung:</p>
                      <p className="text-xs text-gray-600">{apt.Reason}</p>
                    </div>
                  )}

                  {canCancel && (
                    <div className="flex justify-end">
                      <button
                        onClick={() => handleCancelAppointment(apt.Appoint_ID || apt._id)}
                        className="text-xs font-medium text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                      >
                        Hủy lịch hẹn
                      </button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmModal
        open={showCancelConfirm}
        title="Hủy lịch hẹn"
        description="Bạn có chắc chắn muốn hủy lịch hẹn này? Hãy nhập lý do hủy để giảng viên nắm được."
        confirmText="Xác nhận"
        cancelText="Hủy"
        loading={cancelLoading}
        onConfirm={confirmCancelAppointment}
        onCancel={() => {
          setShowCancelConfirm(false);
          setSelectedCancelId(null);
          setCancelReason("");
          setCancelError(null);
        }}
      >
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Lý do hủy lịch
          </label>
          <textarea
            value={cancelReason}
            onChange={(e) => {
              setCancelReason(e.target.value);
              if (cancelError) setCancelError(null);
            }}
            rows={4}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            placeholder="Ví dụ: Tôi có lịch học trùng, xin hủy buổi tư vấn này..."
          />
          {cancelError && (
            <p className="mt-2 text-sm text-red-600">{cancelError}</p>
          )}
        </div>
      </ConfirmModal>
    </StudentLayout>
  );
};

export default MyAppointments;
