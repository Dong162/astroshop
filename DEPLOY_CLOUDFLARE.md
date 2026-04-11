# 🚀 Hướng Dẫn Triển Khai Đông Tạp Hóa (Full Step-by-Step)

Tài liệu này hướng dẫn bạn cách đưa website **Đông Tạp Hóa** từ máy tính cá nhân lên internet một cách chuyên nghiệp, sử dụng **Supabase** (Cơ sở dữ liệu) và **Cloudflare Pages** (Lưu trữ website).

---

## 🛠 Giai đoạn 1: Thiết lập Cơ sở dữ liệu (Supabase)

Để website có thể lưu đơn hàng và quản lý mã giảm giá, bạn cần một cơ sở dữ liệu.

1.  **Tạo tài khoản & Dự án**:
    - Truy cập [Supabase](https://supabase.com/) và đăng nhập.
    - Nhấn **New Project**, đặt tên (ví dụ: `dongtaphoa-db`) và lưu lại mật khẩu Database.
2.  **Chạy mã SQL (Tạo bảng)**:
    - Tại cột menu bên trái, chọn **SQL Editor**.
    - Nhấn **New query** và copy nội dung các file trong thư mục `supabase/sql` vào để chạy (nhấn nút **Run**):
        - Chạy file `create_astro_orders.sql` (Tạo bảng đơn hàng).
        - Chạy file `create_astro_vouchers.sql` (Tạo bảng mã giảm giá).
        - Chạy các file `enable_..._select.sql` để cấp quyền đọc dữ liệu cho website.
3.  **Lấy thông tin kết nối**:
    - Chọn **Project Settings** (biểu tượng bánh răng) -> **API**.
    - Lưu lại 2 giá trị: **Project URL** và **API Key (service_role)** hoặc **anon key**.

---

## ⚙️ Giai đoạn 2: Cấu hình mã nguồn & Biến môi trường

Trước khi đẩy code lên mạng, bạn cần thiết lập thông tin shop của mình.

1.  **Mở file `.env`** trong VS Code:
    - Điền URL và Key bạn vừa lấy từ Supabase vào:
        - `PUBLIC_SUPABASE_URL`: (Dán Project URL)
        - `PUBLIC_SUPABASE_ANON_KEY`: (Dán API Key)
    - Thiết lập thông tin Shop:
        - `PUBLIC_SITE_NAME`: "Đông Tạp Hóa" (Hoặc tên shop của bạn).
        - `PUBLIC_SITE_URL`: "https://ten-mien-cua-ban.vn" (Dùng cho SEO & Sitemap).
        - `PUBLIC_DEFAULT_SHIPPING_FEE`: `25000` (Phí ship mặc định).
    - Thiết lập Admin:
        - `ADMIN_USERNAME`: Tên đăng nhập để quản lý đơn hàng.
        - `ADMIN_PASSWORD`: Mật khẩu quản trị.

---

## 📦 Giai đoạn 3: Đẩy mã nguồn lên GitHub

Cloudflare sẽ tự động cập nhật web mỗi khi bạn thay đổi code trên GitHub.

1.  Tạo Repository mới trên [GitHub](https://github.com/).
2.  Mở Terminal trong VS Code và chạy các lệnh sau:
    ```bash
    git add .
    git commit -m "Hoàn thiện cấu hình SEO và Biến môi trường"
    git branch -M main
    # Thay link dưới bằng link repo GitHub của bạn
    git remote add origin https://github.com/USERNAME/REPO_NAME.git
    git push -u origin main
    ```

---

## ☁️ Giai đoạn 4: Triển khai lên Cloudflare Pages

1.  **Kết nối GitHub**:
    - Trên [Cloudflare Dashboard](https://dash.cloudflare.com/), chọn **Workers & Pages** -> **Create application** -> **Pages** -> **Connect to Git**.
    - Chọn repository bạn vừa push lên.
2.  **Cấu hình Build**:
    - **Framework preset**: Chọn `Astro`.
    - **Build command**: `npm run build`
    - **Build output directory**: `dist`
3.  **Nhập Biến môi trường (Cực kỳ quan trọng)**:
    - Trong mục **Environment variables**, bạn phải nhập **TẤT CẢ** các dòng có trong file `.env` của bạn vào đây.
    - Cloudflare cần những thông số này để kết nối với Database và hiển thị đúng tên shop của bạn.
4.  **Nhấn "Save and Deploy"**: Chờ khoảng 2 phút để website lên sóng.

---

## 🔍 Giai đoạn 5: Kiểm tra & Tối ưu SEO

Sau khi deploy xong, bạn sẽ có một đường link dạng `https://ten-du-an.pages.dev`.

1.  **Kiểm tra Sitemap**: Truy cập `đường-link-của-bạn/sitemap-index.xml`. Nếu thấy danh sách link sản phẩm thì SEO đã hoạt động.
2.  **Kiểm tra Robots.txt**: Truy cập `đường-link-của-bạn/robots.txt`.
3.  **Gắn tên miền riêng**:
    - Trong trang quản trị dự án trên Cloudflare, chọn tab **Custom domains**.
    - Nhập tên miền bạn đã mua (ví dụ: `dongtaphoa.vn`) và làm theo hướng dẫn tự động của Cloudflare.

---

## 💡 Lưu ý bảo trì

Mỗi khi bạn muốn thay đổi tên shop, phí ship hoặc cập nhật tính năng mới:
1. Sửa code hoặc file `.env` trên máy tính.
2. Mở terminal gõ: `git add .`, `git commit -m "update"`, `git push`.
3. Cloudflare sẽ tự thấy sự thay đổi và cập nhật website cho bạn sau 1 phút. Không cần thao tác gì thêm!
