SAKALIS - DETAIL / FLIPBOOK 3D - BẢN CẬP NHẬT v2
================================================

CHỈNH SỬA v2
- GIỮ NGUYÊN bìa và trang kết thúc của bản trước.
- Thay cách xoay mặt phẳng 180 độ bằng trang giấy cong (24 dải 3D
  liên tục, có mặt trước/mặt sau, ánh sáng và bóng theo góc uốn).
- Lật bằng kéo góc giấy/chạm, nút Trước/Sau hoặc phím mũi tên.
- Nút "Toàn màn hình" trong thanh trên của chế độ flipbook.
  Có fallback toàn màn hình dạng overlay khi trình duyệt không hỗ trợ API.
- Thơ chia tối đa 10 dòng/trang. Nếu chiều cao màn hình quá ngắn
  sẽ chia ít dòng hơn, tránh cắt mất nội dung.
- Một dòng thơ từ Google Sheets luôn nằm trên một dòng giấy;
  tự điều chỉnh cỡ chữ và độ nén ngang với dòng quá dài.
- TẮT TỰ ĐỘNG PHÁT NHẠC: nhạc chỉ chạy khi người đọc bấm nút ♫.
- Giữ nguyên chế độ đọc thường, thanh chọn trang, tập dữ liệu Google
  Sheets và giao diện các trang còn lại.

FILE CHỈNH SỬA
- detail.html
- assets/css/detail-flipbook.css
- assets/js/detail-flipbook.js
- assets/js/detail-music.js

TRIỂN KHAI
Đưa toàn bộ nội dung file ZIP lên hosting tĩnh HTTP(S),
chẳng hạn GitHub Pages. Không mở detail.html bằng file://
vì website dùng ES modules và dữ liệu từ Google Sheets.

LƯU Ý KỸ THUẬT
Giấy được uốn bởi mesh CSS 3D nhiều dải, không phải thư viện
FlipHTML5. Giao diện căn theo desktop/mobile, nhưng hiệu ứng 3D
có thể khác nhau tùy trình duyệt/GPU. Trình phát nhạc không có autoplay.
