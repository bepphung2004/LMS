# 📋 HƯỚNG DẪN THIẾT LẬP SAU CÀI ĐẶT

## 1. Cài đặt Dependencies

Mở Command Prompt hoặc Terminal và chạy:

```bash
cd server
npm install
```

## 2. Cấu hình Email SMTP

Để gửi email thông báo khi duyệt/từ chối giảng viên, bạn cần cấu hình SMTP.

### Sử dụng Gmail:

1. **Bật xác thực 2 bước** tại: https://myaccount.google.com/security
2. **Tạo App Password** tại: https://myaccount.google.com/apppasswords
   - Chọn "Mail" và "Windows Computer"
   - Copy mật khẩu được tạo
3. **Cập nhật file `.env`**:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=xxxx xxxx xxxx xxxx  # App Password vừa tạo
   SMTP_FROM_NAME=LMS Platform
   ```

## 3. Tạo Admin User Đầu Tiên

### Bước 1: Lấy User ID từ Clerk

1. Đăng nhập vào hệ thống LMS bằng tài khoản muốn làm Admin
2. Vào Clerk Dashboard: https://dashboard.clerk.dev
3. Mục **Users** → Click vào user
4. Copy **User ID** (dạng `user_2xxxxxxxxxxxxx`)

### Bước 2: Cập nhật trong MongoDB

Dùng MongoDB Compass hoặc mongosh:

```javascript
// Kết nối database
use lms

// Cập nhật user thành admin
db.users.updateOne(
  { _id: "user_2xxxxxxxxxxxxx" },  // Thay bằng User ID thực
  { $set: { role: "admin" } }
)
```

### Bước 3: Cập nhật trong Clerk

1. Vào Clerk Dashboard → Users → Chọn user
2. Scroll xuống **"Public metadata"**
3. Click **Edit** và thêm:
   ```json
   {
     "role": "admin"
   }
   ```
4. Nhấn **Save**

### Bước 4: Đăng xuất và đăng nhập lại

Sau khi hoàn thành, đăng xuất khỏi hệ thống và đăng nhập lại. 
Bạn sẽ thấy nút **"Admin"** trên thanh navigation.

## 4. Khởi động Server

```bash
# Development
cd server
npm run server

# Production
npm start
```

## 5. Khởi động Client

```bash
cd client
npm run dev
```

---

## 🔗 Các URL quan trọng

- **Trang chủ:** http://localhost:5173
- **Admin Panel:** http://localhost:5173/admin
- **Đăng ký giảng viên:** http://localhost:5173/become-educator
- **Trang giảng viên:** http://localhost:5173/educator

---

## ❓ Troubleshooting

### Email không gửi được?
- Kiểm tra App Password có đúng không
- Đảm bảo đã bật 2FA cho Gmail
- Kiểm tra log server để xem lỗi chi tiết

### Admin không hiển thị?
- Đảm bảo đã cập nhật cả MongoDB và Clerk
- Đăng xuất và đăng nhập lại
- Clear cache browser

### Lỗi kết nối MongoDB?
- Kiểm tra MONGODB_URI trong .env
- Đảm bảo IP của bạn được whitelist trong MongoDB Atlas
