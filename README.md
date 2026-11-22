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
