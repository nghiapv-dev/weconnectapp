import { useEffect, useRef, useState } from "react";
import EmojiPicker from "emoji-picker-react";
import { toast } from "react-toastify";
import {
  arrayUnion,
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useChatStore } from "../../lib/chatStore";
import { useUserStore } from "../../lib/userStore";
import upload from "../../lib/upload";
import { format } from "timeago.js";

const Chat = ({ onToggleDetail, showDetail, onBackToList, isMobile }) => {
  const [chat, setChat] = useState();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [img, setImg] = useState({
    file: null,
    url: "",
  });
  const [usersData, setUsersData] = useState({}); // Cache user data cho group chat

  const { currentUser } = useUserStore();
  const { chatId, user, isCurrentUserBlocked, isReceiverBlocked, isGroup, groupName, groupMembers } =
    useChatStore();
  const endRef = useRef(null); // Ref để scroll xuống cuối chat

  // Function tạo màu sắc unique cho từng user
  const getUserColor = (userId) => {
    const colors = [
      'text-blue-400',
      'text-green-400', 
      'text-purple-400',
      'text-pink-400',
      'text-yellow-400',
      'text-orange-400',
      'text-red-400',
      'text-cyan-400',
      'text-indigo-400',
      'text-teal-400'
    ];
    
    // Tạo hash đơn giản từ userId để có màu consistent
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash << 5) - hash) + userId.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Function lấy thông tin user từ senderId
  const getUserInfo = async (userId) => {
    if (usersData[userId]) {
      return usersData[userId];
    }

    try {
      const userDoc = await getDoc(doc(db, "users", userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUsersData(prev => ({ ...prev, [userId]: userData }));
        return userData;
      }
    } catch (error) {
      console.error("Error fetching user info:", error);
    }
    
    return { username: "Unknown User" };
  };

  // Load user data khi có group members
  useEffect(() => {
    const loadUsersData = async () => {
      if (isGroup && groupMembers) {
        const promises = groupMembers.map(userId => getUserInfo(userId));
        await Promise.all(promises);
      }
    };
    
    loadUsersData();
  }, [isGroup, groupMembers]);

  // Auto scroll xuống cuối khi có tin nhắn mới
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat?.messages, img.url]);

    // Lắng nghe realtime messages từ Firestore
  useEffect(() => {
    if (!chatId) return;

    const unSub = onSnapshot(
      doc(db, "chats", chatId),
      async (res) => {
        try {
          const data = res.data();
          let messages = data?.messages || [];

          // Filter messages dựa trên clearHistoryFrom timestamp
          const userChatsSnap = await getDoc(doc(db, "userchats", currentUser.id));
          
          if (userChatsSnap.exists()) {
            const currentUserChats = userChatsSnap.data().chats || [];
            const currentChat = currentUserChats.find(c => c.chatId === chatId);
            
            if (currentChat?.clearHistoryFrom && currentChat.clearedBy === currentUser.id) {
              // Chỉ hiển thị messages sau thời điểm clear history
              messages = messages.filter(msg => 
                msg.createdAt?.toMillis() > currentChat.clearHistoryFrom
              );
              console.log("Filtered messages after history clear:", messages.length);
            }
          }

          // Load user data cho group chat từ tin nhắn
          if (isGroup && messages.length > 0) {
            const senderIds = [...new Set(messages.map(msg => msg.senderId))];
            const promises = senderIds.map(id => getUserInfo(id));
            await Promise.all(promises);
          }

          setChat({ messages });
          // Lưu toàn bộ data vào global để Detail component sử dụng
          window._chatData = data || { messages };
        } catch (error) {
          console.log("Chat listener error:", error);
          setChat({ messages: [] });
          window._chatData = { messages: [] };
        }
      },
      (error) => {
        console.log("Chat snapshot error:", error);
        setChat({ messages: [] });
        window._chatData = { messages: [] };
      },
    );

    return () => unSub();
  }, [chatId]);

  // Xử lý khi chọn emoji
  const handleEmoji = (e) => {
    setText((prev) => prev + e.emoji);
    setOpen(false);
  };

  // Xử lý khi chọn ảnh để gửi
  const handleImg = (e) => {
    if (e.target.files[0]) {
      setImg({
        file: e.target.files[0],
        url: URL.createObjectURL(e.target.files[0]),
      });
    }
  };

  // Function gửi tin nhắn (cho phép gửi chỉ ảnh hoặc chỉ text)
  const handleSend = async () => {
    if (text === "" && !img.file) return; // Phải có ít nhất text hoặc ảnh

    let imgUrl = null;

    try {
      // Upload ảnh lên Cloudinary nếu có
      if (img.file) {
        console.log("Uploading image...");
        imgUrl = await upload(img.file);
        console.log("Image uploaded successfully:", imgUrl);
      }

      // Tạo message object
      const messageData = {
        senderId: currentUser.id,
        text,
        createdAt: new Date(),
        ...(imgUrl && { img: imgUrl }),
      };

      // Thêm tin nhắn mới vào chat document
      await updateDoc(doc(db, "chats", chatId), {
        messages: arrayUnion(messageData),
      });

      // Xác định lastMessage content
      let lastMessageText = text || "📷 Hình ảnh";

      // Cập nhật lastMessage trong userchats
      let userIDs = [];
      
      if (isGroup) {
        // Group chat - cập nhật cho tất cả thành viên
        userIDs = groupMembers || [];
      } else {
        // Individual chat - cập nhật cho 2 users
        userIDs = [currentUser.id, user.id];
      }

      userIDs.forEach(async (id) => {
        const userChatsRef = doc(db, "userchats", id);
        const userChatsSnapshot = await getDoc(userChatsRef);

        if (userChatsSnapshot.exists()) {
          const userChatsData = userChatsSnapshot.data();
          console.log("UserChats data for", id, ":", userChatsData.chats);

          const chatIndex = userChatsData.chats.findIndex(
            (c) => c.chatId === chatId,
          );

          console.log("Chat index found:", chatIndex, "for chatId:", chatId);

          if (chatIndex !== -1) {
            // Chat exists, check if it needs restoration
            const chat = userChatsData.chats[chatIndex];
            
            // Restore chat nếu đã clear history
            if (chat.clearHistoryFrom && chat.clearedBy === currentUser.id) {
              console.log("Restoring cleared chat for user:", id);
              delete userChatsData.chats[chatIndex].clearHistoryFrom;
              delete userChatsData.chats[chatIndex].clearedBy;
              console.log("Chat history restored successfully");
              
              // Thông báo chat được khôi phục (chỉ cho user đã clear)
              if (id !== currentUser.id) {
                toast.info("💬 Cuộc trò chuyện đã được khôi phục");
              }
            }

            userChatsData.chats[chatIndex].lastMessage = lastMessageText;
            userChatsData.chats[chatIndex].isSeen =
              id === currentUser.id ? true : false;
            userChatsData.chats[chatIndex].updatedAt = Date.now();
          } else {
            // Chat không tồn tại, recreate chat entry
            console.log("Recreating chat entry for user:", id);
            
            const newChatEntry = {
              chatId: chatId,
              lastMessage: lastMessageText,
              isSeen: id === currentUser.id ? true : false,
              updatedAt: Date.now()
            };
            
            if (isGroup) {
              // Group chat entry
              newChatEntry.isGroup = true;
              newChatEntry.groupName = groupName;
              newChatEntry.groupAdmin = groupName; // Should get from store
              newChatEntry.members = groupMembers;
            } else {
              // Individual chat entry  
              const otherUserId = id === currentUser.id ? user.id : currentUser.id;
              newChatEntry.receiverId = otherUserId;
            }
            
            userChatsData.chats.push(newChatEntry);
            
            console.log("Chat recreated successfully for user:", id);
            
            // Thông báo chat được tạo lại
            if (id !== currentUser.id) {
              toast.info("💬 Cuộc trò chuyện đã được khôi phục");
            }
          }

          await updateDoc(userChatsRef, {
            chats: userChatsData.chats,
          });
        }
      });

      console.log("Message sent successfully");

      // Reset input sau khi gửi thành công
      setImg({
        file: null,
        url: "",
      });
      setText("");

    } catch (err) {
      console.error("Error sending message:", err);
      toast.error("Failed to send message. Please try again.");
    }
  };

  return (
    <div className="flex h-full flex-2 flex-col border-r border-l border-gray-700/50 bg-slate-800/10">
      {/* Header chat với thông tin user và các nút điều khiển */}
      <div className="flex items-center justify-between border-b border-gray-700/50 bg-slate-800/20 p-4 md:p-6">
        <div className="flex items-center gap-3 md:gap-4">
          {/* Nút back cho mobile */}
          {isMobile && onBackToList && (
            <button
              onClick={onBackToList}
              className="rounded-lg p-2 transition-colors hover:bg-slate-700/50 md:hidden"
              title="Back to conversations"
            >
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
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          )}

          {/* Avatar */}
          <div className="relative">
            {isGroup ? (
              <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-full border-2 border-gray-600 bg-gradient-to-br from-green-500 to-blue-600 text-white">
                <svg className="h-5 w-5 md:h-6 md:w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zM4 18v-4h3v4H4zM14 6.26V9h7v5h-2v4h3v-4h2V9c0-1.11-.89-2-2-2H14v-.74zM12.5 11.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5S11 9.17 11 10s.67 1.5 1.5 1.5zM8.5 11.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5S7 9.17 7 10s.67 1.5 1.5 1.5z"/>
                </svg>
              </div>
            ) : (
              <>
                <img
                  src={user?.avatar || "./avatar.png"}
                  alt=""
                  className="h-10 w-10 rounded-full border-2 border-gray-600 object-cover md:h-12 md:w-12"
                />
                {user?.online && (
                  <span className="absolute -right-1 -bottom-1 h-3 w-3 rounded-full border-2 border-slate-800 bg-green-500 md:h-4 md:w-4"></span>
                )}
              </>
            )}
          </div>

          {/* Thông tin user/group */}
          <div>
            <h3 className="text-base font-semibold text-white md:text-lg">
              {isGroup ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zM4 18v-4h3v4H4zM14 6.26V9h7v5h-2v4h3v-4h2V9c0-1.11-.89-2-2-2H14v-.74zM12.5 11.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5S11 9.17 11 10s.67 1.5 1.5 1.5zM8.5 11.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5S7 9.17 7 10s.67 1.5 1.5 1.5z"/>
                  </svg>
                  {groupName}
                </span>
              ) : (
                user?.username
              )}
            </h3>
            <p className="text-xs text-gray-400 md:text-sm">
              {isGroup 
                ? `${groupMembers?.length || 0} thành viên`
                : (user?.online ? "Active now" : "Last seen recently")
              }
            </p>
          </div>
        </div>

        {/* Các nút điều khiển chat */}
        <div className="flex gap-4">
          <img
            src="./phone.png"
            alt=""
            className="h-6 w-6 cursor-pointer opacity-70 transition-transform hover:scale-110 hover:opacity-100"
          />
          <img
            src="./video.png"
            alt=""
            className="h-6 w-6 cursor-pointer opacity-70 transition-transform hover:scale-110 hover:opacity-100"
          />
          <img
            src="./info.png"
            alt=""
            className="h-6 w-6 cursor-pointer opacity-70 transition-transform hover:scale-110 hover:opacity-100"
            onClick={onToggleDetail}
          />
        </div>
      </div>

      {/* Khu vực hiển thị danh sách tin nhắn */}
      <div className="flex-1 space-y-4 overflow-y-auto p-6">
        {chat?.messages?.map((message, idx) => {
          const prevMessage = idx > 0 ? chat.messages[idx - 1] : null;
          const showUsername = isGroup && 
                               message.senderId !== currentUser?.id && 
                               (!prevMessage || prevMessage.senderId !== message.senderId);
          
          return (
            <div
              className={`flex max-w-[80%] gap-3 ${
                message.senderId === currentUser?.id
                  ? "ml-auto flex-row-reverse"
                  : ""
              }`}
              key={message?.id || message?.createdAt?.toString() || idx}
            >
              {/* Avatar của người gửi */}
              <img
                src={
                  message.senderId === currentUser?.id
                    ? currentUser.avatar
                    : (isGroup && usersData[message.senderId]?.avatar) || user?.avatar || "./avatar.png"
                }
                alt=""
                className={`${showUsername || !prevMessage || prevMessage.senderId !== message.senderId ? 'h-8 w-8' : 'h-6 w-6 opacity-60'} flex-shrink-0 rounded-full object-cover`}
              />

              {/* Nội dung tin nhắn */}
              <div
                className={`flex flex-col gap-1 ${message.senderId === currentUser?.id ? "items-end" : "items-start"}`}
              >
                {/* Hiển thị tên user trong group chat */}
                {showUsername && (
                  <span className={`text-xs font-medium px-1 ml-1 ${getUserColor(message.senderId)}`}>
                    {usersData[message.senderId]?.username || "Loading..."}
                  </span>
                )}
                
                {/* Hiển thị ảnh nếu có */}
                {message.img && (
                  <img
                    src={message.img}
                    alt=""
                    className="max-w-xs rounded-xl object-cover shadow-lg"
                  />
                )}

              {/* Hiển thị text message */}
              {message.text && (
                <div
                  className={`max-w-full rounded-2xl px-4 py-2 break-words ${
                    message.senderId === currentUser?.id
                      ? "rounded-br-md bg-gradient-to-r from-blue-500 to-blue-600 text-white"
                      : "rounded-bl-md bg-slate-700 text-white"
                  }`}
                >
                  {message.text}
                </div>
              )}

              {/* Timestamp */}
              <span className="px-2 text-xs text-gray-400">
                {format(message.createdAt.toDate())}
              </span>
            </div>
          </div>
          );
        })}

        {/* Preview ảnh đang chuẩn bị gửi */}
        {img.url && (
          <div className="ml-auto flex max-w-[80%] flex-row-reverse gap-3">
            <img
              src={currentUser.avatar || "./avatar.png"}
              alt=""
              className="h-8 w-8 flex-shrink-0 rounded-full object-cover"
            />
            <div className="flex flex-col items-end gap-1">
              <img
                src={img.url}
                alt=""
                className="max-w-xs rounded-xl object-cover opacity-70 shadow-lg"
              />
              <span className="px-2 text-xs text-gray-400">Sending...</span>
            </div>
          </div>
        )}

        {/* Điểm neo để auto scroll */}
        <div ref={endRef}></div>
      </div>

      {/* Khu vực input và các nút gửi tin nhắn */}
      <div className="border-t border-gray-700/50 bg-slate-800/20 p-3 md:p-4">
        <div className="flex items-center gap-2 md:gap-3">
          {/* Các nút đính kèm media */}
          <div className="flex gap-2">
            <label htmlFor="file" className="cursor-pointer">
              <img
                src="./img.png"
                alt=""
                className="h-6 w-6 opacity-70 transition-transform hover:scale-110 hover:opacity-100"
              />
            </label>
            <input
              type="file"
              id="file"
              style={{ display: "none" }}
              onChange={handleImg}
            />
            <img
              src="./camera.png"
              alt=""
              className="h-6 w-6 cursor-pointer opacity-70 transition-transform hover:scale-110 hover:opacity-100"
            />
            <img
              src="./mic.png"
              alt=""
              className="h-6 w-6 cursor-pointer opacity-70 transition-transform hover:scale-110 hover:opacity-100"
            />
          </div>

          {/* Input text với emoji picker */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder={
                isCurrentUserBlocked || isReceiverBlocked
                  ? "Bạn không thể gửi tin nhắn"
                  : "Nhập tin nhắn..."
              }
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full rounded-xl border border-gray-600 bg-slate-700/50 p-3 pr-12 text-white placeholder-gray-400 transition-all outline-none focus:border-blue-500 focus:bg-slate-700/70"
              disabled={isCurrentUserBlocked || isReceiverBlocked}
              onKeyPress={(e) => {
                if (e.key === "Enter" && (text.trim() || img.file)) {
                  handleSend();
                }
              }}
            />

            {/* Nút emoji và emoji picker */}
            <div className="absolute top-1/2 right-3 -translate-y-1/2 transform">
              <img
                src="./emoji.png"
                alt=""
                onClick={() => setOpen((prev) => !prev)}
                className="h-5 w-5 cursor-pointer opacity-70 transition-transform hover:scale-110 hover:opacity-100"
              />
              {open && (
                <div className="absolute right-0 bottom-12 z-50">
                  <EmojiPicker onEmojiClick={handleEmoji} />
                </div>
              )}
            </div>
          </div>

          {/* Nút gửi tin nhắn - cho phép gửi khi có text hoặc ảnh */}
          <button
            onClick={handleSend}
            disabled={isCurrentUserBlocked || isReceiverBlocked || (!text.trim() && !img.file)}
            className="cursor-pointer rounded-xl border-none bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-3 font-medium text-white transition-all hover:from-blue-600 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};
export default Chat;
