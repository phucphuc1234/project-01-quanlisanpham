import { HttpError } from '../lib.js';

const commands = Object.freeze({
  verify: { roles: ['VT02', 'VT05'], states: ['SUBMITTED'] },
  reject: { roles: ['VT02', 'VT05'], states: ['SUBMITTED'] },
  assign: { roles: ['VT02', 'VT05'], states: ['VERIFIED', 'REOPENED'] },
  'accept-task': { roles: ['VT03', 'VT05'], states: ['ASSIGNED'], ownUnit: true },
  'return-task': { roles: ['VT03', 'VT05'], states: ['ASSIGNED'], ownUnit: true },
  progress: { roles: ['VT03', 'VT05'], states: ['IN_PROGRESS'], ownUnit: true },
  'submit-result': { roles: ['VT03', 'VT05'], states: ['IN_PROGRESS'], ownUnit: true },
  'accept-result': { roles: ['VT04', 'VT05'], states: ['WAITING_ACCEPTANCE'] },
  rework: { roles: ['VT04', 'VT05'], states: ['WAITING_ACCEPTANCE'] },
});

/** Authorization and legal lifecycle transitions, independent from HTTP and SQL. */
export class ReportWorkflowPolicy {
  static assertRole(actor, action) {
    const rule = typeof action === 'string' && Object.hasOwn(commands, action) ? commands[action] : null;
    if (!rule) throw new HttpError(400, 'Thao tác xử lý không hợp lệ.');
    if (!actor || !rule.roles.includes(actor.role)) throw new HttpError(403, 'Bạn không có quyền thực hiện bước xử lý này.');
    return rule;
  }
  static assertState(report, states) {
    if (!states.includes(report.status)) throw new HttpError(409, 'Trạng thái phản ánh đã thay đổi hoặc không phù hợp với thao tác. Vui lòng tải lại.');
  }
  static assertCanExecute(report, actor, action) {
    const rule = this.assertRole(actor, action);
    if (rule.ownUnit) {
      if (actor.role === 'VT03' && (!report.unitId || report.unitId !== actor.unitId)) throw new HttpError(403, 'Phản ánh không được giao cho đơn vị của bạn.');
      if (!report.assignmentId) throw new HttpError(409, 'Chưa có phân công xử lý hợp lệ.');
    }
    this.assertState(report, rule.states);
  }
}
