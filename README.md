# SAKALIS — Literary Atelier v5

Trang web thơ **thuần HTML + CSS + JavaScript**, thiết kế theo phong cách tạp chí văn học đương đại. Không yêu cầu React, Vue, bundler hoặc Node trên máy chủ.

## Các trang

- `index.html`: mở đầu nghệ thuật với ảnh film đen trắng, bài thơ được chọn, tuyển tập bất đối xứng, thơ mới, bìa sách, cảm xúc, lưu bút.
- `list.html`: thư viện thơ với card 4 dạng (editorial ngang, ảnh bìa, trích thơ đậm màu, ấn phẩm chữ), tìm kiếm, lọc tập, lọc chủ đề, sắp xếp, đánh dấu và đọc thêm. Hỗ trợ URL `?collection=...`, `?topic=...`, `?filter=saved`.
- `collection.html?type=collection`: tủ sách, các tập thơ dựng dạng bìa sách vật thể 3D.
- `collection.html?type=topic`: tủ sách theo cảm xúc/chủ đề.
- `detail.html?id=<id>&slug=<slug>`: mặc định là **đọc thơ dạng cuộn**, hỗ trợ tăng/giảm chữ, lưu/chia sẻ, nhạc tự bật **đã tắt**, nhúng video YouTube khi cột `youtube` hợp lệ. Có thể chọn lật giấy 3D và bật toàn màn hình thủ công.
- `about.html`: trang lưu bút/về không gian đọc Sakalis, sử dụng những bài thơ có sẵn thay vì tự tạo tiểu sử tác giả.

## API và dữ liệu

**File `assets/js/data.js` giữ nguyên từ bản v4**, kể cả hai URL API Google Sheets CSV và Google Apps Script tăng lượt xem `action=increment`. Các trường ID, title, collection, topics, year, content, image, youtube được đọc và chuẩn hoá ở đây. Không thay endpoint hoặc hình thức đọc API.

- Bookmark local: `sakalis-bookmarks`
- Cỡ chữ local: `sakalis-font-size`
- CSV cache session 3 phút: `sakalis-poems-cache-v3`
- Nhạc nền có sẵn tại `assets/audio/background.mp3`, chỉ phát khi người dùng bấm biểu tượng tai nghe ở trang detail.
- Ảnh từ API, nếu không có sẽ dùng ảnh WebP trong `assets/images`.

## Chạy trực tiếp và deploy Netlify

1. Giải nén ZIP.
2. Kéo toàn bộ **nội dung của thư mục** lên Netlify. Đảm bảo `index.html`, `list.html`, `collection.html`, `detail.html`, `about.html` nằm tại thư mục gốc deploy.
3. Tải lại site bằng `Ctrl + Shift + R`. JS bundle dùng URL phiên bản `?v=5.0.0` để tránh tải cache cũ.
4. Có thể mở HTML qua `file://` vì bundle ở dạng classic script. Khi đó vẫn cần Internet và Google Sheets phải được chia sẻ công khai để lấy dữ liệu.

## Sửa code

- UI / cấu trúc trang: `assets/js/site.js`
- Styles: `assets/css/site.css`
- Bộ chuyển trang cong: `assets/js/detail-flipbook.js`, `assets/css/detail-flipbook.css`
- API / CSV: `assets/js/data.js`

Sau khi sửa JS, chạy `python build_bundle.py` để tạo lại `assets/js/site.bundle.js` (trình duyệt thực tế sử dụng file bundle này).

## Animation

Text reveal, parallax hero nhẹ, CSS morph, ảnh zoom khi hover, các khối hiện so le khi cuộn, dòng chữ chạy kiểu in ấn, lưu bài có pulse, chuyển trang ngắn. Tôn trọng `prefers-reduced-motion`.

## Tình trạng kiểm thử

Đã kiểm tra bằng Chromium với **CSV mô phỏng** ở viewport 1440×900, 815×960 và 390×844: trang chủ, thư viện, tập thơ, chi tiết khởi tạo không lỗi JS; tìm kiếm, hiển thị iframe YouTube, chọn chế độ flip, không tràn ngang. Đã kiểm tra trang lưu bút riêng ở 390×844. Kết nối API thật sau deploy Netlify chưa được xác nhận trong môi trường này.
