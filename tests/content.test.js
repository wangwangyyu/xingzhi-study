const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const {modules,lessons}=require('../data');
const D=require('../domain');
const map=require('../knowledge-map');
const ctx={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../real-questions.js'),'utf8'),ctx);
const real=ctx.window.REAL_QUESTIONS;
const questions=[...lessons.flatMap(l=>[l.example,l.quiz]),...real];
const bankCtx={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../question-bank/catalog.js'),'utf8'),bankCtx);
const bank=bankCtx.window.BANK_CATALOG;
test('所有考点都有可作答的例题、复测与完整知识卡',()=>{
 assert.equal(modules.length,6);assert.equal(lessons.length,36);
 assert.equal(new Set(questions.map(q=>q.id)).size,questions.length);
 for(const m of modules)assert.ok(lessons.filter(l=>l.module===m.id).length>=4);
 for(const l of lessons){for(const key of ['title','summary','signal','formula','pitfall'])assert.ok(l[key]);assert.equal(l.steps.length,3);}
 for(const q of questions){assert.ok(q.stem);assert.equal(q.options.length,4);assert.ok(q.options.every(x=>typeof x==='string'&&x.trim()));assert.ok(q.answer>=0&&q.answer<4);assert.ok(q.explanation);assert.ok(!q.options.some(x=>x.includes('✅')||x.includes('**答案**')));}
});
test('思维导图知识点完整进入地图，所有原创课程均有关联专题',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../行测知识点思维导图.md'),'utf8');
 const headings=source.split(/\r?\n/).filter(line=>line.startsWith('### ')).length;
 const points=source.split(/\r?\n/).filter(line=>line.startsWith('#### ')).length;
 assert.equal(map.meta.topics,headings);assert.equal(map.meta.points,points);assert.equal(map.topics.length,32);assert.equal(map.meta.corrections,3);
 assert.equal(new Set(map.topics.map(t=>t.id)).size,map.topics.length);
 for(const topic of map.topics){assert.ok(topic.points.length,topic.title);for(const point of topic.points){assert.ok(point.text);assert.ok(point.sourceLine>0);}}
 const linked=new Set(map.topics.flatMap(t=>t.lessons.map(l=>l.id)));assert.deepEqual([...linked].sort(),lessons.map(l=>l.id).sort());
 assert.ok(map.topics.find(t=>t.title==='篇章阅读（部分省考/专项）').lessons.some(l=>l.id==='passage'));
 assert.ok(map.topics.find(t=>t.title==='公文与行政管理').lessons.some(l=>l.id==='documents'));
 assert.ok(map.topics.find(t=>t.title==='历史人文').lessons.some(l=>l.id==='history'));
 assert.ok(map.topics.find(t=>t.title==='题目复盘闭环').points.length>0);
 assert.equal(fs.readFileSync(path.join(__dirname,'../knowledge-map.js'),'utf8').includes(map.meta.sha256),true);
});
test('完整题库索引包含所有模块、试卷、题目与本地题目文件',()=>{
 assert.equal(bank.meta.total,58890);assert.equal(bank.meta.papers,515);assert.equal(bank.papers.length,2956);assert.equal(bank.rows.length,58890);
 assert.deepEqual(JSON.parse(JSON.stringify(bank.meta.counts)),{politics:2305,general:9163,verbal:16000,math:6448,reason:16859,data:8115});
 assert.equal(bank.rows.reduce((n,r)=>n+(r[8]&1?1:0),0),bank.meta.readOnly);
 assert.ok(fs.existsSync(path.join(__dirname,'../question-bank/papers/p0000.js')));
 assert.ok(fs.existsSync(path.join(__dirname,'../question-bank/papers/p2955.js')));
 assert.ok(fs.existsSync(path.join(__dirname,'../question-bank/images')));
 const source=fs.readFileSync(path.join(__dirname,'../question-bank/SOURCE.md'),'utf8');assert.ok(source.includes(bank.meta.commit));
});
test('江苏 2025 判断推理回忆题仍可访问并保留来源与题库编号',()=>{
 assert.equal(real.length,28);
 const source=fs.readFileSync(path.join(__dirname,'../sources/jiangsu-2025-judgment.md'),'utf8');
 for(const q of real){assert.ok(q.sourceUrl.startsWith('https://github.com/ERRRC/xingcezhenti/'));assert.ok(q.source.includes('回忆版'));assert.ok(source.includes('qid '+q.qid));assert.ok(!/<img|!\[|<sub>/.test(q.stem+q.options.join('')+q.explanation));assert.ok(q.sourceNumber>=3);}
});
test('全部分卷内容与索引对应，材料关系完整，图片引用可在本地读取',()=>{
 const byId=new Map(bank.rows.map(r=>[r[0],r]));const seen=new Set(),images=new Set();let materials=0;
 const context=vm.createContext({window:{XingzhiBank:{register(pid,payload){
  for(const q of payload.questions){
   const row=byId.get(q.id);assert.ok(row,q.id);assert.equal(bank.papers[row[1]].id,pid);assert.ok(!seen.has(q.id));seen.add(q.id);
   assert.equal(q.options.length,row[7],q.id);assert.equal(q.optionsHtml.length,row[7]);assert.deepEqual(Array.from(q.answerIndices),Array.from(row[6]));assert.equal(q.gradable,!(row[8]&1));
   if(q.gradable){assert.ok(q.answerIndices.length);assert.ok(q.answerIndices.every(i=>i>=0&&i<q.options.length));}
   const material=q.materialId?payload.materials[q.materialId]:null;if(q.materialId){assert.ok(material,q.id);materials++;}
   const html=[q.stemHtml,...q.optionsHtml,q.explanationHtml,material?.html||''].join('');
   assert.ok(!/<(?:script|iframe|object)|\son\w+=|javascript:/i.test(html),q.id);
   for(const match of html.matchAll(/<img[^>]*src="([^"]+)"/g))images.add(decodeURIComponent(match[1]));
  }
 }}}});
 for(const paper of bank.papers)vm.runInContext(fs.readFileSync(path.join(__dirname,'../question-bank/papers',paper.id+'.js'),'utf8'),context);
 assert.equal(seen.size,58890);assert.equal(materials,bank.meta.withMaterial);
 for(const image of images){assert.ok(image.startsWith('question-bank/images/'));assert.ok(fs.existsSync(path.join(__dirname,'..',image)),image);}
});
test('多选判分、漏选、备份恢复和只读题边界',()=>{
 const q={id:'multi',optionCount:8,answerIndices:[0,4,7],gradable:true};
 assert.equal(D.isCorrect(q,[7,0,4]),true);assert.equal(D.isCorrect(q,[0,4]),false);assert.equal(D.isCorrect(q,[0,4,6,7]),false);
 const s=D.emptyState();s.attempts=[{questionId:q.id,answer:[7,0,4],at:Date.now(),correct:false}];
 assert.equal(D.validateState(s,lessons,[q]).attempts[0].correct,true);
 assert.throws(()=>D.validateState(s,lessons,[{...q,gradable:false}]));
 s.attempts[0].answer=[0,0,4,7];assert.throws(()=>D.validateState(s,lessons,[q]));
});
test('每日目标支持自定义整数，备考标签会随备份保存并做长度校验',()=>{
 const s=D.emptyState();s.goal=37;s.examLabel='  江苏常规选调  ';
 const restored=D.validateState(s,lessons,questions);assert.equal(restored.goal,37);assert.equal(restored.examLabel,'江苏常规选调');
 s.goal=1000;assert.equal(D.validateState(s,lessons,questions).goal,3);
 s.goal=5;s.examLabel='选调'.repeat(30);assert.equal(D.validateState(s,lessons,questions).examLabel.length,40);
 s.goal=0;assert.equal(D.validateState(s,lessons,questions).goal,3);
});
test('浏览和例题作答不算复测通过，独立复测正确才算',()=>{
 const l=lessons[0],s=D.emptyState();s.learned.push(l.id);assert.deepEqual(D.completed(s,lessons),[]);
 s.attempts.push({questionId:l.example.id,correct:true});assert.deepEqual(D.completed(s,lessons),[]);
 s.attempts.push({questionId:l.quiz.id,correct:true});assert.deepEqual(D.completed(s,lessons),[l.id]);
 s.attempts.push({questionId:l.quiz.id,correct:false});assert.deepEqual(D.completed(s,lessons),[]);
});
test('答错进入复习，重做正确移出队列，历史不会被删除',()=>{
 const s=D.emptyState();s.attempts.push({questionId:'a',correct:false});assert.equal(D.wrongQuestions(s).length,1);
 s.attempts.push({questionId:'a',correct:true});assert.equal(D.wrongQuestions(s).length,0);assert.equal(s.attempts.length,2);
});
test('备份导入重新计算正确性，并拒绝非法题目与答案',()=>{
 const s=D.emptyState();const q=questions[0];s.attempts=[{questionId:q.id,answer:q.answer,correct:false,at:Date.now()}];
 assert.equal(D.validateState(s,lessons,questions).attempts[0].correct,true);
 s.attempts[0].answer=8;assert.throws(()=>D.validateState(s,lessons,questions));
 s.attempts[0].answer=0;s.attempts[0].questionId='unknown';assert.throws(()=>D.validateState(s,lessons,questions));
});
test('日期按北京时间计算，断一天的连续记录不会夸大',()=>{
 assert.equal(D.dayKey(Date.parse('2026-11-07T17:00:00Z')),'2026-11-08');
 const now=Date.parse('2026-11-07T12:00:00+08:00');
 const list=[{at:Date.parse('2026-11-06T12:00:00+08:00')},{at:Date.parse('2026-11-05T12:00:00+08:00')}];
 assert.equal(D.streak(list,now),2);list.push({at:now});assert.equal(D.streak(list,now),3);
 assert.equal(D.streak([{at:now-3*86400000}],now),0);
});
