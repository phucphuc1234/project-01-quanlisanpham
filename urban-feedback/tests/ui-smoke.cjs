const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const chromiumModule = require('@sparticuz/chromium');
const binary = chromiumModule.default || chromiumModule;

const base = process.env.TEST_WEB_URL || 'http://127.0.0.1:5173';
const output = path.resolve(__dirname, '../test-results');
const checks = [];
async function check(name, operation) { await operation(); checks.push(name); console.log(`PASS ${name}`); }
async function noOverflow(page) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),'Page must not overflow horizontally');
}
(async () => {
  await fs.mkdir(output,{recursive:true});
  const browser = await chromium.launch({headless:true,args:binary.args,executablePath:await binary.executablePath()});
  const page = await browser.newPage({viewport:{width:1440,height:1000},locale:'vi-VN',timezoneId:'Asia/Bangkok'});
  const fatalErrors = [];
  page.on('pageerror',error=>fatalErrors.push(error.message));
  page.on('console',message=>{if(message.type()==='error' && /invalid regular expression|is not a valid regular expression/i.test(message.text()))fatalErrors.push(message.text());});
  try {
    await check('desktop home renders real React app',async()=>{
      await page.goto(base,{waitUntil:'domcontentloaded'});
      await page.getByRole('heading',{name:/Một phản ánh nhỏ/}).waitFor();
      assert.match(await page.title(),/Đô thị Kết nối/);
      await noOverflow(page);
      await page.screenshot({path:path.join(output,'home-desktop.png')});
    });
    await check('login form, labels, required fields, password visibility',async()=>{
      await page.goto(`${base}/login`,{waitUntil:'domcontentloaded'});
      await page.getByRole('heading',{name:'Đăng nhập tài khoản'}).waitFor();
      const username=page.getByRole('textbox',{name:/Email hoặc số điện thoại/});
      await username.fill('citizen@dothiso.vn');
      await page.locator('input[autocomplete="current-password"]').fill('DoThi@2026!');
      await page.getByRole('button',{name:'Hiện mật khẩu',exact:true}).click();
      assert.equal(await page.locator('input[autocomplete="current-password"]').getAttribute('type'),'text');
      await page.getByRole('button',{name:'Ẩn mật khẩu',exact:true}).click();
      await noOverflow(page);
      await page.screenshot({path:path.join(output,'login-desktop.png')});
    });
    await check('registration catches password mismatch without API fake data',async()=>{
      await page.goto(`${base}/register`,{waitUntil:'domcontentloaded'});
      await page.getByRole('heading',{name:'Bắt đầu kết nối'}).waitFor();
      await page.getByRole('textbox',{name:/Họ và tên/}).fill('Nguyễn Kiểm Thử');
      await page.getByRole('textbox',{name:/^Email/}).fill('ui@example.test');
      await page.getByRole('textbox',{name:/Số điện thoại/}).fill('0912345678');
      const password=page.locator('input[autocomplete="new-password"]').first();
      assert.equal(await password.getAttribute('minlength'),'10');
      await password.fill('Mismatch!2026');
      await page.getByLabel('Nhập lại mật khẩu',{exact:false}).fill('Another!2026');
      await page.getByRole('checkbox').check();
      await page.getByRole('button',{name:'Tạo tài khoản',exact:false}).click();
      await page.getByText('Mật khẩu nhập lại chưa khớp.').waitFor();
      assert.ok(await page.locator('input[type="tel"]').evaluate(input=>input.checkValidity()));
      await noOverflow(page);
    });
    await check('anonymous protected report creation redirects to login',async()=>{
      await page.goto(`${base}/reports/new`,{waitUntil:'domcontentloaded'});
      await page.waitForURL('**/login');
      await page.getByRole('heading',{name:'Đăng nhập tài khoản'}).waitFor();
    });
    await check('unknown route provides usable 404',async()=>{
      await page.goto(`${base}/does-not-exist`,{waitUntil:'domcontentloaded'});
      await page.getByRole('heading',{name:'Có vẻ bạn đã đi lạc.'}).waitFor();
    });
    await check('mobile home has no horizontal overflow and working menu',async()=>{
      await page.setViewportSize({width:390,height:844});
      await page.goto(base,{waitUntil:'domcontentloaded'});
      await page.getByRole('heading',{name:/Một phản ánh nhỏ/}).waitFor();
      await noOverflow(page);
      await page.getByRole('button',{name:'Mở menu',exact:true}).click();
      await page.locator('.mobile-menu').getByRole('link',{name:'Gửi phản ánh mới'}).click();
      await page.waitForURL('**/login');
      await noOverflow(page);
      await page.screenshot({path:path.join(output,'login-mobile.png'),fullPage:true});
    });
    await check('public data pages show actual API response or connection error',async()=>{
      await page.setViewportSize({width:1440,height:1000});
      await page.goto(`${base}/reports`,{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>{
        const body=document.body.innerText;
        return body.includes('Không thể tải') || body.includes('Chưa có phản ánh') || document.querySelector('.report-card');
      },{},{timeout:35000});
      assert.ok(!/\bNaN\b|\bundefined\b/.test(await page.locator('body').innerText()));
      await noOverflow(page);
      await page.screenshot({path:path.join(output,'reports-desktop.png'),fullPage:true});
    });
    assert.deepEqual(fatalErrors,[],`Unexpected browser errors: ${fatalErrors.join('; ')}`);
    console.log(`Completed ${checks.length} browser smoke checks. No authenticated database workflow was simulated.`);
    await fs.writeFile(path.join(output,'ui-summary.json'),JSON.stringify({checks,errors:fatalErrors,authenticatedWorkflow:'covered separately by ui-workflow.cjs'},null,2));
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
