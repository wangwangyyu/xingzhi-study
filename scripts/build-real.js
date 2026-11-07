const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'sources/jiangsu-2025-judgment.md'),'utf8');
const url='https://github.com/ERRRC/xingcezhenti/blob/main/'+encodeURIComponent('05-判断推理')+'/'+encodeURIComponent('2025年江苏省公务员录用考试《行测》题（A类）（网友回忆版）.md');
function clean(s){return s.replace(/<\/p>/g,'\n').replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' ').replace(/&gt;/g,'>').replace(/&lt;/g,'<').replace(/&amp;/g,'&').replace(/✅/g,'').replace(/\*\*/g,'').trim();}
const questions=[];
for(const block of source.split(/(?=^### 第 )/m).slice(1)){
 const match=block.match(/^### 第 (\d+) 题.*?qid (\d+) · ([^<]+)/);
 if(!match)continue;
 const num=Number(match[1]);
 // Exclude image-dependent and shared-material questions. Keep reference text verbatim.
 if(num<3 || /<img|!\[/.test(block) || num===25)continue;
 const parts=block.split(/\*\*答案\*\*：/);
 // Multiline options need boundaries at the next option or answer marker.
 const optionSection=parts[0].slice(parts[0].indexOf('- **A**.'));
 const opts=optionSection.split(/^- \*\*[A-D]\*\*\. /m).slice(1).map(clean);
 const answer=(parts[1]||'').trim()[0];
 if(opts.length!==4 || !'ABCD'.includes(answer))throw Error('Invalid question '+num);
 const category=clean(match[3]);
 const stem=clean(parts[0].split('\n').slice(1).join('\n').split('- **A**.')[0]);
 let explanation=clean((parts[1]||'').split('**官方解析**')[1]||'').replace(/\n---[\s\S]*$/,'').trim();
 if(!stem||!explanation)throw Error('Missing content '+num);
 questions.push({id:'js2025-'+match[2],lessonId:category==='定义判断'?'definition':category==='类比推理'?'analogy':num===23?'condition':'argument',module:'reason',type:'real',category,stem,options:opts,answer:'ABCD'.indexOf(answer),explanation,source:'2025 江苏 A 类 · 网友回忆版',sourceUrl:url,qid:match[2],sourceNumber:num,sourceNote:'编号为来源文件内序号，不是原卷题号。解析为第三方题库参考解析，未核实考试主管部门官方出处。'});
}
fs.writeFileSync(path.join(root,'real-questions.js'),'/* 来源：ERRRC/xingcezhenti；回忆版，仅保留无需图片或共享材料的条目。 */\nwindow.REAL_QUESTIONS = '+JSON.stringify(questions,null,2)+';\n');
console.log('已生成 '+questions.length+' 道有来源的判断推理回忆题');
