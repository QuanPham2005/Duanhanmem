import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { MagnifyingGlass, Plus } from "phosphor-react";
import { Eye, EyeOff, Lock, Unlock, Edit3 } from "lucide-react";
import { Card } from "../../components/UI/Card";
import { Button } from "../../components/UI/Button";

export default function ManageUsers() {
  const navigate = useNavigate();
  const jwt = () => localStorage.getItem("jwtToken");

  const [activeTab, setActiveTab] = useState("students");
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);

  const [students, setStudents] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [majors, setMajors] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [selectedAccountType, setSelectedAccountType] = useState(null);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [selectedAccountInfo, setSelectedAccountInfo] = useState({ Full_Name: "", ClassName: "", Dept_ID: "", Major_ID: "", Academic_Rank: "", Office_Room: "" });
  const [actionLoading, setActionLoading] = useState(false);
  const [showCreatePassword, setShowCreatePassword] = useState({
    student: false,
    lecturer: false,
  });
  const [showEditPassword, setShowEditPassword] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  const [studentForm, setStudentForm] = useState({
    Student_ID: "",
    Password: "",
    Email: "",
    Full_Name: "",
    Dept_ID: "",
    Major_ID: "",
    ClassName: "",
  });
  const [lecturerForm, setLecturerForm] = useState({
    Username: "",
    Password: "",
    Email: "",
    Full_Name: "",
    Dept_ID: "",
    Major_ID: "",
    Office_Room: "",
    Academic_Rank: "",
  });

  const headers = useMemo(() => ({ Authorization: `Bearer ${jwt()}` }), []);

  const loadAll = async () => {
    if (!jwt()) {
      navigate("/admin/login");
      return;
    }
    setLoading(true);
    try {
      const [stRes, lecRes, deptRes, majorRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/v1/admin/students`, { headers }),
        axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/v1/admin/teachers`, { headers }),
        axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/v1/admin/departments`, { headers }),
        axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/v1/admin/majors`, { headers }),
      ]);

      setStudents((stRes.data.data && stRes.data.data.students) || []);
      setLecturers((lecRes.data.data && lecRes.data.data.users) || []);
      setDepartments((deptRes.data.data && deptRes.data.data.departments) || []);
      setMajors((majorRes.data.data && majorRes.data.data.majors) || []);
    } catch (err) {
      toast.error("Không thể tải dữ liệu người dùng");
      setStudents([]);
      setLecturers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const filteredStudents = students.filter((s) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return (
      String(s.Student_ID || s._id || "").toLowerCase().includes(q) ||
      String(s.Full_Name || s.name || "").toLowerCase().includes(q) ||
      String(s.Email || s.email || "").toLowerCase().includes(q)
    );
  });

  const filteredLecturers = lecturers.filter((l) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return (
      String(l.Lecturer_ID || l._id || "").toLowerCase().includes(q) ||
      String(l.Full_Name || l.name || "").toLowerCase().includes(q) ||
      String(l.Email || l.email || "").toLowerCase().includes(q)
    );
  });

  const createStudent = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...studentForm,
        Student_ID: Number(studentForm.Student_ID),
      };
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/v1/admin/students`, payload, { headers });
      toast.success("Đã thêm sinh viên");
      setStudentForm({
        Student_ID: "",
        Password: "",
        Email: "",
        Full_Name: "",
        Dept_ID: "",
        Major_ID: "",
        ClassName: "",
      });
      setShowCreate(false);
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Không thể thêm sinh viên");
    }
  };

  const filteredStudentMajors = useMemo(() => {
    if (!studentForm.Dept_ID) return majors;
    return majors.filter((m) => String(m.Dept_ID) === String(studentForm.Dept_ID));
  }, [majors, studentForm.Dept_ID]);

  const filteredLecturerMajors = useMemo(() => {
    if (!lecturerForm.Dept_ID) return majors;
    return majors.filter((m) => String(m.Dept_ID) === String(lecturerForm.Dept_ID));
  }, [majors, lecturerForm.Dept_ID]);

  const createLecturer = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/v1/admin/teachers`, lecturerForm, { headers });
      toast.success("Đã thêm giảng viên");
      setLecturerForm({
        Username: "",
        Password: "",
        Email: "",
        Full_Name: "",
        Dept_ID: "",
        Major_ID: "",
        Office_Room: "",
        Academic_Rank: "",
      });
      setShowCreate(false);
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Không thể thêm giảng viên");
    }
  };

  const openPasswordForm = (account, type) => {
    setSelectedAccount(account);
    setSelectedAccountType(type);
    setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setShowEditPassword({ currentPassword: false, newPassword: false, confirmPassword: false });

    let deptId = account.Dept_ID || "";
    let majorId = account.Major_ID || "";

    if (type === "students" && account.Major?.MajorName) {
      const matchedMajor = majors.find((m) => m.MajorName === account.Major.MajorName);
      if (matchedMajor) {
        deptId = String(matchedMajor.Dept_ID || "");
        majorId = String(matchedMajor.Major_ID || "");
      }
    }

    setSelectedAccountInfo({
      Full_Name: account.Full_Name || account.name || "",
      ClassName: account.ClassName || "",
      Dept_ID: deptId,
      Major_ID: majorId,
      Academic_Rank: account.Academic_Rank || account.academicRank || "",
      Office_Room: account.Office_Room || account.officeRoom || "",
    });
    setShowPasswordForm(true);
  };

  const closePasswordForm = () => {
    setShowPasswordForm(false);
    setSelectedAccount(null);
    setSelectedAccountType(null);
    setSelectedAccountInfo({ Full_Name: "", ClassName: "", Dept_ID: "", Major_ID: "", Academic_Rank: "", Office_Room: "" });
    setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setShowEditPassword({ currentPassword: false, newPassword: false, confirmPassword: false });
  };

  const updateSelectedAccountInfo = (field, value) => {
    setSelectedAccountInfo((prev) => ({ ...prev, [field]: value }));
  };

  const toggleStatus = async (account, type) => {
    if (!account || !account._id) return;
    const id = account._id;
    const url = type === "students"
      ? `${import.meta.env.VITE_BACKEND_URL}/api/v1/admin/students/${id}/status`
      : `${import.meta.env.VITE_BACKEND_URL}/api/v1/admin/teachers/${id}/status`;
    try {
      setActionLoading(true);
      const res = await axios.patch(url, null, { headers });
      toast.success(`Đã ${res.data.data?.Status === "Active" ? "mở khóa" : "khóa"} tài khoản`);
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Không thể cập nhật trạng thái");
    } finally {
      setActionLoading(false);
    }
  };

  const saveAccountChanges = async (e) => {
    e.preventDefault();
    if (!selectedAccount || !selectedAccountType) return;

    const id = selectedAccount._id;
    const actions = [];

    if (selectedAccountType === "students") {
      const studentPayload = {
        Full_Name: selectedAccountInfo.Full_Name,
        ClassName: selectedAccountInfo.ClassName,
        Major_ID: selectedAccountInfo.Major_ID || null,
      };

      actions.push(
        axios.patch(`${import.meta.env.VITE_BACKEND_URL}/api/v1/admin/students/${id}`, studentPayload, { headers })
      );
    } else if (selectedAccountType === "lecturers") {
      const lecturerPayload = {
        Full_Name: selectedAccountInfo.Full_Name,
        Dept_ID: selectedAccountInfo.Dept_ID || null,
        Major_ID: selectedAccountInfo.Major_ID || null,
        Academic_Rank: selectedAccountInfo.Academic_Rank || null,
        Office_Room: selectedAccountInfo.Office_Room || null,
      };

      actions.push(
        axios.patch(`${import.meta.env.VITE_BACKEND_URL}/api/v1/admin/teachers/${id}`, lecturerPayload, { headers })
      );
    }

    if (passwordData.newPassword.trim()) {
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        toast.error("Mật khẩu mới không khớp");
        return;
      }
      if (passwordData.newPassword.length < 6) {
        toast.error("Mật khẩu phải có ít nhất 6 ký tự");
        return;
      }
      const passwordUrl = selectedAccountType === "students"
        ? `${import.meta.env.VITE_BACKEND_URL}/api/v1/admin/students/${id}/password`
        : `${import.meta.env.VITE_BACKEND_URL}/api/v1/admin/teachers/${id}/password`;
      actions.push(axios.patch(passwordUrl, { newPassword: passwordData.newPassword }, { headers }));
    }

    if (actions.length === 0) {
      toast.error("Không có thay đổi nào để lưu");
      return;
    }

    try {
      setActionLoading(true);
      await Promise.all(actions);
      toast.success("Đã lưu thay đổi");
      closePasswordForm();
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Không thể lưu thay đổi");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <Card className="border border-slate-200 !p-0 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-full bg-slate-100 p-1">
              <button
                className={`px-5 py-2 rounded-full text-sm font-medium ${activeTab === "students" ? "bg-udck-primary text-white" : "text-slate-600"}`}
                onClick={() => setActiveTab("students")}
              >
                Sinh viên
              </button>
              <button
                className={`px-5 py-2 rounded-full text-sm font-medium ${activeTab === "lecturers" ? "bg-udck-primary text-white" : "text-slate-600"}`}
                onClick={() => setActiveTab("lecturers")}
              >
                Giảng viên
              </button>
            </div>
            <Button onClick={() => setShowCreate((v) => !v)}>
              <Plus size={16} /> Thêm mới
            </Button>
          </div>

          <div className="relative mt-4">
            <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
              <MagnifyingGlass className="text-slate-400" size={18} />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm..."
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 pl-12 pr-3 py-2.5 outline-none focus:border-udck-primary"
            />
          </div>
        </div>

        {showCreate && (
          <div className="p-5 border-b border-slate-200 bg-slate-50">
            {activeTab === "students" ? (
              <form onSubmit={createStudent} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input required type="number" min="1" placeholder="Mã sinh viên" value={studentForm.Student_ID} onChange={(e) => setStudentForm((p) => ({ ...p, Student_ID: e.target.value }))} className="px-3 py-2 border rounded-lg" />
                <div className="relative">
                  <input required type={showCreatePassword.student ? "text" : "password"} placeholder="Mật khẩu" value={studentForm.Password} onChange={(e) => setStudentForm((p) => ({ ...p, Password: e.target.value }))} className="w-full px-3 py-2 pr-10 border rounded-lg" />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                    onClick={() => setShowCreatePassword((prev) => ({ ...prev, student: !prev.student }))}
                  >
                    {showCreatePassword.student ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <input required type="email" placeholder="Email" value={studentForm.Email} onChange={(e) => setStudentForm((p) => ({ ...p, Email: e.target.value }))} className="px-3 py-2 border rounded-lg" />
                <input required placeholder="Họ và tên" value={studentForm.Full_Name} onChange={(e) => setStudentForm((p) => ({ ...p, Full_Name: e.target.value }))} className="px-3 py-2 border rounded-lg" />
                <select
                  value={studentForm.Dept_ID}
                  onChange={(e) =>
                    setStudentForm((p) => ({
                      ...p,
                      Dept_ID: e.target.value,
                      Major_ID: "",
                    }))
                  }
                  className="px-3 py-2 border rounded-lg"
                >
                  <option value="">Chọn khoa</option>
                  {departments.map((d) => (
                    <option key={d.Dept_ID} value={d.Dept_ID}>{d.DeptName}</option>
                  ))}
                </select>
                <select
                  value={studentForm.Major_ID}
                  onChange={(e) => {
                    const selectedMajor = majors.find((m) => String(m.Major_ID) === String(e.target.value));
                    setStudentForm((p) => ({
                      ...p,
                      Major_ID: e.target.value,
                      Dept_ID: selectedMajor?.Dept_ID ? String(selectedMajor.Dept_ID) : p.Dept_ID,
                    }));
                  }}
                  className="px-3 py-2 border rounded-lg"
                >
                  <option value="">Chọn ngành</option>
                  {filteredStudentMajors.map((m) => (
                    <option key={m.Major_ID} value={m.Major_ID}>{m.MajorName}</option>
                  ))}
                </select>
                <input placeholder="Lớp" value={studentForm.ClassName} onChange={(e) => setStudentForm((p) => ({ ...p, ClassName: e.target.value }))} className="px-3 py-2 border rounded-lg" />
                <div className="md:col-span-3">
                  <Button type="submit">Lưu sinh viên</Button>
                </div>
              </form>
            ) : (
              <form onSubmit={createLecturer} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input required placeholder="Mã giảng viên" value={lecturerForm.Username} onChange={(e) => setLecturerForm((p) => ({ ...p, Username: e.target.value }))} className="px-3 py-2 border rounded-lg" />
                <div className="relative">
                  <input required type={showCreatePassword.lecturer ? "text" : "password"} placeholder="Mật khẩu" value={lecturerForm.Password} onChange={(e) => setLecturerForm((p) => ({ ...p, Password: e.target.value }))} className="w-full px-3 py-2 pr-10 border rounded-lg" />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                    onClick={() => setShowCreatePassword((prev) => ({ ...prev, lecturer: !prev.lecturer }))}
                  >
                    {showCreatePassword.lecturer ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <input required type="email" placeholder="Email" value={lecturerForm.Email} onChange={(e) => setLecturerForm((p) => ({ ...p, Email: e.target.value }))} className="px-3 py-2 border rounded-lg" />
                <input required placeholder="Họ và tên" value={lecturerForm.Full_Name} onChange={(e) => setLecturerForm((p) => ({ ...p, Full_Name: e.target.value }))} className="px-3 py-2 border rounded-lg" />
                <select
                  value={lecturerForm.Dept_ID}
                  onChange={(e) =>
                    setLecturerForm((p) => ({
                      ...p,
                      Dept_ID: e.target.value,
                      Major_ID: "",
                    }))
                  }
                  className="px-3 py-2 border rounded-lg"
                >
                  <option value="">Chọn khoa</option>
                  {departments.map((d) => (
                    <option key={d.Dept_ID} value={d.Dept_ID}>{d.DeptName}</option>
                  ))}
                </select>
                <select
                  value={lecturerForm.Major_ID}
                  onChange={(e) => {
                    const selectedMajor = majors.find((m) => String(m.Major_ID) === String(e.target.value));
                    setLecturerForm((p) => ({
                      ...p,
                      Major_ID: e.target.value,
                      Dept_ID: selectedMajor?.Dept_ID ? String(selectedMajor.Dept_ID) : p.Dept_ID,
                    }));
                  }}
                  className="px-3 py-2 border rounded-lg"
                >
                  <option value="">Chọn ngành</option>
                  {filteredLecturerMajors.map((m) => (
                    <option key={m.Major_ID} value={m.Major_ID}>{m.MajorName}</option>
                  ))}
                </select>
                <input
                  placeholder="Phòng làm việc"
                  value={lecturerForm.Office_Room}
                  onChange={(e) => setLecturerForm((p) => ({ ...p, Office_Room: e.target.value }))}
                  className="px-3 py-2 border rounded-lg"
                />
                <input
                  placeholder="Học hàm/Học vị"
                  value={lecturerForm.Academic_Rank}
                  onChange={(e) => setLecturerForm((p) => ({ ...p, Academic_Rank: e.target.value }))}
                  className="px-3 py-2 border rounded-lg"
                />
                <div className="md:col-span-3">
                  <Button type="submit">Lưu giảng viên</Button>
                </div>
              </form>
            )}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Mã</th>
                <th className="px-4 py-3 text-left">Họ tên</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">{activeTab === "students" ? "Ngành/Lớp" : "Khoa/Ngành"}</th>
                <th className="px-4 py-3 text-left">Trạng thái</th>
                <th className="px-4 py-3 text-left">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td className="px-4 py-4 text-slate-500" colSpan={6}>Đang tải dữ liệu...</td></tr>
              ) : activeTab === "students" ? (
                filteredStudents.length === 0 ? (
                  <tr><td className="px-4 py-4 text-slate-500" colSpan={6}>Không có sinh viên phù hợp.</td></tr>
                ) : (
                  filteredStudents.map((s, idx) => (
                    <tr key={s._id || idx} className="hover:bg-slate-50">
                      <td className="px-4 py-3">{s.Student_ID || s._id || "-"}</td>
                      <td className="px-4 py-3">{s.Full_Name || s.name || "-"}</td>
                      <td className="px-4 py-3">{s.Email || s.email || "-"}</td>
                      <td className="px-4 py-3">{(s.Major && s.Major.MajorName) || s.major || s.ClassName || "-"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${s.Status === "Locked" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                          {s.Status === "Locked" ? "Đã khóa" : "Hoạt động"}
                        </span>
                      </td>
                      <td className="px-4 py-3 space-x-2">
                        <Button variant={s.Status === "Locked" ? "secondary" : "danger"} size="sm" onClick={() => toggleStatus(s, "students")} disabled={actionLoading} title={s.Status === "Locked" ? "Mở khóa" : "Khóa"}>
                          {s.Status === "Locked" ? <Unlock size={18} /> : <Lock size={18} />}
                        </Button>
                        <Button variant="primary" size="sm" onClick={() => openPasswordForm(s, "students")} disabled={actionLoading} title="Sửa">
                          <Edit3 size={18} />
                        </Button>
                      </td>
                    </tr>
                  ))
                )
              ) : (
                filteredLecturers.length === 0 ? (
                  <tr><td className="px-4 py-4 text-slate-500" colSpan={6}>Không có giảng viên phù hợp.</td></tr>
                ) : (
                  filteredLecturers.map((l, idx) => (
                    <tr key={l._id || idx} className="hover:bg-slate-50">
                      <td className="px-4 py-3">{l.Lecturer_ID || l._id || "-"}</td>
                      <td className="px-4 py-3">{l.Full_Name || l.name || "-"}</td>
                      <td className="px-4 py-3">{l.Email || l.email || "-"}</td>
                      <td className="px-4 py-3">{`${l.DeptName || l.department || "-"} / ${l.major || "-"}`}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${l.Status === "Locked" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                          {l.Status === "Locked" ? "Đã khóa" : "Hoạt động"}
                        </span>
                      </td>
                      <td className="px-4 py-3 space-x-2">
                        <Button variant={l.Status === "Locked" ? "secondary" : "danger"} size="sm" onClick={() => toggleStatus(l, "lecturers")} disabled={actionLoading} title={l.Status === "Locked" ? "Mở khóa" : "Khóa"}>
                          {l.Status === "Locked" ? <Unlock size={18} /> : <Lock size={18} />}
                        </Button>
                        <Button variant="primary" size="sm" onClick={() => openPasswordForm(l, "lecturers")} disabled={actionLoading} title="Sửa">
                          <Edit3 size={18} />
                        </Button>
                      </td>
                    </tr>
                  ))
                )
              )}
            </tbody>
          </table>
        </div>
        {showPasswordForm && selectedAccount && (
          <div className="p-5 bg-white border-t border-slate-200">
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-600">Cập nhật mật khẩu</div>
                <div className="text-sm text-slate-500">{selectedAccount.Full_Name || selectedAccount.name}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="danger" size="sm" onClick={() => {
                  const pwd = selectedAccount.Password || "";
                  console.log("Current password:", pwd);
                  setPasswordData({ ...passwordData, currentPassword: pwd });
                }}>Reset mật khẩu</Button>
                <Button variant="secondary" size="sm" onClick={closePasswordForm}>Hủy</Button>
              </div>
            </div>
            <form onSubmit={saveAccountChanges} className="grid gap-4 md:grid-cols-3">
              {selectedAccountType === "students" && (
                <>
                  <div className="space-y-2 md:col-span-3">
                    <label className="block text-sm font-medium text-slate-700">Tên</label>
                    <input
                      type="text"
                      value={selectedAccountInfo.Full_Name}
                      onChange={(e) => updateSelectedAccountInfo("Full_Name", e.target.value)}
                      placeholder="Họ và tên"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-udck-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">Khoa</label>
                    <select
                      value={selectedAccountInfo.Dept_ID}
                      onChange={(e) => {
                        const selectedDept = e.target.value;
                        updateSelectedAccountInfo("Dept_ID", selectedDept);
                        updateSelectedAccountInfo("Major_ID", "");
                      }}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-udck-primary"
                    >
                      <option value="">Chọn khoa</option>
                      {departments.map((d) => (
                        <option key={d.Dept_ID} value={d.Dept_ID}>{d.DeptName}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">Ngành</label>
                    <select
                      value={selectedAccountInfo.Major_ID}
                      onChange={(e) => updateSelectedAccountInfo("Major_ID", e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-udck-primary"
                    >
                      <option value="">Chọn ngành</option>
                      {majors
                        .filter((m) => !selectedAccountInfo.Dept_ID || String(m.Dept_ID) === String(selectedAccountInfo.Dept_ID))
                        .map((m) => (
                          <option key={m.Major_ID} value={m.Major_ID}>{m.MajorName}</option>
                        ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">Lớp</label>
                    <input
                      type="text"
                      value={selectedAccountInfo.ClassName}
                      onChange={(e) => updateSelectedAccountInfo("ClassName", e.target.value)}
                      placeholder="Lớp"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-udck-primary"
                    />
                  </div>
                </>
              )}
              {selectedAccountType === "lecturers" && (
                <>
                  <div className="space-y-2 md:col-span-3">
                    <label className="block text-sm font-medium text-slate-700">Tên</label>
                    <input
                      type="text"
                      value={selectedAccountInfo.Full_Name}
                      onChange={(e) => updateSelectedAccountInfo("Full_Name", e.target.value)}
                      placeholder="Họ và tên"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-udck-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">Khoa</label>
                    <select
                      value={selectedAccountInfo.Dept_ID}
                      onChange={(e) => {
                        const selectedDept = e.target.value;
                        updateSelectedAccountInfo("Dept_ID", selectedDept);
                        updateSelectedAccountInfo("Major_ID", "");
                      }}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-udck-primary"
                    >
                      <option value="">Chọn khoa</option>
                      {departments.map((d) => (
                        <option key={d.Dept_ID} value={d.Dept_ID}>{d.DeptName}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">Ngành</label>
                    <select
                      value={selectedAccountInfo.Major_ID}
                      onChange={(e) => updateSelectedAccountInfo("Major_ID", e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-udck-primary"
                    >
                      <option value="">Chọn ngành</option>
                      {majors
                        .filter((m) => !selectedAccountInfo.Dept_ID || String(m.Dept_ID) === String(selectedAccountInfo.Dept_ID))
                        .map((m) => (
                          <option key={m.Major_ID} value={m.Major_ID}>{m.MajorName}</option>
                        ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">Học hàm/Học vị</label>
                    <input
                      type="text"
                      value={selectedAccountInfo.Academic_Rank}
                      onChange={(e) => updateSelectedAccountInfo("Academic_Rank", e.target.value)}
                      placeholder="Ví dụ: Thạc sĩ, Tiến sĩ"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-udck-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">Phòng làm việc</label>
                    <input
                      type="text"
                      value={selectedAccountInfo.Office_Room}
                      onChange={(e) => updateSelectedAccountInfo("Office_Room", e.target.value)}
                      placeholder="Ví dụ: A101"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-udck-primary"
                    />
                  </div>
                </>
              )}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Mật khẩu hiện tại</label>
                <div className="relative">
                  <input
                    type={showEditPassword.currentPassword ? "text" : "password"}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData((p) => ({ ...p, currentPassword: e.target.value }))}
                    placeholder="Nhập mật khẩu hiện tại nếu cần"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 outline-none focus:border-udck-primary"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                    onClick={() => setShowEditPassword((prev) => ({ ...prev, currentPassword: !prev.currentPassword }))}
                  >
                    {showEditPassword.currentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Mật khẩu mới</label>
                <div className="relative">
                  <input
                    type={showEditPassword.newPassword ? "text" : "password"}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData((p) => ({ ...p, newPassword: e.target.value }))}
                    placeholder="Mật khẩu mới"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 outline-none focus:border-udck-primary"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                    onClick={() => setShowEditPassword((prev) => ({ ...prev, newPassword: !prev.newPassword }))}
                  >
                    {showEditPassword.newPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Xác nhận mật khẩu mới</label>
                <div className="relative">
                  <input
                    type={showEditPassword.confirmPassword ? "text" : "password"}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData((p) => ({ ...p, confirmPassword: e.target.value }))}
                    placeholder="Xác nhận mật khẩu"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 outline-none focus:border-udck-primary"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                    onClick={() => setShowEditPassword((prev) => ({ ...prev, confirmPassword: !prev.confirmPassword }))}
                  >
                    {showEditPassword.confirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div className="md:col-span-3 flex justify-end">
                <Button type="submit" size="sm" className="mt-2" disabled={actionLoading}>
                  {actionLoading ? "Đang lưu..." : "Lưu thay đổi"}
                </Button>
              </div>
            </form>
          </div>
        )}
      </Card>
    </div>
  );
}

