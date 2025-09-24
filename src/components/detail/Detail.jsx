import { useState } from "react";
import { arrayRemove, arrayUnion, doc, updateDoc } from "firebase/firestore";
import { useChatStore } from "../../lib/chatStore";
import { auth, db } from "../../lib/firebase";
import { useUserStore } from "../../lib/userStore";

const Detail = ({ chatData }) => {
  // State quản lý hiển thị/ẩn media section
  const [showMedia, setShowMedia] = useState(true);

  // Lấy dữ liệu từ chat store và user store
  const {
    chatId,
    user,
    isCurrentUserBlocked,
    isReceiverBlocked,
    changeBlock,
    resetChat,
  } = useChatStore();
  const { currentUser } = useUserStore();

  // Function xử lý block/unblock user
  const handleBlock = async () => {
    if (!user) return;

    const userDocRef = doc(db, "users", currentUser.id);

    try {
      await updateDoc(userDocRef, {
        blocked: isReceiverBlocked ? arrayRemove(user.id) : arrayUnion(user.id),
      });
      changeBlock();
    } catch (err) {
      console.log(err);
    }
  };

  // Function xử lý logout
  const handleLogout = () => {
    auth.signOut();
    resetChat();
  };

  return (
    <div className="flex-1 border-l border-gray-700/50 bg-slate-800/10">
      {/* Khu vực hiển thị thông tin profile user */}
      <div className="flex flex-col items-center gap-4 border-b border-gray-700/50 bg-slate-800/20 px-6 py-8">
        <div className="relative">
          <img
            src={user?.avatar || "./avatar.png"}
            alt=""
            className="h-24 w-24 rounded-full border-4 border-gray-600 object-cover"
          />
          {/* Chấm xanh hiển thị trạng thái online */}
          {user?.online && (
            <span className="absolute -right-2 -bottom-2 h-6 w-6 rounded-full border-4 border-slate-800 bg-green-500"></span>
          )}
        </div>
        <div className="text-center">
          <h2 className="mb-1 text-xl font-semibold text-white">
            {user?.username}
          </h2>
          <p className="text-gray-400">
            {user?.online ? "Active now" : "Offline"}
          </p>
        </div>
      </div>

      {/* Khu vực các tùy chọn và thông tin chi tiết */}
      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="space-y-4">
          {/* Mục Chat Info */}
          <div className="rounded-xl bg-slate-700/30 p-4">
            <div className="flex cursor-pointer items-center justify-between">
              <span className="font-medium text-white">
                Thông tin trò chuyện
              </span>
              <img src="./arrowUp.png" alt="" className="h-5 w-5 opacity-60" />
            </div>
          </div>

          {/* Mục Tùy chỉnh trò chuyện */}
          <div className="rounded-xl bg-slate-700/30 p-4">
            <div className="flex cursor-pointer items-center justify-between">
              <span className="font-medium text-white">
                Tùy chỉnh trò chuyện
              </span>
              <img src="./arrowUp.png" alt="" className="h-5 w-5 opacity-60" />
            </div>
          </div>

          {/* Mục Shared Media với khả năng toggle */}
          <div className="rounded-xl bg-slate-700/30 p-4">
            <div
              className="flex cursor-pointer items-center justify-between"
              onClick={() => setShowMedia((prev) => !prev)}
            >
              <span className="font-medium text-white">Media </span>
              <img
                src={showMedia ? "./arrowDown.png" : "./arrowUp.png"}
                alt=""
                className="h-5 w-5 opacity-60 transition-transform"
              />
            </div>

            {/* Danh sách media được chia sẻ trong chat */}
            {showMedia && (
              <div className="mt-4 max-h-64 space-y-3 overflow-y-auto">
                {chatData?.messages
                  ?.filter((m) => m.img)
                  .map((message, idx) => (
                    <div
                      className="flex items-center justify-between rounded-lg bg-slate-800/50 p-3"
                      key={message.img + idx}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={message.img}
                          alt=""
                          className="h-12 w-12 rounded-lg object-cover"
                        />
                        <div>
                          <span className="block text-sm text-white">
                            Image
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(
                              message.createdAt.toDate(),
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      {/* Nút download ảnh */}
                      <a
                        href={message.img}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <img
                          src="./download.png"
                          alt=""
                          className="h-5 w-5 cursor-pointer opacity-60 transition-opacity hover:opacity-100"
                        />
                      </a>
                    </div>
                  ))}
                {/* Thông báo khi chưa có media nào */}
                {(!chatData?.messages ||
                  chatData.messages.filter((m) => m.img).length === 0) && (
                  <p className="py-4 text-center text-sm text-gray-400">
                    No shared media yet
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Khu vực các hành động chính */}
        <div className="mt-auto space-y-3">
          {/* Nút Block/Unblock user */}
          <button
            onClick={handleBlock}
            className="w-full rounded-xl border border-red-500/30 bg-red-500/20 p-4 font-medium text-red-400 transition-colors hover:bg-red-500/30"
          >
            {isCurrentUserBlocked
              ? "You are Blocked!"
              : isReceiverBlocked
                ? "Unblock User"
                : "Block User"}
          </button>

          {/* Nút Logout */}
          <button
            onClick={handleLogout}
            className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 p-4 font-medium text-white transition-all hover:from-blue-600 hover:to-blue-700"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Detail;
