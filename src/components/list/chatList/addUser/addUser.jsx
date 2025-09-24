import { db } from "../../../../lib/firebase";
import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { useState } from "react";
import { useUserStore } from "../../../../lib/userStore";
import { toast } from "react-toastify";

const AddUser = ({ setAddMode }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  const { currentUser } = useUserStore();

  // Function tìm kiếm user theo username
  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setUser(null);

    // Lấy username từ form
    const formData = new FormData(e.target);
    const username = formData.get("username");

    if (!username || username.trim() === "") {
      toast.warn("Vui lòng nhập tên người dùng để tìm kiếm");
      setLoading(false);
      return;
    }

    // Tìm kiếm user trong Firestore
    try {
      const userRef = collection(db, "users");
      const q = query(userRef, where("username", "==", username.trim()));
      const querySnapShot = await getDocs(q);

      if (!querySnapShot.empty) {
        const foundUser = querySnapShot.docs[0].data();
        setUser(foundUser);
        console.log("Người dùng được tìm thấy trong Firestore:", foundUser);
      } else {
        toast.info("Không tìm thấy người dùng với tên đó");
      }
    } catch (err) {
      console.log("Lỗi tìm kiếm Firestore:", err);

      // Xử lý các loại lỗi khác nhau
      if (err.code === "permission-denied") {
        toast.error(
          "Quyền truy cập cơ sở dữ liệu bị từ chối. Vui lòng cập nhật Quy tắc Bảo mật Firebase để cho phép người dùng đã xác thực đọc/ghi dữ liệu.",
        );
        console.log(
          "Quy tắc bảo mật Firebase cần được cập nhật để tìm kiếm người dùng. Lỗi hiện tại:",
          err,
        );
      } else if (err.code === "unavailable") {
        toast.error(
          "Cơ sở dữ liệu tạm thời không khả dụng. Vui lòng thử lại sau.",
        );
      } else {
        toast.error(
          "Tìm kiếm không thành công. Vui lòng kiểm tra kết nối internet của bạn và thử lại.",
        );
      }
    }

    setLoading(false);
  };

  // Function thêm user và tạo chat mới
  const handleAdd = async () => {
    if (!user) {
      toast.error("Không có người dùng nào được chọn để thêm");
      return;
    }

    if (user.id === currentUser.id) {
      toast.error("Bạn không thể thêm chính mình!");
      return;
    }

    try {
      const chatRef = collection(db, "chats");
      const userChatsRef = collection(db, "userchats");

      // Kiểm tra và tạo userchats document cho target user nếu chưa có
      try {
        const targetUserDocRef = doc(userChatsRef, user.id);
        const targetUserDoc = await getDoc(targetUserDocRef);
        if (!targetUserDoc.exists()) {
          console.log(
            "Tạo tài liệu userchats cho người dùng mục tiêu:",
            user.id,
          );
          await setDoc(targetUserDocRef, { chats: [] });
          toast.info("Đang khởi tạo dữ liệu người dùng...");
        }
      } catch (checkError) {
        console.log(
          "Lỗi khi kiểm tra tài liệu người dùng mục tiêu:",
          checkError,
        );
        await setDoc(doc(userChatsRef, user.id), { chats: [] });
      }

      // Kiểm tra và tạo userchats document cho current user nếu chưa có
      try {
        const currentUserDocRef = doc(userChatsRef, currentUser.id);
        const currentUserDoc = await getDoc(currentUserDocRef);
        if (!currentUserDoc.exists()) {
          console.log(
            "Tạo tài liệu userchats cho người dùng hiện tại:",
            currentUser.id,
          );
          await setDoc(currentUserDocRef, { chats: [] });
        }
      } catch (checkError) {
        console.log("Error checking current user document:", checkError);
        await setDoc(doc(userChatsRef, currentUser.id), { chats: [] });
      }

      // Tạo chat document mới
      const newChatRef = doc(chatRef);

      await setDoc(newChatRef, {
        createdAt: serverTimestamp(),
        messages: [],
      });

      // Cập nhật userchats cho target user
      await updateDoc(doc(userChatsRef, user.id), {
        chats: arrayUnion({
          chatId: newChatRef.id,
          lastMessage: "",
          receiverId: currentUser.id,
          updatedAt: Date.now(),
        }),
      });

      // Cập nhật userchats cho current user
      await updateDoc(doc(userChatsRef, currentUser.id), {
        chats: arrayUnion({
          chatId: newChatRef.id,
          lastMessage: "",
          receiverId: user.id,
          updatedAt: Date.now(),
        }),
      });

      toast.success(`Chat created with ${user.username}!`);
      setUser(null);

      setTimeout(() => {
        setAddMode(false);
      }, 1000); // Đợi 1 giây để hiển thị thông báo thành công
    } catch (err) {
      console.log("Lỗi thêm người dùng khi Firestore:", err);
      console.log("Mã lỗi:", err.code);
      console.log("Thông điệp lỗi:", err.message);
      console.log("Đối tượng lỗi đầy đủ:", err);

      // Xử lý các loại lỗi khác nhau khi thêm user
      if (err.code === "permission-denied") {
        toast.error(
          "Quyền truy cập cơ sở dữ liệu bị từ chối. Vui lòng cập nhật Quy tắc Bảo mật Firebase để cho phép người dùng đã xác thực đọc/ghi dữ liệu.",
        );
        console.log(
          "Quy tắc bảo mật Firebase cần được cập nhật. Lỗi hiện tại:",
          err,
        );
      } else if (err.code === "unavailable") {
        toast.error(
          "Cơ sở dữ liệu tạm thời không khả dụng. Vui lòng thử lại sau.",
        );
      } else if (err.code === "not-found") {
        toast.error(
          "Không tìm thấy tài liệu người dùng. Vui lòng thử tìm kiếm lại người dùng.",
        );
      } else if (err.code === "already-exists") {
        toast.error("Chat đã tồn tại với người dùng này.");
      } else if (err.code === "unauthenticated") {
        toast.error("Lỗi xác thực. Vui lòng đăng nhập lại.");
      } else if (err.code === "failed-precondition") {
        toast.error(
          "Thao tác cơ sở dữ liệu không thành công. Người dùng có thể không có tài liệu userchats. Đang tạo tài liệu này...",
        );

        // Thử tạo userchats document nếu chưa có
        try {
          await setDoc(doc(db, "userchats", user.id), { chats: [] });
          toast.info(
            "Đã tạo tài liệu trò chuyện người dùng. Vui lòng thử thêm người dùng lại.",
          );
        } catch (createError) {
          console.log("Failed to create userchats document:", createError);
          toast.error("Failed to create user chat document.");
        }
      } else {
        toast.error(
          `Failed to add user: ${err.message || "Unknown error"}. Code: ${err.code || "No code"}`,
        );
      }

      setUser(null);
    }
  };

  return (
    // Modal overlay với backdrop blur
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setAddMode(false);
        }
      }}
      style={{ zIndex: 9999 }}
    >
      {/* Modal content */}
      <div className="mx-4 w-full max-w-md rounded-2xl border border-gray-700 bg-slate-800 p-8 shadow-2xl">
        {/* Header với tiêu đề và nút đóng */}
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-white">Add New Contact</h3>
          <button
            onClick={() => setAddMode(false)}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
          >
            <svg
              className="h-5 w-5"
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

        {/* Form tìm kiếm user */}
        <form onSubmit={handleSearch} className="mb-6 flex gap-3">
          <input
            type="text"
            placeholder="Enter username..."
            name="username"
            disabled={loading}
            className="flex-1 rounded-lg border border-gray-600 bg-slate-700 p-3 text-white placeholder-gray-400 transition-colors focus:border-blue-500 focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading}
            className="flex min-w-[80px] items-center justify-center rounded-lg bg-blue-500 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
            ) : (
              "Search"
            )}
          </button>
        </form>

        {/* Kết quả tìm kiếm - hiển thị user tìm được */}
        {user && (
          <div className="mb-4 rounded-xl border border-slate-600/50 bg-slate-700/50 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <img
                  src={user.avatar || "./avatar.png"}
                  alt=""
                  className="h-12 w-12 rounded-full border-2 border-gray-600 object-cover"
                />
                <div>
                  <h4 className="font-medium text-white">{user.username}</h4>
                  <p className="text-sm text-gray-400">
                    {user.email || "No email"}
                  </p>
                </div>
              </div>
              <button
                onClick={handleAdd}
                className="rounded-lg bg-green-500 px-4 py-2 font-medium text-white transition-colors hover:bg-green-600"
              >
                Add
              </button>
            </div>
          </div>
        )}

        {/* Trạng thái rỗng khi chưa tìm kiếm */}
        {!loading && !user && (
          <div className="py-8 text-center text-gray-400">
            <svg
              className="mx-auto mb-4 h-12 w-12 opacity-50"
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
            <p>Tìm kiếm người dùng để bắt đầu cuộc trò chuyện</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddUser;
