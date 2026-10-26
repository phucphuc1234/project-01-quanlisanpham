import test from 'node:test';
import assert from 'node:assert/strict';
import { location, distanceMeters, coarseAddress, id, pagination } from '../src/lib.js';
import { summary, filters, allowedReport } from '../src/report-store.js';
import { validMagic } from '../src/routes/uploads.js';

test('distance calculation enforces real geographic duplicate radius', () => {
  const origin = { latitude: 10.7769, longitude: 106.7009 };
  assert.equal(distanceMeters(origin, origin), 0);
  assert.ok(distanceMeters(origin, { latitude: origin.latitude + 0.001, longitude: origin.longitude }) > 100);
  assert.ok(distanceMeters(origin, { latitude: origin.latitude + 0.001, longitude: origin.longitude }) < 120);
  assert.ok(distanceMeters(origin, { latitude: origin.latitude + 0.003, longitude: origin.longitude }) > 200);
});
test('coordinates reject absent, nonfinite and out-of-bounds values', () => {
  for (const coordinates of [{}, { latitude: '', longitude: '' }, { latitude: 91, longitude: 1 }, { latitude: 1, longitude: 181 }, { latitude: 'NaN', longitude: 2 }]) assert.throws(() => location(coordinates));
  assert.deepEqual(location({ latitude: '10.2', longitude: '106.5' }), { latitude: 10.2, longitude: 106.5 });
});
test('public reports cannot reveal owner, exact location or incident thumbnail', () => {
  const row = { id: 'PA1', ownerId: 'OWNER', status: 'CLOSED', address: '12 Nguyễn Huệ, Quận 1, TP.HCM', coordinates: '10.1,106.2', incidentThumbnail: '/private.webp', outcomeThumbnail: '/outcome.webp', rejectionReason: 'Private note' };
  const value = summary(row, null);
  assert.equal(value.ownerId, undefined);
  assert.equal(value.coordinates, undefined);
  assert.equal(value.latitude, null);
  assert.equal(value.longitude, null);
  assert.equal(value.address, 'Quận 1, TP.HCM');
  assert.equal(value.thumbnail, '/outcome.webp');
  assert.equal(value.rejectionReason, undefined);
  const own = summary(row, { id: 'OWNER', role: 'VT01' });
  assert.equal(own.latitude, 10.1);
  assert.equal(own.thumbnail, '/private.webp');
});
test('open report authorization scopes by citizen ownership and unit assignment', () => {
  const row = { ownerId: 'A', unitId: 'DV01', status: 'IN_PROGRESS' };
  assert.equal(allowedReport(row, null), false);
  assert.equal(allowedReport(row, { id: 'B', role: 'VT01' }), false);
  assert.equal(allowedReport(row, { id: 'A', role: 'VT01' }), true);
  assert.equal(allowedReport(row, { id: 'B', role: 'VT03', unitId: 'DV02' }), false);
  assert.equal(allowedReport(row, { id: 'B', role: 'VT03', unitId: 'DV01' }), true);
});
test('filters parameterize SQL-like input and always enforce actor scope', () => {
  const citizen = filters({ id: 'ND1', role: 'VT01' }, { search: "';DROP TABLE dbo.PhanAnh;--", categoryId: 'LPA01', mine: 'true' });
  assert.ok(citizen.where.includes('pa.MaNguoiDung=@viewerId'));
  assert.ok(!citizen.where.includes('DROP'));
  assert.equal(citizen.params.viewerId, 'ND1');
  assert.equal(filters(null, {}).where.includes("pa.TrangThai='CLOSED'"), true);
});
test('IDs fit schema and pagination cannot request unbounded records', () => {
  assert.ok(id('LPA').length <= 20);
  assert.equal(pagination({ pageSize: '100000' }).pageSize, 100);
  assert.equal(pagination({ page: '-1' }).page, 1);
  assert.equal(coarseAddress('Home address with no region'), 'Khu vực đô thị');
});
test('image validation accepts signatures only for supported image formats', () => {
  assert.equal(validMagic(Buffer.from('<svg onload=alert(1)>')), false);
  assert.equal(validMagic(Buffer.from('this is not an image')), false);
  assert.equal(validMagic(Buffer.from([0xff, 0xd8, 0xff, 1])), true);
  assert.equal(validMagic(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), true);
  assert.equal(validMagic(Buffer.from('RIFF1234WEBP1234')), true);
});
