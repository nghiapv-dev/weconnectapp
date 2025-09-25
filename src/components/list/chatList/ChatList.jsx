import { useEffect, useState } from "react";
import AddUser from "./addUser/addUser";
import CreateGroup from "./createGroup/CreateGroup";
import { toast } from "react-toastify";
import { useUserStore } from "../../../lib/userStore";
import { doc, getDoc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { useChatStore } from "../../../lib/chatStore";
import { getDatabase, ref, onValue, off } from "firebase/database";

const ChatList = ({ onSelectChat }) => {
  const [chats, setChats] = useState([]);
  const [addMode, setAddMode] = useState(false);
  const [createGroupMode, setCreateGroupMode] = useState(false);
  const [input, setInput] = useState("");
  const [onlineUsers, setOnlineUsers] = useState({}); // Track online users
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
          console.log("Raw chats from Firebase:", items);

          // Filter ra những chat có clearHistoryFrom (tạm ẩn cho đến khi có tin nhắn mới)
          const activeChats = items.filter(chat => {
            const isHistoryCleared = chat.clearHistoryFrom && chat.clearedBy === currentUser.id;
            if (isHistoryCleared) {
              // Chỉ ẩn nếu không có tin nhắn mới sau khi clear
              const hasNewMessages = chat.updatedAt > chat.clearHistoryFrom;
              if (!hasNewMessages) {
                console.log("Hiding chat with cleared history:", chat.chatId);
                return false;
              }
              console.log("Showing chat with new messages after clear:", chat.chatId);
            }
            return true;
          });

          console.log("Active chats after filtering:", activeChats);

          // Lấy thông tin user cho từng chat
          const promises = activeChats.map(async (item) => {
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

  // Real-time presence listener từ Realtime Database
  useEffect(() => {
    if (!chats.length) return;

    try {
      const rtdb = getDatabase();
      const statusListeners = [];

      // Lắng nghe online status cho tất cả users trong chat list
      chats.forEach((chat) => {
        if (chat.user?.id || chat.receiverId) {
          const userId = chat.user?.id || chat.receiverId;
          const statusRef = ref(rtdb, `/status/${userId}`);
          
          const unsubscribe = onValue(statusRef, (snapshot) => {
            const status = snapshot.val();
            setOnlineUsers(prev => ({
              ...prev,
              [userId]: status?.online === true
            }));
          }, (error) => {
            console.log("Realtime Database not setup, using fallback:", error);
            // Fallback: dùng online status từ Firestore
            setOnlineUsers(prev => ({
              ...prev,
              [userId]: chat.user?.online === true
            }));
          });

          statusListeners.push(() => off(statusRef, 'value', unsubscribe));
        }
      });

      // Cleanup function
      return () => {
        statusListeners.forEach(cleanup => cleanup());
      };
    } catch (error) {
      console.log("Realtime Database error, using Firestore online status:", error);
      // Fallback to Firestore online status
      const fallbackStatus = {};
      chats.forEach(chat => {
        const userId = chat.user?.id || chat.receiverId;
        fallbackStatus[userId] = chat.user?.online === true;
      });
      setOnlineUsers(fallbackStatus);
    }
  }, [chats]);

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
      
      // Chuyển sang chat được chọn - group hoặc individual
      if (chat.isGroup) {
        changeChat(chat.chatId, null, {
          isGroup: true,
          groupName: chat.groupName,
          groupAdmin: chat.groupAdmin,
          members: chat.members
        });
      } else {
        changeChat(chat.chatId, chat.user);
      }

      // Gọi callback cho mobile navigation nếu có
      if (onSelectChat) {
        onSelectChat();
      }
    } catch (err) {
      console.log(err);
    }
  };

  // Lọc chat theo từ khóa tìm kiếm
  const filteredChats = chats.filter((c) => {
    const searchTerm = input.toLowerCase();
    if (c.isGroup) {
      return c.groupName?.toLowerCase().includes(searchTerm);
    } else {
      return c.user?.username?.toLowerCase().includes(searchTerm);
    }
  });

  // Xử lý hiển thị context menu khi click icon 3 chấm với tối ưu vị trí
  const handleContextMenu = (e, chat) => {
    e.preventDefault();
    e.stopPropagation();

    // Tính toán vị trí hiển thị menu dựa trên vị trí button
    const rect = e.currentTarget.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const menuWidth = 240;
    const menuHeight = 400;

    let x = rect.left - 200;
    let y = rect.top - 10;

    // Điều chỉnh vị trí nếu menu bị tràn ra ngoài viewport
    if (x < 10) {
      x = rect.right + 10;
    }
    if (x + menuWidth > viewportWidth) {
      x = viewportWidth - menuWidth - 10;
    }

    if (y + menuHeight > viewportHeight) {
      y = Math.max(10, viewportHeight - menuHeight - 10);
    }

    setContextMenu({
      show: true,
      x: Math.max(x, 10),
      y: Math.max(y, 10),
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

      console.log("Deleting chat:", chatId, "for user:", currentUser.id);

      // Soft Delete: Chỉ ẩn chat cho user hiện tại, không xóa hoàn toàn
      const userChatsRef = doc(db, "userchats", currentUser.id);
      const userChatsSnap = await getDoc(userChatsRef);

      if (userChatsSnap.exists()) {
        const currentChats = userChatsSnap.data().chats || [];
        console.log("Current chats before delete:", currentChats);
        
        // Thêm field "clearHistoryFrom" để clear messages từ thời điểm này
        const updatedChats = currentChats.map((chat) => {
          if (chat.chatId === chatId) {
            console.log("Clearing chat history for:", chat.chatId);
            return {
              ...chat,
              clearHistoryFrom: Date.now(), // Clear messages từ thời điểm này
              clearedBy: currentUser.id,    // Ai là người clear
            };
          }
          return chat;
        });

        console.log("Updated chats after soft delete:", updatedChats);

        await updateDoc(userChatsRef, {
          chats: updatedChats,
        });

        // Nếu đang mở chat này thì clear selection
        if (chatId === chatId) {
          changeChat(null, null);
        }
      }

      setDeleteConfirm({ show: false, chatId: null, chatUser: null });
      toast.success("Đã xóa lịch sử trò chuyện");
    } catch (error) {
      console.error("Error deleting chat:", error);
      toast.error("Không thể xóa cuộc trò chuyện");
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
            <div className="flex items-center gap-2">
              {/* Button tạo nhóm */}
              <button
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border border-green-400/30 bg-gradient-to-r from-green-500 to-green-600 shadow-lg shadow-green-500/25 transition-all duration-200 hover:scale-105 hover:from-green-600 hover:to-green-700 hover:shadow-green-500/40 md:h-10 md:w-10"
                onClick={() => setCreateGroupMode((prev) => !prev)}
                title={createGroupMode ? "Cancel" : "Create group chat"}
              >
                <svg
                  className={`h-4 w-4 text-white transition-transform duration-200 md:h-5 md:w-5 ${createGroupMode ? "rotate-45" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </button>
              
              {/* Button thêm bạn */}
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
                  {chat.isGroup ? (
                    <div className="relative h-12 w-12 md:h-14 md:w-14">
                      {/* Group avatar - có thể là avatar của nhóm hoặc icon */}
                      <div className="flex h-full w-full items-center justify-center rounded-full border-2 border-slate-600 bg-gradient-to-br from-green-500 to-blue-600 text-white transition-colors group-hover:border-slate-500">
                        <svg className="h-6 w-6 md:h-8 md:w-8" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zM4 18v-4h3v4H4zM14 6.26V9h7v5h-2v4h3v-4h2V9c0-1.11-.89-2-2-2H14v-.74zM12.5 11.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5S11 9.17 11 10s.67 1.5 1.5 1.5zM8.5 11.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5S7 9.17 7 10s.67 1.5 1.5 1.5z"/>
                        </svg>
                      </div>
                      {/* Group member count */}
                      <span className="absolute -right-1 -bottom-1 rounded-full bg-blue-500 px-1.5 py-0.5 text-xs font-medium text-white shadow-md">
                        {chat.members ? chat.members.length : 0}
                      </span>
                    </div>
                  ) : (
                    <>
                      <img
                        src={
                          chat.user?.blocked?.includes(currentUser?.id)
                            ? "./avatar.png"
                            : chat.user?.avatar || "./avatar.png"
                        }
                        alt=""
                        className="h-12 w-12 rounded-full border-2 border-slate-600 object-cover transition-colors group-hover:border-slate-500 md:h-14 md:w-14"
                      />
                      {/* Online status từ Realtime Database thay vì Firestore */}
                      {onlineUsers[chat.user?.id || chat.receiverId] && (
                        <span className="absolute -right-1 -bottom-1 h-3 w-3 rounded-full border-2 border-slate-800 bg-green-500 shadow-[0_0_8px_#10b981] md:h-4 md:w-4"></span>
                      )}
                    </>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center justify-between md:mb-2">
                    <span className="truncate text-sm font-semibold text-white transition-colors group-hover:text-blue-300 md:text-base">
                      {chat.isGroup ? (
                        <span className="flex items-center gap-1">
                          <svg className="h-3 w-3 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zM4 18v-4h3v4H4zM14 6.26V9h7v5h-2v4h3v-4h2V9c0-1.11-.89-2-2-2H14v-.74zM12.5 11.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5S11 9.17 11 10s.67 1.5 1.5 1.5zM8.5 11.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5S7 9.17 7 10s.67 1.5 1.5 1.5z"/>
                          </svg>
                          {chat.groupName}
                        </span>
                      ) : (
                        chat.user?.blocked?.includes(currentUser?.id)
                          ? "User"
                          : chat.user?.username || "Unknown User"
                      )}
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
          className="fixed z-50 w-64 rounded-lg border border-gray-200 bg-white shadow-xl"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
            height: "300px",
            maxHeight: "70vh",
            overflowY: "scroll",
            overflowX: "hidden",
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

          {/* Debug items to test scroll */}
          {/* <button className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-gray-800 hover:bg-gray-50">
            <span>🔧</span> Test Scroll 1
          </button>
          <button className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-gray-800 hover:bg-gray-50">
            <span>⚡</span> Test Scroll 2
          </button>
          <button className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-gray-800 hover:bg-gray-50">
            <span>🎨</span> Test Scroll 3
          </button> */}
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
      {createGroupMode && <CreateGroup setCreateGroupMode={setCreateGroupMode} />}
    </div>
  );
};

export default ChatList;
