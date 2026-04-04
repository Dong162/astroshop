# Hướng Dẫn Triển Khai (Deploy) Dự Án Astro Lên Cloudflare Pages

Tài liệu này hướng dẫn chi tiết từng bước (cầm tay chỉ việc) để đưa dự án **Đông Tạp Hóa** lên internet sử dụng **Cloudflare Pages**. Cloudflare cung cấp tốc độ tải trang cực nhanh, miễn phí SSL, tính năng CDN mạnh mẽ và kết nối tự động với GitHub.

---

## 🛠 Giai đoạn 1: Chuẩn Bị Dự Án
Vì dự án Astro của chúng ta có sử dụng các biến tham số môi trường (Environment Variables) như Supabase URL hay thông tin Admin, chúng ta cần cài đặt Cloudflare Adapter cho dự án.

1. **Mở Terminal (Dấu nhắc lệnh) trong VS Code**
2. Cài đặt adapter của Cloudflare bằng lệnh sau (nhấn `y` - yes nếu được hỏi):
   ```bash
   npx astro add cloudflare
   ```
   *Lưu ý: Lệnh này sẽ tự động cập nhật file `astro.config.mjs` của bạn để cấu hình output cho Cloudflare.*

3. Mở file `astro.config.mjs` và tự kiểm tra. Nó nên trông giống thế này:
   ```javascript
   import { defineConfig } from "astro/config";
   import cloudflare from "@astrojs/cloudflare";

   export default defineConfig({
     output: "server", // hoặc có thể là "hybrid"
     adapter: cloudflare()
   });
   ```

---

## 🚀 Giai đoạn 2: Đẩy Code Lên GitHub
Cloudflare Pages sẽ theo dõi mã nguồn của bạn trên GitHub để tự động cập nhật website mỗi khi có thay đổi.

1. Tạo một Repository (Kho lưu trữ) mới trên [GitHub](https://github.com/).
2. Trong Terminal của VS Code, kiểm tra và đẩy code lên Github bằng cách chạy lần lượt các lệnh sau:
   ```bash
   git add .
   git commit -m "Chuẩn bị code để deploy lên Cloudflare"
   git branch -M main
   # Thay URL dưới đây bằng URL repo thực tế của bạn
   git remote add origin https://github.com/Dong162/astroshop.git
   git push -u origin main
   ```

---

## ☁️ Giai đoạn 3: Thiết Lập Trên Cloudflare

1. Đăng ký hoặc Đăng nhập vào [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Tại cột menu bên trái, chọn **Workers & Pages**.
3. Nhấp vào nút màu xanh **Create application** (Tạo ứng dụng), sau đó chuyển sang tab **Pages**.
4. Nhấp vào **Connect to Git** (Kết nối với Git).
5. Cloudflare sẽ yêu cầu bạn cấp quyền truy cập GitHub. Hãy đồng ý và chọn Repository mà bạn vừa push code lên ở Giai đoạn 2.
6. Tham số **Production branch** cứ để là `main`. Lướt xuống dưới và nhấn **Begin setup**.

---

## ⚙️ Giai đoạn 4: Cấu Hình Build & Biến Môi Trường (Quan trọng nhất)

Trên màn hình tiếp theo, bạn cần điền chính xác các thông số để Cloudflare hiểu cách dịch (build) dự án Astro:

1. **Build settings (Cài đặt build):**
   - **Framework preset:** Chọn `Astro`.
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`

2. **Environment variables (Biến môi trường - Cực kỳ quan trọng):**
   Mở file `.env` (hoặc `.env.example`) trên VS Code của bạn và copy các biến này dán vào Cloudflare (Bằng cách nhấn nút **Add variable**). Việc này sẽ giúp website có thể gọi API đến dữ liệu và Admin.
   
   - Variable name: `PUBLIC_SUPABASE_URL` | Value: *(Điền đường link supabase của bạn)*
   - Variable name: `PUBLIC_SUPABASE_ANON_KEY` | Value: *(Điền key supabase anon của bạn)*
   - Variable name: `PUBLIC_SUPABASE_ORDERS_TABLE` | Value: `astro_orders`
   - Variable name: `ADMIN_USERNAME` | Value: *(Điền tên đăng nhập admin)*
   - Variable name: `ADMIN_PASSWORD` | Value: *(Điền mật khẩu admin)*
   - Variable name: `ADMIN_SESSION_TTL_MINUTES` | Value: `480`

3. Nhấp vào nút **Save and Deploy** (Lưu và Triển khai).

---

## 🎉 Giai đoạn 5: Tận Hưởng Thành Quả

1. Cloudflare sẽ bắt đầu tải code của bạn về, chạy lệnh build cài tự động thiết lập môi trường. Quá trình này mất khoảng 1-2 phút.
2. Sau khi quá trình chạy xong báo Success, bạn sẽ nhận được một đường link hiển thị miễn phí dạng `https://ten-du-an.pages.dev`.
3. Bạn có thể bấm vào URL đó để xem website của mình đang chạy trực tiếp trên Internet.

### Khuyến nghị: Thêm Tên Miền Riêng (Custom Domain)
Nếu bạn đã mua tên miền (ví dụ: `dongtaphoa.vn`), bạn có thể thêm nó vào dễ dàng:
- Tại trang quản lý Project (Pages) vừa tạo xong, chuyển qua tab **Custom domains**.
- Chọn **Set up a custom domain** và nhập tên miền của bạn. Cloudflare sẽ hướng dẫn bạn tự động cấu hình các bản ghi DNS.

### Vòng đời bảo trì và cập nhật 
Tuyệt vời nhất là với những lần sau. Mỗi khi bạn đổi nội dung hay muốn sửa giá sản phẩm, thay vì mở Cloudflare thay đổi, bạn **CHỈ CẦN mở Terminal VS Code** gõ:
```bash
git add .
git commit -m "Cập nhật tính năng / nội dung mới"
git push
```
Cloudflare Pages sẽ tự thấy bạn có gửi bản cập nhật trên Github và tự build lại website trong nền cho khách hàng truy cập.
