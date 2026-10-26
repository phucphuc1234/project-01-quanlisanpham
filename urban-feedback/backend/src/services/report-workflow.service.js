import { HttpError, text, priorities } from '../lib.js';
import { validateImages } from '../image-storage.js';
import { ReportRepository } from '../repositories/report.repository.js';
import { ReportWorkflowPolicy } from './workflow-policy.js';

/** Application service: validates commands and orchestrates policy + atomic persistence. */
export class ReportWorkflowService {
  constructor({ repository = ReportRepository, imageValidator = validateImages } = {}) {
    this.repository = repository;
    this.imageValidator = imageValidator;
  }
  async execute(reportId, actor, command) {
    const action = command.action;
    ReportWorkflowPolicy.assertRole(actor, action);
    const required = ['reject', 'return-task', 'progress', 'submit-result', 'rework'].includes(action);
    const note = text(command.note, 'Nội dung xử lý', { required, min: required ? 3 : 0, max: 1000 });
    const images = command.images == null ? [] : await this.imageValidator(command.images, actor);
    if (action === 'submit-result' && !images.length) throw new HttpError(400, 'Vui lòng tải ảnh sau xử lý trước khi gửi nghiệm thu.');
    await this.repository.inTransaction(async repository => {
      const report = await repository.findAndLock(reportId);
      ReportWorkflowPolicy.assertCanExecute(report, actor, action);
      let nextStatus = report.status;
      if (action === 'verify') {
        const priority = command.priority || report.priority;
        if (!priorities.includes(priority)) throw new HttpError(400, 'Mức độ ưu tiên không hợp lệ.');
        await repository.classify(report.id, command.categoryId || report.categoryId, priority);
        nextStatus = 'VERIFIED';
      } else if (action === 'reject') {
        await repository.recordRejection(report.id, note);
        nextStatus = 'REJECTED';
      } else if (action === 'assign') {
        const unitId = text(command.unitId, 'Đơn vị xử lý', { required: true, max: 20 });
        const dueAt = new Date(command.dueAt);
        if (!Number.isFinite(dueAt.valueOf()) || dueAt.valueOf() <= Date.now() || dueAt.getUTCFullYear() > 9999) throw new HttpError(400, 'Thời hạn xử lý phải là thời điểm hợp lệ trong tương lai.');
        await repository.createAssignment(report.id, actor.id, { unitId, dueAt, note });
        await repository.notify({ unitId, reportId: report.id, title: 'Nhiệm vụ mới được phân công', message: report.title, type: 'ASSIGNED' });
        nextStatus = 'ASSIGNED';
      } else if (action === 'accept-task') {
        await repository.acceptTask(report.assignmentId, actor.id);
        nextStatus = 'IN_PROGRESS';
      } else if (action === 'return-task') {
        await repository.returnTask(report.assignmentId, note);
        await repository.notify({ roles: ['VT02'], reportId: report.id, title: 'Đơn vị đề nghị chuyển lại nhiệm vụ', message: note, type: 'RETURN_REQUESTED' });
        nextStatus = 'VERIFIED';
      } else if (action === 'progress') {
        await repository.recordProgress(report, actor.id, note, images);
      } else if (action === 'submit-result') {
        await repository.recordResult(report.id, actor.id, note, images);
        await repository.notify({ roles: ['VT04'], reportId: report.id, title: 'Kết quả xử lý chờ nghiệm thu', message: report.title, type: 'WAITING_ACCEPTANCE' });
        nextStatus = 'WAITING_ACCEPTANCE';
      } else if (action === 'accept-result' || action === 'rework') {
        const passed = action === 'accept-result';
        await repository.recordAcceptance(report, actor.id, passed, note);
        if (!passed) await repository.notify({ unitId: report.unitId, reportId: report.id, title: 'Yêu cầu xử lý lại', message: note, type: 'REWORK_REQUIRED' });
        nextStatus = passed ? 'CLOSED' : 'IN_PROGRESS';
      }
      await repository.transition(report, nextStatus);
      const defaultNote = { verify: 'Phản ánh đã được xác minh.', assign: 'Đã phân công đơn vị xử lý.', 'accept-task': 'Đơn vị tiếp nhận nhiệm vụ.', 'accept-result': 'Kết quả đạt yêu cầu, đã đóng phản ánh.' }[action] || 'Cập nhật xử lý.';
      await repository.history(report, actor.id, nextStatus, note || defaultNote);
      await repository.notify({ users: [report.ownerId], reportId: report.id, title: action === 'progress' ? 'Tiến độ xử lý vừa cập nhật' : 'Phản ánh có trạng thái mới', message: `${report.title}: ${nextStatus}${note ? ` – ${note}` : ''}`, type: nextStatus });
    });
  }
}
