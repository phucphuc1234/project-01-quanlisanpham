const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const {chromium} = require('playwright');
const chromiumModule = require('@sparticuz/chromium');
const binary = chromiumModule.default || chromiumModule;
const base = process.env.TEST_WEB_URL || 'http://127.0.0.1:5173';
const image = path.resolve(__dirname,'../backend/public/demo/road.jpg');
const output = path.resolve(__dirname,'../test-results');
const password = process.env.DEMO_PASSWORD || 'DoThi@2026!';

(async()=>{
 const browser=await chromium.launch({headless:true,args:binary.args.filter(arg=>arg!=='--single-process'),executablePath:await binary.executablePath()});
 const contexts=[];const failures=[];const checks=[];
 async function step(name,fn){await fn();checks.push(name);console.log(`PASS ${name}`);}
 async function login(role){
  const context=await browser.newContext({viewport:{width:1440,height:1000},locale:'vi-VN',timezoneId:'Asia/Bangkok'});contexts.push(context);
  const page=await context.newPage();page.on('pageerror',error=>failures.push(error.message));
  await page.goto(`${base}/login`);await page.getByRole('textbox',{name:/Email hoặc số điện thoại/}).fill(`${role}@dothiso.vn`);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await page.waitForURL('**/dashboard');
  return page;
 }
 async function response(page,predicate,operation){const pending=page.waitForResponse(predicate);await operation();const res=await pending;const body=await res.json();assert.ok(res.ok(),`${res.status()}: ${JSON.stringify(body)}`);return body;}
 async function action(page,reportId,label,{note='Kiểm tra giao diện thực tế',unit=false,photo=false}={}){
  await page.goto(`${base}/reports/${reportId}`);await page.getByRole('button',{name:label,exact:true}).click();
  const dialog=page.getByRole('dialog');await dialog.waitFor();
  await dialog.locator('textarea').fill(note);
  if(unit)await dialog.getByLabel('Đơn vị xử lý',{exact:false}).selectOption('DV01');
  if(photo)await dialog.locator('input[type="file"]').setInputFiles(image);
  const body=await response(page,res=>res.url().endsWith(`/reports/${reportId}/actions`)&&res.request().method()==='POST',()=>dialog.getByRole('button',{name:'Xác nhận',exact:true}).click());
  await dialog.waitFor({state:'hidden'});return body;
 }
 let reportId,title;
 try{
  await fs.mkdir(output,{recursive:true});
  const citizen=await login('citizen');
  await step('citizen submits photo and location through actual React form',async()=>{
   title=`Kiểm tra giao diện ${Date.now()}`;
   await citizen.goto(`${base}/reports/new`);
   await citizen.getByLabel('Tiêu đề phản ánh',{exact:false}).fill(title);
   await citizen.getByLabel('Lĩnh vực phản ánh',{exact:false}).selectOption('LPA01');
   await citizen.getByLabel('Nội dung mô tả',{exact:false}).fill('Mặt đường xuất hiện hố sâu, đề nghị rào chắn và sửa chữa để bảo đảm an toàn.');
   await citizen.getByLabel('Ảnh sự cố',{exact:true}).setInputFiles(image);
   await citizen.getByLabel('Địa chỉ / địa điểm',{exact:false}).fill('Đường kiểm tra giao diện, TP. Hồ Chí Minh');
   await citizen.getByRole('spinbutton',{name:'Vĩ độ',exact:true}).fill('10.84');
   await citizen.getByRole('spinbutton',{name:'Kinh độ',exact:true}).fill('106.75');
   const duplicateResult=await response(citizen,res=>res.url().includes('/reports/check-duplicates')&&res.request().method()==='POST',()=>citizen.getByRole('button',{name:'Kiểm tra phản ánh tương tự',exact:true}).click());
   if(duplicateResult.items.length)await citizen.getByRole('checkbox',{name:/Tôi đã kiểm tra/}).check();
   const result=await response(citizen,res=>res.url().endsWith('/api/reports')&&res.request().method()==='POST',()=>citizen.getByRole('button',{name:'Gửi phản ánh',exact:true}).click());
   reportId=result.report.id;await citizen.getByRole('heading',{name:'Phản ánh đã được gửi!',exact:true}).waitFor();
   await citizen.screenshot({path:path.join(output,'workflow-submitted.png'),fullPage:true});
  });
  const intake=await login('intake');
  await step('intake verifies and assigns a real task through modal forms',async()=>{
   assert.equal((await action(intake,reportId,'Xác minh & tiếp nhận')).report.status,'VERIFIED');
   assert.equal((await action(intake,reportId,'Phân công đơn vị xử lý',{unit:true})).report.status,'ASSIGNED');
  });
  const unit=await login('unit');
  await step('unit accepts, reports progress and uploads completion evidence',async()=>{
   assert.equal((await action(unit,reportId,'Tiếp nhận nhiệm vụ')).report.status,'IN_PROGRESS');
   await action(unit,reportId,'Cập nhật tiến độ',{note:'Đã rào chắn và tập kết vật tư tại hiện trường.',photo:true});
   assert.equal((await action(unit,reportId,'Gửi kết quả nghiệm thu',{note:'Đã sửa chữa và hoàn thiện mặt đường.',photo:true})).report.status,'WAITING_ACCEPTANCE');
   await unit.screenshot({path:path.join(output,'workflow-waiting-acceptance.png'),fullPage:true});
  });
  const inspector=await login('inspector');
  await step('inspector accepts completion result',async()=>{
   assert.equal((await action(inspector,reportId,'Chấp nhận nghiệm thu',{note:'Kết quả đạt yêu cầu, đủ điều kiện phục vụ người dân.'})).report.status,'CLOSED');
  });
  await step('citizen submits dissatisfied feedback and requests reconsideration',async()=>{
   await citizen.goto(`${base}/reports/${reportId}`);
   await citizen.getByRole('button',{name:'1 sao',exact:true}).click();
   await citizen.getByLabel('Nhận xét của bạn',{exact:false}).fill('Mặt đường còn có vị trí lún sau sửa chữa.');
   await response(citizen,res=>res.url().endsWith(`/reports/${reportId}/feedback`),()=>citizen.getByRole('button',{name:'Gửi đánh giá',exact:true}).click());
   await citizen.getByRole('button',{name:'Yêu cầu xem xét lại',exact:true}).click();
   const dialog=citizen.getByRole('dialog');
   await dialog.getByLabel('Lý do yêu cầu',{exact:false}).fill('Mặt đường còn lún, đề nghị kiểm tra và khắc phục lại.');
   await response(citizen,res=>res.url().endsWith(`/reports/${reportId}/reopen`),()=>dialog.getByRole('button',{name:'Gửi yêu cầu',exact:true}).click());
   await dialog.waitFor({state:'hidden'});
  });
  await step('intake approves reconsideration from paginated management queue',async()=>{
   await intake.goto(`${base}/reopens`);
   const card=intake.locator('.reopen-card').filter({hasText:title});await card.waitFor();
   await card.getByRole('button',{name:'Chấp nhận mở lại',exact:true}).click();
   const dialog=intake.getByRole('dialog');await dialog.locator('textarea').fill('Chấp nhận mở lại và kiểm tra bổ sung tại hiện trường.');
   await response(intake,res=>res.url().includes('/reopens/')&&res.url().endsWith('/decision'),()=>dialog.getByRole('button',{name:'Xác nhận quyết định',exact:true}).click());
   await intake.goto(`${base}/reports/${reportId}`);
   const actual=await (await intake.request.get(`${base}/api/reports/${reportId}`)).json();assert.equal((actual.report||actual).status,'REOPENED');
   await intake.getByRole('button',{name:'Phân công đơn vị xử lý',exact:true}).waitFor();
   await intake.screenshot({path:path.join(output,'workflow-reopened.png'),fullPage:true});
  });
  assert.deepEqual(failures,[],`Browser runtime errors: ${failures.join('; ')}`);
  await fs.writeFile(path.join(output,'ui-workflow-summary.json'),JSON.stringify({checks,reportId,title,errors:failures},null,2));
  console.log(`Completed ${checks.length} real browser workflow stages; report ${reportId}.`);
 }finally{await Promise.all(contexts.map(context=>context.close().catch(()=>{})));await browser.close().catch(()=>{});}
})().catch(error=>{console.error(error);process.exitCode=1;});
