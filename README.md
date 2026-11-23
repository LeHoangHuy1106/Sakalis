# Sakalis v7.1 — Manuscript Paper Stack

- SPA HTML/CSS/JavaScript thuần, giữ endpoint Google Sheets và Apps Script, lưu bookmark cũ.
- Thư viện `list.html` dùng `archiveCard` riêng: lưới đồng cỡ, ảnh và nút bo mềm, hover/reveal.
- Chi tiết tập `collection-detail.html` dùng `chapterCard` độc lập: mục lục dạng card ngang, thứ tự riêng.
- Chi tiết thơ mặc định đọc thường; chế độ Xấp giấy chia tối đa 10 dòng thơ/trang, giữ khoảng cách khổ thơ, vuốt trái/phải, kéo chuột, phím mũi tên, slider và toàn màn hình. YouTube và nhạc bật thủ công vẫn giữ.
- CSV đọc một lần trong phiên, sử dụng bộ nhớ và sessionStorage; điều hướng SPA hỗ trợ deep link.

## Deploy
Giải nén và upload nội dung thư mục chứa index.html lên Netlify. Ctrl+Shift+R sau deploy.
Local: chạy `python -m http.server 8080` trong thư mục rồi mở http://localhost:8080/.
Nếu chỉnh source JS, chạy `python build_bundle.py` để tạo site.bundle.js.

## v7.1
- Chế độ Xấp giấy dùng tỷ lệ A4, không còn khung card nền xám; ẩn cột ảnh khi đọc, căn giữa xấp giấy.
- Tiêu đề chỉ ở trang đầu, chữ ký ở trang cuối, số trang nhỏ. Các dòng thơ dùng cùng cỡ chữ trong một tờ.
- Kiểm thử component đọc giấy trong Chromium với dữ liệu mô phỏng ở 1440px, 390px, 320px. Chưa kiểm thử bản deploy Netlify.

## v7.2 — Poetry Postcards
- Nội dung thơ thường và thiệp dùng FC Gastie do người dùng cung cấp, nhúng vào poetry-type.css. Font có glyph tiếng Việt dựng sẵn; nội dung chuẩn hóa NFC.
- Thiệp ngang trên PC, tỷ lệ gần dọc trên điện thoại, tối đa 6 dòng thơ (không tính khoảng nghỉ giữa khổ). Mỗi thiệp có viền, họa tiết thực vật, tem ảnh, tên bài và thứ tự.
- Vuốt, điều hướng, fullscreen, A+/A− và SPA giữ nguyên.

## v7.3 — Thiệp thơ dọc 3:4
- Đổi riêng các tờ thiệp ở chế độ xấp giấy sang **tỷ lệ 3:4 (rộng:cao)** đồng nhất trên PC, tablet, điện thoại và toàn màn hình. Không còn thiệp ngang PC hay gần vuông trên mobile.
- Căn lại viền trang trí, tem ảnh, tiêu đề, câu thơ và footer theo khổ dọc. Giữ nguyên font FC Gastie, 6 dòng/tờ, vuốt hai chiều, chế độ đọc thường và API.

### Font FC-Gastie
Font không được đóng gói lại. Để giữ font FC-Gastie, chép file FC-Gastie.otf của bạn vào `assets/fonts/` trước khi deploy, hoặc giữ nguyên `assets/css/poetry-type.css` từ source v7.2 đã dùng.


## v8 — Sakalis Studio /create
Trang soạn thảo độc lập tại create.html hoặc /create, 8 bìa SVG, màu tùy chọn, công cụ rich text, xem trước và chế độ tập trung. Chưa có lưu dữ liệu. Chi tiết trong README_CREATE.md.
