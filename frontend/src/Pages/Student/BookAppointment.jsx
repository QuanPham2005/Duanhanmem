import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import StudentLayout from "../../components/Layouts/StudentLayout";
import { Button } from "../../components/UI";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";
import { ArrowLeft, Calendar, Clock, User, FileText } from "phosphor-react";

export default function BookAppointment() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const slotId = searchParams.get("slotId");
  const lecturerName = searchParams.get("lecturerName") || "";
  const date = searchParams.get("date") || "";
  const time = searchParams.get("time") || "";
  const lecturerId = searchParams.get("lecturerId");
  
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lecturerInfo, setLecturerInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [slotInfo, setSlotInfo] = useState(null);
  const [startMin, setStartMin] = useState(null);
  const [endMax, setEndMax] = useState(null);
  const [selectedStart, setSelectedStart] = useState(null);
  const [selectedEnd, setSelectedEnd] = useState(null);
  const [bookedRanges, setBookedRanges] = useState([]);
  const [hasSelfBooking, setHasSelfBooking] = useState(false);
  const [hasExistingLecturerBooking, setHasExistingLecturerBooking] = useState(false);
  const [now, setNow] = useState(new Date());
  const MIN_BOOKING_DURATION = 15;

  const jwt = () => localStorage.getItem("Student jwtToken");

  // Decode JWT to get student ID
  const getStudentIdFromToken = () => {
    const token = jwt();
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.id || payload.studentId || null;
    } catch (e) {
      return null;
    }
  };

  const parseTimeToMinutes = useCallback((timeString) => {
    if (!timeString) return 0;
    const parts = String(timeString).split(":");
    return Number(parts[0] || 0) * 60 + Number(parts[1] || 0);
  }, []);

  const parseDateOnly = useCallback((value) => {
    if (!value) return null;
    const stringValue = String(value).slice(0, 10);
    const parts = stringValue.split("-").map((n) => Number(n));
    if (parts.length !== 3 || parts.some((p) => Number.isNaN(p))) return null;
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }, []);

  const currentMinutes = useMemo(() => now.getHours() * 60 + now.getMinutes(), [now]);
  const slotDateObject = useMemo(() => parseDateOnly(slotInfo?.Date || date), [slotInfo, date, parseDateOnly]);
  const todayDateObject = useMemo(() => new Date(now.getFullYear(), now.getMonth(), now.getDate()), [now]);

  const expiredRange = useMemo(() => {
    if (!slotInfo || startMin == null || endMax == null || !slotDateObject) return null;
    const slotStart = startMin;
    const slotEnd = endMax;
    if (slotDateObject < todayDateObject) {
      return { start: slotStart, end: slotEnd };
    }
    if (slotDateObject.getTime() === todayDateObject.getTime()) {
      const expiredEnd = Math.min(currentMinutes, slotEnd);
      if (expiredEnd > slotStart) {
        return { start: slotStart, end: expiredEnd };
      }
    }
    return null;
  }, [slotInfo, startMin, endMax, slotDateObject, todayDateObject, currentMinutes]);

  const effectiveStartMin = useMemo(() => {
    if (startMin == null || endMax == null || !slotDateObject) return startMin;
    if (slotDateObject.getTime() === todayDateObject.getTime()) {
      return Math.min(Math.max(startMin, currentMinutes), endMax);
    }
    return startMin;
  }, [startMin, endMax, slotDateObject, todayDateObject, currentMinutes]);

  const slotExpired = useMemo(() => {
    if (!slotInfo || startMin == null || endMax == null || !slotDateObject) return false;
    if (slotDateObject < todayDateObject) return true;
    return slotDateObject.getTime() === todayDateObject.getTime() && currentMinutes >= endMax;
  }, [slotInfo, startMin, endMax, slotDateObject, todayDateObject, currentMinutes]);
  const studentId = getStudentIdFromToken();

  useEffect(() => {
    const token = jwt();
    if (!token) {
      navigate("/student/login");
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch lecturer info
        if (lecturerId) {
          const lecturerRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/v1/student/lecturers/${lecturerId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setLecturerInfo(lecturerRes.data.data?.lecturer || null);
        }
        
        // Fetch slot info
        if (lecturerId && slotId) {
          fetchSlotInfo();
          fetchExistingLecturerBooking();
        }
        
      } catch (err) {
        console.error('Error:', err);
        toast.error("Không thể tải thông tin");
      } finally {
        setLoading(false);
      }
    };

    if (lecturerId) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [lecturerId, slotId, navigate]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchBookedRanges = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/v1/student/slots/${slotId}/appointments`, {
        headers: { Authorization: `Bearer ${jwt()}` },
      });
      const appts = res.data.data?.appointments || [];
      const filteredAppts = appts.filter((a) => a.Status === "Approved" || a.Status === "Pending");
      const ranges = filteredAppts.map((a) => {
        const start = parseTimeToMinutes(a.StuStartTime || a.StartTime);
        const end = parseTimeToMinutes(a.StuEndTime || a.EndTime);
        return {
          start,
          end,
          studentId: a.Student_ID,
          Status: a.Status,
          studentName: a.AppointmentStudent?.Full_Name || `Sinh viên ${typeof a.Student_ID === 'string' ? a.Student_ID.slice(-4) : 'Unknown'}`
        };
      });

      const selfBooking = filteredAppts.some((a) => String(a.Student_ID) === String(studentId));
      setHasSelfBooking(selfBooking);
      setBookedRanges(ranges);
    } catch (err) {
      console.error('Error in fetchBookedRanges:', err);
      setBookedRanges([]);
    }
  };

  const fetchExistingLecturerBooking = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/v1/student/appointments/registered`, {
        headers: { Authorization: `Bearer ${jwt()}` },
      });
      const appointments = res.data.appointments || [];
      const existingBooking = appointments.some((apt) => {
        const lecturerFromAppointment = apt.AvailableSlot?.SlotLecturer?.Lecturer_ID || apt.AvailableSlot?.Lecturer_ID || apt.Lecturer_ID || apt.lecturerId || apt.Lecturer?._id || apt.lecturer?._id;
        return String(lecturerFromAppointment) === String(lecturerId) && ["Approved", "Pending"].includes(apt.Status);
      });
      setHasExistingLecturerBooking(existingBooking);
    } catch (err) {
      console.error("Error fetching existing lecturer booking:", err);
      setHasExistingLecturerBooking(false);
    }
  };

  const fetchSlotInfo = async () => {
    try {
      const token = jwt();
      
      if (!token) {
        navigate("/student/login");
        return;
      }
      
      const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/v1/student/lecturers/${lecturerId}/slots`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const slots = res.data.data?.slots || [];
      const s = slots.find((x) => String(x.Slot_ID) === String(slotId));
      if (s) {
        setSlotInfo(s);
        const sMin = parseTimeToMinutes(s.StartTime || "00:00");
        const eMax = parseTimeToMinutes(s.EndTime || "23:59");
        setStartMin(sMin);
        setEndMax(eMax);
        setSelectedStart(sMin);
        setSelectedEnd(eMax);
        
        fetchBookedRanges();
      } else {
        // Slot not found or expired
        toast.error("Khung giờ đã bị xóa hoặc quá hạn");
        navigate(`/student/dashboard/lecturer/${lecturerId}`);
      }
    } catch (err) {
      console.error("Failed to fetch slot info:", err);
      if (err.response?.status === 401) {
        localStorage.removeItem("Student jwtToken");
        localStorage.removeItem("email");
        navigate("/student/login");
      } else {
        toast.error("Không thể tải thông tin slot");
      }
    }
  };

  const handleSliderChange = (vals) => {
    const allowedStart = effectiveStartMin ?? vals[0];
    setSelectedStart(Math.max(vals[0], allowedStart));
    setSelectedEnd(vals[1]);
  };

  useEffect(() => {
    if (effectiveStartMin == null || selectedStart == null || selectedEnd == null || endMax == null) return;

    let nextStart = selectedStart;
    let nextEnd = selectedEnd;

    if (selectedStart < effectiveStartMin) {
      nextStart = effectiveStartMin;
    }

    if (selectedEnd <= effectiveStartMin) {
      nextEnd = Math.min(effectiveStartMin + MIN_BOOKING_DURATION, endMax);
    }

    if (nextStart !== selectedStart) {
      setSelectedStart(nextStart);
    }
    if (nextEnd !== selectedEnd) {
      setSelectedEnd(nextEnd);
    }
  }, [effectiveStartMin, selectedStart, selectedEnd, endMax]);

  const formatTime = (minutes) => {
    const h = Math.floor(minutes / 60).toString().padStart(2, '0');
    const m = (minutes % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error("Vui lòng nhập nội dung cần tư vấn");
      return;
    }
    if (selectedStart == null || selectedEnd == null) {
      toast.error("Vui lòng chọn khoảng thời gian");
      return;
    }
    if (slotExpired) {
      toast.error("Khung giờ đã trôi qua và không còn khả dụng.");
      return;
    }
    if (selectedStart < (effectiveStartMin ?? 0)) {
      toast.error("Khoảng thời gian đã trôi qua. Vui lòng chọn giờ hợp lệ.");
      return;
    }
    if (selectedEnd - selectedStart < MIN_BOOKING_DURATION) {
      toast.error(`Thời gian tư vấn tối thiểu là ${MIN_BOOKING_DURATION} phút`);
      return;
    }

    if (hasSelfBooking) {
      toast.error("Bạn đã đặt lịch trong khung giờ này.");
      return;
    }

    if (hasExistingLecturerBooking) {
      toast.error("Bạn đã có lịch hẹn với giảng viên này. Không thể đặt lại.");
      return;
    }

    // Check for overlap with existing bookings
    const hasOverlap = bookedRanges.some(
      (b) => selectedStart < b.end && selectedEnd > b.start
    );
    if (hasOverlap) {
      toast.error("Khoảng thời gian đã được đặt bởi sinh viên khác");
      return;
    }

    if (selectedStart < (effectiveStartMin ?? 0)) {
      toast.error("Khoảng thời gian đã trôi qua. Vui lòng chọn giờ hợp lệ.");
      return;
    }

    if (selectedStart >= selectedEnd) {
      toast.error("Thời gian bắt đầu phải nhỏ hơn thời gian kết thúc");
      return;
    }

    setSubmitting(true);
    try {
      await axios.patch(
        `${import.meta.env.VITE_BACKEND_URL}/api/v1/student/appointments/${slotId}`,
        {
          StuStartTime: formatTime(selectedStart),
          StuEndTime: formatTime(selectedEnd),
          reason: reason.trim(),
          location: "",
        },
        { headers: { Authorization: `Bearer ${jwt()}` } }
      );
      toast.success("Đặt lịch thành công! Vui lòng chờ giảng viên xác nhận.");
      navigate("/student/dashboard/appointments");
    } catch (err) {
      toast.error(err.response?.data?.message || "Đặt lịch thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <StudentLayout title="Đặt lịch tư vấn" user={{ name: localStorage.getItem("Student Name") || "Sinh viên" }}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Đang tải thông tin...</p>
          </div>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout title="Đặt lịch tư vấn" user={{ name: localStorage.getItem("Student Name") || "Sinh viên" }}>
      <div className="space-y-6">
        <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Back Button */}
          <Link 
            to={`/student/dashboard/lecturer/${lecturerId}`}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          >
            <ArrowLeft size={20} />
            Quay lại hồ sơ giảng viên
          </Link>

          {/* Main Layout - Two Column */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column - Lecturer Info */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Lecturer Header */}
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-10">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <User size={40} className="text-white" />
                    </div>
                    <h1 className="text-xl font-bold text-white mb-2">{decodeURIComponent(lecturerName)}</h1>
                    <div className="flex flex-col items-center gap-2 text-blue-100 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar size={16} />
                        <span>{date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock size={16} />
                        <span>{time}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Lecturer Details */}
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Thông tin giảng viên</h3>
                  {lecturerInfo ? (
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Email</p>
                        <p className="font-medium text-gray-900">{lecturerInfo.email}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Khoa</p>
                        <p className="font-medium text-gray-900">{lecturerInfo.department || "Chưa cập nhật"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Chuyên ngành</p>
                        <p className="font-medium text-gray-900">{lecturerInfo.major || "Chưa cập nhật"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Mã giảng viên</p>
                        <p className="font-medium text-gray-900">{lecturerInfo._id || lecturerInfo.Lecturer_ID}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <User size={20} className="text-gray-400" />
                      </div>
                      <p className="text-gray-500 text-sm">Đang tải thông tin...</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Booking Form */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Form Header */}
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
                  <h2 className="text-xl font-bold text-white">Đặt lịch tư vấn</h2>
                </div>

                {/* Form Content */}
                <form onSubmit={handleSubmit} className="p-6">
                  
                  {/* Time Selection */}
                  {slotInfo && startMin != null && endMax != null && (
                    <div className="mb-8">
                      <label className="block text-lg font-semibold text-gray-900 mb-4">
                        <Clock size={20} className="inline mr-2" />
                        Chọn khoảng thời gian
                      </label>
                      <div className="bg-gray-50 rounded-xl p-6 space-y-6">
                        {slotExpired && (
                          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700">
                            <p className="font-semibold">Khoảng thời gian này đã trôi qua một phần hoặc toàn bộ.</p>
                            <p className="text-sm mt-1">Phần màu xám là thời gian đã hết hạn và không thể chọn.</p>
                          </div>
                        )}
                        {/* Time Range Display */}
                        <div className="bg-gray-100 rounded-lg p-4 border border-gray-200">
                          <div className="flex justify-between text-sm text-gray-600 font-medium">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                              <span>Bắt đầu: {slotInfo.StartTime || "00:00"}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span>Kết thúc: {slotInfo.EndTime || "23:59"}</span>
                              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            </div>
                          </div>
                        </div>

                        {/* Slider Visualization */}
                        <div className="space-y-4">
                          <div className="relative bg-gray-200 rounded-full h-3 overflow-hidden">
                            {/* Background track */}
                            <div className="absolute inset-0 bg-gray-300" />

                            {/* Expired past range */}
                            {expiredRange && expiredRange.end > expiredRange.start && startMin !== null && endMax !== null && (
                              <div
                                title={`Đã quá hạn: ${formatTime(expiredRange.start)} - ${formatTime(expiredRange.end)}`}
                                className="absolute top-0 bottom-0 bg-gray-400 rounded-full"
                                style={{
                                  left: `${((expiredRange.start - startMin) / (endMax - startMin)) * 100}%`,
                                  width: `${((expiredRange.end - expiredRange.start) / (endMax - startMin)) * 100}%`
                                }}
                              />
                            )}
                            
                            {/* Booked ranges - MÀU ĐỎ PHÂN BIỆT */}
                            {bookedRanges.filter(b => b && typeof b === 'object' && b.start !== undefined && b.end !== undefined).map((b, idx) => {
                              if (startMin === null || endMax === null) return null;
                              
                              const total = endMax - startMin;
                              const left = ((b.start - startMin) / total) * 100;
                              const width = ((b.end - b.start) / total) * 100;
                              
                              return (
                                <div
                                  key={idx}
                                  title={`${formatTime(b.start)} - ${formatTime(b.end)}`}
                                  style={{ 
                                    left: `${Math.max(0, Math.min(100, left))}%`, 
                                    width: `${Math.max(0, Math.min(100 - left, width))}%` 
                                  }}
                                  className="absolute top-0 bottom-0 bg-red-500 rounded-full"
                                />
                              );
                            })}
                            
                            {/* Selection indicator - MÀU XANH DƯƠNG */}
                            {selectedStart != null && selectedEnd != null && (
                              <div
                                className="absolute top-0 bottom-0 bg-blue-500 bg-opacity-50 rounded-full"
                                style={{ left: `${((selectedStart - startMin) / (endMax - startMin)) * 100}%`, width: `${((selectedEnd - selectedStart) / (endMax - startMin)) * 100}%` }}
                              />
                            )}

                            {/* Range slider */}
                            <div className="absolute inset-0 w-full flex items-center">
                              <div className="w-full">
                                <Slider
                                  range
                                  min={effectiveStartMin ?? startMin}
                                  max={endMax}
                                  step={1}
                                  allowCross={false}
                                  disabled={slotExpired}
                                  value={[selectedStart, selectedEnd]}
                                  onChange={handleSliderChange}
                                  className="w-full"
                                  trackStyle={[{ backgroundColor: 'transparent' }, { backgroundColor: 'transparent' }]}
                                  handleStyle={[
                                    { backgroundColor: '#3b82f6', borderColor: '#1d4ed8', borderWidth: 3, width: 20, height: 20, marginTop: -8.5 },
                                    { backgroundColor: '#2563eb', borderColor: '#1e40af', borderWidth: 3, width: 20, height: 20, marginTop: -8.5 }
                                  ]}
                                  railStyle={{ backgroundColor: 'transparent' }}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Legend */}
                          <div className="flex gap-6 text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-4 rounded bg-gradient-to-r from-blue-400 to-blue-500 border border-blue-600" />
                              <span className="text-gray-700 font-medium">Lựa chọn của bạn</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-4 rounded bg-gradient-to-r from-red-400 to-red-500 border border-red-600" />
                              <span className="text-gray-700 font-medium">Đã được đặt</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-4 rounded bg-gray-400 border border-gray-500" />
                              <span className="text-gray-700 font-medium">Đã trôi qua</span>
                            </div>
                          </div>

                          {/* Time Display */}
                          <div className="grid grid-cols-3 gap-4 text-center">
                            <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
                              <p className="text-xs text-gray-600 font-medium mb-1">Bắt đầu</p>
                              <p className="font-bold text-blue-600 text-xl">{formatTime(selectedStart)}</p>
                            </div>
                            <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
                              <p className="text-xs text-gray-600 font-medium mb-1">Thời lượng</p>
                              <p className="font-bold text-blue-600 text-xl">
                                {Math.floor((selectedEnd - selectedStart) / 60)}h {(selectedEnd - selectedStart) % 60}m
                              </p>
                            </div>
                            <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
                              <p className="text-xs text-gray-600 font-medium mb-1">Kết thúc</p>
                              <p className="font-bold text-blue-600 text-xl">{formatTime(selectedEnd)}</p>
                            </div>
                          </div>
                        </div>

                        {/* Notes Section */}
                        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                          <div className="flex items-start gap-2">
                            <span className="text-yellow-600 mt-1">⚠️</span>
                            <div>
                              <h4 className="text-sm font-semibold text-yellow-800 mb-1">Lưu ý:</h4>
                              <ul className="text-xs text-yellow-700 space-y-1">
                                <li>• Vui lòng chọn khoảng thời gian phù hợp với nhu cầu tư vấn</li>
                                <li>• Thời gian tư vấn tối thiểu là 15 phút</li>
                                <li>• Các khoảng thời gian đã được đánh dấu màu đỏ đã được đặt bởi sinh viên khác</li>
                                <li>• Sau khi đặt lịch, vui lòng chờ giảng viên xác nhận</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Fallback if no slot info */}
                  {!slotInfo && !loading && (
                    <div className="mb-8 p-6 bg-yellow-50 border border-yellow-200 rounded-xl">
                      <p className="text-yellow-800 font-medium">⚠️ Không thể tải thông tin khung giờ. Vui lòng thử lại sau.</p>
                    </div>
                  )}

                  {/* Reason Input */}
                  <div className="mb-8">
                    <label className="block text-lg font-semibold text-gray-900 mb-4">
                      <FileText size={20} className="inline mr-2" />
                      Nội dung cần tư vấn
                    </label>
                    <textarea
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition resize-none"
                      rows={6}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Vui lòng mô tả chi tiết nội dung bạn cần tư vấn..."
                    />
                  </div>

                  {(hasSelfBooking || hasExistingLecturerBooking) && (
                    <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700">
                      <p className="font-semibold">
                        {hasExistingLecturerBooking
                          ? "Bạn đã có lịch hẹn với giảng viên này. Không thể đặt lại."
                          : "Bạn đã đặt lịch với giảng viên này trong khung giờ hiện tại."}
                      </p>
                      {hasExistingLecturerBooking && (
                        <p className="text-sm text-red-600">Vui lòng hủy hoặc chờ giảng viên xử lý yêu cầu hiện tại trước khi đặt lịch mới.</p>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => navigate(`/student/dashboard/lecturer/${lecturerId}`)}
                      className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-colors"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || hasSelfBooking}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? "Đang xử lý..." : "Xác nhận đặt lịch"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </StudentLayout>
  );
}
