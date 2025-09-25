# 💬 WeConnect Chat App

## ✨ Tính năng nổi bật

### 🔐 **Xác thực người dùng**

### 💬 **Chat cá nhân (1-1)**

### 👥 **Chat nhóm**

## 🛠️ Công nghệ sử dụng

### Frontend

- **React 18.2.0** - UI Framework
- **Vite 5.2.0** - Build tool và dev server
- **Tailwind CSS 4.1.13** - Styling framework
- **Zustand 4.5.2** - State management
- **React Toastify** - Toast notifications
- **Emoji Picker React** - Emoji selector

### Backend & Database

- **Firebase Authentication** - Xác thực người dùng
- **Firebase Firestore** - Database NoSQL thời gian thực
- **Firebase Storage** - Lưu trữ file/ảnh
- **Firebase Hosting** - Deploy ứng dụng

## 🚀 Cài đặt và chạy dự án

### 1️⃣ Clone dự án

```bash
git clone https://github.com/nghiapv-dev/weconnectapp.git
cd weconnectapp
```

### 2️⃣ Cài đặt dependencies

````bash
npm install
### 3️⃣ Cấu hình Firebase
#### Tạo Firebase Project:
1. Truy cập [Firebase Console](https://console.firebase.google.com/)
2. Tạo project mới hoặc sử dụng project có sẵn
3. Kích hoạt các services:
   - **Authentication** (Email/Password)
   - **Firestore Database**
   - **Storage**

#### Lấy Firebase Config:
1. Vào **Project Settings** → **General** → **Your apps**
2. Chọn **Web app** và copy config object
3. Tạo file `.env` trong thư mục root:

```env
VITE_API_KEY=your_api_key_here
````

**Storage Rules:**

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

### 4️⃣ Chạy ứng dụng

#### Development mode:

```bash
npm run dev
```
Ứng dụng sẽ chạy tại `http://localhost:5173`

#### Production build:

```bash
npm run build
# hoặc
yarn build
```

## 🎯 Hướng dẫn sử dụng

### 👤 Đăng ký/Đăng nhập

1. Mở ứng dụng và chọn **"Sign Up"**
2. Nhập thông tin: Username, Email, Password
3. Upload avatar (tùy chọn)
4. Hoặc đăng nhập nếu đã có tài khoản

### 💬 Chat cá nhân

1. Tìm kiếm người dùng bằng username
2. Nhấp **"Add User"** để thêm vào danh sách chat
3. Chọn người dùng để bắt đầu chat
4. Gửi tin nhắn, ảnh, emoji

### 👥 Tạo nhóm chat

1. Nhấp button **"+"** trong danh sách chat
2. Nhập tên nhóm
3. Tìm kiếm và chọn thành viên
4. Nhấp **"Create Group"**

### ⚙️ Quản lý chat

- **Xóa lịch sử:** Menu 3 chấm → "Clear History"
- **Chặn người dùng:** Chi tiết chat → "Block"
- **Xóa thành viên nhóm:** Chi tiết nhóm → "Remove" (chỉ admin)
