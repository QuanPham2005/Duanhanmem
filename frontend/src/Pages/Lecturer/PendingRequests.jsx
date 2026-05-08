import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { Badge } from "../../components/UI/Badge";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";
import {
  Clock3,
  User,
  Filter,
  X,
  FileText,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  Search,
  CheckCircle2,
  CircleDashed,
  CheckCheck,
  XCircle,
} from "lucide-react";

const PendingRequests = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustStart, setAdjustStart] = useState(null);
  const [adjustEnd, setAdjustEnd] = useState(null);
  const [adjustNote, setAdjustNote] = useState("");
  const [adjusting, setAdjusting] = useState(false);
  const [approveLocation, setApproveLocation] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  const jwt = () => localStorage.getItem("Teacher jwtToken");

  useEffect(() => {
    if (!jwt()) {
      navigate("/teacher/login");
      return;
    }
    // Gọi API lấy tất cả appointments
    axios
      .get(`${import.meta.env.VITE_BACKEND_URL}/api/v1/teachers/appointments`, {
        headers: { Authorization: `Bearer ${jwt()}` },
      })
      .then((res) => setAppointments(res.data.data?.appointments || []))
      .catch(() => setAppointments([]))
      .finally(() => setLoading(false));
  }, [navigate]);

  const normalizeStatus = (status) => String(status || "").trim().toLowerCase();

  const getDateOnly = (dateInput) => {
    const d = new Date(dateInput);
    if (Number.isNaN(d.getTime())) return null;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  };

  const getSlotEndDateTime = (slot) => {
    if (!slot?.Date || !slot?.EndTime) return null;
    const baseDate = new Date(slot.Date);
    if (Number.isNaN(baseDate.getTime())) return null;
    const [hours, minutes] = String(slot.EndTime).split(":").map((v) => Number(v));
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    return new Date(
      baseDate.getFullYear(),
      baseDate.getMonth(),
      baseDate.getDate(),
      hours,
      minutes,
      0,
      0
    );
  };

  const isPendingStatus = (status) => {
    const st = normalizeStatus(status);
    return st.includes("pending") || st.includes("chờ") || st.includes("check");
  };

  const getEffectiveStatus = (appointment) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const slotEnd = getSlotEndDateTime(appointment?.AvailableSlot);
    const slotDate = getDateOnly(appointment?.AvailableSlot?.Date);
    if (isPendingStatus(appointment?.Status) && slotDate && slotDate.getTime() === today.getTime() && slotEnd && slotEnd < now) {
      return "Overdue";
    }
    return appointment?.Status || "";
  };

  // Ẩn toàn bộ yêu cầu của ngày cũ (sang ngày hôm sau sẽ tự biến mất)
  const visibleAppointments = appointments.filter((a) => {
    const slotDate = getDateOnly(a?.AvailableSlot?.Date);
    if (!slotDate) return true;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return slotDate >= today;
  });

  const sortedVisibleAppointments = [...visibleAppointments].sort((a, b) => {
    const aRequested = a.RequestedAt ? new Date(a.RequestedAt).getTime() : 0;
    const bRequested = b.RequestedAt ? new Date(b.RequestedAt).getTime() : 0;
    if (aRequested !== bRequested) return bRequested - aRequested;
    return (b.Appoint_ID || 0) - (a.Appoint_ID || 0);
  });

  // Auto open detail modal when coming from dashboard (e.g. ?open=11)
  useEffect(() => {
    if (loading) return;
    const openId = searchParams.get("open");
    if (!openId) return;

    const target = sortedVisibleAppointments.find(
      (a) => String(a.Appoint_ID || a.id) === String(openId)
    );

    if (target) {
      setSelectedAppointment(target);
      setApproveLocation(target.Location || "");
      setRejectReason("");
    } else {
      toast.error("Không tìm thấy yêu cầu cần mở (có thể đã quá hạn hoặc đã được xử lý).");
    }

    // remove query to avoid reopening on refresh
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("open");
    setSearchParams(nextParams, { replace: true });
  }, [loading, searchParams, setSearchParams, sortedVisibleAppointments]);

  // Lọc appointments theo tab (sẵn sàng với nhiều kiểu case)
  const filteredAppointments = sortedVisibleAppointments.filter((a) => {
    const studentName = (a.AppointmentStudent?.Full_Name || "").toLowerCase();
    const studentCode = String(a.Student_ID || "").toLowerCase();
    const keyword = searchTerm.trim().toLowerCase();
    const matchesSearch = !keyword || studentName.includes(keyword) || studentCode.includes(keyword);
    if (!matchesSearch) return false;
    if (activeTab === "all") return true;
    const st = normalizeStatus(getEffectiveStatus(a));
    if (activeTab === "pending") return st.includes("pending") || st.includes("chờ") || st.includes("check");
    if (activeTab === "approved") return st.includes("approved") || st.includes("đã duyệt");
    if (activeTab === "rejected") return st.includes("rejected") || st.includes("từ chối");
    if (activeTab === "overdue") return st.includes("overdue") || st.includes("quá hạn");
    return false;
  });

  // Tabs configuration
  const tabs = [
    { id: "all", label: "Tất cả", count: sortedVisibleAppointments.length, icon: CircleDashed },
    { id: "pending", label: "Chờ duyệt", count: sortedVisibleAppointments.filter((a) => {
      const st = normalizeStatus(getEffectiveStatus(a));
      return st.includes("pending") || st.includes("chờ");
    }).length, icon: CheckCircle2 },
    { id: "approved", label: "Đã duyệt", count: sortedVisibleAppointments.filter((a) => {
      const st = normalizeStatus(getEffectiveStatus(a));
      return st.includes("approved") || st.includes("đã duyệt");
    }).length, icon: CheckCheck },
    { id: "rejected", label: "Từ chối", count: sortedVisibleAppointments.filter((a) => {
      const st = normalizeStatus(getEffectiveStatus(a));
      return st.includes("rejected") || st.includes("từ chối");
    }).length, icon: XCircle },
    { id: "overdue", label: "Quá hạn", count: sortedVisibleAppointments.filter((a) => {
      const st = normalizeStatus(getEffectiveStatus(a));
      return st.includes("overdue") || st.includes("quá hạn");
    }).length, icon: Clock3 },
  ];

  const formatDateTime = (slot) => {
    if (!slot || !slot.Date) return { date: "N/A", time: "N/A" };
    const normalizedDate = new Date(slot.Date).toLocaleDateString('vi-VN');
    const normalizedTime = slot.StartTime && slot.EndTime
      ? `${slot.StartTime.slice(0, 5)} - ${slot.EndTime.slice(0, 5)}`
      : "N/A";
    return { date: normalizedDate, time: normalizedTime };
  };

  const getRequestedTimeRange = (appointment) => {
    const start = appointment?.StuStartTime || appointment?.AvailableSlot?.StartTime || null;
    const end = appointment?.StuEndTime || appointment?.AvailableSlot?.EndTime || null;
    return {
      start,
      end,
      label: start && end ? `${String(start).slice(0, 5)} - ${String(end).slice(0, 5)}` : "N/A",
    };
  };

  const toMinutes = (t) => {
    if (!t) return 0;
    const [h, m] = String(t).split(":");
    return Number(h || 0) * 60 + Number(m || 0);
  };

  const formatHHmm = (minutes) => {
    const h = Math.floor(minutes / 60).toString().padStart(2, "0");
    const m = (minutes % 60).toString().padStart(2, "0");
    return `${h}:${m}`;
  };

  const openAdjustModal = (appointment) => {
    const requested = getRequestedTimeRange(appointment);
    const min = toMinutes(requested?.start);
    const max = toMinutes(requested?.end);
    setAdjustStart(min);
    setAdjustEnd(max);
    setAdjustNote("");
    setShowAdjustModal(true);
  };

  const getStatusVariant = (status) => {
    const st = normalizeStatus(status);
    if (st.includes("overdue") || st.includes("quá hạn")) return "overdue";
    if (st.includes("pending") || st.includes("chờ")) return "pending";
    if (st.includes("approved") || st.includes("đã duyệt")) return "confirmed";
    return "cancelled";
  };

  const getStatusLabel = (status) => {
    const st = normalizeStatus(status);
    if (st.includes("overdue") || st.includes("quá hạn")) return "Quá hạn";
    if (st.includes("pending") || st.includes("chờ")) return "Chờ duyệt";
    if (st.includes("approved") || st.includes("đã duyệt")) return "Đã duyệt";
    return "Từ chối";
  };

  const approveAppointment = (appointmentId) => {
    if (!approveLocation.trim()) {
      toast.error("Vui lòng nhập địa điểm trước khi chấp nhận.");
      return;
    }
    axios
      .patch(
        `${import.meta.env.VITE_BACKEND_URL}/api/v1/teachers/changeApprovalStatus/${appointmentId}`,
        { Location: approveLocation.trim() },
        { headers: { Authorization: `Bearer ${jwt()}` } }
      )
      .then(() => {
        toast.success("Yêu cầu đã được duyệt.");
        setSelectedAppointment(null);
        setAppointments((prev) => prev.map((item) => item.Appoint_ID === appointmentId || item.id === appointmentId ? { ...item, Status: "Approved" } : item));
      })
      .catch(() => toast.error("Duyệt yêu cầu thất bại."));
  };

  const rejectAppointment = (appointmentId) => {
    if (!rejectReason.trim()) {
      toast.error("Vui lòng nhập lý do từ chối.");
      return;
    }
    axios
      .patch(
        `${import.meta.env.VITE_BACKEND_URL}/api/v1/teachers/appointments/${appointmentId}/reject`,
        { rejectionReason: rejectReason.trim() },
        { headers: { Authorization: `Bearer ${jwt()}` } }
      )
      .then(() => {
        toast.success("Yêu cầu đã bị từ chối.");
        setSelectedAppointment(null);
        setAppointments((prev) => prev.map((item) => item.Appoint_ID === appointmentId || item.id === appointmentId ? { ...item, Status: "Rejected" } : item));
      })
      .catch(() => toast.error("Từ chối yêu cầu thất bại."));
  };

  const adjustAppointmentTime = (appointment) => {
    if (adjustStart == null || adjustEnd == null || adjustEnd <= adjustStart) {
      toast.error("Khoảng thời gian điều chỉnh không hợp lệ.");
      return;
    }
    if (!adjustNote.trim()) {
      toast.error("Vui lòng nhập lý do thay đổi.");
      return;
    }

    setAdjusting(true);
    axios
      .patch(
        `${import.meta.env.VITE_BACKEND_URL}/api/v1/teachers/appointments/${appointment.Appoint_ID || appointment.id}/adjust`,
        {
          StuStartTime: formatHHmm(adjustStart),
          StuEndTime: formatHHmm(adjustEnd),
          adjustmentNote: adjustNote.trim(),
        },
        { headers: { Authorization: `Bearer ${jwt()}` } }
      )
      .then(() => {
        toast.success("Đã điều chỉnh thời gian và gửi thông báo cho sinh viên.");
        setAppointments((prev) =>
          prev.map((item) =>
            item.Appoint_ID === appointment.Appoint_ID || item.id === appointment.id
              ? { ...item, StuStartTime: formatHHmm(adjustStart), StuEndTime: formatHHmm(adjustEnd) }
              : item
          )
        );
        setShowAdjustModal(false);
      })
      .catch((err) => toast.error(err?.response?.data?.message || "Điều chỉnh thời gian thất bại."))
      .finally(() => setAdjusting(false));
  };

  return (
    <div className="container mx-auto px-4 py-6 sm:px-6 sm:py-8">
      {loading && (
        <div className="flex items-center justify-center py-20">
          <p className="text-gray-500">Đang tải dữ liệu...</p>
        </div>
      )}

      {!loading && (
        <>
          <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-800">Danh sách yêu cầu tư vấn</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Theo dõi và xử lý yêu cầu tư vấn của sinh viên theo trạng thái.
                </p>
              </div>
              <div className="relative w-full lg:w-80">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm theo tên sinh viên hoặc MSSV"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-udck-primary focus:ring-2 focus:ring-udck-primary/10"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 text-sm font-medium text-slate-700">
              <Filter className="h-4 w-4 text-slate-500" />
              <span>Bộ lọc trạng thái</span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {tabs.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`inline-flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                    activeTab === item.id
                      ? "border-udck-primary bg-udck-primary text-white"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </span>
                  <span
                    className={`rounded-md px-2 py-0.5 text-xs ${
                      activeTab === item.id
                        ? "bg-white/20 text-white"
                        : "bg-white text-slate-600"
                    }`}
                  >
                    {item.count}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <div className="space-y-4">
            {filteredAppointments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <p className="text-lg font-medium text-slate-600">Không có yêu cầu phù hợp.</p>
                <p className="mt-1 text-sm text-slate-500">Thử đổi bộ lọc hoặc từ khóa tìm kiếm.</p>
              </div>
            ) : (
              filteredAppointments.map((a) => (
                <div
                  key={a.Appoint_ID || a.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"
                >
                  <div className="grid items-start gap-4 sm:grid-cols-[56px_1fr_auto]">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                      <User className="h-6 w-6" />
                    </div>

                    <div className="space-y-2">
                      <div>
                        <p className="text-lg font-semibold text-slate-900">
                          {a.AppointmentStudent?.Full_Name || a.Student_ID}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          <span className="font-medium">MSSV: {a.Student_ID || 'N/A'}</span>
                          <span className="font-medium">Lớp: {a.AppointmentStudent?.ClassName || a.AppointmentStudent?.Class || 'N/A'}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-4 w-4" />
                          {formatDateTime(a.AvailableSlot).date}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock3 className="h-4 w-4" />
                          {getRequestedTimeRange(a).label}
                        </span>
                      </div>

                      <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                        {a.Reason || 'Không có lý do'}
                      </p>

                      <div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAppointment(a);
                            setApproveLocation(a.Location || "");
                            setRejectReason("");
                          }}
                          className="inline-flex rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                        >
                          Xem chi tiết
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <Badge variant={getStatusVariant(getEffectiveStatus(a))}>
                        {getStatusLabel(getEffectiveStatus(a))}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {selectedAppointment && (
            <div
              className="fixed inset-0 z-[9999] flex items-start justify-center px-4 pb-6 pt-24"
              onClick={() => setSelectedAppointment(null)}
            >
              <div
                    className="w-full max-w-4xl max-h-[calc(100vh-2rem)] overflow-y-auto rounded-xl bg-white p-4 shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="mb-3 flex items-center justify-between gap-2 border-b border-slate-200 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="rounded-lg bg-slate-100 p-2 text-slate-600">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <h2 className="text-lg font-semibold text-slate-800">Chi tiết yêu cầu tư vấn</h2>
                          <p className="text-sm text-slate-500">
                            Mã yêu cầu: #{selectedAppointment.Appoint_ID || selectedAppointment.id || "---"}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedAppointment(null)}
                        className="rounded-lg border border-slate-300 bg-white p-2 text-slate-500 transition hover:bg-slate-100"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mb-3">
                      <div className="mb-2 flex items-center gap-2 text-slate-700">
                        <GraduationCap className="h-3 w-3" />
                        <p className="text-sm font-semibold">Thông tin sinh viên</p>
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                          <p className="text-xs text-slate-500">Họ và tên</p>
                          <p className="text-sm font-semibold text-slate-800">{selectedAppointment.AppointmentStudent?.Full_Name || "N/A"}</p>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                          <p className="text-xs text-slate-500">Mã số sinh viên</p>
                          <p className="text-sm font-semibold text-slate-800">{selectedAppointment.Student_ID || "N/A"}</p>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                          <p className="text-xs text-slate-500">Lớp</p>
                          <p className="text-sm font-semibold text-slate-800">{selectedAppointment.AppointmentStudent?.ClassName || selectedAppointment.AppointmentStudent?.Class || "N/A"}</p>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                          <p className="text-xs text-slate-500">Ngày gửi yêu cầu</p>
                          <p className="text-sm font-semibold text-slate-800">
                            {selectedAppointment.RequestedAt
                              ? new Date(selectedAppointment.RequestedAt).toLocaleDateString("vi-VN")
                              : selectedAppointment.CreatedAt
                                ? new Date(selectedAppointment.CreatedAt).toLocaleDateString("vi-VN")
                                : selectedAppointment.AppointmentCreatedAt
                                  ? new Date(selectedAppointment.AppointmentCreatedAt).toLocaleDateString("vi-VN")
                                  : "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="mb-2 flex items-center gap-2 text-slate-700">
                        <CalendarDays className="h-3 w-3" />
                        <p className="text-sm font-semibold">Thời gian hẹn tư vấn</p>
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                          <p className="text-xs text-slate-500">Ngày</p>
                          <p className="text-sm font-semibold text-slate-800">
                            {selectedAppointment.AvailableSlot?.Date
                              ? new Date(selectedAppointment.AvailableSlot.Date).toLocaleDateString("vi-VN", {
                                weekday: "long",
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              })
                              : "N/A"}
                          </p>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                          <p className="text-xs text-slate-500">Giờ</p>
                          <p className="text-sm font-semibold text-slate-800">
                            {getRequestedTimeRange(selectedAppointment).label}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="mb-2 flex items-center gap-2 text-slate-700">
                        <ClipboardList className="h-3 w-3" />
                        <p className="text-sm font-semibold">Nội dung yêu cầu tư vấn</p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700 break-words">
                        {selectedAppointment.Reason || "Không có nội dung được cung cấp"}
                      </div>
                    </div>

                    <div className="mb-3 rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-600">
                      <span className="font-semibold text-slate-700">Trạng thái: </span>
                      <Badge variant={getStatusVariant(getEffectiveStatus(selectedAppointment))}>
                        {getStatusLabel(getEffectiveStatus(selectedAppointment))}
                      </Badge>
                    </div>

                    {isPendingStatus(getEffectiveStatus(selectedAppointment)) ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-700">Địa điểm</label>
                            <input
                              value={approveLocation}
                              onChange={(e) => setApproveLocation(e.target.value)}
                              placeholder="Ví dụ: Phòng A101 / Online"
                              className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs text-slate-700 outline-none transition focus:border-udck-primary focus:ring-1 focus:ring-udck-primary/10"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-700">Lý do từ chối</label>
                            <input
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              placeholder="Ví dụ: Trùng lịch dạy"
                              className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs text-slate-700 outline-none transition focus:border-red-400 focus:ring-1 focus:ring-red-500/10"
                            />
                          </div>
                        </div>

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <button
                          onClick={() => openAdjustModal(selectedAppointment)}
                          className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 transition hover:bg-amber-100"
                        >
                          Chỉnh sửa
                        </button>
                        <button
                          onClick={() => approveAppointment(selectedAppointment.Appoint_ID || selectedAppointment.id)}
                          className="rounded-lg bg-udck-primary px-3 py-1.5 text-xs font-medium text-white transition hover:bg-udck-dark"
                        >
                          Chấp nhận
                        </button>
                        <button
                          onClick={() => rejectAppointment(selectedAppointment.Appoint_ID || selectedAppointment.id)}
                          className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                        >
                          Từ chối
                        </button>
                      </div>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500">Yêu cầu đã được xử lý. Đóng bằng nút X.</div>
                    )}
                  </div>
                </div>
          )}

          {showAdjustModal && selectedAppointment && (
            <div
              className="fixed inset-0 z-[10000] flex items-start justify-center px-4 pt-24 pb-6"
              onClick={() => setShowAdjustModal(false)}
            >
              <div
                className="w-full max-w-3xl max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl bg-white shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between bg-amber-500 px-4 py-3 text-white">
                  <div>
                    <h3 className="text-base font-semibold sm:text-lg">Chỉnh sửa thời gian tư vấn</h3>
                    <p className="text-white/90 text-sm">Điều chỉnh khoảng thời gian phù hợp hơn</p>
                  </div>
                  <button
                    onClick={() => setShowAdjustModal(false)}
                    className="rounded-full bg-white/20 p-2 transition hover:bg-white/30"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-3 p-3">
                  <div className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-slate-500">Sinh viên</p>
                      <p className="text-base font-semibold text-slate-800">
                        {selectedAppointment.AppointmentStudent?.Full_Name || "N/A"}
                      </p>
                    </div>
                    <div className="sm:text-right">
                      <p className="text-xs text-slate-500">Thời gian hiện tại</p>
                      <p className="text-base font-semibold text-slate-800">
                        {selectedAppointment.AvailableSlot?.Date
                          ? new Date(selectedAppointment.AvailableSlot.Date).toLocaleDateString("vi-VN")
                          : "N/A"}{" "}
                        • {getRequestedTimeRange(selectedAppointment).label}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-700">
                      <span>Từ: {formatHHmm(adjustStart || 0)}</span>
                      <span>Đến: {formatHHmm(adjustEnd || 0)}</span>
                    </div>
                    {adjustStart != null && adjustEnd != null && getRequestedTimeRange(selectedAppointment).start && getRequestedTimeRange(selectedAppointment).end && (
                      <Slider
                        range
                        min={toMinutes(getRequestedTimeRange(selectedAppointment).start)}
                        max={toMinutes(getRequestedTimeRange(selectedAppointment).end)}
                        value={[adjustStart, adjustEnd]}
                        onChange={(vals) => {
                          setAdjustStart(vals[0]);
                          setAdjustEnd(vals[1]);
                        }}
                        allowCross={false}
                        step={1}
                      />
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-center">
                      <p className="text-[11px] text-slate-500">Bắt đầu</p>
                      <p className="text-sm font-semibold text-slate-800">{formatHHmm(adjustStart || 0)}</p>
                    </div>
                    <div className="rounded-lg border border-amber-300 bg-amber-50 p-2 text-center">
                      <p className="text-[11px] text-slate-500">Thời lượng</p>
                      <p className="text-sm font-semibold text-amber-700">
                        {Math.floor(((adjustEnd || 0) - (adjustStart || 0)) / 60)}h {((adjustEnd || 0) - (adjustStart || 0)) % 60}m
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-center">
                      <p className="text-[11px] text-slate-500">Kết thúc</p>
                      <p className="text-xl font-semibold text-slate-800">{formatHHmm(adjustEnd || 0)}</p>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Ghi chú lý do thay đổi</label>
                    <textarea
                      rows={4}
                      value={adjustNote}
                      onChange={(e) => setAdjustNote(e.target.value)}
                      placeholder="Ví dụ: Điều chỉnh để phù hợp lịch dạy và đảm bảo đủ thời gian trao đổi..."
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-udck-primary focus:ring-2 focus:ring-udck-primary/10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 border-t border-slate-200 bg-slate-50 p-3 sm:grid-cols-2">
                  <button
                    onClick={() => setShowAdjustModal(false)}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={() => adjustAppointmentTime(selectedAppointment)}
                    disabled={adjusting}
                    className="rounded-xl bg-udck-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-udck-dark disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {adjusting ? "Đang lưu..." : "Lưu thay đổi"}
                  </button>
                </div>
              </div>
            </div>
          )}
      </>
      )}
    </div>
  );
};

export default PendingRequests;
