import { useEffect } from "react";
import Chat from "./components/chat/Chat";
import Detail from "./components/detail/Detail";
import List from "./components/list/List";
import Login from "./components/login/Login";
import Notification from "./components/notification/Notification";
import FirebaseSetupNotice from "./components/notification/FirebaseSetupNotice";
import EditProfile from "./components/editProfile/EditProfile";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./lib/firebase";
import { useUserStore } from "./lib/userStore";
import { useChatStore } from "./lib/chatStore";
import { useState } from "react";

const App = () => {
  const { currentUser, isLoading, fetchUserInfo } = useUserStore();
  const { chatId } = useChatStore();
  const [showDetail, setShowDetail] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [mobileView, setMobileView] = useState("list");
  const handleToggleDetail = () => setShowDetail((prev) => !prev);

  // Theo dõi trạng thái đăng nhập của user
  useEffect(() => {
    const unSub = onAuthStateChanged(auth, (user) => {
      fetchUserInfo(user?.uid);
    });

    return () => {
      unSub();
    };
  }, [fetchUserInfo]);

  // Cập nhật trạng thái offline khi user đóng tab/browser
  useEffect(() => {
    const handleUnload = async () => {
      if (currentUser?.id) {
        try {
          const { doc, updateDoc } = await import("firebase/firestore");
          const { db } = await import("./lib/firebase");
          const userRef = doc(db, "users", currentUser.id);
          await updateDoc(userRef, { online: false });
        } catch (error) {
          console.log("Failed to update online status:", error);
        }
      }
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [currentUser?.id]);

  // Hiển thị loading spinner khi đang tải dữ liệu
  if (isLoading)
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-blue-500/30 border-t-blue-500"></div>
          <p className="text-lg font-medium text-white">Loading WeConnect...</p>
        </div>
      </div>
    );

  return (
    <div className="flex h-screen w-full flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 md:flex-row">
      {currentUser ? (
        <>
          {/* Layout cho mobile - hiển thị từng view riêng biệt */}
          <div className="h-full w-full md:hidden">
            {mobileView === "list" && (
              <List
                onOpenEditProfile={() => setShowEditProfile(true)}
                onSelectChat={() => setMobileView("chat")}
              />
            )}
            {mobileView === "chat" && chatId && (
              <Chat
                onToggleDetail={handleToggleDetail}
                showDetail={showDetail}
                onBackToList={() => setMobileView("list")}
                isMobile={true}
              />
            )}
            {mobileView === "detail" && (
              <Detail
                chatData={window._chatData}
                onCloseDetail={() => setMobileView("chat")}
                isMobile={true}
              />
            )}
          </div>

          {/* Layout cho desktop - hiển thị đồng thời nhiều panel */}
          <div className="hidden h-full w-full md:flex">
            {/* Sidebar bên trái - danh sách chat */}
            <div className="h-full w-96 border-r border-slate-700/50 bg-slate-800/30 backdrop-blur-sm">
              <List onOpenEditProfile={() => setShowEditProfile(true)} />
            </div>

            {/* Khu vực chat chính */}
            <div className="flex h-full flex-1">
              {chatId ? (
                <>
                  {/* Khu vực tin nhắn */}
                  <div
                    className={`${showDetail ? "flex-1" : "w-full"} h-full transition-all duration-300`}
                  >
                    <Chat
                      onToggleDetail={handleToggleDetail}
                      showDetail={showDetail}
                    />
                  </div>

                  {/* Panel chi tiết chat */}
                  {showDetail && (
                    <div className="h-full w-80 border-l border-slate-700/50 bg-slate-800/30 backdrop-blur-sm">
                      <Detail
                        chatData={window._chatData}
                        onCloseDetail={() => setShowDetail(false)}
                      />
                    </div>
                  )}
                </>
              ) : (
                // Màn hình chào mừng khi chưa chọn chat
                <div className="flex h-full w-full items-center justify-center bg-slate-800/10">
                  <div className="max-w-md px-8 text-center">
                    <div className="mb-8">
                      <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
                        <svg
                          className="h-12 w-12 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                          />
                        </svg>
                      </div>
                    </div>
                    <h2 className="mb-4 text-2xl font-bold text-white">
                      Welcome to WeConnect
                    </h2>
                    <p className="mb-8 leading-relaxed text-gray-400">
                      Chọn một cuộc trò chuyện từ thanh bên để bắt đầu trò
                      chuyện, hoặc tạo một cuộc trò chuyện mới bằng cách nhấp
                      vào nút +.
                    </p>
                    <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-500"></div>
                        <span>Nhắn tin bảo mật</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                        <span>Trò chuyện thời gian thực</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        // Hiển thị màn hình đăng nhập nếu chưa đăng nhập
        <Login />
      )}

      {/* Các component global luôn hiển thị */}
      <FirebaseSetupNotice />
      <Notification />

      {/* Modal chỉnh sửa profile */}
      <EditProfile
        isOpen={showEditProfile}
        onClose={() => setShowEditProfile(false)}
      />
    </div>
  );
};

export default App;
