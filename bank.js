/* Compact searchable catalog + per-source-file content, loaded only when needed. */
(() => {
 const catalog=window.BANK_CATALOG;
 if(!catalog)throw Error('真题索引加载失败，请刷新页面或检查 question-bank 目录。');
 const {papers,meta}=catalog;
 const legacy=new Map((window.REAL_QUESTIONS||[]).map(q=>[q.id,q]));
 const rows=catalog.rows.map(r=>{
  const p=papers[r[1]];
  const q={id:r[0],paperId:p.id,paperIndex:r[1],sourceNumber:r[2],qid:r[3],category:r[4],stem:r[5],answerIndices:r[6],answer:r[6].length===1?r[6][0]:null,optionCount:r[7],flags:r[8],lessonId:r[9],module:p.module,year:p.year,region:p.region,type:'real',gradable:!(r[8]&1),loaded:false};
  Object.defineProperties(q,{
   source:{get:()=>p.title},
   sourceUrl:{get:()=>`https://github.com/ERRRC/xingcezhenti/blob/${meta.commit}/${p.path.split('/').map(encodeURIComponent).join('/')}`},
   sourceNote:{get:()=>`来源文件内第 ${q.sourceNumber} 条（非原卷题号），qid ${q.qid}。第三方整理${p.recall?'／网友回忆版':''}；解析未经考试主管部门认证。`},
   recall:{get:()=>p.recall}
  });
  if(legacy.has(q.id)){const old=legacy.get(q.id);q.options=old.options;q.explanation=old.explanation;q.loaded=true;}
  return q;
 });
 const map=new Map(rows.map(q=>[q.id,q]));
 const pending=new Map();const loadedPapers=new Set();
 function register(id,payload){
  if(!payload||!Array.isArray(payload.questions))throw Error('题目文件格式无效');
  for(const details of payload.questions){const q=map.get(details.id);if(!q)throw Error('题目不在索引中');Object.assign(q,details);q.material=details.materialId?payload.materials[details.materialId]:null;q.loaded=true;}
  loadedPapers.add(id);
 }
 function loadPaper(id){
  if(loadedPapers.has(id))return Promise.resolve();
  if(pending.has(id))return pending.get(id);
  const promise=new Promise((resolve,reject)=>{
   const script=document.createElement('script');script.src='question-bank/papers/'+id+'.js';script.async=true;
   const timeout=setTimeout(()=>finish(new Error('题目加载超时，请重试。')),30000);
   function finish(error){clearTimeout(timeout);script.remove();if(error){pending.delete(id);reject(error);}else resolve();}
   script.onload=()=>finish(loadedPapers.has(id)?null:new Error('题目文件未完整加载，请重试。'));
   script.onerror=()=>finish(new Error('无法加载题目，请确认 question-bank/papers 目录完整。'));
   document.head.appendChild(script);
  });
  pending.set(id,promise);return promise;
 }
 async function ensure(ids){const targets=[...new Set(ids.map(id=>map.get(id)).filter(q=>q&&!q.loaded).map(q=>q.paperId))];await Promise.all(targets.map(loadPaper));}
 function pick(list,count){const a=list.filter(q=>q.gradable);for(let i=0;i<Math.min(count,a.length);i++){const j=i+Math.floor(Math.random()*(a.length-i));[a[i],a[j]]=[a[j],a[i]];}return a.slice(0,count);}
 window.XingzhiBank={meta,papers,rows,map,register,ensure,pick};
 window.REAL_QUESTIONS=rows;
 delete window.BANK_CATALOG;
})();
