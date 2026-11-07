const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createRequire}=require('node:module');
let playwright;
try{playwright=require('playwright');}catch{const runtime=process.env.PLAYWRIGHT_MODULE_DIR||'C:/Users/ww/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';playwright=createRequire(path.join(runtime,'__resolver__.js'))('playwright');}
(async()=>{
 const browser=await playwright.chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const page=await browser.newPage({viewport:{width:1440,height:1050},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4173/');await page.waitForFunction(()=>window.XINGZHI_READY);
 fs.mkdirSync(path.resolve('artifacts'),{recursive:true});
 await page.screenshot({path:'artifacts/home-desktop.png',fullPage:true});
 assert.equal(await page.locator('.module-card').count(),6);
 assert.equal(await page.locator('.metrics strong').first().textContent(),'0 / 36');
 await page.locator('.hero-actions a').first().click();
 await page.getByRole('button',{name:'理解了，进入例题'}).click();
 assert.equal(await page.locator('.feedback').count(),0);
 assert.equal(await page.locator('[data-action="submit"]').isDisabled(),true);
 await page.locator('.option').nth(0).click();await page.locator('[data-action="submit"]').click();
 assert.equal(await page.locator('.feedback.correct').count(),1);
 await page.getByRole('button',{name:'开始即时复测'}).click();
 await page.locator('.option').nth(0).click();await page.locator('[data-action="submit"]').click();
 assert.equal(await page.locator('.feedback.incorrect').count(),1);
 let saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('xingzhi-study-v1')));
 assert.equal(saved.attempts.length,2);assert.equal(saved.attempts[1].correct,false);
 await page.screenshot({path:'artifacts/lesson-feedback.png',fullPage:true});
 await page.locator('nav a[href="#review"]').click();await page.locator('.question-row').waitFor();assert.equal(await page.locator('.question-row').count(),1);
 await page.locator('.question-row').click();await page.locator('.option').nth(1).click();await page.locator('[data-action="submit"]').click();await page.getByRole('button',{name:'查看本轮结果'}).click();
 assert.equal(await page.locator('.result-sheet').count(),1);
 await page.goto('http://127.0.0.1:4173/#review');await page.waitForFunction(()=>window.XINGZHI_READY);
 assert.equal(await page.locator('.empty-state').count(),1);
 await page.goto('http://127.0.0.1:4173/#stats');assert.equal(await page.locator('.stat-tile strong').first().textContent(),'1 / 36');
 await page.goto('http://127.0.0.1:4173/#map');assert.equal(await page.locator('.map-topic').count(),32);assert.equal(await page.locator('.map-point').count(),175);
 await page.locator('#map-search').fill('作者—作品—体裁');assert.equal(await page.locator('.map-point').count(),1);assert.match(await page.locator('.map-point').textContent(),/作者/);
 await page.locator('#map-search').fill('没有这样的知识点XYZ');assert.equal(await page.locator('.empty-state').count(),1);
 await page.getByRole('button',{name:'清空搜索'}).click();assert.equal(await page.locator('.map-point').count(),175);
 await page.getByRole('button',{name:'资料分析',exact:true}).click();assert.ok(await page.locator('.map-topic').count()>0);assert.ok(await page.locator('.map-point').count()<175);
 await page.getByRole('button',{name:'考试策略与复盘'}).click();assert.equal(await page.locator('.map-topic').count(),3);
 await page.locator('.map-topic').filter({hasText:'题目复盘闭环'}).locator('summary').click();assert.equal(await page.locator('.map-point').filter({hasText:'间隔复习'}).count(),1);
 await page.getByRole('button',{name:'全部内容'}).click();
 await page.locator('.map-topic').filter({hasText:'篇章阅读'}).locator('summary').click();await page.getByRole('link',{name:/篇章阅读：按问题回文定位/}).click();assert.equal(await page.locator('.lesson-header h1').textContent(),'篇章阅读：按问题回文定位');
 await page.goto('http://127.0.0.1:4173/#map/reason');await page.locator('.map-topic').filter({hasText:'论证与加强削弱'}).locator('summary').click();await page.screenshot({path:'artifacts/map-topic-desktop.png',fullPage:true});await page.locator('.map-topic').filter({hasText:'论证与加强削弱'}).getByRole('button',{name:'练本专题真题'}).click();await page.locator('.session-heading h1').waitFor();assert.match(await page.locator('.session-heading h1').textContent(),/论证与加强削弱/);assert.match(await page.locator('.question-meta').textContent(),/真题/);
 await page.goto('http://127.0.0.1:4173/#map/reason');assert.ok(await page.locator('.map-point').count()>0);
 await page.screenshot({path:'artifacts/map-desktop.png',fullPage:true});
 await page.goto('http://127.0.0.1:4173/#real');await page.screenshot({path:'artifacts/bank-desktop.png',fullPage:true});
 assert.equal(await page.locator('.question-row').count(),50);assert.match(await page.locator('.list-toolbar').textContent(),/58,890/);
 assert.equal(await page.locator('#bank-module option').count(),7);assert.ok(await page.locator('#bank-year option').count()>10);assert.ok(await page.locator('#bank-region option').count()>10);
 await page.locator('#bank-module').selectOption('reason');assert.equal(await page.locator('.question-row').count(),50);
 const filtered=await page.evaluate(()=>window.XingzhiBank.rows.find(q=>q.module==='reason'&&q.category==='定义判断'));
 await page.locator('#bank-year').selectOption(filtered.year);await page.locator('#bank-region').selectOption(filtered.region);await page.locator('#bank-category').selectOption({label:'定义判断'});assert.ok(await page.locator('.question-row').count()>0);
 await page.locator('#bank-module').selectOption('all');await page.locator('#bank-year').selectOption('all');await page.locator('#bank-region').selectOption('all');await page.locator('#bank-category').selectOption('all');
 await page.locator('[data-action="bank-page"]').last().click();assert.match(await page.locator('.list-toolbar').textContent(),/第 2/);assert.equal(await page.locator('.question-row').count(),50);
 await page.locator('[data-action="bank-page"]').first().click();
 const dynamic=await page.evaluate(()=>window.XingzhiBank.rows.find(q=>q.module==='reason'&&q.category==='定义判断'&&q.gradable&&!q.loaded));assert.ok(dynamic);
 await page.locator('#real-search').fill(dynamic.qid);await page.locator(`.question-row[data-id="${dynamic.id}"]`).click();await page.locator('.question-stem').waitFor();assert.equal(await page.locator('.feedback').count(),0);assert.match(await page.locator('.question-meta').textContent(),new RegExp(dynamic.qid));
 await page.locator('.option').nth(dynamic.answerIndices[0]).click();await page.locator('[data-action="submit"]').click();assert.equal(await page.locator('.feedback.correct').count(),1);assert.ok(await page.locator('.reference-note a').getAttribute('href'));
 const multi=await page.evaluate(()=>window.XingzhiBank.rows.find(q=>q.gradable&&q.answerIndices.length>1));assert.ok(multi);
 await page.goto('http://127.0.0.1:4173/#real');await page.locator('#real-search').fill(multi.qid);await page.locator(`.question-row[data-id="${multi.id}"]`).click();await page.locator('.question-stem').waitFor();
 for(const index of multi.answerIndices)await page.locator('.option').nth(index).click();await page.locator('[data-action="submit"]').click();assert.equal(await page.locator('.feedback.correct').count(),1);
 const readOnly=await page.evaluate(()=>window.XingzhiBank.rows.find(q=>!q.gradable));assert.ok(readOnly);
 await page.goto('http://127.0.0.1:4173/#real');await page.locator('#real-search').fill(readOnly.qid);await page.locator(`.question-row[data-id="${readOnly.id}"]`).click();await page.locator('.question-stem').waitFor();assert.equal(await page.locator('[data-action="submit"]').isDisabled(),true);assert.match(await page.locator('.question-actions').textContent(),/仅供阅读/);
 const illustrated=await page.evaluate(()=>window.XingzhiBank.rows.find(q=>q.gradable&&(q.flags&2)));assert.ok(illustrated);
 await page.goto('http://127.0.0.1:4173/#real');await page.locator('#real-search').fill(illustrated.qid);await page.locator(`.question-row[data-id="${illustrated.id}"]`).click();await page.locator('.question-stem').waitFor();assert.ok(await page.locator('.question-image,.formula-image,.missing-image').count()>0);
 await page.waitForFunction(()=>[...document.querySelectorAll('.question-sheet img')].every(i=>i.complete&&i.naturalWidth>0));await page.screenshot({path:'artifacts/bank-question.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});
 const material=await page.evaluate(()=>window.XingzhiBank.rows.find(q=>q.module==='data'&&q.gradable&&(q.flags&4)));
 await page.goto('http://127.0.0.1:4173/#real');await page.locator('#real-search').fill(material.qid);await page.locator(`.question-row[data-id="${material.id}"]`).click();await page.locator('.material-box').waitFor();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Mobile material overflow');
 await page.screenshot({path:'artifacts/bank-material-mobile.png',fullPage:true});await page.setViewportSize({width:1440,height:1050});
 await page.goto('http://127.0.0.1:4173/#practice');await page.getByRole('button',{name:'开始 5 题复测'}).click();
 for(let i=0;i<5;i++){await page.locator('.option').nth(0).click();await page.locator('[data-action="submit"]').click();await page.locator('[data-action="next-question"]').click();}
 assert.equal(await page.locator('.result-sheet').count(),1);
 const backup=await page.evaluate(()=>localStorage.getItem('xingzhi-study-v1'));
 await page.locator('.avatar').click();await page.locator('#daily-goal').fill('17');await page.getByRole('button',{name:'保存设置'}).click();
 saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('xingzhi-study-v1')));assert.equal(saved.goal,17);
 await page.locator('.avatar').click();await page.locator('#daily-goal').fill('1000');await page.getByRole('button',{name:'保存设置'}).click();assert.equal(await page.locator('#settings').isVisible(),true);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('xingzhi-study-v1')).goal),17);await page.getByRole('button',{name:'关闭设置'}).click();
 await page.locator('#exam-label').fill('江苏常规选调');await page.locator('#exam-label').press('Tab');saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('xingzhi-study-v1')));assert.equal(saved.examLabel,'江苏常规选调');
 await page.locator('.avatar').click();const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'导出备份',exact:true}).click();const download=await downloadPromise;assert.ok(download.suggestedFilename().endsWith('.json'));
 page.once('dialog',d=>d.accept());await page.locator('#import-file').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(backup)});await page.waitForURL('**/#stats');assert.equal(await page.locator('#settings').isVisible(),false);
 await page.locator('.avatar').click();await page.locator('#import-file').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{"bad":true}')});await page.waitForTimeout(100);assert.match(await page.locator('#toast').textContent(),/格式/);await page.getByRole('button',{name:'关闭设置'}).click();
 await page.setViewportSize({width:390,height:844});
 for(const route of ['home','map','real','practice','review','stats','lesson/condition']){
  await page.goto('http://127.0.0.1:4173/#'+route);await page.waitForFunction(()=>window.XINGZHI_READY);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth);
  assert.equal(overflow,false,'Mobile overflow: '+route);
  if(route==='home')await page.screenshot({path:'artifacts/home-mobile.png',fullPage:true});
  if(route==='map'){await page.locator('.map-topic').filter({hasText:'论证与加强削弱'}).locator('summary').click();await page.screenshot({path:'artifacts/map-topic-mobile.png',fullPage:true});}
  if(route==='real'){await page.locator('#real-search').fill('');await page.screenshot({path:'artifacts/bank-mobile.png',fullPage:true});}
 }
 await page.getByRole('button',{name:'理解了，进入例题'}).click();await page.locator('.option').first().click();await page.locator('[data-action="submit"]').click();assert.equal(await page.locator('.feedback.correct').count(),1);
 await page.screenshot({path:'artifacts/lesson-mobile.png',fullPage:true});
 for(const lesson of ['analogy','definition']){await page.goto('http://127.0.0.1:4173/#lesson/'+lesson);await page.locator('[data-action="learn-example"]').click();await page.locator('.option').first().waitFor();}
 // Direct file use must work without a server or remote assets.
 const filePage=await browser.newPage();await filePage.goto('file:///'+path.resolve('index.html').replace(/\\/g,'/'));await filePage.waitForFunction(()=>window.XINGZHI_READY);assert.equal(await filePage.locator('.module-card').count(),6);
 assert.deepEqual(errors,[]);
 console.log('PASS: desktop/mobile, 58,890-question bank, filters, search, pagination, on-demand paper loading, image rendering, multi-select and read-only behavior, lesson flow, review recovery, persistence, 5-question session, settings, backups, direct file use, no JS errors.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
