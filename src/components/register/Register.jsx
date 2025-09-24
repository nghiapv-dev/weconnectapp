import { useState, useRef } from "react";
import { toast } from "react-toastify";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../lib/firebase";
import {
  doc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import upload from "../../lib/upload";

const Register = ({ onBackToLogin }) => {
  const [avatar, setAvatar] = useState({
    file: null,
    url: "",
    base64: "",
  });

  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const registerFormRef = useRef(null);

  // Function xử lý upload avatar
  const handleAvatar = (e) => {
    if (e.target.files[0]) {
      const file = e.target.files[0];

      // Tạo blob URL để preview
      const blobUrl = URL.createObjectURL(file);

      // Convert file thành base64 để backup trong localStorage
      const reader = new FileReader();
      reader.onload = (event) => {
        setAvatar({
          file: file,
          url: blobUrl,
          base64: event.target.result,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Function chính xử lý đăng ký tài khoản
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.target);

    const { username, email, password } = Object.fromEntries(formData);

    // Validation input fields cơ bản
    if (!username || !email || !password) {
      setLoading(false);
      return toast.warn("Vui lòng nhập tất cả các trường bắt buộc!");
    }

    if (username.length < 3) {
      setLoading(false);
      return toast.warn("Username phải có ít nhất 3 ký tự!");
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setLoading(false);
      return toast.warn(
        "Username chỉ có thể chứa chữ cái, số và dấu gạch dưới!",
      );
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setLoading(false);
      return toast.warn("Vui lòng nhập địa chỉ email hợp lệ!");
    }

    if (password.length < 6) {
      setLoading(false);
      return toast.warn("Mật khẩu phải có ít nhất 6 ký tự!");
    }

    // Kiểm tra username đã tồn tại chưa (với error handling)
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("username", "==", username));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        setLoading(false);
        return toast.warn("Username đã tồn tại! Vui lòng chọn tên khác.");
      }
    } catch (firestoreError) {
      console.log(
        "Xác thực tên người dùng không thành công, bỏ qua kiểm tra:",
        firestoreError,
      );
      toast.info(
        "Bỏ qua kiểm tra tính duy nhất của tên người dùng do quyền truy cập cơ sở dữ liệu",
      );
    }

    // Main registration process
    try {
      // Tạo Firebase Auth account
      const res = await createUserWithEmailAndPassword(auth, email, password);
      console.log("Tài khoản xác thực đã được tạo thành công:", res.user.uid);

      // Upload avatar hoặc dùng default
      let imgUrl = "./avatar.png";
      if (avatar.file) {
        try {
          imgUrl = await upload(avatar.file);
          console.log("Avatar đã được tải lên thành công:", imgUrl);
        } catch (uploadError) {
          console.log(
            "Tải lên avatar thất bại, sử dụng avatar mặc định:",
            uploadError,
          );
          toast.warn("Tải lên avatar thất bại, sử dụng avatar mặc định");
        }
      }

      // Lưu user data vào Firestore (với fallback localStorage)
      try {
        await setDoc(doc(db, "users", res.user.uid), {
          username,
          email,
          avatar: imgUrl,
          id: res.user.uid,
          blocked: [],
        });
        console.log("Dữ liệu người dùng đã được lưu vào Firestore thành công");

        // Backup vào localStorage
        const userData = {
          username: username,
          avatar: imgUrl,
        };
        localStorage.setItem(`user_${res.user.uid}`, JSON.stringify(userData));

        toast.success(
          "Tài khoản đã được tạo thành công! Đang chuyển hướng đến trang đăng nhập...",
        );
      } catch (firestoreError) {
        console.log("Firestore save error:", firestoreError);

        // Fallback: chỉ lưu vào localStorage với base64 avatar
        const userData = {
          username: username,
          avatar: avatar.base64 || avatar.url || "./avatar.png",
        };
        localStorage.setItem(`user_${res.user.uid}`, JSON.stringify(userData));

        toast.success("Tài khoản đã được tạo thành công!");
      }

      setRedirecting(true);

      // Clear form và reset avatar sau khi đăng ký thành công
      if (registerFormRef.current) {
        registerFormRef.current.reset();
      }
      setAvatar({ file: null, url: "", base64: "" });

      // Auto redirect về login page
      setTimeout(() => {
        onBackToLogin();
      }, 1500);
    } catch (err) {
      console.log("Registration error:", err);

      // Xử lý các loại lỗi Firebase Auth cụ thể
      if (err.code === "auth/email-already-in-use") {
        toast.error("Email này đã được đăng ký!");
      } else if (err.code === "auth/weak-password") {
        toast.error("Mật khẩu phải có ít nhất 6 ký tự!");
      } else if (err.code === "auth/invalid-email") {
        toast.error("Địa chỉ email không hợp lệ!");
      } else if (
        err.code === "permission-denied" ||
        err.message.includes("insufficient permissions")
      ) {
        toast.error(
          "Tài khoản đã được tạo thành công nhưng một số tính năng có thể bị hạn chế do quyền truy cập.",
        );
        setTimeout(() => {
          onBackToLogin();
        }, 2000);
      } else {
        toast.error(err.message || "Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
      if (!redirecting) {
        setRedirecting(false);
      }
    }
  };

  // Function quay lại trang login (clear form trước)
  const handleBackToLogin = () => {
    // Clear form và reset avatar trước khi quay lại login
    if (registerFormRef.current) {
      registerFormRef.current.reset();
    }
    setAvatar({ file: null, url: "" });
    onBackToLogin();
  };

  return (
    <div className="flex h-full w-full items-center justify-center">
      {/* Clean Register Form Container */}
      <div className="mx-auto w-full max-w-md">
        {/* Header tiêu đề */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold tracking-wider text-white uppercase">
            WE CONNECT
          </h1>
        </div>

        {/* Main Register Form với backdrop blur */}
        <div className="rounded-lg border border-gray-600 bg-black/70 p-8 shadow-2xl backdrop-blur-sm">
          <h2 className="mb-8 text-center text-2xl font-semibold text-white">
            Create Account
          </h2>

          <form
            ref={registerFormRef}
            onSubmit={handleRegister}
            className="space-y-6"
          >
            {/* Avatar Upload Section */}
            <div className="mb-6 flex flex-col items-center gap-4">
              <label
                htmlFor="file"
                className={`group relative ${loading || redirecting ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
              >
                <div className="h-20 w-20 overflow-hidden rounded-full border-4 border-gray-500 bg-gray-700 transition-all duration-300 group-hover:border-green-400">
                  <img
                    src={avatar.url || "./avatar.png"}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  {/* Hover overlay với plus icon */}
                  {!loading && !redirecting && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      <svg
                        className="h-6 w-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                        ></path>
                      </svg>
                    </div>
                  )}
                </div>
              </label>
              <span className="text-sm font-medium text-green-400">
                Tải ảnh lên
              </span>
              {/* Hidden file input */}
              <input
                type="file"
                id="file"
                style={{ display: "none" }}
                onChange={handleAvatar}
                disabled={loading || redirecting}
              />
            </div>

            {/* Username Input Field */}
            <div className="relative">
              <input
                type="text"
                name="username"
                placeholder="Username"
                required
                disabled={loading || redirecting}
                className="w-full rounded border border-gray-500 bg-transparent px-4 py-3 text-white placeholder-gray-400 transition-colors duration-200 focus:border-green-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              />
              {/* User icon */}
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

            {/* Email Input Field */}
            <div className="relative">
              <input
                type="email"
                name="email"
                placeholder="Email Address"
                required
                disabled={loading || redirecting}
                className="w-full rounded border border-gray-500 bg-transparent px-4 py-3 text-white placeholder-gray-400 transition-colors duration-200 focus:border-green-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              />
              {/* Email icon */}
              <div className="absolute top-1/2 right-3 -translate-y-1/2 transform">
                <svg
                  className="h-5 w-5 text-gray-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M14.243 5.757a6 6 0 10-.986 9.284 1 1 0 111.087 1.678A8 8 0 1118 10a3 3 0 01-4.8 2.401A4 4 0 1114 10a1 1 0 102 0c0-1.537-.586-3.07-1.757-4.243zM12 10a2 2 0 10-4 0 2 2 0 004 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>

            {/* Password Input Field */}
            <div className="relative">
              <input
                type="password"
                name="password"
                placeholder="Password"
                required
                disabled={loading || redirecting}
                className="w-full rounded border border-gray-500 bg-transparent px-4 py-3 text-white placeholder-gray-400 transition-colors duration-200 focus:border-green-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              />
              {/* Lock icon */}
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

            {/* Back to Login Link */}
            <div className="text-center text-sm">
              <button
                type="button"
                onClick={handleBackToLogin}
                disabled={loading || redirecting}
                className="cursor-pointer text-green-400 transition-colors hover:text-green-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Đã có tài khoản? Đăng nhập tại đây
              </button>
            </div>

            {/* Register Submit Button */}
            <button
              type="submit"
              disabled={loading || redirecting}
              className="w-full cursor-pointer rounded bg-green-600 py-3 font-semibold tracking-wide text-white uppercase transition-colors duration-200 hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {redirecting
                ? "Redirecting to login..."
                : loading
                  ? "Tạo tài khoản..."
                  : "ĐĂNG KÝ"}
            </button>
          </form>

          {/* Footer thông tin design */}
          {/* <div className="mt-8 text-center text-xs text-gray-500">
            <p>© 2017 Clean Register v</p>
            <p>
              Design By <span className="text-green-400">W3layouts</span>
            </p>
          </div> */}
        </div>
      </div>
    </div>
  );
};

export default Register;
