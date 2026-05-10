import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { CalendarDays, Clock3, Plus, Trash2, AlertTriangle } from "lucide-react";
import { Badge } from "../../components/UI/Badge";

const ManageSlots = () => {
  const navigate = useNavigate();
  const [slots, setSlots] = useState([]);
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [slotToDelete, setSlotToDelete] = useState(null);

  const jwt = () => localStorage.getItem("Teacher jwtToken");

  const normalizeSlot = (slot) => {
    if (!slot) return null;
    return {
      ...slot,
      Slot_ID: slot.Slot_ID ?? slot.slot_id ?? slot.id,
      Date: slot.Date ?? slot.date,
      StartTime: slot.StartTime ?? slot.startTime,
      EndTime: slot.EndTime ?? slot.endTime,
      IsBooked: slot.IsBooked ?? slot.isBooked ?? slot.booked ?? false,
    };
  };

  const fetchSlots = () => {
    axios
      .get(`${import.meta.env.VITE_BACKEND_URL}/api/v1/teachers/slots`, {
        headers: { Authorization: `Bearer ${jwt()}` },
      })
      .then((res) => {
        const raw =
          res.data?.data?.slots ||
          res.data?.data?.availableSlots ||
          res.data?.data?.slot ||
          [];
        const list = Array.isArray(raw)
          ? raw.map(normalizeSlot).filter(Boolean)
          : raw
            ? [normalizeSlot(raw)].filter(Boolean)
            : [];
        setSlots(list);
        // Nếu muốn tắt thông báo tự động xóa khung giờ đã quá hạn, giữ nguyên và không hiện toast.
        // const removed = res.data.meta?.removed || 0;
        // if (removed > 0) {
        //   toast('Có ' + removed + ' khung giờ đã quá hạn và được xóa tự động', { icon: '⚠️' });
        // }
      })
      .catch(() => {
        toast.error("Không thể tải danh sách khung giờ.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!jwt()) {
      navigate("/teacher/login");
      return;
    }
    fetchSlots();
  }, [navigate]);

  const toDateOnly = (dateInput) => {
    const d = new Date(dateInput);
    if (Number.isNaN(d.getTime())) return null;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  };

  const toDateTime = (dateInput, timeInput) => {
    if (!dateInput || !timeInput) return null;
    const [h, m] = String(timeInput).split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    const d = new Date(dateInput);
    if (Number.isNaN(d.getTime())) return null;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m, 0, 0);
  };

  const formatDisplayDate = (dateInput) => {
    const d = new Date(dateInput);
    if (Number.isNaN(d.getTime())) return "N/A";
    return d.toLocaleDateString("vi-VN");
  };

  const formatDisplayTime = (timeInput) => String(timeInput || "").slice(0, 5);

  const isSlotBooked = (slot) => {
    const st = String(slot?.Status || "").toLowerCase();
    return Boolean(
      slot?.IsBooked ||
      slot?.isBooked ||
      slot?.Booked ||
      slot?.HasAppointment ||
      slot?.AppointmentCount > 0 ||
      st.includes("booked") ||
      st.includes("đã đặt")
    );
  };

  const minDate = useMemo(() => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }, []);

  const minStartTime = useMemo(() => {
    if (!date) return "";
    const now = new Date();
    const todayOnly = toDateOnly(now);
    const pickedOnly = toDateOnly(date);
    if (!todayOnly || !pickedOnly || todayOnly.getTime() !== pickedOnly.getTime()) return "";
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }, [date]);

  const sortedSlots = useMemo(() => {
    return [...slots].sort((a, b) => {
      const aStart = toDateTime(a.Date, a.StartTime)?.getTime() || 0;
      const bStart = toDateTime(b.Date, b.StartTime)?.getTime() || 0;
      return aStart - bStart;
    });
  }, [slots]);

  const addSlot = (e) => {
    e.preventDefault();
    if (!date || !startTime || !endTime) {
      toast.error("Vui lòng chọn đầy đủ ngày và giờ.");
      return;
    }

    const now = new Date();
    const startDateTime = toDateTime(date, startTime);
    const endDateTime = toDateTime(date, endTime);
    if (!startDateTime || !endDateTime) {
      toast.error("Dữ liệu thời gian không hợp lệ.");
      return;
    }
    if (startDateTime < now) {
      toast.error("Không thể tạo khung giờ trong quá khứ.");
      return;
    }
    if (endDateTime <= startDateTime) {
      toast.error("Giờ kết thúc phải sau giờ bắt đầu.");
      return;
    }

    const overlap = slots.some((s) => {
      const sameDate = toDateOnly(s.Date)?.getTime() === toDateOnly(date)?.getTime();
      if (!sameDate) return false;
      const existingStart = toDateTime(s.Date, s.StartTime);
      const existingEnd = toDateTime(s.Date, s.EndTime);
      if (!existingStart || !existingEnd) return false;
      return startDateTime < existingEnd && endDateTime > existingStart;
    });
    if (overlap) {
      toast.error("Khung giờ bị trùng với lịch rảnh đã có.");
      return;
    }

    setSubmitting(true);
    axios
      .post(
        `${import.meta.env.VITE_BACKEND_URL}/api/v1/teachers/slots`,
        { Date: date, StartTime: startTime, EndTime: endTime },
        { headers: { Authorization: `Bearer ${jwt()}` } }
      )
      .then((res) => {
        toast.success("Tạo khung giờ thành công.");
        const createdSlot = normalizeSlot(
          res.data?.data?.slot ||
          res.data?.data?.newSlot ||
          null
        );
        if (createdSlot && createdSlot.Slot_ID != null) {
          setSlots((prev) => {
            const existed = prev.some((p) => String(p.Slot_ID) === String(createdSlot.Slot_ID));
            if (existed) return prev;
            return [...prev, createdSlot];
          });
        }
        setDate("");
        setStartTime("");
        setEndTime("");
        fetchSlots();
      })
      .catch(() => toast.error("Không thể tạo khung giờ. Vui lòng thử lại."))
      .finally(() => setSubmitting(false));
  };

  const deleteSlot = (id) => {
    axios
      .delete(`${import.meta.env.VITE_BACKEND_URL}/api/v1/teachers/slots/${id}`, {
        headers: { Authorization: `Bearer ${jwt()}` },
      })
      .then(() => {
        toast.success("Đã xóa khung giờ.");
        fetchSlots();
      })
      .catch(() => toast.error("Không thể xóa khung giờ."));
  };

  return (
    <div className="container mx-auto px-4 py-6 sm:px-6 sm:py-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-semibold text-udck-primary">Khung giờ rảnh</h2>
          <button
            type="submit"
            form="slot-form"
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-udck-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-udck-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            {submitting ? "Đang thêm..." : "Thêm khung giờ"}
          </button>
        </div>

        <form id="slot-form" onSubmit={addSlot} className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-600">Ngày</label>
            <input
              type="date"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-udck-primary focus:ring-2 focus:ring-udck-primary/10"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={minDate}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-600">Giờ bắt đầu</label>
            <input
              type="time"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-udck-primary focus:ring-2 focus:ring-udck-primary/10"
              value={startTime}
              min={minStartTime || undefined}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-600">Giờ kết thúc</label>
            <input
              type="time"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-udck-primary focus:ring-2 focus:ring-udck-primary/10"
              value={endTime}
              min={startTime || undefined}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
          </div>
        </form>

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
            Đang tải dữ liệu....
          </div>
        ) : sortedSlots.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <p className="text-base font-medium text-slate-600">Chưa có khung giờ rảnh nào.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedSlots.map((s) => {
              const booked = isSlotBooked(s);
              return (
                <article
                  key={s.Slot_ID}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                      <CalendarDays className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-blue-700">{formatDisplayDate(s.Date)}</p>
                      <p className="inline-flex items-center gap-1 text-sm text-slate-600">
                        <Clock3 className="h-3.5 w-3.5" />
                        {formatDisplayTime(s.StartTime)} - {formatDisplayTime(s.EndTime)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3">
                    {booked && <Badge variant="upcoming">Đã đặt</Badge>}
                    {!booked && (
                      <button
                        type="button"
                        onClick={() => setSlotToDelete(s)}
                        className="rounded-lg p-2 text-red-500 transition hover:bg-red-50 hover:text-red-600"
                        aria-label="Xóa khung giờ"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {slotToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => setSlotToDelete(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start gap-3">
              <div className="rounded-lg bg-red-50 p-2 text-red-500">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold  text-slate-800">Xác nhận xóa khung giờ</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Bạn có chắc muốn xóa khung giờ{" "}
                  <span className="font-medium text-slate-800">
                    {formatDisplayDate(slotToDelete.Date)} ({formatDisplayTime(slotToDelete.StartTime)} - {formatDisplayTime(slotToDelete.EndTime)})
                  </span>
                  ?
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setSlotToDelete(null)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteSlot(slotToDelete.Slot_ID);
                  setSlotToDelete(null);
                }}
                className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700"
              >
                Xóa khung giờ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageSlots;
