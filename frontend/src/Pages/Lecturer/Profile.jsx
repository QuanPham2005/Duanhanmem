import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import {
  User,
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  Building,
  Camera,
  Edit3,
  Save,
  X,
  Lock,
  BookOpen,
  FileText,
  Award,
  Briefcase,
  Eye,
  EyeOff
} from "lucide-react";
import { Button } from "../../components/UI/Button";

const Profile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState({
    Full_Name: "",
    Email: "",
    Phone: "",
    Academic_Rank: "",
    Office_Room: "",
    Specialization: "",
    Bio: "",
    picture: null,
    DepartmentName: "",
    MajorName: ""
  });
  const [profileImage, setProfileImage] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  const jwt = () => localStorage.getItem("Teacher jwtToken");

  useEffect(() => {
    if (!jwt()) {
      navigate("/teacher/login");
      return;
    }
    fetchProfile();
  }, [navigate]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/v1/teachers/profile`,
        { headers: { Authorization: `Bearer ${jwt()}` } }
      );

      const lecturer = response.data.data?.lecturer || {};
      setProfile({
        Full_Name: lecturer.Full_Name || "",
        Email: lecturer.Email || "",
        Phone: lecturer.Phone || "",
        Academic_Rank: lecturer.Academic_Rank || "",
        Office_Room: lecturer.Office_Room || "",
        Specialization: lecturer.Specialization || "",
        Bio: lecturer.Bio || "",
        picture: lecturer.picture || null,
        DepartmentName: lecturer.DepartmentName || "",
        MajorName: lecturer.MajorName || ""
      });

      if (lecturer.picture) {
        setProfileImagePreview(lecturer.picture);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Không thể tải dữ liệu hồ sơ");
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInputChange = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const updateData = {
        Full_Name: profile.Full_Name,
        Email: profile.Email,
        Phone: profile.Phone,
        Academic_Rank: profile.Academic_Rank,
        Office_Room: profile.Office_Room,
        Specialization: profile.Specialization,
        Bio: profile.Bio
      };

      if (profileImagePreview && profileImagePreview !== profile.picture) {
        updateData.profileImage = profileImagePreview;
      }

      await axios.patch(
        `${import.meta.env.VITE_BACKEND_URL}/api/v1/teachers/profile`,
        updateData,
        { headers: { Authorization: `Bearer ${jwt()}` } }
      );

      toast.success("Đã cập nhật hồ sơ thành công!");
      setIsEditing(false);
      setProfileImage(null);
      await fetchProfile(); // Refresh data
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Không thể cập nhật hồ sơ");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Mật khẩu mới không khớp");
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }

    setLoading(true);
    try {
      await axios.patch(
        `${import.meta.env.VITE_BACKEND_URL}/api/v1/teachers/change-password`,
        {
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        },
        { headers: { Authorization: `Bearer ${jwt()}` } }
      );
      toast.success("Đã thay đổi mật khẩu thành công!");
      setShowPasswordForm(false);
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể thay đổi mật khẩu");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !profile.Full_Name) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Hồ sơ cá nhân</h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Quản lý thông tin cá nhân, cập nhật hồ sơ chuyên môn và cài đặt tài khoản của bạn
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 flex flex-col items-center sticky top-8">
              {/* Square Avatar */}
              <div className="relative mb-6">
                <div className="w-44 h-44 rounded-2xl overflow-hidden bg-gradient-to-br from-blue-100 to-purple-100 border-4 border-white shadow-xl flex items-center justify-center">
                  {profileImagePreview ? (
                    <img
                      src={profileImagePreview}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User size={80} className="text-gray-400" />
                  )}
                </div>

                {isEditing && (
                  <label className="absolute -bottom-2 -right-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-3 rounded-2xl cursor-pointer hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg">
                    <Camera size={20} />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Name and Title */}
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {profile.Full_Name || "Chưa cập nhật"}
                </h2>
                <p className="text-purple-600 font-medium text-lg mb-1">
                  {profile.Academic_Rank || "Giảng viên"}
                </p>
                <p className="text-gray-500 text-sm">
                  {profile.Specialization
                    ? profile.Specialization
                    : profile.MajorName
                      ? profile.MajorName
                      : "Chưa cập nhật chuyên môn"}
                </p>
              </div>

              {/* Quick Stats */}
              <div className="w-full bg-gray-50 rounded-2xl p-4 mb-6">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {profile.Phone ? "✓" : "○"}
                    </div>
                    <div className="text-xs text-gray-600">SĐT</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {profile.Office_Room ? "✓" : "○"}
                    </div>
                    <div className="text-xs text-gray-600">Phòng</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col w-full space-y-3">
                {!isEditing ? (
                  <Button
                    onClick={() => setIsEditing(true)}
                    className="w-full py-3 text-lg"
                    variant="primary"
                  >
                    <Edit3 size={20} className="mr-2" />
                    Chỉnh sửa hồ sơ
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <Button
                      onClick={handleSave}
                      disabled={loading}
                      className="w-full py-3 text-lg"
                      variant="primary"
                    >
                      <Save size={20} className="mr-2" />
                      {loading ? "Đang lưu..." : "Lưu thay đổi"}
                    </Button>
                    <Button
                      onClick={() => {
                        setIsEditing(false);
                        setProfileImage(null);
                        fetchProfile(); // Reset changes
                      }}
                      variant="outline"
                      className="w-full py-3 text-lg"
                    >
                      <X size={20} className="mr-2" />
                      Hủy
                    </Button>
                  </div>
                )}

                <Button
                  onClick={() => setShowPasswordForm(!showPasswordForm)}
                  variant="outline"
                  className="w-full py-3 text-lg"
                >
                  <Lock size={20} className="mr-2" />
                  {showPasswordForm ? "Hủy" : "Đổi mật khẩu"}
                </Button>
              </div>
            </div>
          </div>

          {/* Profile Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Basic Information (Merged) */}
            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8">
              <h3 className="text-2xl font-bold text-blue-700 mb-6 flex items-center">
                <User size={28} className="mr-3" />
                Thông tin cơ bản
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Họ và tên đầy đủ
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={profile.Full_Name}
                      onChange={(e) => handleInputChange("Full_Name", e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 text-lg"
                      placeholder="Nhập họ và tên"
                    />
                  ) : (
                    <div className="flex items-center p-3 bg-gray-50 rounded-xl">
                      <User size={20} className="mr-3 text-gray-400" />
                      <span className="text-gray-900 text-lg">
                        {profile.Full_Name || "Chưa cập nhật"}
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Email liên hệ
                  </label>
                  {isEditing ? (
                    <input
                      type="email"
                      value={profile.Email}
                      onChange={(e) => handleInputChange("Email", e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 text-lg"
                      placeholder="example@university.edu.vn"
                    />
                  ) : (
                    <div className="flex items-center p-3 bg-gray-50 rounded-xl">
                      <Mail size={20} className="mr-3 text-gray-400" />
                      <span className="text-gray-900 text-lg">
                        {profile.Email || "Chưa cập nhật"}
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Số điện thoại
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={profile.Phone}
                      onChange={(e) => handleInputChange("Phone", e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all duration-200 text-lg"
                      placeholder="0123 456 789"
                    />
                  ) : (
                    <div className="flex items-center p-3 bg-gray-50 rounded-xl">
                      <Phone size={20} className="mr-3 text-gray-400" />
                      <span className="text-gray-900 text-lg">
                        {profile.Phone || "Chưa cập nhật"}
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Phòng làm việc
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={profile.Office_Room}
                      onChange={(e) => handleInputChange("Office_Room", e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all duration-200 text-lg"
                      placeholder="A101, B205, etc."
                    />
                  ) : (
                    <div className="flex items-center p-3 bg-gray-50 rounded-xl">
                      <MapPin size={20} className="mr-3 text-gray-400" />
                      <span className="text-gray-900 text-lg">
                        {profile.Office_Room || "Chưa cập nhật"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Academic Information */}
            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8">
              <h3 className="text-2xl font-bold text-purple-700 mb-6 flex items-center">
                <GraduationCap size={28} className="mr-3" />
                Thông tin học thuật
              </h3>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Học hàm/Học vị
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={profile.Academic_Rank}
                      onChange={(e) => handleInputChange("Academic_Rank", e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 transition-all duration-200 text-lg"
                      placeholder="Tiến sĩ, Thạc sĩ, Giáo sư, etc."
                    />
                  ) : (
                    <div className="flex items-center p-3 bg-gray-50 rounded-xl">
                      <Award size={20} className="mr-3 text-gray-400" />
                      <span className="text-gray-900 text-lg">
                        {profile.Academic_Rank || "Chưa cập nhật"}
                      </span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Khoa (Department)
                    </label>
                    <div className="flex items-center p-3 bg-gray-50 rounded-xl">
                      <Building size={20} className="mr-3 text-gray-400" />
                      <span className="text-gray-900 text-lg">
                        {profile.DepartmentName || "Chưa cập nhật"}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Ngành (Major)
                    </label>
                    <div className="flex items-center p-3 bg-gray-50 rounded-xl">
                      <Briefcase size={20} className="mr-3 text-gray-400" />
                      <span className="text-gray-900 text-lg">
                        {profile.MajorName || "Chưa cập nhật"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Chuyên môn
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={profile.Specialization}
                      onChange={(e) => handleInputChange("Specialization", e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 transition-all duration-200 text-lg"
                      placeholder="Mật tự nhiên, Machine Learning, ..."
                    />
                  ) : (
                    <div className="flex items-center p-3 bg-gray-50 rounded-xl">
                      <BookOpen size={20} className="mr-3 text-gray-400" />
                      <span className="text-gray-900 text-lg">
                        {profile.Specialization || "Chưa cập nhật"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bio Section */}
            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8">
              <h3 className="text-2xl font-bold text-indigo-700 mb-6 flex items-center">
                <FileText size={28} className="mr-3" />
                Giới thiệu bản thân
              </h3>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Mô tả ngắn gọn về bản thân và kinh nghiệm
                </label>
                {isEditing ? (
                  <textarea
                    value={profile.Bio}
                    onChange={(e) => handleInputChange("Bio", e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all duration-200 text-lg resize-none"
                    placeholder="Hãy viết một đoạn giới thiệu ngắn gọn về bản thân, kinh nghiệm giảng dạy và sở thích chuyên môn..."
                  />
                ) : (
                  <div className="p-4 bg-gray-50 rounded-xl min-h-[120px]">
                    <p className="text-gray-700 text-lg leading-relaxed">
                      {profile.Bio || "Chưa có thông tin giới thiệu. Hãy cập nhật để sinh viên hiểu hơn về bạn!"}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Password Change Form */}
            {showPasswordForm && (
              <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8">
                <h3 className="text-2xl font-bold text-red-700 mb-6 flex items-center">
                  <Lock size={28} className="mr-3" />
                  Đổi mật khẩu
                </h3>

                <form onSubmit={handlePasswordChange} className="space-y-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Mật khẩu hiện tại
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword.currentPassword ? "text" : "password"}
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                        className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-red-100 focus:border-red-500 transition-all duration-200 text-lg"
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                        onClick={() => setShowPassword((prev) => ({ ...prev, currentPassword: !prev.currentPassword }))}
                      >
                        {showPassword.currentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">
                        Mật khẩu mới
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword.newPassword ? "text" : "password"}
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                          className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-red-100 focus:border-red-500 transition-all duration-200 text-lg"
                          required
                          minLength={6}
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                          onClick={() => setShowPassword((prev) => ({ ...prev, newPassword: !prev.newPassword }))}
                        >
                          {showPassword.newPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">
                        Xác nhận mật khẩu mới
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword.confirmPassword ? "text" : "password"}
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                          className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-red-100 focus:border-red-500 transition-all duration-200 text-lg"
                          required
                          minLength={6}
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                          onClick={() => setShowPassword((prev) => ({ ...prev, confirmPassword: !prev.confirmPassword }))}
                        >
                          {showPassword.confirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-4 pt-4">
                    <Button
                      type="submit"
                      disabled={loading}
                      variant="primary"
                      className="px-8 py-3 text-lg"
                    >
                      {loading ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setShowPasswordForm(false)}
                      variant="outline"
                      className="px-8 py-3 text-lg"
                    >
                      Hủy
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
