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

const CreateGroup = ({ setCreateGroupMode }) => {
  const [groupName, setGroupName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  const { currentUser } = useUserStore();

  const handleSearchUsers = async (e) => {
    const term = e.target.value;
    setSearchTerm(term);

    if (!term.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);

    try {
      const userRef = collection(db, "users");
      const q = query(userRef, where("username", ">=", term.toLowerCase()));
      const querySnapshot = await getDocs(q);

      const users = [];
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        // Không hiển thị bản thân và users đã được chọn
        if (
          userData.id !== currentUser.id &&
          !selectedMembers.find((member) => member.id === userData.id)
        ) {
          users.push(userData);
        }
      });

      setSearchResults(users.slice(0, 10));
    } catch (error) {
      console.log("Lỗi tìm kiếm users:", error);
      toast.error("Không thể tìm kiếm users");
    }

    setSearching(false);
  };

  // Function thêm member vào danh sách được chọn
  const handleSelectMember = (user) => {
    setSelectedMembers((prev) => [...prev, user]);
    setSearchResults((prev) => prev.filter((u) => u.id !== user.id));
    setSearchTerm("");
  };

  // Function xóa member khỏi danh sách được chọn
  const handleRemoveMember = (userId) => {
    setSelectedMembers((prev) => prev.filter((member) => member.id !== userId));
  };

  // Function tạo group chat
  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast.error("Vui lòng nhập tên nhóm");
      return;
    }

    if (selectedMembers.length < 1) {
      toast.error("Cần ít nhất 2 thành viên để tạo nhóm");
      return;
    }

    setLoading(true);

    try {
      // Tạo group chat document
      const chatRef = collection(db, "chats");
      const newChatRef = doc(chatRef);

      const allMembers = [currentUser, ...selectedMembers];
      const memberIds = allMembers.map((member) => member.id);

      await setDoc(newChatRef, {
        createdAt: serverTimestamp(),
        messages: [],
        isGroup: true,
        groupName: groupName.trim(),
        groupAdmin: currentUser.id,
        members: memberIds,
        memberDetails: allMembers.map((member) => ({
          id: member.id,
          username: member.username,
          avatar: member.avatar || "./avatar.png",
          email: member.email,
        })),
      });

      // Thêm group chat vào userchats của tất cả thành viên
      for (const member of allMembers) {
        const userChatsRef = doc(db, "userchats", member.id);

        try {
          const userChatsDoc = await getDoc(userChatsRef);

          if (userChatsDoc.exists()) {
            await updateDoc(userChatsRef, {
              chats: arrayUnion({
                chatId: newChatRef.id,
                lastMessage: "",
                updatedAt: Date.now(),
                isSeen: member.id === currentUser.id,
                isGroup: true,
                groupName: groupName.trim(),
                groupAdmin: currentUser.id,
                members: memberIds,
              }),
            });
          } else {
            // Tạo userchats document nếu chưa có
            await setDoc(userChatsRef, {
              chats: [
                {
                  chatId: newChatRef.id,
                  lastMessage: "",
                  updatedAt: Date.now(),
                  isSeen: member.id === currentUser.id,
                  isGroup: true,
                  groupName: groupName.trim(),
                  groupAdmin: currentUser.id,
                  members: memberIds,
                },
              ],
            });
          }
        } catch (error) {
          console.log(`Lỗi cập nhật userchats cho ${member.username}:`, error);
        }
      }

      toast.success(`Đã tạo nhóm "${groupName}" thành công!`);

      // Reset form
      setGroupName("");
      setSelectedMembers([]);
      setSearchResults([]);
      setSearchTerm("");

      // Đóng modal sau 1 giây
      setTimeout(() => {
        setCreateGroupMode(false);
      }, 1000);
    } catch (error) {
      console.log("Lỗi tạo group chat:", error);
      toast.error("Không thể tạo nhóm chat");
    }

    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-2xl bg-slate-800 p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-white">Tạo nhóm chat</h3>
          <button
            onClick={() => setCreateGroupMode(false)}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Input tên nhóm */}
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-gray-300">
            Tên nhóm
          </label>
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Nhập tên nhóm..."
            className="w-full rounded-lg bg-slate-700 px-4 py-3 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        {/* Tìm kiếm thành viên */}
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-gray-300">
            Thêm thành viên
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchUsers}
            placeholder="Tìm kiếm tên người dùng..."
            className="w-full rounded-lg bg-slate-700 px-4 py-3 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />

          {/* Kết quả tìm kiếm */}
          {searchResults.length > 0 && (
            <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-slate-600 bg-slate-700">
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  onClick={() => handleSelectMember(user)}
                  className="flex cursor-pointer items-center gap-3 p-3 transition-colors hover:bg-slate-600"
                >
                  <img
                    src={user.avatar || "./avatar.png"}
                    alt=""
                    className="h-8 w-8 rounded-full object-cover"
                  />
                  <div>
                    <p className="text-sm font-medium text-white">
                      {user.username}
                    </p>
                    <p className="text-xs text-gray-400">{user.email}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Danh sách thành viên đã chọn */}
        {selectedMembers.length > 0 && (
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Thành viên ({selectedMembers.length + 1})
            </label>
            <div className="max-h-32 space-y-2 overflow-y-auto">
              {/* Admin (current user) */}
              <div className="flex items-center justify-between rounded-lg bg-slate-700 p-2">
                <div className="flex items-center gap-2">
                  <img
                    src={currentUser.avatar || "./avatar.png"}
                    alt=""
                    className="h-6 w-6 rounded-full object-cover"
                  />
                  <span className="text-sm text-white">
                    {currentUser.username}
                  </span>
                  <span className="rounded bg-blue-500 px-2 py-0.5 text-xs text-white">
                    Admin
                  </span>
                </div>
              </div>

              {/* Selected members */}
              {selectedMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-lg bg-slate-700 p-2"
                >
                  <div className="flex items-center gap-2">
                    <img
                      src={member.avatar || "./avatar.png"}
                      alt=""
                      className="h-6 w-6 rounded-full object-cover"
                    />
                    <span className="text-sm text-white">
                      {member.username}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveMember(member.id)}
                    className="text-sm text-red-400 hover:text-red-300"
                  >
                    Xóa
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => setCreateGroupMode(false)}
            className="flex-1 rounded-lg bg-gray-600 px-4 py-3 font-medium text-white transition-colors hover:bg-gray-700"
          >
            Hủy
          </button>
          <button
            onClick={handleCreateGroup}
            disabled={
              loading || !groupName.trim() || selectedMembers.length === 0
            }
            className="flex-1 rounded-lg bg-green-500 px-4 py-3 font-medium text-white transition-colors hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
            ) : (
              "Tạo nhóm"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateGroup;
