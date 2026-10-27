export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const defaultContact={title:'联系与反馈',enabled:false,statusText:'联系入口尚未开放',description:'专用邮箱待配置，配置后将在这里提供真实可用的联系信息。',email:''};
export const validEmail=value=>typeof value==='string'&&/^[A-Za-z0-9._%+-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,}$/.test(value);
export function renderContact(contact){
 const c={...defaultContact,...contact};
 const email=c.enabled&&validEmail(c.email)?c.email:'';
 return `<div class="info-panel"><h2>${escapeHtml(c.title)}</h2><span class="contact-status">${escapeHtml(c.statusText)}</span><p>${escapeHtml(c.description).replace(/\n/g,'<br>')}</p>${email?`<div class="contact-actions"><a href="mailto:${encodeURIComponent(email)}">${escapeHtml(email)} ↗</a><button type="button" data-copy-email="${escapeHtml(email)}">复制邮箱</button><span class="copy-status" role="status"></span></div>`:''}</div>`;
}
export function bindContactCopy(root){
 root.querySelectorAll('[data-copy-email],[data-copy-contact]').forEach(button=>button.addEventListener('click',async()=>{const value=button.dataset.copyEmail||button.dataset.copyContact;const label=button.dataset.copyEmail?'邮箱':'联系方式';const status=button.parentElement.querySelector('.copy-status');try{await navigator.clipboard.writeText(value);status.textContent=`已复制${label}`;}catch{status.textContent=`请手动选择并复制${label}`;}}));
}
export function renderAuthorContact(author){
 const a=author&&typeof author==='object'?author:{};const c=a.contact&&typeof a.contact==='object'?a.contact:{};
 const labels={email:'邮箱',wechat:'微信',qq:'QQ',other:'联系方式'},label=labels[c.type]||labels.other;
 const enabled=!!c.enabled&&typeof c.value==='string'&&c.value.trim();
 if(!a.name&&!enabled)return '';
 const value=escapeHtml(c.value||''),copy=escapeHtml(c.value||'');
 const contact=enabled?`<div class="contact-actions">${c.type==='email'&&validEmail(c.value)?`<a href="mailto:${encodeURIComponent(c.value)}">${value} ↗</a>`:`<span class="contact-value">${label}：${value}</span>`}<button type="button" data-copy-contact="${copy}">复制${label}</button><span class="copy-status" role="status"></span></div>${c.note?`<p class="author-contact-note">${escapeHtml(c.note)}</p>`:''}`:'';
 return `<div class="info-panel author-panel"><h2>关于作者</h2>${a.name?`<p>作者署名：${escapeHtml(a.name)}</p>`:''}${contact}</div>`;
}
export function safeHref(value) {
  try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) ? u.href : ''; } catch { return ''; }
}
export function renderBlocks(blocks = []) {
  return blocks.map(b => {
    if (b.type === 'heading') return `<h${b.level === 3 ? 3 : 2}>${escapeHtml(b.text)}</h${b.level === 3 ? 3 : 2}>`;
    if (b.type === 'paragraph') return `<p>${escapeHtml(b.text).replace(/\n/g,'<br>')}</p>`;
    if (b.type === 'quote') return `<blockquote>${escapeHtml(b.text)}</blockquote>`;
    if (b.type === 'list') { const t = b.ordered ? 'ol' : 'ul'; return `<${t}>${(b.items || []).map(s => `<li>${escapeHtml(s)}</li>`).join('')}</${t}>`; }
    if (b.type === 'link') { const url = safeHref(b.href); return url ? `<p><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(b.label)} ↗</a></p>` : ''; }
    return '';
  }).join('');
}
const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
const nonempty = s => typeof s === 'string' && s.trim().length > 0;
export function validateBundle(bundle, {mode = 'demo'} = {}) {
  const errors = [], warnings = [];
  const error = (file, field, message) => errors.push({file, field, message});
  if (!bundle || !bundle.site || !Array.isArray(bundle.articles) || !Array.isArray(bundle.faqs)) return {errors:[{file:'内容',field:'结构',message:'需要 site、articles 和 faqs'}],warnings};
  if (!nonempty(bundle.site.name) || !nonempty(bundle.site.slogan)) error('site.json','name / slogan','站名和口号不能为空');
  const cats = bundle.site.categories;
  if (!cats || !Object.keys(cats).length) error('site.json','categories','至少需要一个分类');
  for (const [key,c] of Object.entries(cats || {})) {
    if (!/^[a-z][a-z0-9-]*$/.test(key) || !c || !['name','subtitle','description','word','english'].every(k=>nonempty(c[k]))) error('site.json',`categories.${key}`,'分类代码及名称、说明等字段不完整');
  }
  const ids = new Set(), slugs = new Set();
  function blocksCheck(blocks, file, field, draft) {
    if (!Array.isArray(blocks) || (!draft && !blocks.length)) { error(file,field,'正文必须是内容块列表，发布内容不能为空'); return; }
    blocks.forEach((b,i) => {
      const key=`${field}[${i}]`;
      if (!b || !['heading','paragraph','list','quote','link'].includes(b.type)) { error(file,key,'不支持的正文块类型'); return; }
      if (['heading','paragraph','quote'].includes(b.type) && (typeof b.text !== 'string' || (!draft && !nonempty(b.text)))) error(file,key,'文字不能为空');
      if (b.type === 'heading' && ![2,3].includes(b.level)) error(file,key,'小标题级别只能是 2 或 3');
      if (b.type === 'list' && (!Array.isArray(b.items) || (!draft && (!b.items.length || !b.items.every(nonempty))) || !b.items.every(s=>typeof s==='string') || typeof b.ordered !== 'boolean')) error(file,key,'列表需要文字条目和排序类型');
      if (b.type === 'link' && ((!draft || b.href || b.label) && (!safeHref(b.href) || !nonempty(b.label)))) error(file,key,'链接需有名称，且仅支持 http / https');
    });
  }
  if (bundle.site.about !== undefined) {
    const about=bundle.site.about;
    if (!about || !nonempty(about.title) || typeof about.summary !== 'string') error('site.json','about','关于页面需要标题和文字简介');
    else blocksCheck(about.bodyBlocks,'site.json','about.bodyBlocks',false);
    if (about?.contact !== undefined) {
      const c=about.contact;
      if(!c || !nonempty(c.title) || !nonempty(c.statusText) || typeof c.description!=='string' || typeof c.enabled!=='boolean' || typeof c.email!=='string') error('site.json','about.contact','联系区域需要标题、状态说明、文字说明、开放状态和邮箱字段');
      else if((c.enabled || c.email) && !validEmail(c.email)) error('site.json','about.contact.email','请填写有效邮箱；开放联系时邮箱不能为空');
    }
  }
  for (const [kind,records] of [['articles',bundle.articles],['faqs',bundle.faqs]]) {
    records.forEach((r,index) => {
      const file=`${kind}/${r?.id || index}.json`;
      if (!r || typeof r !== 'object') { error(file,'结构','内容应为对象'); return; }
      if (r.schemaVersion !== 2) error(file,'schemaVersion','内容规范必须为 2');
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(r.id || '')) error(file,'id','ID 只能用小写字母、数字和中划线');
      if (ids.has(r.id)) error(file,'id','ID 重复'); ids.add(r.id);
      if (!cats || !Object.hasOwn(cats,r.category)) error(file,'category','分类不存在');
      if (!['draft','published'].includes(r.publicationState)) error(file,'publicationState','状态只能为 draft 或 published');
      if (typeof r.isDemo !== 'boolean' || typeof r.aiGenerated !== 'boolean') error(file,'isDemo / aiGenerated','必须明确演示及 AI 来源标记');
      if (!['unreviewed','reviewed'].includes(r.reviewStatus)) error(file,'reviewStatus','必须明确核实状态');
      if (!Array.isArray(r.tags) || !r.tags.every(nonempty)) error(file,'tags','标签必须为非空文字列表');
      for (const key of ['publishedAt','updatedAt','reviewAfter']) if (r[key] && !validDate(r[key])) error(file,key,'日期需为有效的 YYYY-MM-DD');
      if (r.publishedAt && r.updatedAt && r.updatedAt < r.publishedAt) error(file,'updatedAt','更新时间不能早于发布时间');
      const draft=r.publicationState==='draft';
      if (!nonempty(kind==='articles'?r.title:r.question)) error(file,kind==='articles'?'title':'question','标题不能为空');
      if (kind==='articles') {
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(r.slug || '')) error(file,'slug','网址名格式无效');
        if (slugs.has(r.slug)) error(file,'slug','网址名重复'); slugs.add(r.slug);
        if (!draft && !nonempty(r.summary)) error(file,'summary','已发布文章必须有摘要');
        if (typeof r.audience !== 'string') error(file,'audience','适用对象必须为文字');
        if (typeof r.featured !== 'boolean') error(file,'featured','精选必须为布尔值');
        if (r.experienceYear && !/^\d{4}$/.test(String(r.experienceYear))) error(file,'experienceYear','经验年份应为四位年份或留空');
        if (!Array.isArray(r.sources)) error(file,'sources','来源必须为列表');
        else r.sources.forEach((s,i)=>{if(!s || !nonempty(s.name)||!safeHref(s.url))error(file,`sources[${i}]`,'来源必须有名称和安全的网址');});
        if (!r.experienceYear) warnings.push({file,field:'experienceYear',message:'经验年份未填写；通用整理可留空'});
        if (!r.sources?.length) warnings.push({file,field:'sources',message:'来源未填写；发布前请检查是否含需核对的信息'});
        if (r.author !== undefined) {
          const a=r.author,c=a?.contact;
          if (!a || typeof a.name!=='string' || !c || typeof c.enabled!=='boolean' || !['email','wechat','qq','other'].includes(c.type) || typeof c.value!=='string' || typeof c.note!=='string') error(file,'author','作者信息需要署名、公开状态、联系方式类型、联系内容和说明');
          else if (c.enabled && (!nonempty(a.name) || !nonempty(c.value))) error(file,'author.contact','公开联系方式时必须填写作者署名和联系内容');
          else if (c.enabled && c.type==='email' && !validEmail(c.value)) error(file,'author.contact.value','公开邮箱格式无效');
        }
      }
      blocksCheck(kind==='articles'?r.bodyBlocks:r.answerBlocks,file,kind==='articles'?'bodyBlocks':'answerBlocks',draft);
      if (!draft && mode==='formal') {
        if (r.isDemo) error(file,'isDemo','正式包禁止混入演示内容');
        if (r.reviewStatus !== 'reviewed') error(file,'reviewStatus','正式发布前必须人工核实');
        if (!validDate(r.updatedAt) || (kind==='articles'&&!validDate(r.publishedAt))) error(file,'日期','正式发布需填写真实的发布 / 更新日期');
      }
    });
  }
  for (const [kind,records,field,targets] of [['articles',bundle.articles,'relatedFaqIds',bundle.faqs],['faqs',bundle.faqs,'relatedArticleIds',bundle.articles]]) {
    for (const r of records) {
      if (!r) continue;
      const refs=r[field];
      if (!Array.isArray(refs)) { error(`${kind}/${r.id}.json`,field,'关联必须为 ID 列表'); continue; }
      for (const id of refs) { const target=targets.find(t=>t?.id===id); if (!target || (r.publicationState==='published'&&target.publicationState!=='published')) error(`${kind}/${r.id}.json`,field,`关联 ${id} 不存在或尚未发布`); }
    }
  }
  return {errors,warnings};
}
export function publicBundle(bundle, mode='demo') {
  const pick=(object,keys)=>Object.fromEntries(keys.map(key=>[key,object[key]]));
  const cleanBlocks=blocks=>blocks.map(b=>pick(b,{heading:['type','level','text'],paragraph:['type','text'],quote:['type','text'],list:['type','ordered','items'],link:['type','label','href']}[b.type]||['type']));
  return {
    site:{name:bundle.site.name,slogan:bundle.site.slogan,categories:Object.fromEntries(Object.entries(bundle.site.categories).map(([id,c])=>[id,Object.fromEntries(['name','subtitle','description','word','english'].map(k=>[k,c[k]]))])),...(bundle.site.about?{about:{title:bundle.site.about.title,summary:bundle.site.about.summary,bodyBlocks:cleanBlocks(bundle.site.about.bodyBlocks),...(bundle.site.about.contact?{contact:{...pick(bundle.site.about.contact,['title','enabled','statusText','description']),email:bundle.site.about.contact.enabled?bundle.site.about.contact.email:''}}:{})}}:{})},
    mode,
    articles:bundle.articles.filter(a=>a.publicationState==='published').map(a=>({...pick(a,['schemaVersion','id','slug','title','summary','category','tags','audience','experienceYear','publishedAt','updatedAt','featured','relatedFaqIds','isDemo','aiGenerated','reviewStatus']),...(a.author?{author:{name:a.author.name,contact:{...pick(a.author.contact,['enabled','type','note']),value:a.author.contact.enabled?a.author.contact.value:''}}}:{}),bodyBlocks:cleanBlocks(a.bodyBlocks),sources:a.sources.map(s=>pick(s,['name','url']))})),
    faqs:bundle.faqs.filter(f=>f.publicationState==='published').map(f=>({...pick(f,['schemaVersion','id','question','category','tags','relatedArticleIds','updatedAt','isDemo','aiGenerated','reviewStatus']),answerBlocks:cleanBlocks(f.answerBlocks)}))
  };
}
