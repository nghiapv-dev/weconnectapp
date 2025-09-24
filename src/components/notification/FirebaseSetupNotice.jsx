// Import các dependencies cần thiết
import { useState } from "react";
import { toast } from "react-toastify";

const FirebaseSetupNotice = () => {
  // State quản lý hiển thị chi tiết và trạng thái dismiss notification
  const [showDetails, setShowDetails] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const copyRules = () => {
    const rules = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read and write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Allow authenticated users to read ALL user documents (for search functionality)
    match /users/{userId} {
      allow read: if request.auth != null;
    }
    
    // Allow users to read and write their own userchats
    match /userchats/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Allow authenticated users to read and write any chat document
    match /chats/{chatId} {
      allow read, write: if request.auth != null;
    }
    
    // Temporary: Allow full access for debugging (REMOVE in production)
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}`;

    // Copy rules vào clipboard và hiển thị thông báo
    navigator.clipboard.writeText(rules);
    toast.success(
      "🔥 NEW Firebase Rules copied! Paste these rules in Firebase Console and PUBLISH them!",
    );
    toast.warn(
      "⚠️ After publishing, wait 1-2 minutes for rules to take effect, then refresh this page!",
    );
  };

  // Không hiển thị gì nếu đã dismiss
  if (isDismissed) return null;

  return (
    // Notification floating ở góc phải trên cùng
    <div className="fixed top-4 right-4 z-50 max-w-sm rounded-xl border border-orange-400/20 bg-orange-500/95 p-4 text-white shadow-2xl backdrop-blur-sm">
      {/* Header với tiêu đề và nút close */}
      <div className="mb-2 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🔧</span>
          <h3 className="font-semibold">Debug Firebase Connection</h3>
        </div>
        <button
          onClick={() => setIsDismissed(true)}
          className="text-lg leading-none text-white/60 hover:text-white/80"
          title="Dismiss"
        >
          ×
        </button>
      </div>

      {/* Thông báo lỗi chính */}
      <p className="mb-4 text-sm opacity-90">
        🚨 Database access is denied! Use the updated rules below to fix this
        issue.
      </p>

      {/* Các nút hành động chính */}
      <div className="mb-3 flex gap-2">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-1 rounded-lg bg-white/20 px-3 py-2 text-xs transition-colors hover:bg-white/30"
        >
          <span>{showDetails ? "📖" : "🔧"}</span>
          {showDetails ? "Hide" : "Debug"} Steps
        </button>

        <a
          href="https://console.firebase.google.com/project/chat-app-5209e/firestore/rules"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 rounded-lg bg-blue-500/80 px-3 py-2 text-xs transition-colors hover:bg-blue-500"
        >
          <span>🚀</span>
          Open Firebase
        </a>
      </div>

      {showDetails && (
        <div className="mt-4 space-y-3 text-xs">
          {/* Hộp hướng dẫn từng bước chi tiết */}
          <div className="rounded-lg bg-black/20 p-3">
            <p className="mb-2 font-semibold text-yellow-200">
              � URGENT: Fix Database Access
            </p>
            <ol className="list-inside list-decimal space-y-1 text-white/80">
              <li>Click "Open Firebase" button above</li>
              <li>Go to: Firestore Database → Rules</li>
              <li>Click "Copy New Rules" button below</li>
              <li>Replace ALL existing rules and Publish</li>
              <li>Wait 1-2 minutes for rules to take effect</li>
              <li>Refresh this page and try again</li>
            </ol>
          </div>

          {/* Nút copy Firebase security rules mới */}
          <button
            onClick={copyRules}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-500/80 px-3 py-2 font-medium transition-colors hover:bg-green-500"
          >
            <span>�</span>
            Copy NEW Firebase Rules (with full access)
          </button>

          {/* Cảnh báo về security trong production */}
          <div className="mt-2 text-center text-xs text-white/60">
            ⚠️ These rules include temporary full access for debugging. Remove
            the wildcard rule in production!
          </div>
        </div>
      )}
    </div>
  );
};

export default FirebaseSetupNotice;
