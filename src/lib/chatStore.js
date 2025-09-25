import { create } from "zustand";
import { useUserStore } from "./userStore";
export const useChatStore = create((set) => ({
  chatId: null,
  user: null,
  isCurrentUserBlocked: false,
  isReceiverBlocked: false,
  isGroup: false,
  groupName: null,
  groupAdmin: null,
  groupMembers: [],
  // Function thay đổi chat hiện tại và kiểm tra trạng thái block
  changeChat: (chatId, user, chatData = {}) => {
    const currentUser = useUserStore.getState().currentUser;

    // Nếu không có user hiện tại, reset tất cả state
    if (!currentUser) {
      return set({
        chatId: null,
        user: null,
        isCurrentUserBlocked: false,
        isReceiverBlocked: false,
        isGroup: false,
        groupName: null,
        groupAdmin: null,
        groupMembers: [],
      });
    }

    // Nếu là group chat
    if (chatData.isGroup) {
      return set({
        chatId,
        user: null,
        isCurrentUserBlocked: false,
        isReceiverBlocked: false,
        isGroup: true,
        groupName: chatData.groupName,
        groupAdmin: chatData.groupAdmin,
        groupMembers: chatData.members || [],
      });
    }

    // Lấy danh sách bị block của cả hai user (individual chat)
    const userBlocked = user?.blocked || [];
    const currentUserBlocked = currentUser?.blocked || [];

    // Kiểm tra nếu user hiện tại bị block bởi người kia
    if (userBlocked.includes(currentUser.id)) {
      return set({
        chatId,
        user: null,
        isCurrentUserBlocked: true,
        isReceiverBlocked: false,
        isGroup: false,
        groupName: null,
        groupAdmin: null,
        groupMembers: [],
      });
    }
    // Kiểm tra nếu user hiện tại đã block người kia
    else if (currentUserBlocked.includes(user?.id)) {
      return set({
        chatId,
        user: user,
        isCurrentUserBlocked: false,
        isReceiverBlocked: true,
        isGroup: false,
        groupName: null,
        groupAdmin: null,
        groupMembers: [],
      });
    }
    // Trường hợp bình thường, không ai block ai
    else {
      return set({
        chatId,
        user,
        isCurrentUserBlocked: false,
        isReceiverBlocked: false,
        isGroup: false,
        groupName: null,
        groupAdmin: null,
        groupMembers: [],
      });
    }
  },

  // Function toggle trạng thái block/unblock receiver
  changeBlock: () => {
    set((state) => ({ ...state, isReceiverBlocked: !state.isReceiverBlocked }));
  },

  // Function reset về trạng thái ban đầu
  resetChat: () => {
    set({
      chatId: null,
      user: null,
      isCurrentUserBlocked: false,
      isReceiverBlocked: false,
      isGroup: false,
      groupName: null,
      groupAdmin: null,
      groupMembers: [],
    });
  },
}));
