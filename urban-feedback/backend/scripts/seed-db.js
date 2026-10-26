import 'dotenv/config';
import sql from 'mssql';
import bcrypt from 'bcryptjs';

if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_SEED !== 'true') {
  throw new Error('Dữ liệu minh họa chỉ dành cho môi trường phát triển.');
}
if (!process.env.SQL_PASSWORD) throw new Error('Thiếu SQL_PASSWORD trong backend/.env.');

const pool = new sql.ConnectionPool({
  server: process.env.SQL_HOST || '127.0.0.1',
  port: Number(process.env.SQL_PORT || 1433),
  database: process.env.SQL_DATABASE || 'QuanLyPhanAnhHaTangDoThi',
  user: process.env.SQL_USER || 'sa',
  password: process.env.SQL_PASSWORD,
  options: {
    encrypt: process.env.SQL_ENCRYPT !== 'false',
    trustServerCertificate: process.env.SQL_TRUST_SERVER_CERTIFICATE === 'true',
    enableArithAbort: true,
  },
  requestTimeout: 60000,
});

async function query(text, params = {}, executor = pool) {
  const request = new sql.Request(executor);
  for (const [key, value] of Object.entries(params)) {
    if (value instanceof Date) request.input(key, sql.DateTime2(0), value);
    else request.input(key, value ?? null);
  }
  return request.query(text);
}

const DAY = 86400000;
const now = Date.now();
const ago = days => new Date(now - days * DAY);
const accounts = [
  { id: 'NDDEMO01', role: 'VT01', name: 'Nguyễn Minh Anh', email: 'citizen@dothiso.vn', phone: '0900000001', unit: null },
  { id: 'NDDEMO02', role: 'VT02', name: 'Trần Thanh Hà', email: 'intake@dothiso.vn', phone: '0900000002', unit: null },
  { id: 'NDDEMO03', role: 'VT03', name: 'Lê Quốc Huy', email: 'unit@dothiso.vn', phone: '0900000003', unit: 'DV01' },
  { id: 'NDDEMO04', role: 'VT04', name: 'Phạm Thu Trang', email: 'inspector@dothiso.vn', phone: '0900000004', unit: null },
  { id: 'NDDEMO05', role: 'VT05', name: 'Đỗ Hoàng Nam', email: 'admin@dothiso.vn', phone: '0900000005', unit: null },
];

// Local demonstration data. IDs and emails are stable so rerunning the command
// never resets a password or overwrites records changed through the application.
const reports = [
  { id: 'PADEMO0001', title: 'Khắc phục ổ gà trên đường Lê Lợi', description: 'Mặt đường xuất hiện ổ gà sau mưa, gây khó khăn cho người đi xe máy. Đề nghị kiểm tra và sửa chữa để bảo đảm an toàn giao thông.', address: 'Đường Lê Lợi, phường Bến Nghé, Quận 1, TP. Hồ Chí Minh', lat: 10.7757, lng: 106.7012, category: 'LPA01', status: 'CLOSED', priority: 'HIGH', days: 12, unit: 'DV01', image: 'road', rating: 5 },
  { id: 'PADEMO0002', title: 'Đèn chiếu sáng đường Nguyễn Thị Minh Khai đã hoạt động', description: 'Cụm đèn chiếu sáng công cộng ngừng hoạt động vào buổi tối, khu vực có đông người đi bộ. Mong đơn vị phụ trách sớm thay thế thiết bị.', address: 'Đường Nguyễn Thị Minh Khai, phường Đa Kao, Quận 1, TP. Hồ Chí Minh', lat: 10.7884, lng: 106.6951, category: 'LPA02', status: 'CLOSED', priority: 'NORMAL', days: 8, unit: 'DV02', image: 'light', rating: 5 },
  { id: 'PADEMO0003', title: 'Điểm tập kết rác tự phát đã được dọn sạch', description: 'Rác sinh hoạt tồn đọng nhiều ngày ở góc đường, gây mùi hôi và ảnh hưởng sinh hoạt của người dân. Đề nghị thu gom và vệ sinh khu vực.', address: 'Đường Cô Bắc, phường Cô Giang, Quận 1, TP. Hồ Chí Minh', lat: 10.7625, lng: 106.6932, category: 'LPA03', status: 'CLOSED', priority: 'NORMAL', days: 5, unit: 'DV03', image: 'waste', rating: 4 },
  { id: 'PADEMO0004', title: 'Thông thoáng miệng cống, giảm ngập sau mưa', description: 'Miệng cống bị bùn và lá cây che kín, nước rút chậm sau các trận mưa. Nhờ đơn vị phụ trách nạo vét và kiểm tra khả năng thoát nước.', address: 'Đường Võ Văn Tần, phường 6, Quận 3, TP. Hồ Chí Minh', lat: 10.7771, lng: 106.6896, category: 'LPA04', status: 'CLOSED', priority: 'HIGH', days: 3, unit: 'DV01', image: 'flood', rating: 5 },
  { id: 'PADEMO0005', title: 'Sơn lại vạch qua đường trước cổng trường', description: 'Vạch sang đường trước cổng trường đã mờ, học sinh di chuyển khó quan sát. Đề nghị sơn lại và bổ sung biển báo cần thiết.', address: 'Đường Nguyễn Du, phường Bến Nghé, Quận 1, TP. Hồ Chí Minh', lat: 10.7793, lng: 106.6985, category: 'LPA01', status: 'CLOSED', priority: 'NORMAL', days: 18, unit: 'DV01', image: 'road', rating: 4 },
  { id: 'PADEMO0006', title: 'Thay bóng đèn tại công viên Lê Văn Tám', description: 'Một số bóng đèn trên lối đi bộ không sáng, khiến khu vực thiếu ánh sáng vào buổi tối. Mong được kiểm tra và thay bóng phù hợp.', address: 'Công viên Lê Văn Tám, phường Đa Kao, Quận 1, TP. Hồ Chí Minh', lat: 10.7875, lng: 106.6959, category: 'LPA02', status: 'CLOSED', priority: 'NORMAL', days: 22, unit: 'DV02', image: 'light', rating: 5 },
  { id: 'PADEMO0007', title: 'Mặt đường sụt lún gần ngã tư Hàm Nghi', description: 'Phát hiện vị trí mặt đường sụt lún, nước đọng và xe máy thường tránh đột ngột. Kính đề nghị khảo sát, đặt cảnh báo và xử lý sớm.', address: 'Đường Hàm Nghi, phường Nguyễn Thái Bình, Quận 1, TP. Hồ Chí Minh', lat: 10.7712, lng: 106.7011, category: 'LPA01', status: 'SUBMITTED', priority: 'HIGH', days: 0.2, unit: 'DV01', image: 'road' },
  { id: 'PADEMO0008', title: 'Cống thoát nước bị tắc tại đường Trần Quốc Thảo', description: 'Nước tràn lên vỉa hè khi mưa lớn, nghi ngờ đường ống thoát nước bị tắc. Đề nghị kiểm tra hệ thống cống và khơi thông dòng chảy.', address: 'Đường Trần Quốc Thảo, phường 9, Quận 3, TP. Hồ Chí Minh', lat: 10.7853, lng: 106.6821, category: 'LPA04', status: 'VERIFIED', priority: 'HIGH', days: 1, unit: 'DV01', image: 'flood' },
  { id: 'PADEMO0009', title: 'Thu gom rác tại hẻm Nguyễn Trãi', description: 'Một điểm rác nhỏ tại đầu hẻm chưa được thu gom, cản trở lối đi và ảnh hưởng cảnh quan. Nhờ đơn vị môi trường lên lịch xử lý.', address: 'Hẻm đường Nguyễn Trãi, phường Nguyễn Cư Trinh, Quận 1, TP. Hồ Chí Minh', lat: 10.7622, lng: 106.6827, category: 'LPA03', status: 'ASSIGNED', priority: 'NORMAL', days: 2, unit: 'DV03', image: 'waste' },
  { id: 'PADEMO0010', title: 'Biển báo giao thông bị nghiêng trên đường Pasteur', description: 'Biển báo tại giao lộ bị nghiêng sau mưa gió, chân trụ chưa chắc chắn. Đề nghị gia cố và kiểm tra để tránh nguy hiểm cho người đi đường.', address: 'Đường Pasteur, phường Võ Thị Sáu, Quận 3, TP. Hồ Chí Minh', lat: 10.7844, lng: 106.6919, category: 'LPA01', status: 'ASSIGNED', priority: 'HIGH', days: 2, unit: 'DV01', image: 'road' },
  { id: 'PADEMO0011', title: 'Nắp hố ga hư hỏng tại đường Điện Biên Phủ', description: 'Nắp hố ga bị nứt và phát ra tiếng động khi xe chạy qua. Vị trí gần lối qua đường, cần kiểm tra và thay thế để bảo đảm an toàn.', address: 'Đường Điện Biên Phủ, phường Đa Kao, Quận 1, TP. Hồ Chí Minh', lat: 10.7912, lng: 106.6985, category: 'LPA01', status: 'IN_PROGRESS', priority: 'URGENT', days: 4, unit: 'DV01', image: 'road' },
  { id: 'PADEMO0012', title: 'Sửa hệ thống đèn tại đường Hai Bà Trưng', description: 'Đèn đường chập chờn nhiều đêm liên tiếp. Người dân mong đơn vị chuyên môn kiểm tra đường dây và thay thế thiết bị hư hỏng.', address: 'Đường Hai Bà Trưng, phường Tân Định, Quận 1, TP. Hồ Chí Minh', lat: 10.7937, lng: 106.6898, category: 'LPA02', status: 'WAITING_ACCEPTANCE', priority: 'NORMAL', days: 6, unit: 'DV02', image: 'light' },
  { id: 'PADEMO0013', title: 'Nội dung gửi nhầm lĩnh vực xử lý', description: 'Phản ánh liên quan đến dịch vụ vận chuyển của doanh nghiệp, không thuộc nhóm sự cố hạ tầng đô thị công cộng.', address: 'Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh', lat: 10.779, lng: 106.699, category: 'LPA05', status: 'REJECTED', priority: 'LOW', days: 2, unit: 'DV01', image: 'road' },
  { id: 'PADEMO0014', title: 'Xem xét lại chất lượng vá mặt đường Nguyễn Đình Chiểu', description: 'Mặt đường đã được vá nhưng vẫn xuất hiện vết lõm khi mưa. Đề nghị đơn vị chuyên môn đánh giá lại chất lượng và xử lý triệt để.', address: 'Đường Nguyễn Đình Chiểu, phường 5, Quận 3, TP. Hồ Chí Minh', lat: 10.7813, lng: 106.6855, category: 'LPA01', status: 'REOPENED', priority: 'HIGH', days: 18, unit: 'DV01', image: 'road', rating: 2, reopen: 'APPROVED' },
  { id: 'PADEMO0015', title: 'Kiểm tra lại vỉa hè vừa sửa tại đường Nam Kỳ Khởi Nghĩa', description: 'Đoạn vỉa hè đã sửa nhưng một số viên gạch chưa bằng phẳng. Mong được kiểm tra lại để người lớn tuổi và trẻ nhỏ đi lại thuận tiện.', address: 'Đường Nam Kỳ Khởi Nghĩa, phường Võ Thị Sáu, Quận 3, TP. Hồ Chí Minh', lat: 10.7868, lng: 106.6851, category: 'LPA01', status: 'CLOSED', priority: 'NORMAL', days: 9, unit: 'DV01', image: 'road', rating: 2, reopen: 'PENDING' },
  { id: 'PADEMO0016', title: 'Khắc phục đoạn đường đọng nước kéo dài', description: 'Mặt đường thấp gây đọng nước dù mưa đã tạnh, ảnh hưởng giao thông. Đề nghị khảo sát cao độ và bổ sung giải pháp thoát nước.', address: 'Đường Bàn Cờ, phường 3, Quận 3, TP. Hồ Chí Minh', lat: 10.7685, lng: 106.6797, category: 'LPA01', status: 'IN_PROGRESS', priority: 'HIGH', days: 9, unit: 'DV01', image: 'flood', overdue: true },
  { id: 'PADEMO0017', title: 'Cành cây gãy chắn một phần lối đi công cộng', description: 'Cành cây gãy sau mưa nằm sát lối đi, người dân đã đặt vật cảnh báo tạm thời. Nhờ đơn vị kiểm tra, thu dọn và bảo đảm an toàn khu vực.', address: 'Đường Nguyễn Bỉnh Khiêm, phường Bến Nghé, Quận 1, TP. Hồ Chí Minh', lat: 10.7881, lng: 106.7041, category: 'LPA03', status: 'SUBMITTED', priority: 'URGENT', days: 0.4, unit: 'DV03', image: 'waste' },
  { id: 'PADEMO0018', title: 'Hoàn thành sửa mặt đường trước nhà văn hóa', description: 'Đoạn đường trước nhà văn hóa bị bong tróc, trơn trượt sau mưa. Đề nghị sửa chữa để người dân tham gia sinh hoạt cộng đồng an toàn.', address: 'Đường Cách Mạng Tháng Tám, phường 6, Quận 3, TP. Hồ Chí Minh', lat: 10.7789, lng: 106.6826, category: 'LPA01', status: 'WAITING_ACCEPTANCE', priority: 'NORMAL', days: 7, unit: 'DV01', image: 'road' },
  { id: 'PADEMO0019', title: 'Mặt đường trước chợ đã được sửa chữa', description: 'Đường trước chợ xuống cấp, nhiều điểm trũng ảnh hưởng người dân đi lại. Đơn vị phụ trách đã khảo sát và hoàn tất sửa chữa.', address: 'Khu vực chợ Bến Thành, phường Bến Thành, Quận 1, TP. Hồ Chí Minh', lat: 10.7722, lng: 106.698, category: 'LPA01', status: 'CLOSED', priority: 'NORMAL', days: 52, unit: 'DV01', image: 'road', rating: 5 },
  { id: 'PADEMO0020', title: 'Vệ sinh khu vực công cộng ven kênh', description: 'Rác thải tồn đọng ven kênh đã được thu gom, đồng thời bổ sung lịch vệ sinh định kỳ nhằm giữ gìn cảnh quan đô thị.', address: 'Kênh Nhiêu Lộc, phường 7, Quận 3, TP. Hồ Chí Minh', lat: 10.7894, lng: 106.6789, category: 'LPA03', status: 'CLOSED', priority: 'NORMAL', days: 80, unit: 'DV03', image: 'waste', rating: 4 },
];

let inserted = 0;
try {
  await pool.connect();
  const schema = await query("SELECT OBJECT_ID('dbo.PhanAnh', 'U') AS id");
  if (!schema.recordset[0].id) throw new Error('Chưa có schema. Chạy npm run db:init trước.');
  const hash = await bcrypt.hash(process.env.DEMO_PASSWORD || 'DoThi@2026!', 12);
  const userIds = {};
  for (const account of accounts) {
    await query(`IF NOT EXISTS (SELECT 1 FROM dbo.NguoiDung WHERE Email=@email OR MaNguoiDung=@id)
      INSERT dbo.NguoiDung(MaNguoiDung,MaVaiTro,MaDonVi,HoTen,Email,SoDienThoai,MatKhau,DiaChi,TrangThai,NgayTao)
      VALUES(@id,@role,@unit,@name,@email,@phone,@hash,@address,1,@created)`,
    { ...account, hash, address: 'TP. Hồ Chí Minh', created: ago(120) });
    const found = await query('SELECT MaNguoiDung,MaVaiTro FROM dbo.NguoiDung WHERE Email=@email', { email: account.email });
    if (!found.recordset.length) throw new Error(`ID tài khoản minh họa bị trùng: ${account.id}. Không ghi đè dữ liệu.`);
    userIds[account.role] = found.recordset[0].MaNguoiDung;
  }

  for (const report of reports) {
    const transaction = new sql.Transaction(pool);
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    try {
      const exists = await query('SELECT MaPhanAnh FROM dbo.PhanAnh WITH (UPDLOCK,HOLDLOCK) WHERE MaPhanAnh=@id', { id: report.id }, transaction);
      if (exists.recordset.length) { await transaction.commit(); continue; }
      const created = ago(report.days);
      const at = fraction => new Date(created.getTime() + (now - created.getTime()) * fraction);
      const short = report.id.slice(2);
      const image = `/demo/${report.image}.jpg`;
      const afterImage = '/demo/completed.jpg';
      const finalWasClosed = report.status === 'CLOSED' || report.status === 'REOPENED';
      const hasAssigned = ['ASSIGNED','IN_PROGRESS','WAITING_ACCEPTANCE','CLOSED','REOPENED'].includes(report.status);
      const hasStarted = ['IN_PROGRESS','WAITING_ACCEPTANCE','CLOSED','REOPENED'].includes(report.status);
      const hasResult = ['WAITING_ACCEPTANCE','CLOSED','REOPENED'].includes(report.status);
      const due = report.overdue ? ago(2) : new Date(at(.2).getTime() + 7 * DAY);
      const rejection = report.status === 'REJECTED' ? 'Nội dung không thuộc phạm vi phản ánh hạ tầng đô thị. Vui lòng liên hệ đơn vị cung cấp dịch vụ.' : null;

      await query(`INSERT dbo.PhanAnh(MaPhanAnh,MaNguoiDung,MaLoai,TieuDe,NoiDung,ViTri,ToaDo,NgayGui,TrangThai,MucDoUuTien,LyDoTuChoi)
        VALUES(@id,@owner,@category,@title,@description,@address,@coordinates,@created,@status,@priority,@rejection)`,
      { ...report, owner: userIds.VT01, coordinates: `${report.lat},${report.lng}`, created, rejection }, transaction);
      await query(`INSERT dbo.HinhAnhPhanAnh(MaHinhAnh,MaPhanAnh,DuongDan,MoTa,LoaiAnh,ThoiGianTao)
        VALUES(@id,@report,@image,N'Ảnh minh họa sự cố hạ tầng đô thị','SU_CO',@created)`,
      { id: `IMG${short}B`, report: report.id, image, created }, transaction);

      let historyIndex = 0;
      async function history(from, to, actor, note, date) {
        historyIndex += 1;
        await query(`INSERT dbo.LichSuTrangThai(MaLichSu,MaPhanAnh,MaNguoiThucHien,TrangThaiCu,TrangThaiMoi,ThoiGian,GhiChu)
          VALUES(@id,@report,@actor,@from,@to,@date,@note)`,
        { id: `HS${short}${String(historyIndex).padStart(2,'0')}`, report: report.id, actor, from, to, date, note }, transaction);
      }
      await history(null, 'SUBMITTED', userIds.VT01, 'Người dân gửi phản ánh kèm ảnh và vị trí sự cố.', created);
      if (report.status === 'REJECTED') {
        await history('SUBMITTED','REJECTED',userIds.VT02,rejection,at(.4));
      } else if (report.status !== 'SUBMITTED') {
        await history('SUBMITTED','VERIFIED',userIds.VT02,'Đã kiểm tra nội dung, vị trí, loại sự cố và xác nhận phản ánh hợp lệ.',at(.1));
      }
      if (hasAssigned) {
        await query(`INSERT dbo.PhanCong(MaPhanCong,MaPhanAnh,MaDonVi,MaNguoiPhanCong,MaNguoiTiepNhan,NgayPhanCong,HanXuLy,GhiChu,TrangThai)
          VALUES(@id,@report,@unit,@intake,@receiver,@date,@due,N'Kiểm tra hiện trường và xử lý theo chuyên môn.',@status)`,
        { id: `PC${short}`, report: report.id, unit: report.unit, intake: userIds.VT02, receiver: hasStarted && report.unit === 'DV01' ? userIds.VT03 : null, date: at(.2), due, status: finalWasClosed ? 'DONE' : hasStarted ? 'ACCEPTED' : 'ASSIGNED' }, transaction);
        await history('VERIFIED','ASSIGNED',userIds.VT02,'Đã phân công đơn vị phụ trách và thời hạn xử lý.',at(.2));
      }
      if (hasStarted) {
        const actor = report.unit === 'DV01' ? userIds.VT03 : userIds.VT05;
        await history('ASSIGNED','IN_PROGRESS',actor,'Đơn vị đã tiếp nhận nhiệm vụ và tổ chức khảo sát hiện trường.',at(.3));
        await query(`INSERT dbo.TienDoXuLy(MaTienDo,MaPhanAnh,MaPhanCong,MaNguoiCapNhat,NoiDung,NgayCapNhat,HinhAnh)
          VALUES(@id,@report,@assignment,@actor,N'Đã khảo sát, bố trí vật tư và triển khai xử lý. Khu vực thi công có cảnh báo an toàn.',@date,@image)`,
        { id: `TD${short}`, report: report.id, assignment: `PC${short}`, actor, date: at(.5), image }, transaction);
      }
      if (hasResult) {
        const actor = report.unit === 'DV01' ? userIds.VT03 : userIds.VT05;
        await query(`INSERT dbo.KetQuaXuLy(MaKetQua,MaPhanAnh,MaNguoiGui,MoTaKetQua,NgayHoanThanh,HinhAnh,TrangThai)
          VALUES(@id,@report,@actor,N'Đã hoàn tất xử lý theo phương án kỹ thuật, vệ sinh hiện trường và kiểm tra an toàn. Kính đề nghị nghiệm thu.',@date,@image,@status)`,
        { id: `KQ${short}`, report: report.id, actor, date: at(.65), image: afterImage, status: finalWasClosed ? 'ACCEPTED' : 'WAITING_ACCEPTANCE' }, transaction);
        await query(`INSERT dbo.HinhAnhPhanAnh(MaHinhAnh,MaPhanAnh,DuongDan,MoTa,LoaiAnh,ThoiGianTao)
          VALUES(@id,@report,@image,N'Ảnh minh họa sau xử lý','SAU_XU_LY',@date)`,
        { id: `IMG${short}A`, report: report.id, image: afterImage, date: at(.65) }, transaction);
        await history('IN_PROGRESS','WAITING_ACCEPTANCE',actor,'Đơn vị gửi kết quả xử lý và ảnh sau hoàn thành.',at(.65));
      }
      if (finalWasClosed) {
        await query(`INSERT dbo.NghiemThu(MaNghiemThu,MaKetQua,MaCanBoNghiemThu,NgayNghiemThu,KetQua,GhiChu,TrangThai)
          VALUES(@id,@result,@actor,@date,'DAT',N'Đã kiểm tra kết quả và bằng chứng. Công việc đáp ứng yêu cầu nghiệm thu.','ACCEPTED')`,
        { id: `NT${short}`, result: `KQ${short}`, actor: userIds.VT04, date: at(.8) }, transaction);
        await history('WAITING_ACCEPTANCE','CLOSED',userIds.VT04,'Kết quả đạt yêu cầu nghiệm thu. Phản ánh đã hoàn thành.',at(.8));
      }
      if (report.rating) {
        await query(`INSERT dbo.PhanHoi(MaPhanHoi,MaPhanAnh,MaNguoiDung,NoiDung,MucDoHaiLong,NgayPhanHoi)
          VALUES(@id,@report,@owner,@comment,@rating,@date)`,
        { id: `PH${short}`, report: report.id, owner: userIds.VT01, rating: report.rating, comment: report.rating <= 2 ? 'Kết quả vẫn còn một số điểm chưa đạt, đề nghị kiểm tra lại chất lượng.' : 'Cảm ơn đơn vị đã xử lý và thông tin đầy đủ cho người dân.', date: at(.9) }, transaction);
      }
      if (report.reopen) {
        await query(`INSERT dbo.YeuCauXemXetLai(MaYeuCau,MaPhanAnh,MaNguoiDung,MaNguoiXuLy,LyDo,NoiDung,NgayYeuCau,TrangThai,GhiChuXuLy)
          VALUES(@id,@report,@owner,@handler,N'Chất lượng sau sửa chữa chưa đáp ứng thực tế.',N'Đề nghị kiểm tra lại tại hiện trường và xử lý triệt để các điểm chưa đạt.',@date,@status,@note)`,
        { id: `YC${short}`, report: report.id, owner: userIds.VT01, handler: report.reopen === 'APPROVED' ? userIds.VT04 : null, date: at(.95), status: report.reopen, note: report.reopen === 'APPROVED' ? 'Chấp nhận mở lại để đơn vị kiểm tra và xử lý bổ sung.' : null }, transaction);
        if (report.reopen === 'APPROVED') await history('CLOSED','REOPENED',userIds.VT04,'Chấp nhận yêu cầu xem xét lại, chuyển cán bộ tiếp nhận phân công xử lý bổ sung.',at(.97));
      }

      await query(`INSERT dbo.ThongBao(MaThongBao,MaNguoiDung,MaPhanAnh,TieuDe,NoiDung,LoaiThongBao,ThoiGian,DaDoc)
        VALUES(@id,@owner,@report,@title,@message,'STATUS_CHANGED',@date,@read)`,
      { id: `TB${short}C`, owner: userIds.VT01, report: report.id, title: finalWasClosed ? 'Đã có kết quả phản ánh' : 'Cập nhật phản ánh của bạn', message: `Phản ánh “${report.title}” đã được cập nhật. Mở chi tiết để xem tiến độ xử lý.`, date: at(.98), read: report.days > 10 }, transaction);
      const staffRole = report.status === 'SUBMITTED' || report.status === 'REOPENED' ? 'VT02' : report.status === 'WAITING_ACCEPTANCE' ? 'VT04' : ['ASSIGNED','IN_PROGRESS'].includes(report.status) && report.unit === 'DV01' ? 'VT03' : null;
      if (staffRole) {
        await query(`INSERT dbo.ThongBao(MaThongBao,MaNguoiDung,MaPhanAnh,TieuDe,NoiDung,LoaiThongBao,ThoiGian)
          VALUES(@id,@user,@report,N'Có công việc cần xử lý',@message,'WORKFLOW',@date)`,
        { id: `TB${short}S`, user: userIds[staffRole], report: report.id, message: `Phản ánh “${report.title}” đang chờ thao tác theo vai trò của bạn.`, date: at(.98) }, transaction);
      }
      if (report.reopen === 'PENDING') {
        await query(`INSERT dbo.ThongBao(MaThongBao,MaNguoiDung,MaPhanAnh,TieuDe,NoiDung,LoaiThongBao,ThoiGian)
          VALUES(@id,@user,@report,N'Yêu cầu xem xét lại mới',N'Người dân đề nghị kiểm tra lại kết quả xử lý. Vui lòng xem nội dung và đưa ra quyết định.','REOPEN_REQUEST',@date)`,
        { id: `TB${short}R`, user: userIds.VT04, report: report.id, date: at(.98) }, transaction);
      }
      await transaction.commit();
      inserted += 1;
    } catch (error) {
      if (!transaction._aborted) await transaction.rollback();
      throw error;
    }
  }
  console.log(`Đã thêm ${inserted} phản ánh minh họa; các bản ghi đã tồn tại được giữ nguyên.`);
  console.log('Đã chuẩn bị 5 tài khoản minh họa theo vai trò. Xem README để đăng nhập trong môi trường phát triển.');
} catch (error) {
  console.error(`Nạp dữ liệu minh họa thất bại: ${error.message}`);
  process.exitCode = 1;
} finally {
  await pool.close();
}
