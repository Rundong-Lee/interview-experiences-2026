'use strict';
const $=id=>document.getElementById(id), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let data, selected='全部题目', current=null, busy=false, dirty=false, patternDirty=false;
const GROUPS={
 '数组与字符串':['数组与矩阵','字符串','哈希表','双指针','快慢指针','滑动窗口','前缀和','二分搜索'],
 '链表、栈与队列':['链表','栈与队列','单调栈','单调队列'],
 '树与图':['树','二叉树','二叉搜索树','DFS','BFS','拓扑排序','并查集','图'],
 '搜索与动态规划':['递归','回溯','分治','动态规划','贪心'],
 '排序与其他':['排序','堆','快速选择','数学','随机算法','位运算','模拟','设计'],
 '专项与待核对':['并发','SQL','深度学习','搜索','待核对']
};
const METHODS=Object.fromEntries(Object.values(GROUPS).flat().map(name=>[name,{question:name,guide:'用自己的话总结 '+name+'：适用条件 → 核心步骤 → 易错边界 → 相似题的区别。先练一道再总结，不必提前填满。'}]));
function matchingSources(p){return (p.sources||[]).filter(s=>(!$('roleFilter').value||s.role===$('roleFilter').value)&&(!$('kindFilter').value||(s.kind||p.kind)===$('kindFilter').value))}
function frequency(p){return new Set(matchingSources(p).map(s=>s.sourceKey||s.source||s.title)).size}
function inCatalogFilter(p){return !p.kind||matchingSources(p).length>0}
const splitTags=s=>[...new Set(s.split(/[,，、]/).map(t=>t.trim()).filter(Boolean))];
function fillSelect(id,options,empty){const old=$(id).value;$(id).innerHTML=(empty?`<option value="">${esc(empty)}</option>`:'')+options.map(([value,label])=>`<option value="${esc(value)}">${esc(label)}</option>`).join('');if([...$(id).options].some(o=>o.value===old))$(id).value=old}
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
function notify(s,error=false){$('notice').textContent=s;$('notice').classList.toggle('error',error);if($('detail').open){let message=$('detailMessage');if(!message){message=document.createElement('p');message.id='detailMessage';message.setAttribute('role','status');$('detail').querySelector('.dialoghead').append(message)}message.textContent=s;message.style.color=error?'#aa302b':'#276957'}}
function categories(){return [...new Set(data.problems.flatMap(p=>[p.category,...(p.methods||[])]).concat(Object.keys(data.patterns)))].sort()}
async function persist(next){
 if(busy)return false;busy=true;document.querySelectorAll('button').forEach(b=>b.disabled=true);
 try{const r=await fetch('/api/study',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(next)});if(!r.ok)throw Error(await r.text());data=await r.json();notify('已保存 · '+new Date().toLocaleTimeString());render();return true}catch(e){notify('保存失败，内容仍留在编辑框中：'+e.message,true);return false}finally{busy=false;document.querySelectorAll('button').forEach(b=>b.disabled=false)}
}
function render(){
 fillSelect('companyFilter',[...new Set(data.problems.flatMap(p=>p.companies||[]))].sort().map(c=>[c,c]),'全部公司');
 const cats=categories();
 const ps=data.problems.filter(inCatalogFilter),done=ps.filter(p=>p.status==='已独立完成').length,review=ps.filter(p=>p.status==='待复写').length;
 $('stats').innerHTML=[['题目',ps.length],['有练习记录',ps.filter(p=>p.attempts.length).length],['待复写',review],['已独立完成',done]].map(([a,b])=>`<div class="stat"><span class="muted">${a}</span><b>${b}</b></div>`).join('');
 const sections=['全部题目','待复写','尚未归纳',...Object.keys(METHODS)];
 const matches=(p,c)=>c==='全部题目'||c==='待复写'&&p.status==='待复写'||c==='尚未归纳'&&!(p.methods||[]).length||(p.methods||[]).includes(c);
 const navButton=c=>`<button class="${selected===c?'active':''}" data-category="${esc(c)}">${esc(c)} <small>${ps.filter(p=>matches(p,c)).length}</small></button>`;
 $('nav').innerHTML='<h3>常用方法</h3><p class="muted">一道题可有多个标签</p>'+sections.slice(0,3).map(navButton).join('')+Object.entries(GROUPS).map(([group,tags])=>`<details ${tags.includes(selected)?'open':''}><summary>${esc(group)}</summary>${tags.map(navButton).join('')}</details>`).join('');
 $('nav').querySelectorAll('button').forEach(b=>b.onclick=()=>{selected=b.dataset.category;render()});
 $('categories').innerHTML=cats.map(c=>`<option value="${esc(c)}"></option>`).join('');
 fillSelect('patternCategory',[...Object.keys(METHODS).map(c=>[c,METHODS[c].question]),...Object.keys(data.methodNotes||{}).filter(c=>!METHODS[c]).map(c=>['oldmethod:'+c,'旧方法笔记 / '+c]),...Object.keys(data.patterns).map(c=>['legacy:'+c,'原有题型笔记 / '+c])]);
 const query=$('search').value.toLowerCase(),status=$('status').value,company=$('companyFilter').value;
 const visible=ps.filter(p=>matches(p,selected)&&(!status||p.status===status)&&(!company||(p.companies||[]).includes(company))&&(!query||JSON.stringify(p).toLowerCase().includes(query)));
 visible.sort((a,b)=>$('sortOrder').value==='frequency'?frequency(b)-frequency(a)||a.name.localeCompare(b.name,'zh-CN'):a.name.localeCompare(b.name,'zh-CN'));
 $('frequencyInfo').textContent=`显示 ${visible.length} 题 / 全库 ${data.problems.length} 题。频率 = 当前岗位和题目类型下的去重来源数。同一帖同题算一次，4 组疑似转载保守合并；不是命中概率。`;
 $('list').innerHTML='<div class="cards">'+visible.map(p=>{const filled=Object.values(p.notes).filter(t=>t.trim()).length;const last=p.attempts.at(-1);return `<button class="card" data-id="${esc(p.id)}"><span class="pill">${esc(p.category)}</span><h3>${esc(p.name)}</h3><p><b>${frequency(p)} 个去重来源</b> <small>· ${matchingSources(p).length} 条记录 · ${esc([...new Set(matchingSources(p).map(s=>s.kind||p.kind||'自选题'))].join(' / ')||'自选题')}</small></p><span class="pill ${p.status==='已独立完成'?'done':p.status==='待复写'?'review':''}">${esc(p.status)}</span><p class="muted">${esc((p.methods||[]).join(' · ')||'可以练完再归纳方法')}</p><p class="muted">${last?esc(last.date+' · '+last.result):'还没有练习记录'}</p><footer><span>${p.attempts.length} 次练习 · ${esc((p.companies||[]).join(' / ')||'通用题')}</span><span>${filled?'已写总结':'总结待记录'}</span></footer></button>`}).join('')+'</div>'+(visible.length?'':'<div class="empty">这里还没有匹配的题目。试试调整筛选，或添加题目。</div>');
 $('list').querySelectorAll('.card').forEach(b=>b.onclick=()=>openProblem(b.dataset.id));updateRelated();
}
function getCurrent(){return data.problems.find(p=>p.id===current)}
function openProblem(id){current=id;const p=getCurrent();$('detailTitle').textContent=p.name;$('detailCategory').textContent=p.category;$('editCategory').value=p.category;$('editStatus').value=p.status;$('editCompanies').value=(p.companies||[]).join(', ');$('editMethods').innerHTML=Object.keys(METHODS).map(m=>`<label><input type="checkbox" value="${esc(m)}" ${(p.methods||[]).includes(m)?'checked':''}>${esc(METHODS[m].question)}</label>`).join('');$('detailMessage')?.remove();
 for(const [k,n] of Object.entries({signal:'Signal',idea:'Idea',pitfall:'Pitfall',transfer:'Transfer'}))$('note'+n).value=p.notes[k]||'';
 $('attemptDate').value=today();$('attemptMinutes').value='';$('attemptResult').selectedIndex=0;$('attemptNotes').value='';$('attemptCode').value='';dirty=false;renderDetail();$('detail').showModal();
}
function renderDetail(){const p=getCurrent();$('history').innerHTML=p.attempts.length?[...p.attempts].reverse().map(a=>`<div class="record"><b>${esc(a.date)} · ${esc(a.result)}</b>${a.minutes?' · '+esc(a.minutes)+' 分钟':''}<div>${esc(a.notes)}</div>${a.code?'<details><summary>查看当次代码</summary><pre style="overflow:auto">'+esc(a.code)+'</pre></details>':''}</div>`).join(''):'<p class="muted">还没有记录。你可以补录以前刷题的经历。</p>';
 $('sourceSummary').textContent=`来源面经（${p.sources.length} 条原始记录；当前筛选去重后 ${frequency(p)} 个来源）`;$('sources').innerHTML=p.sources.map(s=>`<div class="source"><b>${esc(s.title)}</b><p class="muted">${esc(s.role||'')} · ${esc(s.kind||'')} ${esc(s.dedupNote||'')}</p>${s.line?'<p class="muted">原文第 '+esc(s.line)+' 行 · 非力扣题号</p>':''}<p>${esc(s.excerpt||'')}</p>${/^https?:\/\//.test(s.source||'')?'<a target="_blank" rel="noopener" href="'+esc(s.source)+'">打开来源原帖 ↗</a>':''}</div>`).join('')||'<p class="muted">这是你新增的题目，暂未填写来源。</p>'}
function notesInto(p){p.companies=splitTags($('editCompanies').value);p.methods=[...$('editMethods').querySelectorAll('input:checked')].map(x=>x.value);p.status=$('editStatus').value;p.category=$('editCategory').value.trim()||'未分类';for(const [k,n] of Object.entries({signal:'Signal',idea:'Idea',pitfall:'Pitfall',transfer:'Transfer'}))p.notes[k]=$('note'+n).value}
$('saveNotes').onclick=async()=>{const next=structuredClone(data);notesInto(next.problems.find(p=>p.id===current));if(await persist(next)){dirty=Boolean($('attemptNotes').value||$('attemptCode').value||$('attemptMinutes').value);$('detailCategory').textContent=getCurrent().category}};
$('saveAttempt').onclick=async()=>{if(!$('attemptDate').value){notify('请填写练习日期。',true);return}const m=$('attemptMinutes').value;if(m&&(!Number.isInteger(Number(m))||Number(m)<1||Number(m)>1440)){notify('耗时请填 1–1440 之间的整数，或留空。',true);return}const next=structuredClone(data),p=next.problems.find(p=>p.id===current);notesInto(p);p.attempts.push({id:crypto.randomUUID(),date:$('attemptDate').value,minutes:m?Number(m):null,result:$('attemptResult').value,notes:$('attemptNotes').value,code:$('attemptCode').value});if(await persist(next)){dirty=false;$('attemptNotes').value='';$('attemptCode').value='';$('attemptMinutes').value='';renderDetail()}};
function closeDetail(e){if(dirty&&!confirm('还有未保存的修改。确定放弃并关闭吗？')){e?.preventDefault();return}$('detail').close();dirty=false}
$('closeDetail').onclick=closeDetail;$('detail').addEventListener('cancel',closeDetail);$('detail').addEventListener('input',()=>dirty=true);$('detail').addEventListener('change',()=>dirty=true);
$('search').oninput=render;for(const id of ['status','companyFilter','roleFilter','kindFilter','sortOrder'])$(id).onchange=render;
function updateRelated(){const key=$('patternCategory').value,legacy=key.startsWith('legacy:'),cat=key.slice(7);const ps=data.problems.filter(p=>legacy?p.category===cat:(p.methods||[]).includes(key));$('methodGuide').textContent=legacy?'原有笔记原样保留，可继续编辑。':METHODS[key]?.guide||'';$('related').innerHTML='同类题对比：<br>'+ps.map(p=>`<button data-id="${esc(p.id)}">${esc(p.name)}</button>`).join('');$('related').querySelectorAll('button').forEach(b=>b.onclick=()=>openProblem(b.dataset.id))}
function loadPattern(){const key=$('patternCategory').value,p=(key.startsWith('legacy:')?data.patterns[key.slice(7)]:(data.methodNotes||{})[key.replace(/^oldmethod:/,'')])||{};for(const [k,n] of Object.entries({signal:'Signal',invariant:'Invariant',diff:'Diff',error:'Error'}))$('pattern'+n).value=p[k]||'';patternDirty=false;priorPattern=key;updateRelated()}
let priorPattern='';$('patternCategory').onfocus=()=>priorPattern=$('patternCategory').value;$('patternCategory').onchange=()=>{if(patternDirty&&!confirm('当前方法笔记未保存，确定切换吗？')){$('patternCategory').value=priorPattern;return}loadPattern();priorPattern=$('patternCategory').value};
$('patterns').addEventListener('input',e=>{if(e.target.tagName==='TEXTAREA')patternDirty=true});
$('toggle').onclick=()=>{const show=$('patterns').classList.contains('hidden');$('patterns').classList.toggle('hidden',!show);$('list').classList.toggle('hidden',show);$('toggle').textContent=show?'返回题目清单':'方法笔记';if(show&&!patternDirty)loadPattern()};
$('savePattern').onclick=async()=>{const next=structuredClone(data),p={};for(const [k,n] of Object.entries({signal:'Signal',invariant:'Invariant',diff:'Diff',error:'Error'}))p[k]=$('pattern'+n).value;const key=$('patternCategory').value;if(key.startsWith('legacy:'))next.patterns[key.slice(7)]=p;else{next.methodNotes??={};next.methodNotes[key.replace(/^oldmethod:/,'')]=p;}if(await persist(next))patternDirty=false};
$('add').onclick=()=>$('newProblem').showModal();$('cancelAdd').onclick=()=>$('newProblem').close();$('addForm').onsubmit=async e=>{e.preventDefault();const name=$('newName').value.trim(),category=$('newCategory').value.trim();if(!name||!category)return;const next=structuredClone(data),id=crypto.randomUUID();next.problems.push({id,name,category,status:'未开始',priority:'自选',companies:splitTags($('newCompanies').value),campaigns:[],methods:[],notes:{signal:'',idea:'',pitfall:'',transfer:''},attempts:[],sources:$('newSource').value.trim()?[{title:$('newSource').value.trim(),source:'',excerpt:''}]:[]});if(await persist(next)){$('newProblem').close();$('addForm').reset();openProblem(id)}};
$('export').onclick=()=>{const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='coding-study-'+today()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('已导出已保存的学习记录。编辑框中未保存的内容不包含在备份里。')};
window.addEventListener('beforeunload',e=>{if(dirty||patternDirty){e.preventDefault();e.returnValue=''}});
async function init(){try{const r=await fetch('/api/study');if(!r.ok)throw Error('无法读取学习记录');data=await r.json();render();$('connection').textContent='本机文件保存 · 手动保存';notify('')}catch(e){$('connection').textContent='未连接';notify('请通过“启动看板.cmd”打开，不能直接双击 HTML。'+e.message,true);$('add').disabled=true;$('export').disabled=true}}
init();
