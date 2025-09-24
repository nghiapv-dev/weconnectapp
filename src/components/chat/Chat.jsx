import { useEffect, useRef, useState } from "react";
import EmojiPicker from "emoji-picker-react";
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

  const { currentUser } = useUserStore();
  const { chatId, user, isCurrentUserBlocked, isReceiverBlocked } =
    useChatStore();
  const endRef = useRef(null); // Ref để scroll xuống cuối chat

  // Auto scroll xuống cuối khi có tin nhắn mới
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat?.messages, img.url]);

  // Lắng nghe realtime messages từ Firestore
  useEffect(() => {
    if (!chatId) return;

    const unSub = onSnapshot(
      doc(db, "chats", chatId),
      (res) => {
        try {
          const data = res.data();
          setChat(data || { messages: [] });
          window._chatData = data || { messages: [] }; // Lưu vào global để Detail component sử dụng
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

  // Function gửi tin nhắn
  const handleSend = async () => {
    if (text === "") return;

    let imgUrl = null;

    try {
      // Upload ảnh lên Cloudinary nếu có
      if (img.file) {
        imgUrl = await upload(img.file);
      }

      // Thêm tin nhắn mới vào chat document
      await updateDoc(doc(db, "chats", chatId), {
        messages: arrayUnion({
          senderId: currentUser.id,
          text,
          createdAt: new Date(),
          ...(imgUrl && { img: imgUrl }),
        }),
      });

      // Cập nhật lastMessage trong userchats của cả hai user
      const userIDs = [currentUser.id, user.id];

      userIDs.forEach(async (id) => {
        const userChatsRef = doc(db, "userchats", id);
        const userChatsSnapshot = await getDoc(userChatsRef);

        if (userChatsSnapshot.exists()) {
          const userChatsData = userChatsSnapshot.data();

          const chatIndex = userChatsData.chats.findIndex(
            (c) => c.chatId === chatId,
          );

          userChatsData.chats[chatIndex].lastMessage = text;
          userChatsData.chats[chatIndex].isSeen =
            id === currentUser.id ? true : false;
          userChatsData.chats[chatIndex].updatedAt = Date.now();

          await updateDoc(userChatsRef, {
            chats: userChatsData.chats,
          });
        }
      });
    } catch (err) {
      console.log(err);
    } finally {
      // Reset input sau khi gửi
      setImg({
        file: null,
        url: "",
      });

      setText("");
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

          {/* Avatar và trạng thái online của user */}
          <div className="relative">
            <img
              src={user?.avatar || "./avatar.png"}
              alt=""
              className="h-10 w-10 rounded-full border-2 border-gray-600 object-cover md:h-12 md:w-12"
            />
            {user?.online && (
              <span className="absolute -right-1 -bottom-1 h-3 w-3 rounded-full border-2 border-slate-800 bg-green-500 md:h-4 md:w-4"></span>
            )}
          </div>

          {/* Thông tin user */}
          <div>
            <h3 className="text-base font-semibold text-white md:text-lg">
              {user?.username}
            </h3>
            <p className="text-xs text-gray-400 md:text-sm">
              {user?.online ? "Active now" : "Last seen recently"}
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
        {chat?.messages?.map((message, idx) => (
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
                  : user?.avatar || "./avatar.png"
              }
              alt=""
              className="h-8 w-8 flex-shrink-0 rounded-full object-cover"
            />

            {/* Nội dung tin nhắn */}
            <div
              className={`flex flex-col gap-1 ${message.senderId === currentUser?.id ? "items-end" : "items-start"}`}
            >
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
        ))}

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
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
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

          {/* Nút gửi tin nhắn */}
          <button
            onClick={handleSend}
            disabled={isCurrentUserBlocked || isReceiverBlocked || !text.trim()}
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
