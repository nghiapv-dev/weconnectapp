import { useState } from "react";
import { useUserStore } from "../../../lib/userStore";
import { auth } from "../../../lib/firebase";
import { signOut } from "firebase/auth";
import { toast } from "react-toastify";

const Userinfo = ({ onOpenEditProfile }) => {
  const { currentUser } = useUserStore();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Logged out successfully!");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Logout failed. Please try again.");
    }
  };

  if (!currentUser) {
    return (
      <div className="flex items-center justify-between border-b border-gray-700/50 bg-slate-800/30 p-6">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 animate-pulse rounded-full bg-gray-600"></div>
          <div>
            <div className="h-4 w-24 animate-pulse rounded bg-gray-600"></div>
            <div className="mt-1 h-3 w-16 animate-pulse rounded bg-gray-700"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between border-b border-gray-700/50 bg-gradient-to-r from-slate-800/50 via-slate-800/30 to-slate-700/30 p-4 backdrop-blur-sm md:p-6">
      <div className="flex items-center gap-3 md:gap-4">
        <div className="relative">
          <img
            src={currentUser?.avatar || "./avatar.png"}
            alt=""
            className="h-12 w-12 rounded-full border-3 border-slate-600 object-cover shadow-lg transition-all duration-300 hover:border-blue-400 md:h-14 md:w-14"
          />
          <span
            className={`absolute -right-1 -bottom-1 h-3 w-3 rounded-full border-2 border-slate-800 md:h-4 md:w-4 ${
              currentUser?.online
                ? "bg-green-500 shadow-[0_0_12px_#10b981]"
                : "bg-gray-400"
            }`}
            title={currentUser?.online ? "Online" : "Offline"}
          ></span>
        </div>
        <div>
          <h2 className="text-base font-semibold text-white md:text-lg">
            {currentUser?.username || "User"}
          </h2>
          <p className="flex items-center gap-2 text-xs text-gray-400 md:text-sm">
            <span
              className={`h-2 w-2 rounded-full ${currentUser?.online ? "bg-green-500" : "bg-gray-400"}`}
            ></span>
            {currentUser?.online ? "Active now" : "Offline"}
          </p>
        </div>
      </div>
      <div className="flex gap-1 md:gap-2">
        <button
          className="group rounded-lg border border-slate-600/30 bg-slate-700/50 p-2 transition-all duration-200 hover:border-slate-500/50 hover:bg-slate-600/70 md:rounded-xl md:p-3"
          title="Settings"
        >
          <img
            src="./more.png"
            alt="Settings"
            className="h-4 w-4 opacity-70 transition-opacity group-hover:opacity-100 md:h-5 md:w-5"
          />
        </button>
        <button
          onClick={onOpenEditProfile}
          className="group rounded-lg border border-slate-600/30 bg-slate-700/50 p-2 transition-all duration-200 hover:border-slate-500/50 hover:bg-slate-600/70 md:rounded-xl md:p-3"
          title="Edit Profile"
        >
          <img
            src="./edit.png"
            alt="Edit"
            className="h-4 w-4 opacity-70 transition-opacity group-hover:opacity-100 md:h-5 md:w-5"
          />
        </button>
        <button
          onClick={handleLogout}
          className="group rounded-lg border border-red-500/30 bg-red-500/20 p-2 text-red-400 transition-all duration-200 hover:border-red-400/50 hover:bg-red-500/30 md:rounded-xl md:p-3"
          title="Logout"
        >
          <svg
            className="h-4 w-4 transition-transform group-hover:scale-110 md:h-5 md:w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Userinfo;
