# 🌟 Đông Tạp Hóa - E-Commerce Platform

Bản phân phối nền tảng thương mại điện tử giao diện tiếng Việt hiện đại, tối ưu SEO, hiệu năng đạt ngưỡng 100/100 Lighthouse, và ứng dụng cơ chế bảo mật doanh nghiệp (Supabase JWT Auth).

## 📊 Đặc Tả Kỹ Thuật (Technical Specifications)

Dự án được xây dựng dựa trên nguyên lý **Jamstack** (Static-First), đem lại tốc độ siêu tốc và bảo mật dữ liệu cấp cao:

- **Core Framework**: [Astro](https://astro.build/) - Cấu hình SSG (Static Site Generation) mặc định. Các trang sản phẩm được render trước thành HTML tĩnh tại thời điểm build.
- **Ngôn ngữ**: TypeScript 100%, HTML5, Vanilla CSS (Không dùng Tailwind để kiểm soát chính xác từng hiệu ứng UI/UX). Mọi file `.astro` đều tuân thủ nguyên tắc đóng gói module.
- **Database & Authentication**: [Supabase](https://supabase.com/) (PostgreSQL).
  - Tích hợp **Supabase Auth** để quản trị phiên làm việc bằng JWT Access Token.
  - Áp dụng chặt chẽ **Row Level Security (RLS)** trên Database nhằm chặn 100% người ẩn danh đọc/ghi vào bảng Đơn hàng, Voucher.
- **Thiết kế UI/UX**:
  - Giao diện thân thiện thiết bị di động (Mobile-first).
  - Component giỏ hàng (Cart) và thanh toán (Checkout) dạng nổi, Sticky header chống tràn trên iOS.
  - Sử dụng hệ tiểu xảo hoạt ảnh siêu nhỏ (Micro-animations) và màu đa sắc (Gradients).
- **Trình Quản Trị (Admin Dashboard)**: Trang dashboard quản trị đơn hàng tích hợp liền mạch, giao diện phản hồi tức thì qua cơ chế SSR client-fetch kết hợp JWT header.
- **SEO Capability**: Tự động sinh `sitemap.xml`, `robots.txt`, tích hợp hệ thống dữ liệu có cấu trúc (JSON-LD: Product Schema, Rating, Price Valid Until, About). Các trường dữ liệu có khả năng chống XSS hoàn toàn.

---

## 🚀 Hướng Dẫn Triển Khai (Deployment Guide) - Cầm tay chỉ việc

Để đưa website này từ máy tính cá nhân lên internet (cho khách hàng vào mua sắm), bạn chỉ cần thao tác theo 5 Giai đoạn dưới đây:

### 🛠 Giai Đoạn 1: Thiết Lập Cơ Sở Dữ Liệu (Supabase)

Supabase sẽ là nơi lưu trữ Đơn đặt hàng và Danh sách Mã giảm giá của bạn.

1. **Tạo Dự Án**: 
   - Truy cập [Supabase](https://supabase.com/). Đăng nhập bằng Github.
   - Nhấn nút **New Project**, đặt tên (ví dụ: `dongtaphoa-db`), chọn khu vực "Singapore", tạo một mật khẩu mạnh và lưu dự án.
2. **Khởi tạo dữ liệu**:
   - Ở cột icon bên trái, nhấn vào menu **SQL Editor**. Chọn *New Query*.
   - Copy mã nguồn từ thư mục `supabase/` (Của thư mục chứa dự án này, hoặc nhờ AI sinh lại mã tạo bảng `astro_orders` và `astro_vouchers`) dán vào màn hình và nhấn **Run**.
3. **Cấu hình Bảo Mật Admin (Bắt buộc)**:
   - Truy cập menu **Authentication** (Hình ổ khóa bên trái) -> Chọn tab **Users** -> Nhấn **Add User** -> Điền Email và Password quản trị của bạn. Đây sẽ là tài khoản dùng để đăng nhập vào trang Quản lý đơn hàng.
   - Truy cập menu **Authentication** -> Chọn tab **Policies** (RLS). Đảm bảo 2 bảng `astro_orders` và `astro_vouchers` đều đã bật RLS. Xóa/Chặn mọi Rule cấp quyền *SELECT* cho Role *anon* (người lạ).
4. **Lấy API Key**:
   - Nhấn icon **Cài đặt** (Bánh răng dưới cùng cọc trái) -> Chọn **API**.
   - Copy giá trị ở mục **Project URL** và **Project API keys (anon / public)** để dùng cho Giai đoạn tiếp theo.

### ⚙️ Giai Đoạn 2: Cài Đặt Thông Số Website

Bạn phải nói cho mã nguồn website biết thông tin cửa hàng của bạn.

1. Mở file `.env` bằng phần mềm VS Code (Nằm ngoài cùng thư mục dự án. Nếu không thấy, copy file `.env.example` và đổi tên nó thành `.env`).
2. Tinh chỉnh các dòng cấu hình:
    ```ini
    PUBLIC_SITE_NAME="Tên Shop Của Bạn"
    PUBLIC_SITE_URL="https://tencuashopban.vn"
    PUBLIC_DEFAULT_SHIPPING_FEE="25000"
    ```
3. Cắm các mã lưu trữ từ Supabase vào:
    ```ini
    PUBLIC_SUPABASE_URL="https://xxxxxx.supabase.co"
    PUBLIC_SUPABASE_ANON_KEY="eyJ.........."
    ```

### 📦 Giai Đoạn 3: Đưa Code Lên Kho Chứa GitHub

Mã nguồn phải được đưa lên mạng để Cloudflare có thể tự động lấy và xuất bản.

1. Vào [GitHub](https://github.com/), chọn **New Repository**, đặt tên không dấu, không khoảng trắng (vd: `cua-hang-cua-toi`), bấm **Create repository**.
2. Không đóng tab đó, quay lại màn hình máy tính của bạn, mở terminal/CMD ở thư mục chứa code và gõ tuần tự 5 lệnh sau:
    ```bash
    git add .
    git commit -m "Phiên bản khởi tạo"
    git branch -M main
    git remote add origin https://github.com/TENCUABAN/cua-hang-cua-toi.git
    git push -u origin main
    ```
    *(Thay thế dòng link Github bằng link Github thật hệ thống vừa tạo cho bạn ở bước 1)*.

### ☁️ Giai Đoạn 4: Đẩy Web Lên Sóng Với Cloudflare Pages

Cloudflare sẽ phân phối web tốc độ cao hoàn toàn miễn phí.

1. Truy cập [Cloudflare Dash](https://dash.cloudflare.com/), đăng nhập / tạo tài khoản.
2. Chuyển sang menu **Workers & Pages** bên tay trái. Nhấn **Create application**, chọn tab **Pages**, rồi bấm **Connect to Git**.
3. Phân quyền cho Cloudflare đọc tài khoản Github của bạn, và chọn Repository `cua-hang-cua-toi` đã đẩy lên ở Giai đoạn 3.
4. **Cấu hình bản build**:
    - Build framework: Chọn `Astro`
    - Build command: `npm run build`
    - Build output directory: `dist`
5. **CẤU HÌNH BIẾN MÔI TRƯỜNG (SIÊU QUAN TRỌNG)**:
    - Ở màn hình trước khi nhấn Deploy, nhấn vào mũi tên **Environment variables (advanced)**. Nhấn **Add Variable**.
    - Bạn phải thêm thủ công TOÀN BỘ các dòng trong file `.env` ở Giai đoạn 2 lên cấu hình này của Cloudflare (Bên trái là phần trước dấu `=`, bên phải là nội dung text). *Ví dụ: Khung trái điền `PUBLIC_SITE_NAME`, khung phải điền `Tạp Hoá Chú 8`*.
    - Tổng cộng có khoảng 5 trường dữ liệu phải sao chép. Nếu quên bước này, Web sẽ trắng xóa!
6. Bấm **Save and Deploy**. Quay đi pha một ly cafe và đợi khoảng 1-2 phút. Xong! Web đã online trên mạng tại 1 địa chỉ miễn phí `https://cua-hang...pages.dev/`.

### 🔍 Giai Đoạn 5: Hoàn Thiện Tên Miền (Domain)

Địa chỉ Pages.dev mặc định nhìn hơi thiếu tự nhiên, bạn có thể biến nó thành tên miền xịn:

1. Chuyển sang tab **Custom domains** của dự án ứng dụng vừa chạy xong trên Cloudflare.
2. Bấm **Set up a custom domain**. Gõ tên miền gốc của bạn vào (ví dụ `dongtaphoa.com`). Cứ bấm Next Next. 
3. Nếu bạn mua miền ở Mắt Bão, Pavietnam, hay Namecheap, bạn chỉ việc về tổng đài tên miền đó, thay cặp "Nameservers (NS)" thành 2 dòng chữ mà Cloudflare yêu cầu `xxx.ns.cloudflare.com`.
4. Đợi từ 10 - 20 phút để Internet trỏ luồng, website của bạn đã có domain chính chủ!

---

💡 **Kinh Nghiệm Vận Hành**:
Bất cứ khi nào bạn chỉnh sửa giá sản phẩm, thêm sản phẩm mới hay sửa bài viết trong mã nguồn ở máy tính, bạn chỉ cần gõ 3 dòng lệnh cơ bản:
`git add .` -> `git commit -m "Update code"` -> `git push`
Cloudflare sẽ tự hiểu và lấy code mới cập nhật lên Web internet cho bạn ngay lập tức. Đừng lặp lại các thao tác cấu hình bên trên. Mọi thứ đã được quy hoạch hoàn toàn tự động!

---

### 🔔 Giai Đoạn 6: Tích Hợp Thông Báo Telegram (Tùy chọn)

Để nhận thông báo ngay lập tức trên điện thoại mỗi khi có khách đặt hàng mới mà không cần check Dashboard, bạn hãy làm theo các bước sau:

#### 1. Kích hoạt phần mở rộng HTTP
Vào mục **SQL Editor** trong Supabase, tạo một Query mới, dán lệnh này và nhấn **Run**:
```sql
CREATE EXTENSION IF NOT EXISTS pg_net;
```

#### 2. Tạo hàm gửi tin nhắn (SQL Function)
Cũng trong **SQL Editor**, dán đoạn mã dưới đây. 
**Lưu ý:** Thay thế `'YOUR_BOT_TOKEN'` và `'YOUR_CHAT_ID'` bằng thông tin của bạn.
```sql
CREATE OR REPLACE FUNCTION notify_telegram_orders()
RETURNS TRIGGER AS $$
DECLARE
  telegram_token TEXT := 'YOUR_BOT_TOKEN';
  chat_id TEXT := 'YOUR_CHAT_ID';
  message_text TEXT;
BEGIN
  -- Định dạng tin nhắn (Dựa trên cấu trúc bảng astro_orders)
  message_text := '🛍️ **CÓ ĐƠN HÀNG MỚI!**' || CHR(10) ||
                  '━━━━━━━━━━━━━━' || CHR(10) ||
                  '🆔 **Mã đơn:** ' || NEW.id || CHR(10) ||
                  '👤 **Khách hàng:** ' || COALESCE(NEW.customer_name, 'Không tên') || CHR(10) ||
                  '📞 **SĐT:** ' || COALESCE(NEW.customer_phone, 'N/A') || CHR(10) ||
                  '🏠 **Địa chỉ:** ' || COALESCE(NEW.shipping_address, 'N/A') || CHR(10) ||
                  '💰 **Tổng tiền:** ' || TO_CHAR(NEW.total, 'FM999,999,999') || 'đ' || CHR(10) ||
                  '📝 **Ghi chú:** ' || COALESCE(NEW.note, 'Trống') || CHR(10) ||
                  '⚙️ **Trạng thái:** ' || NEW.status;

  -- Gửi đến Telegram qua pg_net
  PERFORM net.http_post(
    url := 'https://api.telegram.org/bot' || telegram_token || '/sendMessage',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object(
      'chat_id', chat_id,
      'text', message_text,
      'parse_mode', 'Markdown'
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 3. Tạo Trigger kích hoạt
Dán lệnh này vào **SQL Editor** và nhấn **Run**:
```sql
CREATE TRIGGER trigger_send_order_to_telegram
AFTER INSERT ON public.astro_orders
FOR EACH ROW
EXECUTE FUNCTION notify_telegram_orders();
```

#### 4. Kiểm tra
Hãy thử thực hiện một đơn hàng trên website hoặc chèn trực tiếp một dòng vào bảng `astro_orders` trong **Table Editor**. Telegram sẽ gửi thông báo đầy đủ chi tiết đơn hàng cho bạn trong tích tắc!

---

💡 **Lưu ý về Biến số thay đổi**:
- **Table Name**: Dự án này sử dụng bảng `public.astro_orders`.
- **Fields**: Các trường dữ liệu như `shipping_address`, `total`, `note` đã được khớp chính xác với mã nguồn. Nếu bạn thay đổi cấu trúc Database, hãy cập nhật lại hàm `notify_telegram_orders`.
- **TOKEN & CHAT_ID**: Đây là thông tin bảo mật, tuyệt đối không chia sẻ công khai.
