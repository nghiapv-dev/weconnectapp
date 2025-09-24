import { create } from "zustand";
import { auth } from "./firebase";

export const useUserStore = create((set) => ({
  currentUser: null,
  isLoading: true,
  // Function lấy thông tin user từ Firestore hoặc tạo mới
  fetchUserInfo: async (uid) => {
    if (!uid) return set({ currentUser: null, isLoading: false });

    const authUser = auth.currentUser;

    // Tạo username mặc định từ uid hoặc email
    let username = `User_${uid.slice(-4)}`;

    if (authUser?.email) {
      const emailPrefix = authUser.email.split("@")[0];
      username = emailPrefix
        .replace(/[._]/g, " ")
        .split(" ")
        .map(
          (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
        )
        .join(" ");
    }

    // Thử lấy dữ liệu user từ Firestore
    try {
      const { doc, getDoc } = await import("firebase/firestore");
      const { db } = await import("./firebase");

      const docRef = doc(db, "users", uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const userData = docSnap.data();
        console.log("User data loaded from Firestore:", userData);

        // Cập nhật trạng thái online
        try {
          const { updateDoc } = await import("firebase/firestore");
          await updateDoc(docRef, { online: true });
          console.log("Updated online status to true");
          userData.online = true;
        } catch (updateError) {
          console.log("Failed to update online status:", updateError);
        }

        set({ currentUser: userData, isLoading: false });
        return;
      }
    } catch (firestoreError) {
      console.log("Firestore access failed, using fallback:", firestoreError);
    }

    // Nếu không có dữ liệu trong Firestore, dùng fallback từ localStorage
    const storedUserData = localStorage.getItem(`user_${uid}`);
    let localUserData = {};
    if (storedUserData) {
      try {
        localUserData = JSON.parse(storedUserData);
      } catch (e) {
        console.log("Error parsing stored user data:", e);
      }
    }

    // Tạo user object tối thiểu
    const minimalUser = {
      id: uid,
      username: localUserData.username || username,
      email: authUser?.email || "",
      avatar: localUserData.avatar || authUser?.photoURL || "./avatar.png",
      blocked: [],
      online: true,
    };

    // Thử tạo/cập nhật document trong Firestore
    try {
      const { doc, setDoc } = await import("firebase/firestore");
      const { db } = await import("./firebase");
      const docRef = doc(db, "users", uid);
      await setDoc(docRef, minimalUser, { merge: true });
      console.log("Created/updated user document with online status");
    } catch (firestoreError) {
      console.log("Failed to create user document:", firestoreError);
    }

    console.log("Created fallback user from auth + localStorage:", minimalUser);
    set({ currentUser: minimalUser, isLoading: false });
  },

  // Function cập nhật thông tin user và lưu vào localStorage
  updateUserInfo: (updates) => {
    set((state) => {
      const updatedUser = { ...state.currentUser, ...updates };

      // Lưu một số thông tin quan trọng vào localStorage để backup
      if (updatedUser.id) {
        localStorage.setItem(
          `user_${updatedUser.id}`,
          JSON.stringify({
            username: updatedUser.username,
            avatar: updatedUser.avatar,
          }),
        );
      }

      return { currentUser: updatedUser };
    });
  },
}));
