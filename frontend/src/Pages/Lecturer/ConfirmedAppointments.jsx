import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import ConfirmModal from "../../components/UI/ConfirmModal";

const ConfirmedAppointments = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const jwt = () => localStorage.getItem("Teacher jwtToken");

  useEffect(() => {
    if (!jwt()) {
      navigate("/teacher/login");
      return;
    }
    fetchAppointments();
  }, [navigate]);

  const fetchAppointments = () => {
    setLoading(true);
    axios
      .get(`${import.meta.env.VITE_BACKEND_URL}/api/v1/teachers/appointments`, {
        headers: { Authorization: `Bearer ${jwt()}` },
      })
      .then((res) => setAppointments(res.data.data?.appointments || []))
      .catch(() => setAppointments([]))
      .finally(() => setLoading(false));
  };

  const handleCancelClick = (appointment) => {
    if (appointment.Status !== "Approved") {
      alert("Only approved appointments can be cancelled");
      return;
    }
    setSelectedAppointment(appointment);
    setCancellationReason("");
    setShowCancelModal(true);
  };

  const handleConfirmCancel = async () => {
    const trimmedReason = cancellationReason.trim();
    if (!trimmedReason) {
      alert("Please enter a cancellation reason");
      return;
    }

    setCancelling(true);
    try {
      await axios.delete(
        `${import.meta.env.VITE_BACKEND_URL}/api/v1/teachers/appointments/${selectedAppointment.Appoint_ID}`,
        {
          headers: { Authorization: `Bearer ${jwt()}` },
          data: { reason: trimmedReason },
        }
      );
      setShowCancelModal(false);
      setCancellationReason("");
      setSelectedAppointment(null);
      fetchAppointments();
    } catch (error) {
      console.error("Cancel error:", error);
      alert(error.response?.data?.message || "Failed to cancel appointment");
    } finally {
      setCancelling(false);
    }
  };

  const statusLabel = (s) =>
    s === "Pending" ? "Pending" : s === "Approved" ? "Approved" : "Rejected";

  const getStudentName = (appointment) => {
    return appointment.AppointmentStudent?.Full_Name || `Student #${appointment.Student_ID}`;
  };

  const getTimeLabel = (appointment) => {
    const start = String(appointment.StuStartTime || appointment.AvailableSlot?.StartTime || "").slice(0, 5);
    const end = String(appointment.StuEndTime || appointment.AvailableSlot?.EndTime || "").slice(0, 5);
    return start && end ? `${start} - ${end}` : "N/A";
  };

  return (
    <div className="container mx-auto px-6 py-8">
      {loading && <p>Loading...</p>}
      {!loading && (
        <div className="overflow-x-auto">
          <table className="min-w-full border">
            <thead>
              <tr className="bg-gray-200">
                <th className="px-4 py-2 text-left">#</th>
                <th className="px-4 py-2 text-left">Student</th>
                <th className="px-4 py-2 text-left">Time</th>
                <th className="px-4 py-2 text-left">Location</th>
                <th className="px-4 py-2 text-left">Reason</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((a, i) => (
                <tr key={a.Appoint_ID || i} className="border-b">
                  <td className="px-4 py-2">{i + 1}</td>
                  <td className="px-4 py-2">{getStudentName(a)}</td>
                  <td className="px-4 py-2">{getTimeLabel(a)}</td>
                  <td className="px-4 py-2">{a.Location || "-"}</td>
                  <td className="px-4 py-2">{a.Reason || "-"}</td>
                  <td className="px-4 py-2">{statusLabel(a.Status)}</td>
                  <td className="px-4 py-2 text-center">
                    {a.Status === "Approved" && (
                      <button
                        onClick={() => handleCancelClick(a)}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!loading && appointments.length === 0 && (
        <p className="text-gray-500 mt-4">No appointments.</p>
      )}

      <ConfirmModal
        open={showCancelModal}
        title="Cancel Appointment"
        description="Bạn có chắc chắn muốn hủy lịch hẹn này?"
        confirmText="Xác nhận hủy"
        cancelText="Hủy"
        loading={cancelling}
        onConfirm={handleConfirmCancel}
        onCancel={() => {
          setShowCancelModal(false);
          setCancellationReason("");
          setSelectedAppointment(null);
        }}
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to cancel this appointment with{" "}
            <strong>{selectedAppointment && getStudentName(selectedAppointment)}</strong>?
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cancellation Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              placeholder="Enter reason for cancellation..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="4"
            />
          </div>
        </div>
      </ConfirmModal>
    </div>
  );
};

export default ConfirmedAppointments;
