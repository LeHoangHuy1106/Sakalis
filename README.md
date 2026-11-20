# SAKALIS · The Poetry Archive (Redesign 2026)

Thiết kế giao diện mới hoàn toàn, HTML/CSS/JS thuần, bốn trang:

- `index.html` — Trang chủ editorial.
- `list.html` — Kho thơ, tìm kiếm, lọc chủ đề, tập thơ, bookmark, sắp xếp và phân trang.
- `collection.html?type=collection` hoặc `?type=topic` — Các tập thơ / chủ đề.
- `detail.html?id=<id>&slug=<slug>` — Đọc bài, nhạc nền thủ công, chia sẻ, lưu thơ, YouTube (nếu có), đọc lật sách 3D và toàn màn hình.

## Dữ liệu và khả năng tương thích

Giữ nguyên chính xác 2 endpoint từ source gốc, tập trung ở `assets/js/data.js`:

1. Google Sheets CSV xuất bản công khai (dữ liệu bài thơ).
2. Google Apps Script View API `action=increment&id=<id>` (đếm lượt xem).

Hỗ trợ các tên cột song ngữ và dữ liệu CSV nhiều dòng với dấu `"` lồng nhau; id/slug, tập thơ, chủ đề, ngày, nội dung, views, image và YouTube. Giữ tương thích các đường dẫn từ website trước (`list.html?topic=...`, `list.html?collection=...`, `detail.html?id=...`). Giữ nguyên localStorage key `sakalis-bookmarks` và `sakalis-detail-reading-mode`.

Gồm lại flipbook 3D uốn giấy (24 dải) từ bản v2. Nhạc không autoplay.

## Cách chạy

Upload nguyên bộ thư mục lên hosting tĩnh HTTPS (GitHub Pages/Netlify/Vercel) hoặc chạy HTTP server tại thư mục này:

```bash
python -m http.server 8080
```

Mở `http://localhost:8080`. Không dùng `file://` vì website sử dụng ES modules. Google Fonts cần Internet, có fallback font hệ thống.

Trong trường hợp Google Sheets chưa xuất bản công khai, website sẽ hiển thị trạng thái lỗi thay vì dữ liệu giả. Để thay API trong tương lai, chỉ cần sửa `API` tại `assets/js/data.js`.
