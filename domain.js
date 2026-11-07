(function(root){
function dayKey(value=Date.now()){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));}
function emptyState(){return {version:1,goal:3,examLabel:'',learned:[],attempts:[],lastLesson:'condition'};}
function latestAttempts(attempts){const map=new Map();for(const a of attempts)map.set(a.questionId,a);return [...map.values()];}
function completed(state,lessons){const latest=new Map(latestAttempts(state.attempts).map(a=>[a.questionId,a]));return lessons.filter(l=>latest.get(l.quiz.id)?.correct).map(l=>l.id);}
function wrongQuestions(state){return latestAttempts(state.attempts).filter(a=>!a.correct);}
function normalizeAnswer(answer){return (Array.isArray(answer)?answer:[answer]).slice().sort((a,b)=>a-b);}
function answerIndices(q){return Array.isArray(q.answerIndices)?q.answerIndices:[q.answer];}
function isCorrect(q,answer){return JSON.stringify(normalizeAnswer(answer))===JSON.stringify(answerIndices(q).slice().sort((a,b)=>a-b));}
function streak(attempts,now=Date.now()){const days=new Set(attempts.map(a=>dayKey(a.at)));let count=0;let cursor=new Date(now);if(!days.has(dayKey(cursor)))cursor.setDate(cursor.getDate()-1);while(days.has(dayKey(cursor))){count++;cursor.setDate(cursor.getDate()-1);}return count;}
function validateState(input,lessons,questions){
 if(!input||input.version!==1||!Array.isArray(input.attempts)||!Array.isArray(input.learned)||input.attempts.length>50000)throw Error('备份格式不正确，需使用行知导出的 JSON 文件。');
 const ids=new Set(lessons.map(l=>l.id));const bank=new Map(questions.map(q=>[q.id,q]));
 const state=emptyState();state.goal=Number.isInteger(input.goal)&&input.goal>=1&&input.goal<=999?input.goal:3;state.examLabel=typeof input.examLabel==='string'?input.examLabel.trim().slice(0,40):'';state.lastLesson=ids.has(input.lastLesson)?input.lastLesson:'condition';state.learned=[...new Set(input.learned.filter(id=>ids.has(id)))];
 state.attempts=input.attempts.map(a=>{const q=bank.get(a.questionId);const answer=normalizeAnswer(a.answer);const count=q?.optionCount??q?.options?.length??0;if(!q||q.gradable===false||!answer.length||new Set(answer).size!==answer.length||answer.some(n=>!Number.isInteger(n)||n<0||n>=count)||(answerIndices(q).length===1&&answer.length!==1)||!Number.isFinite(a.at)||a.at<0||a.at>Date.now()+86400000)throw Error('备份中包含无效的作答记录。');return {questionId:q.id,lessonId:q.lessonId,answer:answer.length===1?answer[0]:answer,correct:isCorrect(q,answer),at:a.at,mode:['example','quiz','real','review','practice'].includes(a.mode)?a.mode:'practice'};}).sort((a,b)=>a.at-b.at);
 return state;
}
root.StudyDomain={dayKey,emptyState,latestAttempts,completed,wrongQuestions,streak,validateState,normalizeAnswer,answerIndices,isCorrect};
if(typeof module!=='undefined'&&module.exports)module.exports=root.StudyDomain;
})(typeof window!=='undefined'?window:globalThis);
