SAKALIS - NÂNG CẤP TRANG DETAIL: ĐỌC LẬT TRANG 3D
===================================================

ĐÃ THÊM
- Chuyển giữa "Đọc thường" (giao diện cũ) và "Lật trang 3D".
- Giữ nguyên bài thơ lấy từ Google Sheets, không phải sửa dữ liệu.
- Tự ngắt nội dung thành các trang dựa trên kích thước màn hình.
- PC/tablet ngang: dạng sách mở hai trang; điện thoại: một trang.
- Lật bằng cách kéo/chạm mép giấy, nút Trước/Sau, phím trái/phải.
- Thanh chọn trang, bìa sách và trang kết thúc.
- Ghi nhớ chế độ đọc được chọn bằng localStorage (nếu có quyền).
- Có hiệu ứng 3D CSS và bóng đổ; không phụ thuộc CDN/plugin ngoài.

FILE ĐÃ SỬA
- detail.html
- assets/js/detail.js

FILE MỚI
- assets/js/detail-flipbook.js
- assets/css/detail-flipbook.css

TRIỂN KHAI
Upload toàn bộ thư mục như website cũ. Phục vụ qua HTTP(S)
(ví dụ GitHub Pages), không mở trang trực tiếp kiểu file://,
vì trang dùng JavaScript ES modules.

LƯU Ý
Hiệu ứng sử dụng CSS 3D cho tờ giấy, không phải bộ giả lập
uốn cong nhiều đoạn giấy chuyên dụng như FlipHTML5.
Trang sách được tạo từ nội dung bài thơ đang xem, không phải PDF.
