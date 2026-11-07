"""Import every source occurrence, preserving material relationships and local images."""
import collections
import hashlib
import html
from html.parser import HTMLParser
import json
import pathlib
import re
import shutil
import sys
import urllib.parse

ROOT = pathlib.Path(__file__).resolve().parents[1]
UPSTREAM = next((ROOT / 'sources/upstream').glob('xingcezhenti-*'))
OUT = ROOT / 'question-bank'
OUT.mkdir(exist_ok=True)
(OUT / 'papers').mkdir(exist_ok=True)
COMMIT = (ROOT / 'sources/xingcezhenti-commit.txt').read_text(encoding='utf-8-sig').strip()
MODULES = {'01-政治理论':'politics', '02-常识判断':'general', '03-言语理解与表达':'verbal', '04-数量关系':'math', '05-判断推理':'reason', '06-资料分析':'data'}
legacy = json.loads((ROOT/'real-questions.js').read_text(encoding='utf8').split('window.REAL_QUESTIONS = ',1)[1].rsplit(';',1)[0])
LEGACY = {q['qid']:q for q in legacy}
missing_refs = collections.Counter()
all_refs = set()

class SafeHTML(HTMLParser):
    ALLOWED = {'p','br','b','strong','i','em','u','span','sub','sup','table','thead','tbody','tr','td','th','ul','ol','li','blockquote'}
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts=[]; self.missing=[]; self.images=[]; self.suppressed=0
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        if tag in {'script','style','iframe','object'}:
            self.suppressed+=1; return
        if self.suppressed: return
        if tag=='img':
            src=urllib.parse.unquote(attrs.get('src','')).replace('\\','/')
            relative=src.split('90-图片/',1)[1] if '90-图片/' in src else ''
            parts=pathlib.PurePosixPath(relative).parts
            valid=bool(parts) and not any(p in {'..','.'} for p in parts) and not relative.startswith('/')
            local=UPSTREAM/'90-图片'/relative
            formula='公式图/' in relative or attrs.get('flag')=='tex'
            if not valid or not local.is_file():
                self.missing.append(src); missing_refs[src]+=1
                self.parts.append('<span class="missing-image" role="img" aria-label="原库缺图">[原库缺失'+('公式图' if formula else '配图')+']</span>')
                return
            all_refs.add(relative); self.images.append(relative)
            path='question-bank/images/'+urllib.parse.quote(relative,safe='/')
            width=re.sub(r'[^0-9]','',attrs.get('width',''))
            width_attr=' width="'+str(min(int(width),2000))+'"' if width else ''
            # Formula images retain natural dimensions; question images can shrink responsively.
            self.parts.append('<img class="'+('formula-image' if formula else 'question-image')+'" src="'+html.escape(path,quote=True)+'" alt="'+('公式' if formula else '题目或解析配图')+'" loading="lazy" decoding="async"'+width_attr+'>')
        elif tag in self.ALLOWED:
            self.parts.append('<'+tag+'>')
    def handle_startendtag(self,tag,attrs): self.handle_starttag(tag,attrs)
    def handle_endtag(self,tag):
        if tag in {'script','style','iframe','object'}:
            self.suppressed=max(0,self.suppressed-1); return
        if not self.suppressed and tag in self.ALLOWED and tag!='br': self.parts.append('</'+tag+'>')
    def handle_data(self,data):
        if not self.suppressed:self.parts.append(html.escape(data).replace('\n','<br>'))

def render(text):
    parser=SafeHTML();parser.feed(text.strip());parser.close()
    return ''.join(parser.parts),parser.missing,parser.images

def plain(text):
    text=re.sub(r'<img\b[^>]*>',' [配图] ',text,flags=re.I)
    text=re.sub(r'</p>|<br\s*/?>','\n',text,flags=re.I)
    text=re.sub(r'<[^>]+>','',text)
    return html.unescape(text).strip()

def trim(text): return re.sub(r'\s*\n---\s*$','',text).strip()

def field(text,name):
    m=re.search(r'^'+name+r':\s*"(.*)"\s*$',text,re.M)
    if not m:raise ValueError('Missing field: '+name)
    return m[1]

papers=[];rows=[];counts=collections.Counter();issues=[];multiple=0;material_questions=0;with_images=0;unique_ids=set();title_set=set();source_count=0
lesson_map={'定义判断':'definition','类比推理':'analogy','图形推理':'figure','主旨概括':'mainidea','逻辑填空':'cloze','语句表达':'sequence','比重':'share','平均数':'average','增长':'growth','基期与现期':'growth'}

for folder,module in MODULES.items():
    for file in sorted((UPSTREAM/folder).glob('*.md')):
        if file.name=='README.md':continue
        content=file.read_text(encoding='utf-8-sig')
        title=field(content,'试卷');year=field(content,'年份');region=field(content,'地区');declared=int(field(content,'题数'))
        title_set.add(title);pid='p'+str(len(papers)).zfill(4)
        relative=file.relative_to(UPSTREAM).as_posix()
        paper={'id':pid,'title':title,'year':year,'region':region,'module':module,'path':relative,'count':declared,'recall':'回忆' in title}
        papers.append(paper)
        matches=list(re.finditer(r'^(#{2,3}) (?:材料\s+(\d+)|第\s+(\d+)\s+题\s*<sub>qid\s+(\d+)\s*·\s*([^<]*)</sub>)\s*$',content,re.M))
        details=[];materials={};active_material=None
        for i,m in enumerate(matches):
            body=trim(content[m.end():matches[i+1].start() if i+1<len(matches) else len(content)])
            if m[2]:
                active_material='m'+m[2]
                material_html,missing,imgs=render(body)
                materials[active_material]={'label':'材料 '+m[2],'html':material_html,'missing':missing,'images':imgs}
                continue
            number=int(m[3]);qid=m[4];category=m[5].strip();source_count+=1;unique_ids.add(qid)
            if len(m[1])==2:active_material=None
            answer_match=re.search(r'^\*\*答案\*\*：(.*)$',body,re.M)
            if not answer_match:raise ValueError('No answer marker '+relative+' '+str(number))
            before=body[:answer_match.start()].strip()
            raw_answer=answer_match[1].strip()
            option_matches=list(re.finditer(r'^- \*\*([A-Z])\*\*\.\s?',before,re.M))
            options=[];labels=[]
            for j,o in enumerate(option_matches):
                value=before[o.end():option_matches[j+1].start() if j+1<len(option_matches) else len(before)]
                options.append(re.sub(r'\s*✅\s*$','',value).strip());labels.append(o[1])
            stem=before[:option_matches[0].start()].strip() if option_matches else re.sub(r'\n- （选项）.*$','',before,flags=re.S).strip()
            tail=body[answer_match.end():]
            explanation=trim(tail.split('**官方解析**',1)[1]) if '**官方解析**' in tail else trim(tail)
            answers=[labels.index(c) for c in raw_answer] if raw_answer and all(c in labels for c in raw_answer) else []
            if len(answers)>1:multiple+=1
            stem_html,stem_missing,stem_images=render(stem)
            explanation_html,explanation_missing,explanation_images=render(explanation)
            rendered_options=[render(o) for o in options]
            material=materials.get(active_material,{})
            if material:material_questions+=1
            input_missing=stem_missing+sum([x[1] for x in rendered_options],[])+material.get('missing',[])
            images=stem_images+explanation_images+sum([x[2] for x in rendered_options],[])+material.get('images',[])
            if images:with_images+=1
            problem=[]
            if not options:problem.append('原库未提供选项，保留原文供阅读，不自动判分')
            if not answers:problem.append('原库答案缺失或无法对应选项，不自动判分')
            if input_missing:problem.append('题干、选项或共享材料有原库缺图，不自动判分')
            if explanation_missing:problem.append('参考解析含原库缺图，请结合原始资料核对')
            gradable=bool(options and answers and not input_missing)
            is_legacy=module=='reason' and title=='2025年江苏省公务员录用考试《行测》题（A类）（网友回忆版）' and qid in LEGACY
            ident=LEGACY[qid]['id'] if is_legacy else 'b-'+pid+'-'+str(number)
            lesson_id=LEGACY[qid]['lessonId'] if is_legacy else lesson_map.get(category)
            flags=(0 if gradable else 1)|(2 if images else 0)|(4 if material else 0)|(8 if problem else 0)
            # Shared paper metadata avoids repeating lengthy source titles in the index.
            rows.append([ident,len(papers)-1,number,qid,category,plain(stem),answers,len(options),flags,lesson_id])
            details.append({'id':ident,'stemHtml':stem_html,'options':[plain(o) for o in options],'optionsHtml':[x[0] for x in rendered_options],'optionLabels':labels,'answerIndices':answers,'explanation':plain(explanation),'explanationHtml':explanation_html,'sourceAnswer':raw_answer,'materialId':active_material,'issues':problem,'gradable':gradable,'missingImages':list(set(input_missing+explanation_missing))})
            if problem:issues.append({'id':ident,'source':relative,'number':number,'issues':problem,'missingImages':list(set(input_missing+explanation_missing))})
            counts[module]+=1
        if len(details)!=declared:raise ValueError(f'Count mismatch: {relative}: {len(details)} / {declared}')
        payload={'questions':details,'materials':materials}
        (OUT/'papers'/f'{pid}.js').write_text('window.XingzhiBank.register('+json.dumps(pid)+','+json.dumps(payload,ensure_ascii=False,separators=(',',':'))+');',encoding='utf8')

declared_total=int(field((UPSTREAM/'README.md').read_text(encoding='utf8'),'题数'))
assert len(rows)==declared_total==source_count,(len(rows),declared_total,source_count)
assert len(set(r[0] for r in rows))==len(rows)
print('Copying all source images...',flush=True)
shutil.copytree(UPSTREAM/'90-图片',OUT/'images',dirs_exist_ok=True)
image_files=list((OUT/'images').rglob('*'));image_count=sum(p.is_file() for p in image_files)
meta={'version':2,'commit':COMMIT,'importDate':'2026-11-07','total':len(rows),'papers':len(title_set),'moduleFiles':len(papers),'uniqueQids':len(unique_ids),'images':image_count,'counts':dict(counts),'multipleChoice':multiple,'withMaterial':material_questions,'withImages':with_images,'readOnly':sum(bool(r[8]&1) for r in rows),'missingImageFiles':len(missing_refs),'issueQuestions':len(issues)}
index={'meta':meta,'papers':papers,'rows':rows}
(OUT/'catalog.js').write_text('window.BANK_CATALOG='+json.dumps(index,ensure_ascii=False,separators=(',',':'))+';',encoding='utf8')
(OUT/'import-report.json').write_text(json.dumps({'meta':meta,'missingImages':dict(missing_refs),'issues':issues},ensure_ascii=False,indent=2),encoding='utf8')
(OUT/'metadata.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf8')
(OUT/'SOURCE.md').write_text('# 真题来源\n\nhttps://github.com/ERRRC/xingcezhenti\n\n固定提交：'+COMMIT+'\n\n'+json.dumps(meta,ensure_ascii=False,indent=2)+'\n\n按原卷出现次数完整保留，不跨卷去重。解析按第三方参考解析展示，历史政策和法律题保留原题年代口径。缺失选项、答案或必要图像的题仅阅读，不自动计分。详细问题见 import-report.json。\n',encoding='utf8')
print(json.dumps(meta,ensure_ascii=False,indent=2),flush=True)
print('Catalog bytes:',(OUT/'catalog.js').stat().st_size,flush=True)
