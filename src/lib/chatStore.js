import { create } from "zustand";
import { useUserStore } from "./userStore";
export const useChatStore = create((set) => ({
  chatId: null,
  user: null,
  isCurrentUserBlocked: false,
  isReceiverBlocked: false,
  // Function thay đổi chat hiện tại và kiểm tra trạng thái block
  changeChat: (chatId, user) => {
    const currentUser = useUserStore.getState().currentUser;

    // Nếu không có user hiện tại, reset tất cả state
    if (!currentUser) {
      return set({
        chatId: null,
        user: null,
        isCurrentUserBlocked: false,
        isReceiverBlocked: false,
      });
    }

    // Lấy danh sách bị block của cả hai user
    const userBlocked = user?.blocked || [];
    const currentUserBlocked = currentUser?.blocked || [];

    // Kiểm tra nếu user hiện tại bị block bởi người kia
    if (userBlocked.includes(currentUser.id)) {
      return set({
        chatId,
        user: null,
        isCurrentUserBlocked: true,
        isReceiverBlocked: false,
      });
    }
    // Kiểm tra nếu user hiện tại đã block người kia
    else if (currentUserBlocked.includes(user?.id)) {
      return set({
        chatId,
        user: user,
        isCurrentUserBlocked: false,
        isReceiverBlocked: true,
      });
    }
    // Trường hợp bình thường, không ai block ai
    else {
      return set({
        chatId,
        user,
        isCurrentUserBlocked: false,
        isReceiverBlocked: false,
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
    });
  },
}));
