# SQL Server

`001-schema.sql` là bản sao nguyên vẹn của tệp SQL người dùng cung cấp. Ứng dụng sử dụng trực tiếp 15 bảng và 3 view trong script này, không thay bằng MongoDB hoặc dữ liệu trong bộ nhớ.

## Khởi tạo bằng Docker

1. Sao chép `.env.example` ở thư mục gốc thành `.env`, đặt `SQL_PASSWORD` thành mật khẩu phát triển riêng có chữ hoa, chữ thường, số và ký tự đặc biệt.
2. Chạy `docker compose up -d sqlserver` tại thư mục gốc. Dịch vụ sử dụng SQL Server 2022 Developer; cổng chỉ được công bố trên `127.0.0.1:1433` và dữ liệu được giữ trong volume `sqlserver_data`.
3. Chuẩn bị `backend/.env` theo tệp mẫu của backend, dùng cùng mật khẩu SQL Server. Đặt `SQL_DATABASE=QuanLyPhanAnhHaTangDoThi`.
4. Tại `backend`, chạy `npm run db:init`, sau đó chạy `npm run db:seed` nếu cần dữ liệu minh họa.

`db:init` kết nối `master` để tạo CSDL nếu chưa có, sau đó thực thi các batch phân cách bằng `GO`. Script không xóa CSDL, không xóa bảng, không đặt lại người dùng và không ghi đè dữ liệu. Nếu schema đã đủ 15 bảng, script giữ nguyên các bản ghi và làm mới 3 view. Nếu phát hiện schema dở dang hoặc CSDL có bảng không thuộc dự án, script dừng để người vận hành kiểm tra.

Kiểm tra dịch vụ bằng `docker compose ps sqlserver`. Khi muốn tạm dừng mà vẫn giữ dữ liệu, dùng `docker compose stop sqlserver`; khởi động lại bằng `docker compose start sqlserver`. Không dùng tùy chọn xóa volume nếu cần giữ dữ liệu.

## Dùng SQL Server có sẵn

Có thể bỏ Docker và cấu hình `SQL_HOST`, `SQL_PORT`, `SQL_USER`, `SQL_PASSWORD`, `SQL_DATABASE` trong `backend/.env`. Tài khoản chạy khởi tạo cần quyền tạo CSDL (khi chưa có), bảng, view và chèn danh mục. Tài khoản ứng dụng triển khai thực tế nên được cấp quyền tối thiểu riêng.

Máy phát triển cục bộ có thể dùng `SQL_ENCRYPT=false`, `SQL_TRUST_SERVER_CERTIFICATE=true` như ví dụ. Với máy chủ triển khai, cấu hình chứng thư tin cậy, bật `SQL_ENCRYPT=true` và tắt `SQL_TRUST_SERVER_CERTIFICATE`; không công khai cổng SQL Server ra Internet.

## Dữ liệu minh họa

`db:seed` chỉ thêm các ID minh họa chưa tồn tại; chạy lại không đặt lại mật khẩu, không khôi phục trạng thái phản ánh và không sửa những bản ghi người dùng đã thay đổi. Dữ liệu gồm 20 phản ánh ở nhiều bước của quy trình, ảnh minh họa, lịch sử, phân công, tiến độ, kết quả, nghiệm thu, đánh giá, yêu cầu xem xét lại và thông báo.

| Vai trò | Email đăng nhập |
| --- | --- |
| Người dân | `citizen@dothiso.vn` |
| Cán bộ tiếp nhận | `intake@dothiso.vn` |
| Đơn vị xử lý giao thông (DV01) | `unit@dothiso.vn` |
| Cán bộ nghiệm thu | `inspector@dothiso.vn` |
| Quản trị viên | `admin@dothiso.vn` |

Mật khẩu minh họa mặc định: `DoThi@2026!`. Đây là tài khoản dành riêng cho chạy thử ở máy phát triển. Có thể đặt `DEMO_PASSWORD` trước lần seed đầu tiên để chọn mật khẩu khác; các mật khẩu được băm bcrypt trước khi lưu. Không chạy bộ seed trên dữ liệu triển khai. Script từ chối chạy khi `NODE_ENV=production` trừ khi có chủ ý đặt `ALLOW_DEMO_SEED=true`.

Ảnh `/demo/*.jpg` là ảnh minh họa giao diện và không phải bằng chứng về một sự cố thực tế. Phản ánh người dùng tạo sử dụng luồng tải ảnh riêng của backend.
