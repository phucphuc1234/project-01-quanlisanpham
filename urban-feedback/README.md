# Đô thị Kết nối

Ứng dụng quản lý phản ánh hạ tầng đô thị bằng **React.js + Node.js/Express + Microsoft SQL Server**. Giao diện tiếng Việt, frontend và backend tách thư mục; chức năng được triển khai theo 16 use case trong tài liệu đính kèm.

## Cấu trúc

```text
urban-feedback/
├── frontend/          # React, Vite, React Router, Leaflet, Recharts
│   └── src/
│       ├── components/
│       ├── lib/
│       └── pages/
├── backend/           # Express API, xác thực, phân quyền, nghiệp vụ
│   ├── src/
│   ├── scripts/       # Khởi tạo schema và dữ liệu mẫu
│   ├── public/demo/   # Hình minh họa mẫu, không phải ảnh hiện trường
│   └── storage/       # Ảnh người dùng được kiểm soát quyền truy cập
├── database/          # SQL gốc được giữ nguyên và hướng dẫn SQL Server
├── docs/              # Hợp đồng API, use case, kiến trúc, kiểm thử
├── scripts/           # Tạo cấu hình phát triển và tài nguyên minh họa
├── tests/             # Kiểm thử toàn luồng và giao diện
└── docker-compose.yml # SQL Server 2022 Developer + volume
```

## Chức năng

| Vai trò | Chức năng |
|---|---|
| Người dân | Đăng ký, đăng nhập bằng email/số điện thoại; gửi phản ánh kèm ảnh và vị trí; chọn vị trí trên bản đồ hoặc định vị; cảnh báo phản ánh trùng; theo dõi lịch sử, đánh giá, yêu cầu xem xét lại; thông báo |
| Cán bộ tiếp nhận | Xác minh/phân loại, từ chối kèm lý do, kiểm tra trùng, phân công đơn vị và hạn xử lý, xem xét yêu cầu mở lại |
| Đơn vị xử lý | Xem nhiệm vụ đúng đơn vị; tiếp nhận hoặc đề nghị trả lại; cập nhật tiến độ, ảnh minh chứng; gửi kết quả nghiệm thu |
| Cán bộ nghiệm thu | Kiểm tra ảnh và kết quả; chấp nhận hoặc yêu cầu làm lại; duyệt/từ chối yêu cầu xem xét lại |
| Quản trị viên | Quản lý danh mục, đơn vị và tài khoản; phân quyền; thống kê theo thời gian/loại/khu vực/đơn vị/trạng thái; biểu đồ và xuất CSV |
| Khách | Xem kết quả đã đóng, thống kê công khai; không xem danh tính người gửi, tọa độ chính xác, ảnh sự cố hay ghi chú nội bộ |

Luồng trạng thái chính:

```text
SUBMITTED → VERIFIED → ASSIGNED → IN_PROGRESS → WAITING_ACCEPTANCE → CLOSED
    └→ REJECTED                           ↑              └→ IN_PROGRESS (làm lại)
                                         │
CLOSED → phản hồi 1–2 sao → yêu cầu xem xét → REOPENED → ASSIGNED
```

## Yêu cầu

- Node.js 22.17 trở lên trong nhánh 22, hoặc Node.js 24 trở lên; khuyến nghị Node.js 24 LTS.
- Docker Engine/Desktop có Compose, máy x86-64 và tối thiểu khoảng 4 GB RAM trống cho SQL Server. Trên máy ARM, nên dùng một SQL Server x86-64 từ xa thay vì coi container SQL Server là được hỗ trợ sẵn.
- Hoặc SQL Server 2019/2022 có sẵn trên Windows/Linux: cấu hình kết nối ở `backend/.env`, không cần Docker.
- Bản đồ cần kết nối đến OpenStreetMap. Trình duyệt phải cấp quyền khi dùng nút định vị; vẫn có thể nhập tọa độ hoặc chọn vị trí bằng bản đồ.

## Chạy trên máy cá nhân

Mở terminal tại thư mục `urban-feedback`:

```bash
npm ci
npm run setup
docker compose up -d sqlserver
docker compose ps
```

`npm run setup` tạo `.env` và `backend/.env` nếu chưa có, sinh mật khẩu SQL và khóa JWT ngẫu nhiên cho **môi trường phát triển cục bộ**, giữ nguyên tệp cấu hình đã có. Không đưa hai tệp này lên Git hoặc gửi cho người khác.

Đợi dịch vụ `sqlserver` có trạng thái **healthy**, sau đó:

```bash
npm run db:init
npm run db:seed
npm run dev
```

Frontend chạy cổng **5173**, API chạy cổng **4000**. Vite chuyển tiếp `/api`, `/uploads`, `/demo` sang backend nên cookie được sử dụng cùng nguồn. `/api/health` trả 200 khi SQL Server sẵn sàng và 503 nếu không kết nối được. Máy chủ vẫn phục vụ giao diện khi SQL Server tạm thời mất kết nối, nhưng các thao tác dữ liệu sẽ báo lỗi rõ ràng.

`db:init` dùng đúng schema SQL người dùng cung cấp, tách batch `GO`, không DROP database. Chạy lại trên schema đầy đủ sẽ giữ dữ liệu và làm mới view. Nếu phát hiện schema không đầy đủ/không liên quan, lệnh dừng để tránh ghi đè.

`db:seed` bổ sung 20 phản ánh minh họa cùng lịch sử xử lý và 5 tài khoản thử nghiệm; chạy lại không ghi đè dữ liệu. Không chạy lệnh này trên dữ liệu vận hành thật. Không xóa volume nếu muốn giữ dữ liệu; `docker compose down` giữ volume, còn `down -v` xóa dữ liệu và không cần dùng trong quy trình thông thường.

### Dùng SQL Server sẵn có

Chạy `npm run setup`, sau đó sửa `backend/.env`:

```dotenv
SQL_HOST=127.0.0.1
SQL_PORT=1433
SQL_DATABASE=QuanLyPhanAnhHaTangDoThi
SQL_USER=ten_tai_khoan_sql
SQL_PASSWORD=nhap_mat_khau_cua_ban_tai_day
SQL_ENCRYPT=true
SQL_TRUST_SERVER_CERTIFICATE=false
```

Ví dụ trên dùng chứng chỉ SQL Server được máy khách tin cậy. Chỉ ở container phát triển cục bộ, cấu hình tạo tự động sử dụng `SQL_ENCRYPT=false` và `SQL_TRUST_SERVER_CERTIFICATE=true`. Tài khoản cần quyền tạo database/schema để chạy `db:init`; khi vận hành nên dùng tài khoản ứng dụng riêng chỉ có quyền dữ liệu cần thiết. Nếu dùng Windows SQL Server, bật TCP/IP và cho phép cổng cấu hình. Có thể nạp SQL gốc bằng SSMS với database sạch, rồi chạy `db:seed` nếu cần dữ liệu mẫu.

## Tài khoản thử nghiệm

Chỉ được tạo sau khi chạy `db:seed`. Mật khẩu dùng chung trong dữ liệu mẫu: **`DoThi@2026!`**.

| Email | Vai trò |
|---|---|
| `citizen@dothiso.vn` | Người dân |
| `intake@dothiso.vn` | Cán bộ tiếp nhận |
| `unit@dothiso.vn` | Đơn vị giao thông DV01 |
| `inspector@dothiso.vn` | Cán bộ nghiệm thu |
| `admin@dothiso.vn` | Quản trị viên |

Tài khoản đăng ký từ giao diện luôn là người dân; quản trị viên phân vai trò và đơn vị trong màn hình quản lý tài khoản.

## Kiểm thử

```bash
# Kiểm thử miền nghiệp vụ, phân quyền và ranh giới HTTP, không cần SQL Server
npm --prefix backend test

# Biên dịch frontend
npm run build

# Kiểm thử thực sự trên SQL Server đã khởi tạo/seed, API đang chạy cổng 4000
npm run test:integration

# Kiểm thử trình duyệt; frontend và backend đang chạy
npm run test:ui

# Quy trình giao diện thật qua 4 vai trò xử lý và tài khoản người dân
npm run test:ui:workflow
```

Kiểm thử tích hợp tạo tài khoản/phản ánh có tên kiểm thử trong database cấu hình; sử dụng một database thử nghiệm riêng nếu cần giữ dữ liệu phát triển sạch. Suite kiểm tra đăng ký/đăng nhập, ảnh giả, duplicate, quyền sở hữu, vòng đời xử lý, làm lại, phản hồi/mở lại, phân công lại, thông báo và danh mục. Không dùng SQLite/MongoDB hay mock database để thay SQL Server.

Xem [kết quả kiểm chứng](docs/VALIDATION.md) để phân biệt kiểm tra đã chạy với kiểm tra còn chờ dịch vụ.

## Bản build phục vụ từ backend

```bash
npm run build
npm start
```

Backend phục vụ thư mục `frontend/dist` cùng API trên cổng 4000. Để triển khai qua HTTPS, cấu hình `NODE_ENV=production`, `FRONTEND_URL`/`CORS_ORIGIN` đúng tên miền công khai, khóa JWT riêng, SQL được bảo vệ và chứng chỉ được tin cậy. Cookie production đặt `Secure`; không thử đăng nhập qua HTTP thường khi đã bật production. Cấu hình reverse proxy cùng nguồn cho frontend và API. Giữ nguyên ảnh tải lên và database khi nâng cấp.

## Bảo vệ dữ liệu

- Mật khẩu băm bcrypt; cookie JWT `HttpOnly`, `SameSite=Lax`, `Secure` khi production; kiểm tra tài khoản/vai trò/đơn vị đang hoạt động ở mỗi yêu cầu xác thực.
- Phân quyền thực thi tại API; không chỉ ẩn nút trên giao diện. Đơn vị chỉ thao tác nhiệm vụ thuộc đơn vị, người dân chỉ đánh giá/mở lại phản ánh của chính mình.
- Câu SQL có tham số, chuyển trạng thái trong transaction và khóa chống cập nhật đồng thời.
- Kiểm tra Origin cho yêu cầu thay đổi dữ liệu; giới hạn thử đăng nhập và kích thước request/tệp.
- Ảnh JPEG/PNG/WebP được kiểm tra chữ ký tệp, giải mã và mã hóa lại, bỏ EXIF/GPS. Tệp chưa công khai kiểm tra quyền truy cập.
- Công khai kết quả đã đóng; không trả danh tính người dân, tọa độ chính xác, ảnh sự cố, ghi chú nội bộ. Ảnh kết quả cần được người phụ trách rà soát trước khi nghiệm thu nếu có khuôn mặt/biển số hoặc thông tin cá nhân trong nội dung hình ảnh.

Tài liệu chi tiết: [API](docs/API-CONTRACT.md), [schema và use case](docs/schema-and-usecases.md), [SQL Server](database/README.md).
