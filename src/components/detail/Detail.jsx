import { useState } from "react";
import { arrayRemove, arrayUnion, doc, updateDoc, getDoc } from "firebase/firestore";
import { useChatStore } from "../../lib/chatStore";
import { auth, db } from "../../lib/firebase";
import { useUserStore } from "../../lib/userStore";

const Detail = ({ chatData }) => {
  const [showMedia, setShowMedia] = useState(true);
  const [showMembers, setShowMembers] = useState(true);

  const {
    chatId,
    user,
    isCurrentUserBlocked,
    isReceiverBlocked,
    changeBlock,
    resetChat,
    isGroup,
    groupName,
    groupMembers,
    groupAdmin,
  } = useChatStore();
  const { currentUser } = useUserStore();

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

  const handleLogout = () => {
    auth.signOut();
    resetChat();
  };

  const handleRemoveMember = async (memberId) => {
    if (!isGroup || currentUser?.id !== groupAdmin) return;
    
    try {
      const confirmRemove = window.confirm("Bạn có chắc muốn xóa thành viên này khỏi nhóm?");
      if (!confirmRemove) return;

      const chatRef = doc(db, "chats", chatId);
      await updateDoc(chatRef, {
        members: arrayRemove(memberId),
      });

      const memberChatsRef = doc(db, "userchats", memberId);
      const memberChatsDoc = await getDoc(memberChatsRef);
      
      if (memberChatsDoc.exists()) {
        const memberChats = memberChatsDoc.data().chats || [];
        const updatedChats = memberChats.filter(chat => chat.chatId !== chatId);
        await updateDoc(memberChatsRef, { chats: updatedChats });
      }

      console.log("Member removed successfully:", memberId);
    } catch (error) {
      console.error("Error removing member:", error);
      alert("Không thể xóa thành viên");
    }
  };

  return (
    <div className="flex h-full flex-1 flex-col border-l border-gray-700/50 bg-slate-800/10">
      <div className="flex flex-col items-center gap-4 border-b border-gray-700/50 bg-slate-800/20 px-6 py-8">
        <div className="relative">
          {isGroup ? (
            <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-gray-600 bg-gradient-to-br from-green-500 to-blue-600 text-white">
              <svg className="h-12 w-12" fill="currentColor" viewBox="0 0 24 24">
                <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zM4 18v-4h3v4H4z"/>
              </svg>
            </div>
          ) : (
            <img
              src={user?.avatar || "./avatar.png"}
              alt=""
              className="h-24 w-24 rounded-full border-4 border-gray-600 object-cover"
            />
          )}
        </div>
        <div className="text-center">
          <h2 className="mb-1 text-xl font-semibold text-white">
            {isGroup ? groupName : user?.username}
          </h2>
          <p className="text-gray-400">
            {isGroup 
              ? `${groupMembers?.length || 0} thành viên`
              : (user?.online ? "Active now" : "Offline")
            }
          </p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="flex flex-1 flex-col gap-4 p-6">
          <div className="space-y-4">
            {/* Chat Info Section */}
            <div className="rounded-xl bg-slate-700/30 p-4">
              <div className="flex cursor-pointer items-center justify-between">
                <span className="font-medium text-white">Thông tin trò chuyện</span>
                <img src="./arrowUp.png" alt="" className="h-5 w-5 opacity-60" />
              </div>
            </div>

            {/* Group Members Section */}
            {isGroup && (
              <div className="rounded-xl bg-slate-700/30 p-4">
                <div 
                  className="mb-3 flex cursor-pointer items-center justify-between"
                  onClick={() => setShowMembers(prev => !prev)}
                >
                  <span className="font-medium text-white">
                    Thành viên ({groupMembers?.length || 0})
                  </span>
                  <img 
                    src={showMembers ? "./arrowDown.png" : "./arrowUp.png"} 
                    alt="" 
                    className="h-5 w-5 opacity-60 transition-transform" 
                  />
                </div>
                
                {showMembers && groupMembers && (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {groupMembers.map((memberId) => {
                      let memberInfo = { 
                        id: memberId, 
                        username: `User ${memberId.substring(0, 8)}`, 
                        avatar: "./avatar.png", 
                        email: "Member" 
                      };
                      
                      if (memberId === currentUser?.id) {
                        memberInfo = currentUser;
                      } else if (chatData?.memberDetails) {
                        const foundMember = chatData.memberDetails.find(m => m.id === memberId);
                        if (foundMember) {
                          memberInfo = foundMember;
                        }
                      } else if (window._chatData?.memberDetails) {
                        const foundMember = window._chatData.memberDetails.find(m => m.id === memberId);
                        if (foundMember) {
                          memberInfo = foundMember;
                        }
                      }
                      
                      const isCurrentMember = memberId === currentUser?.id;
                      const isAdmin = memberId === groupAdmin;
                      
                      return (
                        <div key={memberId} className="flex items-center gap-3 rounded-lg bg-slate-600/30 p-2 transition-colors hover:bg-slate-600/50">
                          <div className="relative">
                            <img
                              src={memberInfo.avatar || "./avatar.png"}
                              alt=""
                              className="h-8 w-8 rounded-full border border-gray-600 object-cover"
                            />
                            {isAdmin && (
                              <span className="absolute -bottom-1 -right-1 rounded-full bg-yellow-500 p-1">
                                <svg className="h-2 w-2 text-white" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                </svg>
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-white truncate">
                                {isCurrentMember ? "Bạn" : (memberInfo.username || `User ${memberId.substring(0, 8)}`)}
                              </p>
                              {isAdmin && (
                                <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">
                                  Admin
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 truncate">
                              {memberInfo.email || "Member"}
                            </p>
                          </div>
                          
                          {/* Admin controls */}
                          {currentUser?.id === groupAdmin && !isCurrentMember && (
                            <div className="flex gap-1">
                              <button 
                                className="p-1 text-gray-400 hover:text-red-400 transition-colors" 
                                title="Remove member"
                                onClick={() => handleRemoveMember(memberId)}
                              >
                                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    
                    {/* Add member button for admin */}
                    {currentUser?.id === groupAdmin && (
                      <button 
                        className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-600 bg-slate-700/20 p-3 text-slate-400 transition-colors hover:border-slate-500 hover:bg-slate-700/40 hover:text-white"
                        onClick={() => alert("Tính năng thêm thành viên sẽ được phát triển sau")}
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Thêm thành viên
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Chat Settings */}
            <div className="rounded-xl bg-slate-700/30 p-4">
              <div className="flex cursor-pointer items-center justify-between">
                <span className="font-medium text-white">Tùy chỉnh trò chuyện</span>
                <img src="./arrowUp.png" alt="" className="h-5 w-5 opacity-60" />
              </div>
            </div>

            {/* Shared Media */}
            <div className="rounded-xl bg-slate-700/30 p-4">
              <div
                className="flex cursor-pointer items-center justify-between"
                onClick={() => setShowMedia((prev) => !prev)}
              >
                <span className="font-medium text-white">Media</span>
                <img
                  src={showMedia ? "./arrowDown.png" : "./arrowUp.png"}
                  alt=""
                  className="h-5 w-5 opacity-60 transition-transform"
                />
              </div>

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
                            <span className="block text-sm text-white">Image</span>
                            <span className="text-xs text-gray-400">
                              {new Date(message.createdAt.toDate()).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <a href={message.img} target="_blank" rel="noopener noreferrer">
                          <img
                            src="./download.png"
                            alt=""
                            className="h-5 w-5 cursor-pointer opacity-60 transition-opacity hover:opacity-100"
                          />
                        </a>
                      </div>
                    ))}
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

          {/* Action Buttons */}
          <div className="mt-auto space-y-3">
            {/* Block/Unblock button for 1-1 chats */}
            {!isGroup && (
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
            )}

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 p-4 font-medium text-white transition-all hover:from-blue-600 hover:to-blue-700"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Detail;