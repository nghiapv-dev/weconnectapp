import { useState, useRef } from "react";
import { useUserStore } from "../../lib/userStore";
import { toast } from "react-toastify";

const EditProfile = ({ isOpen, onClose }) => {
  const { currentUser, updateUserInfo } = useUserStore();
  const [username, setUsername] = useState(currentUser?.username || "");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(
    currentUser?.avatar || "./avatar.png",
  );
  const fileInputRef = useRef(null);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setAvatarPreview(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (!username.trim()) {
      toast.error("Tên người dùng không được để trống!");
      return;
    }

    if (username.length < 2) {
      toast.error("Tên người dùng phải có ít nhất 2 ký tự!");
      return;
    }

    updateUserInfo({
      username: username.trim(),
      avatar: avatarPreview,
    });

    toast.success("Cập nhật hồ sơ thành công!");
    onClose();
  };

  const handleReset = () => {
    setUsername(currentUser?.username || "");
    setAvatarPreview(currentUser?.avatar || "./avatar.png");
    setAvatarFile(null);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      style={{ zIndex: 9999 }}
    >
      <div className="mx-4 w-full max-w-lg rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800 to-slate-900 p-8 shadow-2xl backdrop-blur-sm">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Chỉnh sửa hồ sơ</h2>
            <p className="mt-1 text-sm text-gray-400">
              Cập nhật thông tin hồ sơ của bạn
            </p>
          </div>
          <button
            onClick={onClose}
            className="group rounded-xl p-2 transition-all duration-200 hover:bg-slate-700/50"
            title="Close"
          >
            <svg
              className="h-6 w-6 text-gray-400 transition-colors group-hover:text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Avatar Section */}
        <div className="mb-8 flex flex-col items-center">
          <div className="group relative mb-4">
            <div className="h-28 w-28 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 p-1">
              <img
                src={avatarPreview}
                alt="Avatar"
                className="h-full w-full rounded-full bg-slate-800 object-cover"
              />
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute -right-1 -bottom-1 flex h-10 w-10 items-center justify-center rounded-full border-2 border-slate-800 bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25 transition-all duration-200 hover:scale-105 hover:from-blue-600 hover:to-blue-700"
              title="Change avatar"
            >
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />
          <p className="text-center text-sm text-gray-400">
            Nhấp vào biểu tượng máy ảnh để thay đổi hình đại diện của bạn
          </p>
        </div>

        {/* Username Section */}
        <div className="mb-8">
          <label className="mb-3 block text-sm font-medium text-gray-300">
            Username
          </label>
          <div className="relative">
            <svg
              className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 transform text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-slate-600/50 bg-slate-700/50 py-3 pr-4 pl-10 text-white placeholder-gray-400 transition-all duration-200 outline-none focus:border-blue-500 focus:bg-slate-700/70"
              placeholder="Enter your username"
              maxLength={30}
            />
          </div>
          <div className="mt-2 flex justify-between">
            <span className="text-xs text-gray-500">Tối thiểu 2 ký tự</span>
            <span className="text-xs text-gray-500">{username.length}/30</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleReset}
            className="flex-1 rounded-xl border border-slate-600/50 bg-slate-700/50 px-6 py-3 font-medium text-gray-300 transition-all duration-200 hover:border-slate-500/50 hover:bg-slate-600/70"
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            className="flex-1 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-3 font-medium text-white shadow-lg shadow-blue-500/25 transition-all duration-200 hover:from-blue-600 hover:to-blue-700 hover:shadow-blue-500/40"
          >
            Lưu thay đổi
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditProfile;
