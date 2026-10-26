import test from 'node:test';
import assert from 'node:assert/strict';

const base = process.env.TEST_API_URL || 'http://127.0.0.1:4000/api';
const password = process.env.DEMO_PASSWORD || 'DoThi@2026!';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jZ1kAAAAASUVORK5CYII=', 'base64');
function client() {
  let cookie = '';
  return async function request(route, options = {}) {
    const {method = 'GET', body, status = 200} = options;
    const form = body instanceof FormData;
    const headers = {Origin:'http://localhost:5173', ...(cookie ? {Cookie:cookie} : {}), ...(!form && body !== undefined ? {'Content-Type':'application/json'} : {})};
    const response = await fetch(`${base}${route}`, {method, headers, body:body === undefined ? undefined : form ? body : JSON.stringify(body)});
    const setCookie = response.headers.getSetCookie();
    if (setCookie.length) cookie = setCookie.map(c => c.split(';')[0]).join('; ');
    const text = await response.text();
    let data; try { data = JSON.parse(text); } catch { data = text; }
    const allowed = Array.isArray(status) ? status : [status];
    assert.ok(allowed.includes(response.status), `${method} ${route}: expected ${allowed}, got ${response.status}: ${JSON.stringify(data)}`);
    return data;
  };
}

test('UC01–UC16: real SQL Server workflow, authorization and privacy', {timeout:120000}, async t => {
  const anonymous = client(), citizen = client(), other = client(), intake = client(), unit = client(), inspector = client(), admin = client();
  const suffix = Date.now().toString().slice(-9);
  let reportId, uploadUrl, unitUploadUrl, reopenId;
  await t.test('public metadata and protected endpoints', async () => {
    const meta = await anonymous('/meta');
    assert.ok(meta.categories.length >= 5); assert.ok(meta.units.length >= 3);
    await anonymous('/auth/me', {status:401});
    await anonymous('/admin/users', {status:401});
  });
  await t.test('UC01/02: register, duplicate identity, wrong login, five roles', async () => {
    const user = {name:'Kiểm thử người dân',email:`qa${suffix}@example.test`,phone:`09${suffix.slice(-8)}`,password:'Test!Citizen2026',address:'TP. Hồ Chí Minh'};
    const registered = await citizen('/auth/register', {method:'POST',body:user,status:[200,201]});
    assert.equal(registered.user.role, 'VT01');
    await anonymous('/auth/register', {method:'POST',body:user,status:[400,409,422]});
    await anonymous('/auth/login', {method:'POST',body:{identifier:user.email,password:'wrong-password'},status:401});
    await other('/auth/register', {method:'POST',body:{...user,email:`other${suffix}@example.test`,phone:`08${suffix.slice(-8)}`},status:[200,201]});
    for (const [request,email,role] of [[intake,'intake','VT02'],[unit,'unit','VT03'],[inspector,'inspector','VT04'],[admin,'admin','VT05']]) {
      const data = await request('/auth/login', {method:'POST',body:{identifier:`${email}@dothiso.vn`,password}});
      assert.equal(data.user.role,role);
    }
    await citizen('/admin/users', {status:403});
  });
  await t.test('image upload: reject executable content; accept actual PNG', async () => {
    const invalid = new FormData(); invalid.append('files',new Blob(['<script>alert(1)</script>'],{type:'image/png'}),'not-image.png');
    await citizen('/uploads',{method:'POST',body:invalid,status:[400,415,422]});
    const valid = new FormData(); valid.append('files',new Blob([png],{type:'image/png'}),'incident.png');
    const result=await citizen('/uploads',{method:'POST',body:valid,status:[200,201]});
    uploadUrl=result.files[0].url;assert.ok(uploadUrl.startsWith('/uploads/'));
    const evidence = new FormData(); evidence.append('files',new Blob([png],{type:'image/png'}),'result.png');
    unitUploadUrl=(await unit('/uploads',{method:'POST',body:evidence,status:[200,201]})).files[0].url;
  });
  await t.test('UC03/04: create real geolocated incident and check duplicates', async () => {
    const body={title:`Kiểm thử vòng đời ${suffix}`,description:'Mặt đường có hố sâu ảnh hưởng người dân, cần rào chắn và sửa chữa.',categoryId:'LPA01',address:'Đường kiểm thử, TP. Hồ Chí Minh',latitude:10.812345,longitude:106.712345,priority:'HIGH',images:[uploadUrl],confirmDuplicate:true};
    await citizen('/reports',{method:'POST',body:{...body,latitude:100},status:[400,422]});
    const data=await citizen('/reports',{method:'POST',body,status:[200,201]});
    reportId=data.report.id;assert.equal(data.report.status,'SUBMITTED');
    const duplicates=await citizen('/reports/check-duplicates',{method:'POST',body:{categoryId:'LPA01',address:body.address,latitude:body.latitude,longitude:body.longitude}});
    assert.ok(duplicates.items.some(item=>item.id===reportId));
    await citizen('/reports',{method:'POST',body:{...body,confirmDuplicate:false},status:409});
    await anonymous(`/reports/${reportId}`,{status:[403,404]});
    await other(`/reports/${reportId}`,{status:[403,404]});
    const mine=await citizen('/reports?mine=true');assert.ok(mine.items.some(item=>item.id===reportId));
  });
  const action=async (request,name,extras={},status=200)=>request(`/reports/${reportId}/actions`,{method:'POST',body:{action:name,...extras},status});
  await t.test('UC08/09: staff-only classification, guarded state, assignment', async () => {
    await action(citizen,'verify',{},403);
    assert.equal((await action(intake,'verify',{categoryId:'LPA01',priority:'HIGH',note:'Đã xác minh hiện trường'})).report.status,'VERIFIED');
    await action(intake,'verify',{},[400,409]);
    await action(intake,'assign',{unitId:'DV01',dueAt:'2020-01-01T00:00:00Z'},[400,422]);
    assert.equal((await action(intake,'assign',{unitId:'DV01',dueAt:new Date(Date.now()+86400000*3).toISOString(),note:'Khắc phục và bảo đảm an toàn'})).report.status,'ASSIGNED');
  });
  await t.test('UC10/11/12/13: task, progress, result, rework and acceptance', async () => {
    await action(citizen,'accept-task',{},403);
    assert.equal((await action(unit,'accept-task')).report.status,'IN_PROGRESS');
    await action(unit,'progress',{note:'Đã rào chắn, tập kết vật liệu',images:[unitUploadUrl]});
    await action(unit,'submit-result',{note:'Chưa có ảnh nghiệm thu'},[400,422]);
    assert.equal((await action(unit,'submit-result',{note:'Đã sửa chữa mặt đường',images:[unitUploadUrl]})).report.status,'WAITING_ACCEPTANCE');
    assert.equal((await action(inspector,'rework',{note:'Cần hoàn thiện mép mặt đường'})).report.status,'IN_PROGRESS');
    await action(unit,'submit-result',{note:'Đã hoàn thiện theo yêu cầu nghiệm thu',images:[unitUploadUrl]});
    assert.equal((await action(inspector,'accept-result',{note:'Đạt yêu cầu an toàn'})).report.status,'CLOSED');
  });
  await t.test('UC05: public result hides reporter identity and exact location', async () => {
    const detail=await anonymous(`/reports/${reportId}`);
    const report=detail.report || detail;
    assert.equal(report.status,'CLOSED');
    assert.ok(report.ownerId===undefined || report.ownerId===null);
    assert.ok(report.latitude===undefined || report.latitude===null);
    assert.ok(report.longitude===undefined || report.longitude===null);
    assert.ok(!JSON.stringify(report).includes(`qa${suffix}@example.test`));
    const own=await citizen(`/reports/${reportId}`); const full=own.report || own;
    assert.ok(full.history.length>=7);assert.ok(full.results.length>=2);
  });
  await t.test('UC06/07/14: dissatisfaction, reopen, authorized decision', async () => {
    await other(`/reports/${reportId}/feedback`,{method:'POST',body:{rating:1,comment:'Không phải phản ánh của tôi'},status:[403,404]});
    await citizen(`/reports/${reportId}/feedback`,{method:'POST',body:{rating:2,comment:'Mặt đường vẫn còn lún'},status:[200,201]});
    const data=await citizen(`/reports/${reportId}/reopen`,{method:'POST',body:{reason:'Vị trí cũ xuất hiện lún lại',description:'Đề nghị kiểm tra kết quả.'},status:[200,201]});
    reopenId=data.reopen.id;
    await citizen(`/reports/${reportId}/reopen`,{method:'POST',body:{reason:'Yêu cầu trùng'},status:[400,409]});
    await citizen(`/reopens/${reopenId}/decision`,{method:'POST',body:{approved:true,note:'Tự duyệt'},status:403});
    const pending=await inspector('/reopens?status=PENDING');assert.ok(pending.items.some(item=>item.id===reopenId));
    await inspector(`/reopens/${reopenId}/decision`,{method:'POST',body:{approved:true,note:'Chấp nhận kiểm tra lại hiện trường'}});
    const data2=await intake(`/reports/${reportId}`);assert.equal((data2.report||data2).status,'REOPENED');
  });
  await t.test('task return and reassignment branch',async()=>{
    const details={unitId:'DV01',dueAt:new Date(Date.now()+86400000*2).toISOString(),note:'Xử lý lại sau phản hồi'};
    await action(intake,'assign',details);
    assert.equal((await action(unit,'return-task',{note:'Cần điều phối lại thời gian'})).report.status,'VERIFIED');
    await action(intake,'assign',details);
    await action(unit,'accept-task');
    await action(unit,'submit-result',{note:'Đã xử lý hoàn toàn lún mặt đường',images:[unitUploadUrl]});
    await action(inspector,'accept-result',{note:'Nghiệm thu lần cuối đạt'});
  });
  await t.test('notifications are scoped and can be marked read', async () => {
    const notifications=await citizen('/notifications'); assert.ok(notifications.items.length>0);
    const unreadPage=await citizen('/notifications?page=1&pageSize=1&unread=true');
    assert.equal(unreadPage.items.length,1);assert.ok(unreadPage.total>0);assert.equal(unreadPage.total,unreadPage.unread);
    assert.ok(unreadPage.items.every(item=>item.read===false));
    await other(`/notifications/${notifications.items[0].id}/read`,{method:'PATCH',status:[403,404]});
    await citizen(`/notifications/${notifications.items[0].id}/read`,{method:'PATCH'});
    await citizen('/notifications/read-all',{method:'POST'});
    assert.equal((await citizen('/notifications')).unread,0);
    assert.equal((await citizen('/notifications?unread=true')).total,0);
  });
  await t.test('UC15/16: admin catalogs/users and scoped statistics', async () => {
    const category=await admin('/admin/categories',{method:'POST',body:{name:`Danh mục kiểm thử ${suffix}`,description:'Dữ liệu kiểm thử API'},status:[200,201]});
    await admin(`/admin/categories/${category.item.id}`,{method:'PATCH',body:{name:category.item.name,description:'Đã cập nhật',active:false}});
    await citizen('/admin/categories',{method:'POST',body:{name:'Không hợp lệ'},status:403});
    const users=await admin('/admin/users');assert.ok(users.total>=5);
    const stats=await admin('/stats?categoryId=LPA01');assert.ok(stats.total>0);assert.ok(Array.isArray(stats.byStatus));
    const publicStats=await anonymous('/stats');assert.equal(publicStats.total,publicStats.closed);
  });
  await t.test('last administrator and cross-unit assignment guards execute on SQL Server', async () => {
    const me=await admin('/auth/me');
    await admin(`/admin/users/${me.user.id}`,{method:'PATCH',body:{role:'VT01',active:true},status:409});
    const identity=await other('/auth/me');
    await admin(`/admin/users/${identity.user.id}`,{method:'PATCH',body:{role:'VT03',unitId:'DV02',active:true}});
    const reports=await admin('/reports?unitId=DV01&status=ASSIGNED&pageSize=1');
    assert.ok(reports.items.length,'Seed must include an assigned DV01 task');
    const id=reports.items[0].id;
    await other(`/reports/${id}`,{status:403});
    await other(`/reports/${id}/actions`,{method:'POST',body:{action:'accept-task'},status:403});
    assert.equal((await other('/reports?unitId=DV01')).total,0);
  });
  await t.test('logout invalidates browser cookie', async () => {
    await citizen('/auth/logout',{method:'POST'});
    await citizen('/auth/me',{status:401});
  });
});
