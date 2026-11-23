# SAKALIS — Literary Reader / SVG Atelier v9.0

## Những thay đổi chính

- Trang Detail: chế độ Đọc thơ thường mặc định, Thiệp thơ 3:4 ở dạng xấp giấy 3D, phiên bản mới hiển thị sẵn **nội dung của tờ phía sau** trước khi tờ trên cùng bị kéo. Vuốt trái/phải, mũi tên, thanh trang, phóng toàn màn hình.
- Thiệp lớn hơn, căn giữa trong khu đọc; trong toàn màn hình tự co theo cả chiều rộng và chiều cao của viewport để không bị cắt.
- Cả hai chế độ đọc dùng bộ tùy chọn font (FC-Gastie/Literata/Newsreader/Georgia/Be Vietnam Pro) và màu giấy (ngà/trắng/xám/hồng than/đen). Tùy chọn được ghi nhớ trong localStorage.
- Nút lưu bài dùng localStorage của trình duyệt, không gửi dữ liệu bookmark lên backend. Mở các bài đã lưu qua nút bookmark ở header.
- Nếu bài thơ thuộc một tập, cạnh trang đọc hiển thị mục lục của tập với bài đang đọc được đánh dấu. Trên mobile, mục lục xuất hiện bên dưới nội dung. Nút trước/sau đi trong tập khi có thể.
- YouTube được đặt vào khung video phong cách tạp chí, tỷ lệ chuẩn 16:9, nhúng không tự phát và có link xem trực tiếp trên YouTube.
- Bỏ Lưu bút khỏi header/footer và routing; header sticky trên PC/mobile; menu hamburger nằm sát phải mobile.
- 13 mẫu minh họa SVG: 8 mẫu đầu + 5 mẫu mới. Mẫu trên từng tập thơ xác định ổn định bằng tên tập, không đảo ngẫu nhiên giữa các lần xem. Bìa tập trong tủ sách và trong trang detail dùng chung SVG. Các ảnh minh họa mặc định cho bài thơ cũng được thay bằng SVG; ảnh được cung cấp trực tiếp từ Google Sheets vẫn được giữ.
- Editor /create: 13 mẫu bìa với tùy biến màu nền/màu nét như trước. Chưa tích hợp lưu nội dung soạn thảo, đúng phạm vi.

## API và SPA

- Google Sheets CSV và Apps Script tăng lượt xem giữ nguyên trong `assets/js/data.js`.
- SPA giữ cơ chế History API, CSV chỉ yêu cầu một lần mỗi tab, cache trong sessionStorage. Back/forward và deep link `.html` được giữ nguyên.
- HTML/CSS/JS thuần. `build_bundle.py` kết hợp data.js + cover-art.js + paper-stack.js + site.js thành file browser classic `site.bundle.js`.

## Cách triển khai

1. Giải nén ZIP, upload **nội dung bên trong thư mục** lên Netlify, có `index.html` ở root.
2. Dùng file FC-Gastie.otf mà bạn đã có, tự đặt vào `assets/fonts/FC-Gastie.otf` nếu muốn dùng font đó. Font không được đóng gói lại trong file giao này. Khi thiếu, site dùng fallback font.
3. Tải lại site bằng Ctrl+Shift+R. Phiên bản asset đã nâng lên `?v=9.0.0` để tránh cache CSS/JS cũ.

## Kiểm thử

- Chromium 1440×1000 và 390×844, CSV mô phỏng 4 bài trong một tập, 4 trang thiệp: chuyển trang, render trang phía sau, CSS tùy chỉnh, bìa SVG, menu mobile, full screen, sticky header, khung YouTube, mục lục tập thơ. Không phát sinh lỗi JavaScript từ ứng dụng trong kiểm thử.
- Chưa xác minh Google Sheets/API thật hoặc tương tác YouTube trên bản Netlify sau deploy.
