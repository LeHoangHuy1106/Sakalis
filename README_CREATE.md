# Sakalis Studio – Trang soạn thảo /create

## Mở trang
- Trên Netlify: `/create` hoặc `/create.html`.
- Mở `create.html` trực tiếp bằng trình duyệt (file://) cũng được vì JavaScript là script thuần, không dùng ES Module.
- Có thể dùng bản **Sakalis_Create_Standalone.html** chạy độc lập (CSS và JS nằm trong một HTML).

## Tính năng đã làm
- 13 bìa sách vector SVG (8 gốc + 5 mới) minh họa trực tiếp; chọn bìa, 8 bảng màu, tùy chỉnh độc lập màu nền và màu họa tiết.
- Tên tác phẩm, dòng giới thiệu và tác giả cập nhật trực tiếp trên bìa và trang viết.
- Trình soạn thảo `contenteditable`: in đậm, nghiêng, gạch dưới/gạch ngang, H2/H3, trích dẫn, danh sách số/ký hiệu, căn trái/giữa/phải, liên kết, đường ngang, font chữ, cỡ chữ, màu chữ, tô sáng, xóa định dạng, undo/redo.
- Chọn giấy ngà/trắng/xám/hồng; chỉnh cỡ chữ nội dung, giãn dòng, font chính; đếm từ và ký tự.
- Xem trước (khóa chỉnh sửa tạm thời), chế độ tập trung, giao diện PC/tablet/mobile.
- Bố cục thương hiệu Sakalis; đã thêm menu **Sáng tác** trên website.

## Không có trong bản này
- **Không lưu tự động, không nút lưu**, không upload nội dung, không đồng bộ, không đăng bài, không liên hệ backend hay API từ editor.
- Khi tải lại hoặc đóng trang, nội dung đang nhập có thể mất. Các API đọc thơ ở website cũ không bị chỉnh sửa.
- Font Google là lựa chọn tăng thẩm mỹ; khi không có mạng vẫn có font dự phòng của hệ thống.

## Triển khai trên Netlify
Giải nén ZIP, upload toàn bộ nội dung thư mục làm root site. File `_redirects` cho phép dùng `/create` thay vì `/create.html`.

## Kỹ thuật
HTML, CSS và JavaScript thuần, minh họa SVG inline, không framework, không cần server cho trình soạn thảo. `document.execCommand` được dùng để tương tác vùng chọn và lịch sử undo của trình duyệt; API này đã cũ nhưng vẫn hoạt động trên Chromium. Nếu phát triển thành sản phẩm có lưu trữ lâu dài, nên thay bằng editor engine như ProseMirror/Tiptap hoặc Lexical.
