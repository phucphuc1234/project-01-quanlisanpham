import test from 'node:test';
import assert from 'node:assert/strict';
import { ReportWorkflowPolicy as Policy } from '../src/services/workflow-policy.js';

test('workflow policy prevents privilege escalation, cross-unit changes and illegal lifecycle jumps', () => {
  const citizen = { id: 'CITIZEN', role: 'VT01' };
  const intake = { id: 'INTAKE', role: 'VT02' };
  const ownUnit = { id: 'WORKER', role: 'VT03', unitId: 'DV01' };
  const anotherUnit = { id: 'OTHER', role: 'VT03', unitId: 'DV02' };
  const inspector = { id: 'INSPECTOR', role: 'VT04' };
  const report = { status: 'ASSIGNED', unitId: 'DV01', assignmentId: 'PC1' };
  assert.throws(() => Policy.assertRole(citizen, 'verify'), { status: 403 });
  assert.throws(() => Policy.assertRole(intake, 'accept-result'), { status: 403 });
  assert.throws(() => Policy.assertRole(inspector, 'assign'), { status: 403 });
  assert.throws(() => Policy.assertCanExecute(report, anotherUnit, 'accept-task'), { status: 403 });
  assert.doesNotThrow(() => Policy.assertCanExecute(report, ownUnit, 'accept-task'));
  assert.throws(() => Policy.assertCanExecute(report, ownUnit, 'submit-result'), { status: 409 });
  assert.throws(() => Policy.assertCanExecute({ ...report, status: 'CLOSED' }, inspector, 'accept-result'), { status: 409 });
  assert.doesNotThrow(() => Policy.assertCanExecute({ status: 'WAITING_ACCEPTANCE' }, inspector, 'rework'));
  for (const invalid of ['__proto__', 'constructor', '', null, ['verify']]) assert.throws(() => Policy.assertRole(intake, invalid), { status: 400 });
});
