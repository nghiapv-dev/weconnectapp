import { useEffect, useState } from "react";
import AddUser from "./addUser/addUser";
import { useUserStore } from "../../../lib/userStore";
import { doc, getDoc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { useChatStore } from "../../../lib/chatStore";

const ChatList = ({ onSelectChat }) => {
  const [chats, setChats] = useState([]);
  const [addMode, setAddMode] = useState(false);
  const [input, setInput] = useState("");
  const [contextMenu, setContextMenu] = useState({
    show: false,
    x: 0,
    y: 0,
    chatId: null,
  });
  const [deleteConfirm, setDeleteConfirm] = useState({
    show: false,
    chatId: null,
    chatUser: null,
  });

  const { currentUser } = useUserStore();
  const { chatId, changeChat } = useChatStore();

  useEffect(() => {
    if (!currentUser?.id) return;

    // Lắng nghe realtime thay đổi danh sách chat từ Firebase
    const unSub = onSnapshot(
      doc(db, "userchats", currentUser.id),
      async (res) => {
        try {
          const data = res.data();
          if (!data?.chats) {
            setChats([]);
            return;
          }

          const items = data.chats;

          // Lấy thông tin user cho từng chat
          const promises = items.map(async (item) => {
            try {
              const userDocRef = doc(db, "users", item.receiverId);
              const userDocSnap = await getDoc(userDocRef);

              const user = userDocSnap.data();
              return { ...item, user };
            } catch (error) {
              console.log("Error fetching user data:", error);
              return {
                ...item,
                user: {
                  id: item.receiverId,
                  username: "Unknown User",
                  avatar: "./avatar.png",
                },
              };
            }
          });

          const chatData = await Promise.all(promises);
          // Sắp xếp chat theo thời gian cập nhật gần nhất
          setChats(chatData.sort((a, b) => b.updatedAt - a.updatedAt));
        } catch (error) {
          console.log("Error in chat subscription:", error);
          setChats([]);
        }
      },
    );

    return () => {
      unSub();
    };
  }, [currentUser?.id]);

  const handleSelect = async (chat) => {
    // Tạo bản copy của chats để update trạng thái đã đọc
    const userChats = chats.map((item) => {
      const { user, ...rest } = item;
      return rest;
    });

    const chatIndex = userChats.findIndex(
      (item) => item.chatId === chat.chatId,
    );

    // Đánh dấu chat là đã đọc
    userChats[chatIndex].isSeen = true;

    const userChatsRef = doc(db, "userchats", currentUser.id);

    try {
      await updateDoc(userChatsRef, {
        chats: userChats,
      });
      // Chuyển sang chat được chọn
      changeChat(chat.chatId, chat.user);

      // Gọi callback cho mobile navigation nếu có
      if (onSelectChat) {
        onSelectChat();
      }
    } catch (err) {
      console.log(err);
    }
  };

  // Lọc chat theo từ khóa tìm kiếm
  const filteredChats = chats.filter((c) =>
    c.user.username.toLowerCase().includes(input.toLowerCase()),
  );

  // Xử lý hiển thị context menu khi click icon 3 chấm
  const handleContextMenu = (e, chat) => {
    e.preventDefault();
    e.stopPropagation();

    // Tính toán vị trí hiển thị menu dựa trên vị trí button
    const rect = e.currentTarget.getBoundingClientRect();
    setContextMenu({
      show: true,
      x: rect.left - 200, // Position menu to the left of button
      y: rect.top - 10, // Position menu aligned with top of button
      chatId: chat.chatId,
      chatUser: chat.user,
    });
  };

  const handleMarkAsUnread = async (chatId) => {
    try {
      setContextMenu({ show: false, x: 0, y: 0, chatId: null });

      // Tìm chat và đánh dấu chưa đọc
      const userChats = chats.map((item) => {
        const { user, ...rest } = item;
        return rest;
      });

      const chatIndex = userChats.findIndex((item) => item.chatId === chatId);
      if (chatIndex !== -1) {
        userChats[chatIndex].isSeen = false;

        const userChatsRef = doc(db, "userchats", currentUser.id);
        await updateDoc(userChatsRef, {
          chats: userChats,
        });
      }
    } catch (error) {
      console.error("Error marking as unread:", error);
    }
  };

  const handleToggleNotifications = (chatId) => {
    setContextMenu({ show: false, x: 0, y: 0, chatId: null });
    console.log("Toggle notifications for:", chatId);
  };

  const handleViewProfile = (user) => {
    setContextMenu({ show: false, x: 0, y: 0, chatId: null });
    console.log("View profile:", user);
  };

  const handleVoiceCall = (user) => {
    setContextMenu({ show: false, x: 0, y: 0, chatId: null });
    console.log("Voice call:", user);
  };

  const handleVideoCall = (user) => {
    setContextMenu({ show: false, x: 0, y: 0, chatId: null });
    console.log("Video call:", user);
  };

  const handleBlockUser = async (chatId, user) => {
    setContextMenu({ show: false, x: 0, y: 0, chatId: null });
    console.log("Block user:", user);
  };

  const handleArchiveChat = async (chatId) => {
    setContextMenu({ show: false, x: 0, y: 0, chatId: null });
    console.log("Archive chat:", chatId);
  };

  const handleReportChat = (chatId, user) => {
    setContextMenu({ show: false, x: 0, y: 0, chatId: null });
    console.log("Report chat:", user);
  };

  const handleDeleteChat = async (chatId) => {
    try {
      setContextMenu({ show: false, x: 0, y: 0, chatId: null });

      // Lấy danh sách chat hiện tại và xóa chat được chọn
      const userChatsRef = doc(db, "userchats", currentUser.id);
      const userChatsSnap = await getDoc(userChatsRef);

      if (userChatsSnap.exists()) {
        const currentChats = userChatsSnap.data().chats || [];
        // Lọc bỏ chat cần xóa
        const updatedChats = currentChats.filter(
          (chat) => chat.chatId !== chatId,
        );

        await updateDoc(userChatsRef, {
          chats: updatedChats,
        });

        // Nếu đang mở chat này thì clear selection
        if (chatId === chatId) {
          changeChat(null, null);
        }
      }

      setDeleteConfirm({ show: false, chatId: null, chatUser: null });
    } catch (error) {
      console.error("Error deleting chat:", error);
    }
  };

  const confirmDelete = (chatId, chatUser) => {
    setContextMenu({ show: false, x: 0, y: 0, chatId: null });
    setDeleteConfirm({ show: true, chatId, chatUser });
  };

  // Đóng context menu khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu({ show: false, x: 0, y: 0, chatId: null });
    };

    if (contextMenu.show) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [contextMenu.show]);

  return (
    <div className="min-w-0 flex-1 overflow-hidden bg-gradient-to-b from-slate-800/30 to-slate-900/20 backdrop-blur-sm">
      <div className="sticky top-0 z-10 border-b border-gray-700/30 bg-slate-800/80 backdrop-blur-md">
        <div className="p-3 md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white md:text-xl">
              Messages
            </h2>
            <button
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border border-blue-400/30 bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25 transition-all duration-200 hover:scale-105 hover:from-blue-600 hover:to-blue-700 hover:shadow-blue-500/40 md:h-10 md:w-10"
              onClick={() => setAddMode((prev) => !prev)}
              title={addMode ? "Cancel" : "Add new conversation"}
            >
              <svg
                className={`h-4 w-4 text-white transition-transform duration-200 md:h-5 md:w-5 ${addMode ? "rotate-45" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-slate-600/30 bg-slate-700/50 p-3 backdrop-blur-sm transition-all duration-200 focus-within:border-slate-500/50 focus-within:bg-slate-700/70">
            <svg
              className="h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search conversations..."
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 border-none bg-transparent text-sm text-white placeholder-gray-400 outline-none"
            />
          </div>
        </div>
      </div>

      <div className="h-full overflow-y-auto p-3 md:p-4">
        {filteredChats.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-blue-500/30 bg-gradient-to-br from-blue-500/20 to-purple-600/20">
              <svg
                className="h-8 w-8 text-blue-400"
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
            <h3 className="mb-2 font-medium text-white">
              Chưa có cuộc trò chuyện nào
            </h3>
            <p className="mb-6 px-4 text-sm leading-relaxed text-gray-400">
              Bắt đầu kết nối với mọi người bằng cách tạo cuộc trò chuyện đầu
              tiên
            </p>
            <button
              onClick={() => setAddMode(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-600"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              Bắt đầu trò chuyện mới
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredChats.map((chat) => (
              <div
                className={`group relative flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all duration-300 hover:border-slate-600/50 hover:bg-slate-700/40 md:gap-4 md:p-4 ${
                  chat?.isSeen
                    ? "border-transparent hover:shadow-lg hover:shadow-slate-900/20"
                    : "border-blue-500/30 bg-gradient-to-r from-blue-500/10 to-purple-600/10 shadow-md shadow-blue-500/10"
                }`}
                key={chat.chatId}
                onClick={() => handleSelect(chat)}
              >
                <div className="relative">
                  <img
                    src={
                      chat.user?.blocked?.includes(currentUser?.id)
                        ? "./avatar.png"
                        : chat.user?.avatar || "./avatar.png"
                    }
                    alt=""
                    className="h-12 w-12 rounded-full border-2 border-slate-600 object-cover transition-colors group-hover:border-slate-500 md:h-14 md:w-14"
                  />
                  {chat.user?.online && (
                    <span className="absolute -right-1 -bottom-1 h-3 w-3 rounded-full border-2 border-slate-800 bg-green-500 shadow-[0_0_8px_#10b981] md:h-4 md:w-4"></span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center justify-between md:mb-2">
                    <span className="truncate text-sm font-semibold text-white transition-colors group-hover:text-blue-300 md:text-base">
                      {chat.user?.blocked?.includes(currentUser?.id)
                        ? "User"
                        : chat.user?.username || "Unknown User"}
                    </span>
                    <span className="text-xs text-gray-400 transition-colors group-hover:text-gray-300">
                      {chat.updatedAt
                        ? new Date(chat.updatedAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : ""}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="truncate text-sm text-gray-400 transition-colors group-hover:text-gray-300">
                      {chat.lastMessage || "No messages yet"}
                    </p>
                    {!chat?.isSeen && (
                      <div className="flex items-center gap-1 md:gap-2">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500"></span>
                        <span className="rounded-full bg-blue-500 px-2 py-1 text-xs font-medium text-white">
                          New
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Three dots menu button */}
                {/* Icon 3 chấm để mở context menu */}
                <button
                  className="rounded-lg p-2 text-gray-400 opacity-0 transition-all duration-200 group-hover:opacity-100 hover:bg-slate-600/50 hover:text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleContextMenu(e, chat);
                  }}
                  title="More options"
                >
                  <svg
                    className="h-5 w-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Context Menu - Menu chuột phải với các tùy chọn */}
      {contextMenu.show && (
        <div
          className="animate-in fade-in-0 zoom-in-95 fixed z-50 min-w-[240px] rounded-lg border border-gray-200 bg-white py-1 shadow-xl duration-200"
          style={{
            left: `${Math.max(contextMenu.x, 10)}px`,
            top: `${Math.max(contextMenu.y, 10)}px`,
          }}
        >
          {/* Nhóm 1: Đánh dấu và thông báo */}
          <button
            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-gray-800 transition-all duration-150 hover:bg-gray-50"
            onClick={() => handleMarkAsUnread(contextMenu.chatId)}
          >
            <svg
              className="h-5 w-5 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 7.89a3 3 0 004.24 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            Đánh dấu là chưa đọc
          </button>

          <button
            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-gray-800 transition-all duration-150 hover:bg-gray-50"
            onClick={() => handleToggleNotifications(contextMenu.chatId)}
          >
            <svg
              className="h-5 w-5 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-4-4V9a4 4 0 00-8 0v4l-4 4h5m4 0a2 2 0 01-4 0"
              />
            </svg>
            Tắt thông báo
          </button>

          <button
            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-gray-800 transition-all duration-150 hover:bg-gray-50"
            onClick={() => handleViewProfile(contextMenu.chatUser)}
          >
            <svg
              className="h-5 w-5 text-gray-600"
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
            Xem trang cá nhân
          </button>

          {/* Separator line */}
          <div className="my-1 border-t border-gray-200"></div>

          {/* Group 2: Communication */}
          <button
            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-gray-800 transition-all duration-150 hover:bg-gray-50"
            onClick={() => handleVoiceCall(contextMenu.chatUser)}
          >
            <svg
              className="h-5 w-5 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              />
            </svg>
            Gọi thoại
          </button>

          <button
            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-gray-800 transition-all duration-150 hover:bg-gray-50"
            onClick={() => handleVideoCall(contextMenu.chatUser)}
          >
            <svg
              className="h-5 w-5 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            Chat video
          </button>

          {/* Separator line */}
          <div className="my-1 border-t border-gray-200"></div>

          {/* Group 3: Actions */}
          <button
            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-gray-800 transition-all duration-150 hover:bg-gray-50"
            onClick={() =>
              handleBlockUser(contextMenu.chatId, contextMenu.chatUser)
            }
          >
            <svg
              className="h-5 w-5 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728"
              />
            </svg>
            Chặn
          </button>

          <button
            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-gray-800 transition-all duration-150 hover:bg-gray-50"
            onClick={() => handleArchiveChat(contextMenu.chatId)}
          >
            <svg
              className="h-5 w-5 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 8l6 6 6-6"
              />
            </svg>
            Lưu trữ đoạn chat
          </button>

          <button
            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-gray-800 transition-all duration-150 hover:bg-gray-50"
            onClick={() =>
              confirmDelete(contextMenu.chatId, contextMenu.chatUser)
            }
          >
            <svg
              className="h-5 w-5 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            Xóa đoạn chat
          </button>

          {/* Separator line */}
          <div className="my-1 border-t border-gray-200"></div>

          {/* Group 4: Report */}
          <button
            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-gray-800 transition-all duration-150 hover:bg-gray-50"
            onClick={() =>
              handleReportChat(contextMenu.chatId, contextMenu.chatUser)
            }
          >
            <svg
              className="h-5 w-5 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            Báo cáo
          </button>
        </div>
      )}

      {/* Modal xác nhận xóa chat */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl border border-slate-600 bg-slate-800 p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/20">
                <svg
                  className="h-5 w-5 text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">
                Xóa cuộc trò chuyện
              </h3>
            </div>

            <p className="mb-6 text-gray-300">
              Bạn có chắc chắn muốn xóa cuộc trò chuyện với{" "}
              <span className="font-semibold text-white">
                {deleteConfirm.chatUser?.username || "người dùng này"}
              </span>
              ? Hành động này không thể hoàn tác.
            </p>

            <div className="flex gap-3">
              <button
                className="flex-1 rounded-lg bg-slate-700 px-4 py-2 text-white transition-colors hover:bg-slate-600"
                onClick={() =>
                  setDeleteConfirm({
                    show: false,
                    chatId: null,
                    chatUser: null,
                  })
                }
              >
                Cancel
              </button>
              <button
                className="flex-1 rounded-lg bg-red-500 px-4 py-2 text-white transition-colors hover:bg-red-600"
                onClick={() => handleDeleteChat(deleteConfirm.chatId)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {addMode && <AddUser setAddMode={setAddMode} />}
    </div>
  );
};

export default ChatList;
