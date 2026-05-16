const fs = require('fs');
const path = require('path');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
const SITE_URL = (process.env.SITE_URL || 'https://eladlshop.vercel.app').replace(/\/$/, '');
const WHATSAPP_NUMBER = '201094799247';

function readJson(file, fallback) {
  const paths = [path.join(process.cwd(), 'data', file), path.join(__dirname, '..', 'data', file)];
  for (const p of paths) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) {} }
  return fallback;
}

const PRODUCTS = readJson('products.json', []);
const PAPER = readJson('paper-prices.json', readJson('paper-products.json', []));
const TEAM = readJson('team.json', { members: [], sourcePage: '/about.html', sourceLabel: 'صفحة من نحن' });
const SERVICES = readJson('services.json', { services: [] });

function esc(v = '') { return String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c])); }
function norm(v = '') {
  return String(v).toLowerCase()
    .replace(/[أإآا]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').replace(/ريكو|richo/g, 'ricoh')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ').trim();
}
function hasAny(text, list) { const n = norm(text); return list.some(w => n.includes(norm(w))); }
function extractModels(text = '') {
  const source = norm(text);
  const out = [];
  const re = /(?:mp|sp|ricoh|aficio|افيشيو)?\s*([a-z]*\d{3,5}[a-z0-9]*)/gi;
  let m;
  while ((m = re.exec(source))) out.push(m[1].replace(/\s+/g,''));
  return [...new Set(out.filter(Boolean))];
}
function historyText(history) { return Array.isArray(history) ? history.slice(-8).map(m => `${m.role || ''}: ${m.content || m.text || ''}`).join(' ') : ''; }
function words(text) {
  const stop = new Set(['عاوز','عايز','اريد','محتاج','ممكن','حضرتك','من','عن','على','في','الى','إلى','هو','هي','ده','دي','دى','بس','لو','سعر','اسعار','بكام','كام','ايه','اية','عاوزه','عاوزة']);
  return norm(text).split(' ').filter(w => w.length > 1 && !stop.has(w));
}
function validPrice(price) {
  if (price === null || price === undefined) return false;
  const p = String(price).trim();
  return !!p && !/غير\s*متوفر|غير\s*مذكور|n\/?a|null|undefined|^0$|^0\s*جنيه/i.test(p);
}
function absUrl(url) { if (!url) return SITE_URL + '/products.html'; if (/^https?:\/\//i.test(url)) return url; return SITE_URL + (url.startsWith('/') ? url : '/' + url); }
function waUrl(message) { return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`; }
function goButton(url, label) { return `<button type="button" class="ai-btn ai-go-btn" data-goto="${esc(absUrl(url))}">${esc(label)}</button>`; }
function waButton(message, label = 'استفسر واتساب') { return `<a class="ai-btn ai-wa" href="${esc(waUrl(message))}" target="_blank" rel="noopener">${esc(label)}</a>`; }
function actions(buttons) { return `<div class="ai-actions">${buttons.join('')}</div>`; }

function isSmallTalk(q) {
  const n = norm(q);
  return /^(السلام عليكم|سلام عليكم|هاي|هلا|مرحبا|صباح الخير|مساء الخير|عامل ايه|عامله ايه|اخبارك|ازيك|ازايك|كيفك|كيف الحال|الحمد لله|تمام|كويس|بخير)$/.test(n);
}
function smallTalk(q) {
  const n = norm(q);
  if (n.includes('السلام')) return '<p>وعليكم السلام ورحمة الله وبركاته 😊</p><p>أخبار حضرتك؟</p>';
  if (n === 'الحمد لله' || n === 'تمام' || n === 'كويس' || n === 'بخير') return '<p>الحمد لله دايمًا 🤍</p><p>تحب أساعدك في ماكينة تصوير، طابعة، صيانة، أحبار، قطع غيار، أو بورصة الورق؟</p>';
  if (hasAny(q, ['عامل ايه','عامله ايه','اخبارك','ازيك','ازايك','كيفك','كيف الحال'])) return '<p>الحمد لله، أخبارك إيه؟ 😊</p><p>تحب أساعد حضرتك في إيه؟</p>';
  return '<p>أهلًا وسهلًا بحضرتك 😊</p><p>تحب أساعدك في ماكينة، طابعة، صيانة، أحبار، قطع غيار، أو بورصة الورق؟</p>';
}


function comparisonAnswer(q) {
  const n = norm(q);
  const wantsDiff = /(فرق|الفرق|مقارنه|مقارنة|قارن|ايهما|انهي|اختار)/.test(n);
  const wantsA4A3 = /\ba4\b/i.test(q) && /\ba3\b/i.test(q);
  const machineWords = /(مكن|مكنه|ماكينه|ماكينة|تصوير|طابعة|طابعه|printer|copier)/i.test(q);
  if (!(wantsDiff && wantsA4A3 && machineWords)) return null;
  return `<p><b>الفرق ببساطة بين ماكينة تصوير A4 و A3:</b></p>
  <p><b>ماكينة A4</b>: مناسبة للمكاتب الصغيرة والمتوسطة، تطبع وتصوّر مقاس A4 فقط تقريبًا، حجمها أصغر وسعرها وتشغيلها غالبًا أوفر.</p>
  <p><b>ماكينة A3</b>: مناسبة للمكاتب والشركات ومراكز الطباعة، تقبل A3 و A4، أكبر في الحجم وأقوى في الشغل، وغالبًا سعرها أعلى لكنها أنسب لو عندك تصوير مستندات كبيرة أو شغل تقيل.</p>
  <p><b>اختيار سريع:</b><br>لو شغلك فواتير ومستندات عادية: A4 كفاية.<br>لو عندك رسومات هندسية، كراسات، ملازم، أو حجم تصوير كبير: A3 أفضل.</p>
  <p>تحب أرشح لك موديلات مناسبة من المتاح عندنا؟</p>`;
}
function vagueOrNoise(q) {
  const n = norm(q).trim();
  return !n || (n.length <= 2 && !/a3|a4|305|307|301|2001|161|171|201/i.test(n)) || /^[\W_]+$/.test(n);
}

function machineContext(q, h = '') {
  const full = `${h} ${q}`;
  return hasAny(full, ['مكن','مكنه','ماكينه','ماكينة','تصوير','طابعه','طابعة','طابعات','برنتر','printer','copier','ricoh','ريكو','افيشيو','الوان','ابيض','اسود','سكانر','فاكس','دوبلكس']);
}
function explicitPaperIntent(q) {
  return hasAny(q, ['بورصة الورق','بورصه الورق','اسعار الورق','أسعار الورق','سعر الورق','ورق تصوير','ورق طباعة','رزمة ورق','رزم ورق','طن ورق','ورق مطاوي'])
    || (/\bA[34]\b/i.test(String(q)) && hasAny(q, ['ورق','بورصة','بورصه','رزمة','رزم','سعر','اسعار']));
}
function clearProductFollowup(q) {
  const cur = norm(q || '').trim();
  if (!cur) return false;
  // متابعة واضحة فقط: مقاس/لون/موديل/وظيفة/حجم استخدام. لا نعتبر أي كلمة عشوائية متابعة.
  return /\b(a3|a4)\b/i.test(cur)
    || /(الوان|ابيض|اسود|ابيض واسود|اسود وابيض|color|black|bw|سكانر|فاكس|واي فاي|wifi|دوبلكس|طباعة|تصوير|استعمال|استخدام|خفيف|متوسط|كثيف|قليل|غزير|يومي|حبر|تونر|درام|فيوزر|رول|قطع غيار)/i.test(cur)
    || extractModels(cur).length > 0;
}
function activeProductText(q, h = '') {
  const cur = norm(q || '');
  const hist = norm(h || '');
  return clearProductFollowup(cur) ? `${hist} ${cur}` : cur;
}
function productIntent(q, h = '') {
  const cur = norm(q || '');
  const hist = norm(h || '');
  if (explicitPaperIntent(q) && !machineContext('', hist)) return false;
  const explicit = machineContext(cur, '') || extractModels(cur).length > 0 || hasAny(cur, ['حبر','تونر','خرطوشة','خرطوشه','درام','قطع غيار','فيوزر','رول','طابعة','طابعه']);
  if (explicit) return true;
  const commercialButVague = hasAny(cur, ['سعر','بكام','كام','مواصفات','تفاصيل','متاح','متوفر','عايز','عاوز','رشح','اختار','اشتري','شراء']);
  if (commercialButVague && (machineContext('', hist) || /\b(a3|a4)\b/i.test(cur) || hasAny(cur, ['الوان','ابيض','اسود']))) return true;
  // استخدم التاريخ فقط لو الرسالة الحالية متابعة منتج واضحة.
  return clearProductFollowup(cur) && machineContext('', hist);
}
function missingMachineDetails(q, h = '') {
  const cur = norm(q || '');
  const full = activeProductText(q, h);
  const hasColor = /(الوان|ابيض|اسود|ابيض واسود|اسود وابيض|color|black|bw)/i.test(full);
  const hasSize = /\b(a3|a4)\b/i.test(full);
  const hasModel = extractModels(full).length > 0;
  const genericAsk = /(عايز|عاوز|رشح|اختار|انصح|مناسب|مواصفات|تفاصيل|ماكينات|مكن|مكنه|ماكينه|ماكينة|طابعه|طابعة|برنتر|تصوير)/i.test(cur);
  return genericAsk && !hasModel && (!hasColor || !hasSize);
}
function askMachineQuestions() {
  return `<p>تمام، عشان أرشح لحضرتك ماكينة مناسبة محتاج أعرف 3 حاجات:</p><div class="ai-list">1) ألوان ولا أبيض وأسود؟<br>2) المقاس المطلوب A4 ولا A3؟<br>3) حجم الاستخدام اليومي تقريبًا؟ قليل، متوسط، ولا كثيف؟</div><p>بعدها أعرض لك كل الماكينات المطابقة من الموقع مع زر تفاصيل لكل ماكينة.</p>`;
}

function productSearchText(p) {
  const specs = Array.isArray(p.specs) ? p.specs.map(s => `${s.label || ''} ${s.value || ''}`).join(' ') : '';
  return norm(`${p.name || ''} ${p.model || ''} ${p.category || ''} ${p.categoryLabel || ''} ${p.description || ''} ${p.paperSize || ''} ${p.paperFormat || ''} ${p.colorMode || ''} ${p.speed || ''} ${p.functions || ''} ${specs}`);
}
function scoreProduct(p, q, h = '') {
  const query = activeProductText(q, h);
  const target = productSearchText(p);
  let score = 0;
  for (const w of words(q)) if (target.includes(w)) score += w.length > 2 ? 3 : 1;
  const modelMatches = extractModels(activeProductText(q, h));
  for (const m of modelMatches) { const mm = norm(m).replace(/\s+/g, ''); if (target.replace(/\s+/g, '').includes(mm)) score += 45; }
  if (/(الوان|ألوان|color)/i.test(query)) score += /(الوان|color|ألوان)/i.test(target) ? 12 : -20;
  if (/(ابيض|أبيض|اسود|أسود|black|bw)/i.test(query)) score += /(ابيض|أبيض|اسود|أسود|black|bw)/i.test(target) ? 12 : -20;
  if (/\ba3\b/i.test(query)) score += /\ba3\b/i.test(target) ? 14 : -18;
  if (/\ba4\b/i.test(query)) score += /\ba4\b/i.test(target) ? 14 : -10;
  if (hasAny(q, ['حبر','تونر']) && hasAny(target, ['حبر','تونر'])) score += 15;
  if (hasAny(q, ['قطع غيار','رول','فيوزر','درام']) && hasAny(target, ['قطع','رول','فيوزر','درام'])) score += 15;
  return score;
}
function findProducts(q, h = '') {
  const scored = PRODUCTS.map(p => ({ p, score: scoreProduct(p, q, h) })).filter(x => x.score > 0);
  scored.sort((a, b) => b.score - a.score || String(a.p.name).localeCompare(String(b.p.name), 'ar'));
  if (!scored.length) return [];
  const top = scored[0].score;
  const models = extractModels(activeProductText(q, h));
  if (models.length) return scored.filter(x => x.score >= 40).slice(0, 20).map(x => x.p);
  return scored.filter(x => x.score >= Math.max(1, top - 10)).map(x => x.p);
}
function productDetailsUrl(p) { return `/products.html#product-details/${encodeURIComponent(p.name || '')}`; }
function productCard(p, index) {
  const specs = [p.categoryLabel && `القسم: ${p.categoryLabel}`, p.colorMode && p.colorMode !== 'غير محدد' && `النوع: ${p.colorMode}`, p.paperFormat && p.paperFormat !== 'غير محدد' && `المقاس: ${p.paperFormat}`, p.speed && `السرعة: ${p.speed}`, p.functions && `الوظائف: ${p.functions}`].filter(Boolean);
  const priceHtml = validPrice(p.price) ? `<div class="ai-price">السعر: ${esc(p.price)}</div>` : `<div class="ai-price muted">السعر غير متوفر حاليًا على صفحة المنتج.</div>`;
  const detail = goButton(productDetailsUrl(p), 'تفاصيل الماكينة');
  const wa = !validPrice(p.price) ? waButton(`أريد الاستفسار عن سعر ${p.name || 'المنتج'}`) : '';
  return `<div class="ai-card"><b>${index}. ${esc(p.name || 'منتج')}</b>${priceHtml}<div class="ai-specs">${specs.map(esc).join('<br>')}</div>${p.description ? `<div class="ai-desc">${esc(String(p.description).slice(0, 170))}${String(p.description).length > 170 ? '...' : ''}</div>` : ''}${actions([detail, wa].filter(Boolean))}</div>`;
}
function productAnswer(q, h = '') {
  if (explicitPaperIntent(q) && !machineContext('', h)) return null;
  if (!productIntent(q, h)) return null;
  if (machineContext(q, h) && missingMachineDetails(q, h)) return askMachineQuestions();
  const matches = findProducts(q, h);
  if (!matches.length) return `<p>لم أجد منتجًا مطابقًا لطلب حضرتك داخل بيانات الموقع الحالية.</p><p>ممكن تكتب الموديل أو توضح: ألوان ولا أبيض وأسود؟ A4 ولا A3؟</p>${actions([waButton('أريد الاستفسار عن منتج أو بديل غير ظاهر في الموقع')])}`;
  return `<p>دي المنتجات المطابقة لطلب حضرتك من بيانات الموقع:</p>${matches.map((p, i) => productCard(p, i + 1)).join('')}`;
}

function paperAnswer(q) {
  if (!explicitPaperIntent(q)) return null;
  const n = norm(q); const wantA3 = /\ba3\b/.test(n); const wantA4 = /\ba4\b/.test(n);
  const queryWords = words(q).filter(w => !['ورق','بورصه','بورصة','اسعار','سعر','كام','بكام','رزمة','رزم'].includes(w));
  let rows = PAPER.filter(item => {
    const hay = norm(`${item.name || ''} ${item.brand || ''} ${item.size || ''} ${item.weight || ''} ${item.description || ''}`);
    if (wantA3 && !/\ba3\b/i.test(hay)) return false;
    if (wantA4 && !/\ba4\b/i.test(hay)) return false;
    return !queryWords.length || queryWords.some(w => hay.includes(w));
  });
  if (!rows.length && PAPER.length) rows = PAPER.filter(item => { const hay = norm(`${item.size || ''} ${item.weight || ''}`); if (wantA3) return /\ba3\b/i.test(hay); if (wantA4) return /\ba4\b/i.test(hay); return true; });
  if (!rows.length) return `<p>أسعار بورصة الورق غير متاحة حاليًا من ملف البيانات.</p><p class="ai-note"><b>تنبيه:</b> شركة العدل لا تبيع الورق؛ الأسعار استرشادية فقط.</p>${actions([goButton('/paper-prices.html', 'فتح صفحة بورصة الورق')])}`;
  const cards = rows.map((r, i) => { const name = [r.name, r.size, r.weight].filter(Boolean).join(' - '); const price = validPrice(r.price) ? `${r.price} جنيه` : 'السعر غير مذكور'; return `<div class="ai-card"><b>${i + 1}. ${esc(name)}</b><div class="ai-price">${esc(price)}</div></div>`; }).join('');
  return `<p>دي أسعار بورصة الورق المتاحة من صفحة البورصة:</p>${cards}<p class="ai-note"><b>تنبيه مهم:</b> الأسعار استرشادية وتتغير حسب السوق، وشركة العدل لا تبيع الورق. نشاطنا بيع وصيانة ماكينات التصوير والطابعات والأحبار وقطع الغيار.</p>${actions([goButton('/paper-prices.html', 'فتح صفحة بورصة الورق')])}`;
}

function teamAnswer(q) {
  if (!hasAny(q, ['مدير','صاحب الشركة','مؤسس','فريق العمل','الإدارة','الاداره','خدمة العملاء','مسؤول الصيانة','مسئول الصيانة','مدير الصيانة','مدير المبيعات'])) return null;
  const nq = norm(q); let members = TEAM.members || [];
  if (hasAny(nq, ['مدير الصيانة','مسؤول الصيانة','مسئول الصيانة','الصيانة'])) members = members.filter(m => hasAny(`${m.role} ${m.name}`, ['الصيانة']));
  else if (hasAny(nq, ['مدير المبيعات','المبيعات'])) members = members.filter(m => hasAny(`${m.role} ${m.name}`, ['المبيعات']));
  else if (hasAny(nq, ['خدمة العملاء','العملاء'])) members = members.filter(m => hasAny(`${m.role} ${m.name}`, ['خدمة العملاء']));
  else if (hasAny(nq, ['مدير الشركة','صاحب الشركة','مؤسس','المدير العام'])) members = members.filter(m => hasAny(`${m.role} ${m.name}`, ['المدير العام','المؤسس']));
  if (!members.length) members = TEAM.members || [];
  const cards = members.map((m, i) => `<div class="ai-card"><b>${i + 1}. ${esc(m.name)}</b><div class="ai-price muted">${esc(m.role)}</div><div class="ai-specs">${esc(m.details || '')}</div></div>`).join('');
  return `<p>حسب بيانات ${esc(TEAM.sourceLabel || 'صفحة من نحن')}:</p>${cards}${actions([goButton(TEAM.sourcePage || '/about.html', 'فتح صفحة فريق العمل')])}`;
}
function serviceAnswer(q) {
  if (!hasAny(q, ['صيانة','عقد صيانة','بلاغ عطل','دعم فني','شكوى','شكوي','خدمات','تقسيط','ايجار تمليكي','إيجار تمليكي'])) return null;
  const items = SERVICES.services || []; const n = norm(q);
  let selected = items.filter(s => norm(`${s.name} ${s.description}`).split(' ').some(w => w.length > 2 && n.includes(w)));
  if (!selected.length) selected = items;
  const cards = selected.slice(0, 4).map((s, i) => `<div class="ai-card"><b>${i + 1}. ${esc(s.name)}</b><div class="ai-specs">${esc(s.description || '')}</div>${actions([goButton(s.url || '/', 'فتح الصفحة')])}</div>`).join('');
  return `<p>الخدمة المناسبة من بيانات الموقع:</p>${cards}`;
}
function pageNavigationAnswer(q) {
  if (!hasAny(q, ['افتح','وديني','انتقل','زر','صفحة','صفحه'])) return null;
  const n = norm(q);
  if (hasAny(n, ['بورصة','ورق'])) return `<p>تفضل زر صفحة بورصة الورق:</p>${actions([goButton('/paper-prices.html', 'فتح بورصة الورق')])}`;
  if (hasAny(n, ['الوان','ألوان'])) return `<p>تفضل زر ماكينات التصوير الألوان:</p>${actions([goButton('/color-copiers.html', 'فتح ماكينات ألوان')])}`;
  if (hasAny(n, ['ابيض','اسود'])) return `<p>تفضل زر ماكينات التصوير الأبيض والأسود:</p>${actions([goButton('/black-white-copiers.html', 'فتح ماكينات أبيض وأسود')])}`;
  if (hasAny(n, ['فريق','من نحن','مدير'])) return `<p>تفضل زر صفحة من نحن وفريق العمل:</p>${actions([goButton('/about.html', 'فتح صفحة من نحن')])}`;
  if (hasAny(n, ['صيانة','دعم'])) return `<p>تفضل زر الدعم الفني:</p>${actions([goButton('/tech-support.html', 'فتح الدعم الفني')])}`;
  return `<p>تفضل زر صفحة المنتجات:</p>${actions([goButton('/products.html', 'فتح المنتجات')])}`;
}

function isolatedUnknown(q) {
  const n = norm(q).trim();
  if (!n) return true;
  if (isSmallTalk(n) || machineContext(n,'') || explicitPaperIntent(n) || pageNavigationAnswer(n)) return false;
  const words = n.split(/\s+/).filter(Boolean);
  if (words.length === 1 && !/[؟?]/.test(n) && n.length < 14) return true;
  return false;
}

async function groqAnswer(message, historyText = '') {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return '<p>المساعد غير مفعل حاليًا. أضف GROQ_API_KEY في Vercel.</p>';
  const system = 'أنت مساعد خدمة عملاء لشركة العدل. استخدم بيانات الموقع فقط في المنتجات والأسعار وفريق العمل. ممنوع اختراع أسعار أو موديلات أو أسماء. لو السعر غير موجود قل غير متوفر على الموقع. لو السؤال عام رد باختصار وبلهجة مصرية مهذبة. لو العميل يسلم أو يسأل عامل ايه رد طبيعي: الحمد لله، أخبارك؟ وأكمل المحادثة.';
  const r = await fetch(GROQ_API_URL, { method: 'POST', headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: MODEL, temperature: 0.05, max_tokens: 350, messages: [{ role: 'system', content: system }, { role: 'user', content: `سياق المحادثة السابق:
${historyText.slice(-1200)}

رسالة العميل الحالية:
${message}` }] }) });
  if (!r.ok) throw new Error(`Groq ${r.status}`);
  const data = await r.json();
  return `<p>${esc(data.choices?.[0]?.message?.content || 'لم أتمكن من تجهيز رد مناسب الآن.')}</p>`;
}
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const message = String(body.message || '').trim();
    const h = historyText(body.history);
    if (!message) return res.status(200).json({ reply: '<p>اكتب سؤالك وأنا أساعدك.</p>', format: 'html' });
    let reply = null;
    let source = 'local';
    reply = isSmallTalk(message) ? smallTalk(message) : null;
    reply = reply || pageNavigationAnswer(message);
    reply = reply || comparisonAnswer(message);
    reply = reply || paperAnswer(message);
    reply = reply || productAnswer(message, h);
    reply = reply || teamAnswer(message);
    reply = reply || serviceAnswer(message);
    if (!reply && isolatedUnknown(message)) {
      source = 'local-clarify';
      reply = '<p>مش واضح قصد حضرتك. ممكن تكتب المطلوب بشكل أوضح؟ مثال: مواصفات ماكينة 305، الفرق بين A4 و A3، أو سعر ماكينة ألوان.</p>';
    }
    if (!reply) {
      source = 'groq';
      reply = await groqAnswer(message, h);
    }
    return res.status(200).json({ reply, format: 'html', debug: { source } });
  } catch (e) {
    console.error('Assistant error:', e && (e.message || e));
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const msg = String(body.message || '').trim();
    if (vagueOrNoise(msg)) return res.status(200).json({ reply: '<p>مش واضح قصد حضرتك. ممكن تكتب اسم الموديل أو المطلوب بالضبط؟</p>', format: 'html', debug: { source: 'fallback-vague' } });
    return res.status(200).json({ reply: '<p>حصل خطأ مؤقت في المساعد الذكي. حاول مرة أخرى بعد لحظات أو تواصل على واتساب 01094799247.</p>', format: 'html', debug: { source: 'fallback-error' } });
  }
};
