# Kết quả kiểm chứng

Các kiểm tra dưới đây đã chạy trực tiếp trên ứng dụng trong môi trường phát triển; không dùng mock API hoặc database thay thế.

| Hạng mục | Kết quả |
|---|---|
| Database | Microsoft SQL Server 2022, phiên bản `16.0.4305.5`, container healthy, API health HTTP 200 |
| Schema người dùng | Đã nạp đủ 15 bảng và 3 view; SHA-256 tệp SQL giữ nguyên `23bb85208933992b38d3c67a0872dd3e0b53da0c8c63993c4fabae4ee7a30ae6` |
| Khởi tạo lặp lại | `db:init` chạy lại giữ dữ liệu; `db:seed` chạy lại thêm 0 phản ánh thay vì nhân bản 20 bản ghi mẫu |
| Cài lại và khởi động lại | `scripts/cloud-install.sh` đã chạy thành công từ lockfile với cache ghi được trong workspace; tạo lại container từ digest cố định vẫn giữ đủ dữ liệu trong volume |
| Backend | `npm --prefix backend test`: 9/9 kiểm thử đạt |
| Tích hợp HTTP + SQL Server | `npm run test:integration`: 14/14 kiểm thử đạt, gồm kiểm thử cha và 13 nhóm kiểm tra bên trong |
| Trình duyệt công khai | `npm run test:ui`: 7/7 kiểm tra đạt, desktop/mobile không tràn ngang, điều hướng/biểu mẫu/bảo vệ trang hoạt động |
| Trình duyệt nghiệp vụ | `npm run test:ui:workflow`: 6/6 giai đoạn đạt với dữ liệu và thao tác UI thật; không có lỗi JavaScript |
| Quản trị và thống kê | Đăng nhập quản trị viên, tải trang báo cáo với biểu đồ cột/vòng từ dữ liệu SQL thật; bộ lọc, thống kê và danh mục API đã kiểm tra |
| Build React | `npm run build` thành công; trang chia bundle, bundle đầu khoảng 287 kB trước gzip; không có cảnh báo bundle quá giới hạn |
| Phục vụ bản build | Backend trả HTML và JavaScript của `frontend/dist`; API cùng nguồn trả kết quả đã đóng và che dữ liệu cá nhân |

## Những hành vi đã kiểm tra

- Đăng ký/đăng nhập và cookie, email/số điện thoại trùng, mật khẩu sai; khách không truy cập chức năng có quyền.
- Từ chối tệp giả ảnh; chấp nhận ảnh giải mã được và mã hóa lại; ảnh kết quả phải do tài khoản đang thao tác tải lên.
- Gửi phản ánh có tọa độ; phát hiện trùng cùng loại/phạm vi; yêu cầu xác nhận trước khi tiếp tục gửi.
- Tiếp nhận, phân loại, phân công đúng đơn vị và thời hạn tương lai; chặn bước xử lý sai trạng thái hoặc vai trò.
- Tiếp nhận nhiệm vụ, cập nhật tiến độ, gửi kết quả và ảnh, yêu cầu làm lại, gửi lại và nghiệm thu.
- Phản hồi chưa hài lòng, yêu cầu xem xét lại, duyệt mở lại, trả nhiệm vụ và phân công lại.
- Khách không thấy chủ sở hữu, tọa độ chính xác hoặc danh tính người gửi; tài khoản đơn vị khác không xem/thao tác nhiệm vụ không thuộc đơn vị.
- Thông báo đúng người nhận; phân trang và bộ lọc chưa đọc; đánh dấu đã đọc/toàn bộ.
- Quản lý danh mục và phân quyền; không cho đổi vai trò/khóa quản trị viên đang hoạt động cuối cùng.
- Trình duyệt thật nhập biểu mẫu, tải ảnh, chọn tọa độ, mở modal, gửi thao tác và đọc lại trạng thái `REOPENED` từ database.

## Giới hạn môi trường và phạm vi

- Quy trình trên là môi trường phát triển cục bộ, chưa triển khai một website công khai trên Internet hay xác nhận cấu hình production HTTPS.
- Trong cloud này, máy chủ ảnh bản đồ OpenStreetMap cần cho phép `a.tile.openstreetmap.org`, `b.tile.openstreetmap.org`, `c.tile.openstreetmap.org`. Các tên miền này đã được thêm vào bản nháp cấu hình; cần lưu và Publish trong cài đặt môi trường để áp dụng. Nếu ảnh bản đồ chưa tải, giao diện báo rõ và vẫn cho nhập tọa độ hoặc định vị. Không dùng ảnh bản đồ giả thay dịch vụ thật.
- Các kiểm thử tạo bản ghi có tên “Kiểm thử”/“Kiểm tra giao diện”. Đây là dữ liệu thử nghiệm trong database phát triển, không phải phản ánh của người dân thực tế. Ảnh trong `backend/public/demo` là minh họa tự tạo và có nhãn.
- Ảnh chụp kết quả nằm trong `test-results/` khi chạy lại kiểm thử. Một số ảnh đã được lưu ở [thư mục ảnh](screenshots/) để xem bố cục.

Lệnh cài đặt và khởi động dùng lại được đã lưu trong cấu hình môi trường; các bước không tự triển khai hay công khai dữ liệu. Khôi phục trong một cloud task mới vẫn cần khởi động lại các tiến trình theo hướng dẫn.
