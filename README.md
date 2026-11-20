# Sakalis v4 · Quiet Poetry Edition

Thiết kế lại website thơ (HTML5, CSS3, vanilla JavaScript). Không có React, Vue, framework hoặc bước build bắt buộc.

## Trang
- `index.html`: thơ được tuyển chọn đầu trang, trích thơ thật từ Google Sheets, thơ mới, tập thơ, chủ đề.
- `list.html`: tìm bài, lọc tập thơ/chủ đề, sắp xếp, xem bài đã lưu.
- `collection.html?type=collection`: tủ sách với bìa tập thơ dạng vật thể 3D.
- `collection.html?type=topic`: đọc theo tâm trạng/chủ đề.
- `detail.html?id=<id>&slug=<slug>`: đọc thơ thường mặc định, chữ thân thiện và giữ câu thơ; lưu/chia sẻ; nhạc nền thủ công; YouTube nhúng trực tiếp (nếu cột youtube hợp lệ); chuyển sang 3D flipbook mềm có fullscreen.

## API
Giữ đúng hai endpoint có sẵn trong source cũ, trong `assets/js/data.js`:
- Google Sheets CSV: dùng để đọc tất cả thơ/tập/chủ đề/nội dung/video.
- Google Apps Script: ghi nhận lượt xem qua endpoint `action=increment`.

Giữ `sakalis-bookmarks` trong localStorage, và `sakalis-font-size`. Chế độ lật sách không được tự khôi phục, đọc thơ thường luôn mở trước. File audio có sẵn tại `assets/audio/background.mp3` và KHÔNG tự bật.

## Cách chạy
1. Upload toàn bộ **nội dung** thư mục vào Netlify. Đảm bảo `index.html` nằm ở thư mục gốc deploy.
2. Tải lại bằng Ctrl+Shift+R để xóa cache cũ.
3. Có thể mở trực tiếp `index.html` từ máy tính, vì website chạy `assets/js/site.bundle.js` dạng classic script. Tuy nhiên Google Sheets vẫn cần kết nối internet và quyền truy cập công khai.

Nguồn chỉnh sửa chính: `assets/js/site.js`, `assets/js/data.js`, `assets/js/detail-flipbook.js`, `assets/css/site.css`.
`site.bundle.js` là file đang dùng để chạy. Sau khi sửa JS, chạy `python build_bundle.py` để build lại thành một script độc lập không phụ thuộc vào module loader.

Font `Be Vietnam Pro` và `Literata` lấy từ Google Fonts khi có internet, không đóng gói font. Có font fallback khi không tải được.

## Kiểm tra
Kiểm tra bằng Chromium qua nạp trực tiếp HTML+CSS+bundle với dữ liệu CSV mô phỏng, viewport 1440x900 và 390x844: cả 4 trang khởi tạo, không có lỗi JS, không tràn ngang; tìm kiếm và hai chế độ đọc hoạt động; iframe YouTube hiển thị khi có URL hợp lệ, không autoplay.

Chưa xác minh kết nối API trực tiếp sau deploy Netlify vì môi trường thử nghiệm hạn chế truy cập web/file URL. Không thay đổi API endpoint nguồn.
