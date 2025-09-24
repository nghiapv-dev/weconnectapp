const upload = async (file) => {
  // Cấu hình Cloudinary
  const cloudName = "dc92vz2t1"; // Tên cloud của Cloudinary
  const uploadPreset = "upload_image"; // Preset upload đã tạo sẵn

  // Tạo URL endpoint cho API Cloudinary
  const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

  // Tạo FormData để gửi file
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);

  console.log("Uploading to Cloudinary...");

  // Gửi request upload lên Cloudinary
  return fetch(url, {
    method: "POST",
    body: formData,
  })
    .then((response) => {
      console.log("Cloudinary response status:", response.status);
      return response.json();
    })
    .then((data) => {
      console.log("Cloudinary response data:", data);

      // Kiểm tra upload thành công và trả về URL
      if (data.secure_url) {
        console.log("Cloudinary upload success:", data.secure_url);
        return data.secure_url;
      } else {
        console.error("Cloudinary upload failed", data);
        throw new Error("Cloudinary upload failed");
      }
    });
};

export default upload;
