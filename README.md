# Sakalis v10.1 — Mini cover card

Bản cập nhật v10.1 tập trung sửa **thực sự** card thơ: **một mặt card 3:4 liền khối** dùng SVG generative, chữ và trích thơ nằm trực tiếp trên mặt bìa. Không còn layout ảnh trên/chữ dưới.

- `list.html`: card SVG dọc 3:4, hình và chữ cùng một bề mặt.
- `index.html`: mục thơ mới sử dụng cùng card bìa.
- `collection-detail.html`: tiếp tục dùng component mục lục riêng, nhưng được nâng cấp sang tranh SVG phủ toàn card.
- Giữ bìa sách các tập thơ, BNA, SPA, CSV Google Sheets, API tăng view, lưu bài, YouTube, chế độ thiệp thơ, header và hiệu ứng lá rụng.
- Không đổi các endpoint.

Giải nén rồi deploy **nội dung bên trong thư mục** lên Netlify, sao cho `index.html` ở thư mục gốc.
