## 🔧 Firebase Setup Instructions

**Vấn đề hiện tại:** Database unavailable - Firebase Security Rules đang chặn truy cập

### Cách khắc phục:

1. **Mở Firebase Console:**
   - Truy cập: https://console.firebase.google.com/
   - Chọn project: `chat-app-5209e`

2. **Cập nhật Firestore Rules:**

   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }

       match /users/{userId} {
         allow read: if request.auth != null;
       }

       match /userchats/{userId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }

       match /chats/{chatId} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

3. **Cập nhật Storage Rules:**

   ```javascript
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /{allPaths=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

4. **Nhấn "Publish" để áp dụng**

### Sau khi cập nhật:

- Đăng ký tài khoản mới
- Thử tìm kiếm và thêm bạn bè
- Chat real-time sẽ hoạt động bình thường

**Lưu ý:** Rules trên cho phép người dùng đã đăng nhập đọc/ghi dữ liệu của họ và đọc thông tin người dùng khác để chat.
