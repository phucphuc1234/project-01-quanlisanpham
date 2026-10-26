import { query, transaction } from '../db.js';
import { HttpError, id } from '../lib.js';
import { lockedReport, addHistory, notify, checkCategory } from '../report-store.js';

/** SQL-only persistence boundary for one serializable report workflow command. */
export class ReportRepository {
  constructor(tx) { this.tx = tx; }
  static inTransaction(operation) { return transaction(tx => operation(new ReportRepository(tx))); }
  findAndLock(reportId) { return lockedReport(reportId, this.tx); }
  checkCategory(categoryId) { return checkCategory(categoryId, this.tx); }
  async classify(reportId, categoryId, priority) {
    await this.checkCategory(categoryId);
    await query('UPDATE dbo.PhanAnh SET MaLoai=@categoryId,MucDoUuTien=@priority WHERE MaPhanAnh=@reportId', { categoryId, priority, reportId }, this.tx);
  }
  async recordRejection(reportId, note) {
    await query('UPDATE dbo.PhanAnh SET LyDoTuChoi=@note WHERE MaPhanAnh=@reportId', { note, reportId }, this.tx);
  }
  async createAssignment(reportId, actorId, { unitId, dueAt, note }) {
    if (!(await query('SELECT MaDonVi FROM dbo.DonViXuLy WITH(HOLDLOCK) WHERE MaDonVi=@unitId AND TrangThai=1', { unitId }, this.tx)).recordset.length) throw new HttpError(400, 'Đơn vị xử lý không tồn tại hoặc đã ngừng hoạt động.');
    await query(`UPDATE dbo.PhanCong SET TrangThai='CANCELLED' WHERE MaPhanAnh=@reportId AND TrangThai IN('ASSIGNED','ACCEPTED')`, { reportId }, this.tx);
    await query(`INSERT dbo.PhanCong(MaPhanCong,MaPhanAnh,MaDonVi,MaNguoiPhanCong,HanXuLy,GhiChu,NgayPhanCong) VALUES(@id,@reportId,@unitId,@actorId,@dueAt,@note,SYSUTCDATETIME())`, { id: id('PC'), reportId, unitId, actorId, dueAt, note }, this.tx);
  }
  async acceptTask(assignmentId, userId) {
    await query(`UPDATE dbo.PhanCong SET TrangThai='ACCEPTED',MaNguoiTiepNhan=@userId WHERE MaPhanCong=@assignmentId`, { userId, assignmentId }, this.tx);
  }
  async returnTask(assignmentId, note) {
    await query(`UPDATE dbo.PhanCong SET TrangThai='RETURN_REQUESTED',LyDoTraLai=@note WHERE MaPhanCong=@assignmentId`, { note, assignmentId }, this.tx);
  }
  async addImages(reportId, images, type) {
    for (const url of images) await query(`INSERT dbo.HinhAnhPhanAnh(MaHinhAnh,MaPhanAnh,DuongDan,LoaiAnh,ThoiGianTao) VALUES(@id,@reportId,@url,@type,SYSUTCDATETIME())`, { id: id('HA'), reportId, url, type }, this.tx);
  }
  async recordProgress(report, userId, note, images) {
    await query(`INSERT dbo.TienDoXuLy(MaTienDo,MaPhanAnh,MaPhanCong,MaNguoiCapNhat,NoiDung,HinhAnh,NgayCapNhat) VALUES(@id,@reportId,@assignmentId,@userId,@note,@image,SYSUTCDATETIME())`, { id: id('TD'), reportId: report.id, assignmentId: report.assignmentId, userId, note, image: images[0] || null }, this.tx);
    await this.addImages(report.id, images, 'TRUOC_XU_LY');
  }
  async recordResult(reportId, userId, note, images) {
    await query(`INSERT dbo.KetQuaXuLy(MaKetQua,MaPhanAnh,MaNguoiGui,MoTaKetQua,HinhAnh,NgayHoanThanh) VALUES(@id,@reportId,@userId,@note,@image,SYSUTCDATETIME())`, { id: id('KQ'), reportId, userId, note, image: images[0] }, this.tx);
    await this.addImages(reportId, images, 'SAU_XU_LY');
  }
  async recordAcceptance(report, userId, passed, note) {
    const result = (await query(`SELECT TOP(1) MaKetQua AS id FROM dbo.KetQuaXuLy WITH(UPDLOCK,HOLDLOCK) WHERE MaPhanAnh=@reportId AND TrangThai='WAITING_ACCEPTANCE' ORDER BY NgayHoanThanh DESC,MaKetQua DESC`, { reportId: report.id }, this.tx)).recordset[0];
    if (!result) throw new HttpError(409, 'Không tìm thấy kết quả chờ nghiệm thu.');
    await query(`INSERT dbo.NghiemThu(MaNghiemThu,MaKetQua,MaCanBoNghiemThu,KetQua,GhiChu,TrangThai,NgayNghiemThu) VALUES(@id,@resultId,@userId,@outcome,@note,@status,SYSUTCDATETIME())`, { id: id('NT'), resultId: result.id, userId, outcome: passed ? 'DAT' : 'KHONG_DAT', note, status: passed ? 'ACCEPTED' : 'REWORK_REQUIRED' }, this.tx);
    await query('UPDATE dbo.KetQuaXuLy SET TrangThai=@status WHERE MaKetQua=@resultId', { resultId: result.id, status: passed ? 'ACCEPTED' : 'REJECTED' }, this.tx);
    if (passed) await query(`UPDATE dbo.PhanCong SET TrangThai='DONE' WHERE MaPhanCong=@assignmentId`, { assignmentId: report.assignmentId }, this.tx);
  }
  async transition(report, nextStatus) {
    if (nextStatus === report.status) return;
    const result = await query('UPDATE dbo.PhanAnh SET TrangThai=@status WHERE MaPhanAnh=@reportId AND TrangThai=@previous', { reportId: report.id, status: nextStatus, previous: report.status }, this.tx);
    if (result.rowsAffected[0] !== 1) throw new HttpError(409, 'Phản ánh đã được người khác cập nhật. Vui lòng tải lại.');
  }
  history(report, actorId, nextStatus, note) { return addHistory(this.tx, report.id, actorId, report.status, nextStatus, note); }
  notify(options) { return notify(this.tx, options); }
}
