import { useState, useRef } from "react";
import { toast } from "react-toastify";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import Register from "../register/Register";

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const loginFormRef = useRef(null); // Ref để reset form

  // Function xử lý đăng nhập
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Lấy dữ liệu từ form
    const formData = new FormData(e.target);
    const { email, password } = Object.fromEntries(formData);

    // Validation dữ liệu đầu vào
    if (!email || !password) {
      toast.error("Vui lòng điền vào tất cả các trường!");
      setLoading(false);
      return;
    }

    if (!email.includes("@")) {
      toast.error("Vui lòng nhập địa chỉ email hợp lệ!");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      toast.error("Mật khẩu phải có ít nhất 6 ký tự!");
      setLoading(false);
      return;
    }

    try {
      // Đăng nhập bằng Firebase Auth
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      console.log("Login success:", userCredential);
      console.log("User UID:", userCredential.user.uid);

      // Cập nhật trạng thái online trong Firestore
      try {
        const userRef = doc(db, "users", userCredential.user.uid);
        await updateDoc(userRef, { online: true });
        console.log("Online status updated successfully");
      } catch (firestoreError) {
        console.log("Firestore update error:", firestoreError);
      }
    } catch (err) {
      console.log("Login error:", err);

      // Xử lý các loại lỗi cụ thể từ Firebase Auth
      if (err.code === "auth/user-not-found") {
        toast.error("Không tìm thấy tài khoản với email này!");
      } else if (err.code === "auth/wrong-password") {
        toast.error("Mật khẩu không chính xác!");
      } else if (err.code === "auth/invalid-email") {
        toast.error("Địa chỉ email không hợp lệ!");
      } else if (err.code === "auth/invalid-credential") {
        toast.error(
          "Thông tin xác thực không hợp lệ. Vui lòng kiểm tra lại thông tin của bạn!",
        );
      } else if (err.code === "auth/too-many-requests") {
        toast.error(
          "Quá nhiều lần thử không thành công. Vui lòng thử lại sau.",
        );
      } else {
        toast.error(
          err.message || "Đăng nhập không thành công. Vui lòng thử lại.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Function chuyển sang form đăng ký
  const handleShowRegister = () => {
    // Clear login form trước khi chuyển sang register
    if (loginFormRef.current) {
      loginFormRef.current.reset();
    }
    setShowRegister(true);
  };

  // Function quay lại form đăng nhập
  const handleBackToLogin = () => {
    // Clear form khi quay lại từ register
    setShowRegister(false);
    setTimeout(() => {
      if (loginFormRef.current) {
        loginFormRef.current.reset();
      }
    }, 100);
  };

  // Render form đăng ký nếu đang ở chế độ register
  if (showRegister) {
    return <Register onBackToLogin={handleBackToLogin} />;
  }

  return (
    <div className="flex h-full w-full items-center justify-center">
      {/* Container chính của form login */}
      <div className="mx-auto w-full max-w-md">
        {/* Header tiêu đề */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold tracking-wider text-white uppercase">
            Clean Login Form
          </h1>
        </div>

        {/* Login Form Container với backdrop blur */}
        <div className="rounded-lg border border-gray-600 bg-black/70 p-8 shadow-2xl backdrop-blur-sm">
          <h2 className="mb-8 text-center text-2xl font-semibold text-white">
            Login Now
          </h2>

          {/* Form đăng nhập chính */}
          <form ref={loginFormRef} onSubmit={handleLogin} className="space-y-6">
            {/* Trường nhập email/username */}
            <div className="relative">
              <input
                type="text"
                name="email"
                placeholder="Username"
                className="w-full rounded border border-gray-500 bg-transparent px-4 py-3 text-white placeholder-gray-400 transition-colors duration-200 focus:border-blue-500 focus:outline-none"
              />
              <div className="absolute top-1/2 right-3 -translate-y-1/2 transform">
                <svg
                  className="h-5 w-5 text-gray-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>

            {/* Trường nhập password */}
            <div className="relative">
              <input
                type="password"
                name="password"
                placeholder="Password"
                className="w-full rounded border border-gray-500 bg-transparent px-4 py-3 text-white placeholder-gray-400 transition-colors duration-200 focus:border-blue-500 focus:outline-none"
              />
              <div className="absolute top-1/2 right-3 -translate-y-1/2 transform">
                <svg
                  className="h-5 w-5 text-gray-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>

            {/* Các link phụ: Forgot Password và Register */}
            <div className="flex justify-between text-sm">
              <a
                href="#"
                className="cursor-pointer text-green-400 transition-colors hover:text-green-300"
              >
                Quên mật khẩu?
              </a>
              <button
                type="button"
                onClick={handleShowRegister}
                className="cursor-pointer text-green-400 transition-colors hover:text-green-300"
              >
                Đăng ký tài khoản mới?
              </button>
            </div>

            {/* Nút đăng nhập */}
            <button
              type="submit"
              disabled={loading}
              className="w-full cursor-pointer rounded bg-white py-3 font-semibold tracking-wide text-black uppercase transition-colors duration-200 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Loading..." : "LOGIN"}
            </button>
          </form>

          {/* Phần đăng nhập bằng mạng xã hội */}
          <div className="mt-8">
            <p className="mb-4 text-center text-gray-400">
              Hoặc đăng nhập bằng
            </p>
            <div className="flex justify-center space-x-3">
              {/* Nút đăng nhập Facebook */}
              <button className="flex h-10 w-10 cursor-pointer items-center justify-center rounded bg-blue-600 transition-colors hover:bg-blue-700">
                <svg
                  className="h-5 w-5 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </button>

              {/* Nút đăng nhập Twitter */}
              <button className="flex h-10 w-10 cursor-pointer items-center justify-center rounded bg-blue-400 transition-colors hover:bg-blue-500">
                <svg
                  className="h-5 w-5 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                </svg>
              </button>

              {/* Nút đăng nhập Pinterest */}
              <button className="flex h-10 w-10 cursor-pointer items-center justify-center rounded bg-red-600 transition-colors hover:bg-red-700">
                <svg
                  className="h-5 w-5 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.977.115.16.432.12.661-.041.174-.137.135-.137.15-.461-.057-1.359-1.375-1.359-3.199 0-4.134 3.022-7.94 8.715-7.94 4.58 0 8.131 3.262 8.131 7.619 0 4.54-2.862 8.199-6.835 8.199-1.335 0-2.591-.695-3.023-1.522-.663 2.53-.822 2.84-1.342 4.288C7.116 22.988 9.423 24 12.017 24c6.624 0 11.99-5.367 11.99-11.987C24.007 5.367 18.641.001 12.017.001z" />
                </svg>
              </button>

              {/* Nút đăng nhập LinkedIn */}
              <button className="flex h-10 w-10 cursor-pointer items-center justify-center rounded bg-blue-700 transition-colors hover:bg-blue-800">
                <svg
                  className="h-5 w-5 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Footer với thông tin bản quyền */}
          {/* <div className="mt-8 text-center text-xs text-gray-500">
            <p>© 2017 Clean Logon v</p>
            <p>Design By <span className="text-green-400">W3layouts</span></p>
          </div> */}
        </div>
      </div>
    </div>
  );
};

export default Login;
