# Sakalis v10.1 — Mini cover card

Bản cập nhật v10.1 tập trung sửa **thực sự** card thơ: **một mặt card 3:4 liền khối** dùng SVG generative, chữ và trích thơ nằm trực tiếp trên mặt bìa. Không còn layout ảnh trên/chữ dưới.

- `list.html`: card SVG dọc 3:4, hình và chữ cùng một bề mặt.
- `index.html`: mục thơ mới sử dụng cùng card bìa.
- `collection-detail.html`: tiếp tục dùng component mục lục riêng, nhưng được nâng cấp sang tranh SVG phủ toàn card.
- Giữ bìa sách các tập thơ, BNA, SPA, CSV Google Sheets, API tăng view, lưu bài, YouTube, chế độ thiệp thơ, header và hiệu ứng lá rụng.
- Không đổi các endpoint.

Giải nén rồi deploy **nội dung bên trong thư mục** lên Netlify, sao cho `index.html` ở thư mục gốc.


## v10.2 (24/11/2026)
- Thư viện và bài thơ trên trang chủ: 4 card mỗi hàng trên PC (3 tablet ngang, 2 trên mobile), tỷ lệ 3:4.
- Dùng Literata cho tiêu đề bìa, sửa line-height và padding để bảo toàn dấu tiếng Việt.
- Hai câu thơ đầu được tách thành hai phần tử riêng, căn giữa theo chiều ngang, không thêm dấu phân tách hay ellipsis.
- Thư viện và danh sách trong tập thơ vẫn là hai component riêng. API, bookmark, SVG giữ nguyên.
