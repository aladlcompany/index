const fs = require('fs');
const path = require('path');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
const WHATSAPP_NUMBER = '201094799247';
const SITE_URL = (process.env.SITE_URL || 'https://eladlshop.vercel.app').replace(/\/$/, '');

function readJson(file, fallback = []) {
  const tries = [
    path.join(process.cwd(), 'data', file),
    path.join(__dirname, '..', 'data', file),
    path.join(__dirname, 'data', file)
  ];
  for (const f of tries) {
    try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch {}
  }
  return fallback;
}

const products = readJson('products.json');
const paperProducts = readJson('paper-products.json');

function esc(s = '') {
  return String(s).replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
}
function norm(s = '') {
  return String(s).toLowerCase()
    .replace(/[أإآا]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه')
    .replace(/ريكو|richo/g,'ricoh').replace(/[^\p{L}\p{N}\s]/gu,' ')
    .replace(/\s+/g,' ').trim();
}
function hasAny(text, arr) { const n=norm(text); return arr.some(w => n.includes(norm(w))); }
function isSmallTalk(q) {
  const n = norm(q);
  return /^(عامل ايه|عامله ايه|اخبارك|ازيك|ازايك|كيفك|كيف الحال|السلام عليكم|هاي|هلا|صباح الخير|مساء الخير|الحمد لله|تمام|كويس)/.test(n);
}
function smallTalkAnswer(q) {
  const n = norm(q);
  if (n.includes('الحمد لله') || n.includes('تمام') || n.includes('كويس')) {
    return `<p>الحمد لله دايمًا 🤍</p><p>تحب أساعدك في ماكينة تصوير، طابعة، حبر، قطع غيار، صيانة، أو أسعار بورصة الورق؟</p>`;
  }
  if (n.includes('عامل ايه') || n.includes('عامله ايه') || n.includes('ازيك') || n.includes('اخبارك') || n.includes('كيف')) {
    return `<p>الحمد لله، أخبارك إيه؟ 😊</p><p>تحب أساعد حضرتك في إيه؟</p>`;
  }
  if (n.includes('السلام عليكم')) return `<p>وعليكم السلام ورحمة الله وبركاته 😊</p><p>أخبار حضرتك؟</p>`;
  return `<p>أهلًا بحضرتك 😊</p><p>أقدر أساعدك في منتجات وخدمات شركة العدل.</p>`;
}
function isPaperPriceQuestion(q) {
  const n = norm(q);
  return /(سعر|اسعار|بكام|كام|بورصه|بورصة)/.test(n) && /(ورق|رزمة|رزم|مرام|دبل|زيروكس|روتاتريم|كوبيا)/.test(n);
}
function validPrice(price) {
  if (!price) return false;
  const p = String(price).trim();
  return p && !/غير\s*متوفر|n\/?a|na|null|undefined|0\s*جنيه/i.test(p);
}
function categoryUrl(cat) {
  const c = norm(cat || '');
  if (c.includes('ورق')) return '/paper-prices.html';
  if (c.includes('قطع')) return '/color-copier-parts.html';
  if (c.includes('احبار') || c.includes('تونر')) return '/color-toners.html';
  if (c.includes('طابعات الوان')) return '/digital-color-printers.html';
  if (c.includes('طابعات') && (c.includes('ابيض') || c.includes('اسود'))) return '/digital-bw-printers.html';
  if (c.includes('ابيض') || c.includes('اسود') || c.includes('black')) return '/black-white-copiers.html';
  if (c.includes('الوان') || c.includes('color')) return '/color-copiers.html';
  return '/products.html';
}
function productUrl(p) {
  const productName = p.name || p.title || p.model || 'product';
  return `${SITE_URL}/products.html#product-details/${encodeURIComponent(productName)}`;
}
function waUrl(text) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}
function internalButton(url, label) {
  return `<button type="button" class="ai-btn ai-go-btn" data-goto="${esc(url)}">${esc(label)}</button>`;
}
function buttons(url, waText, label = 'افتح صفحة التفاصيل') {
  return `<div class="ai-actions">${internalButton(url, label)}<a class="ai-btn ai-wa" href="${esc(waUrl(waText))}" target="_blank" rel="noopener">استفسر واتساب</a></div>`;
}
function card(p) {
  const url = productUrl(p);
  const specs = [];
  if (p.category) specs.push(`القسم: ${p.category}`);
  if (p.description) specs.push(p.description);
  const priceLine = validPrice(p.price)
    ? `<div class="ai-price">السعر: ${esc(p.price)}</div>`
    : `<div class="ai-price muted">السعر غير متوفر حاليًا على الموقع.</div>`;
  return `<div class="ai-card"><b>${esc(p.name)}</b>${priceLine}<div class="ai-specs">${specs.slice(0,3).map(esc).join('<br>')}</div>${buttons(url, `أريد الاستفسار عن ${p.name}`)}</div>`;
}
function words(s){ return norm(s).split(' ').filter(w => w.length > 1); }
function scoreProduct(p, q) {
  const nq = norm(q); const target = norm(`${p.name||''} ${p.category||''} ${p.description||''}`);
  let score = 0;
  for (const w of words(q)) if (target.includes(w)) score += w.length > 2 ? 3 : 1;
  if (nq.includes('الوان') && target.includes('الوان')) score += 8;
  if ((nq.includes('ابيض') || nq.includes('اسود') || nq.includes('اسود')) && (target.includes('ابيض') || target.includes('اسود') || target.includes('black'))) score += 8;
  if (nq.includes('a3') && target.includes('a3')) score += 10;
  if (nq.includes('a4') && target.includes('a4')) score += 10;
  const model = (q.match(/[a-z]*\s*\d{3,5}[a-z]*/i)||[])[0];
  if (model && target.includes(norm(model).replace(/\s/g,''))) score += 30;
  return score;
}
function findProducts(q) {
  const ranked = products.map(p => ({p, s: scoreProduct(p,q)})).filter(x => x.s > 2).sort((a,b)=>b.s-a.s);
  if (ranked.length) return ranked.map(x=>x.p);
  if (hasAny(q, ['مكنة','ماكينة','طابعة','تصوير','منتج','منتجات','ricoh','ريكو'])) return products.slice(0, 30);
  return [];
}
function askClarify() {
  return `<p>تمام، علشان أرشح لك أنسب ماكينة محتاج أعرف:</p><div class="ai-list">1) ألوان ولا أبيض وأسود؟<br>2) A4 ولا A3؟<br>3) الاستخدام اليومي تقريبًا كام ورقة؟<br>4) محتاج سكانر / دوبلكس / شبكة؟</div><a class="ai-btn ai-wa" href="${esc(waUrl('أريد ترشيح ماكينة تصوير مناسبة'))}" target="_blank" rel="noopener">إرسال التفاصيل على واتساب</a>`;
}
function productAnswer(q) {
  const n = norm(q);
  const needsClarify = hasAny(q, ['عايز مكنه','عاوز مكنه','اريد مكنه','رشح','انصحني','مكنه تصوير','ماكينة تصوير']) && !/(a3|a4|الوان|ابيض|اسود|black|color|ricoh|\d{3,5})/i.test(n);
  if (needsClarify) return askClarify();
  const results = findProducts(q);
  if (!results.length) return null;
  const askingPrice = /(سعر|اسعار|بكام|كام|price)/.test(n);
  const shown = results.slice(0, 50);
  const intro = `<p>وجدت لك ${shown.length} نتيجة مرتبطة بطلبك من بيانات الموقع:</p>`;
  const htmlCards = shown.map(p => {
    const url = productUrl(p);
    const priceLine = askingPrice
      ? (validPrice(p.price) ? `<div class="ai-price">السعر: ${esc(p.price)}</div>` : `<div class="ai-price muted">السعر غير متوفر حاليًا على صفحة المنتج.</div>`)
      : '';
    const specs = [];
    if (p.category) specs.push(`القسم: ${p.category}`);
    if (p.description) specs.push(p.description);
    return `<div class="ai-card"><b>${esc(p.name)}</b>${priceLine}<div class="ai-specs">${specs.slice(0,4).map(esc).join('<br>')}</div>${buttons(url, 'أريد الاستفسار عن ' + (p.name||'منتج'), 'تفاصيل المنتج')}</div>`;
  }).join('');
  return intro + htmlCards + `<p class="ai-note">ممنوع ذكر أي سعر غير موجود على الموقع. لو السعر غير متوفر، يتم تأكيده عبر واتساب فقط.</p>`;
}

function paperAnswer(q) {
  if (!isPaperPriceQuestion(q) && !hasAny(q, ['ورق','اسعار الورق','بورصة الورق','سعر الورق'])) return null;
  const all = Array.isArray(paperProducts) ? paperProducts : [];
  if (!all.length) {
    return `<p>أسعار بورصة الورق غير ظاهرة حاليًا من بيانات الموقع.</p><p><b>تنبيه مهم:</b> شركة العدل لا تبيع الورق؛ نشاطنا بيع وصيانة الطابعات وماكينات التصوير والأحبار وقطع الغيار.</p>${internalButton(SITE_URL + '/paper-prices.html', 'فتح صفحة بورصة الورق')}`;
  }
  const n = norm(q);
  const wantA3 = /a3|ايه 3|اى 3/.test(n);
  const wantA4 = /a4|ايه 4|اى 4/.test(n);
  const noise = new Set(['سعر','اسعار','بكام','كام','ورق','بورصه','بورصة','عايز','عاوز','اريد','الرزمة','رزمة','رزم','الورق']);
  const terms = words(q).filter(w => w.length > 2 && !noise.has(w));
  let matched = all.filter(item => {
    const h = norm(`${item.name||''} ${item.title||''} ${item.brand||''} ${item.category||''} ${item.description||''} ${item.size||''}`);
    if (wantA3 && !h.includes('a3')) return false;
    if (wantA4 && !h.includes('a4')) return false;
    return !terms.length || terms.some(t => h.includes(t));
  });
  if (!matched.length) matched = all;
  matched = matched.slice(0, 40);
  const cards = matched.map(item => {
    const name = item.name || item.title || 'ورق';
    const price = item.price || item.currentPrice || item.sellPrice || item.buyPrice || 'السعر غير مذكور في البورصة';
    const desc = [item.brand, item.size, item.weight, item.description, item.category].filter(Boolean).join(' - ');
    return `<div class="ai-card"><b>${esc(name)}</b><div class="ai-price">${esc(price)}</div><div class="ai-specs">${esc(desc)}</div></div>`;
  }).join('');
  return `<p>دي أسعار بورصة الورق المتاحة حاليًا من صفحة البورصة داخل الموقع:</p>${cards}<p class="ai-note"><b>تنبيه مهم:</b> دي أسعار بورصة استرشادية، وشركة العدل لا تبيع الورق. نشاطنا بيع وصيانة ماكينات التصوير والطابعات والأحبار وقطع الغيار.</p>${internalButton(SITE_URL + '/paper-prices.html', 'فتح صفحة بورصة الورق')}`;
}

function pageButtonAnswer(q) {
  if (!hasAny(q, ['زر','افتح','وديني','انتقل','صفحه','لينك'])) return null;
  const n = norm(q); let url='/products.html', label='صفحة المنتجات';
  if (n.includes('الرئيسيه') || n.includes('home')) {url='/'; label='الرئيسية';}
  else if (n.includes('ورق')) {url='/paper-prices.html'; label='بورصة الورق';}
  else if (n.includes('الوان')) {url='/color-copiers.html'; label='ماكينات ألوان';}
  else if (n.includes('ابيض') || n.includes('اسود')) {url='/black-white-copiers.html'; label='ماكينات أبيض وأسود';}
  else if (n.includes('احبار') || n.includes('تونر')) {url='/color-toners.html'; label='الأحبار والتونر';}
  else if (n.includes('طابعات')) {url='/digital-bw-printers.html'; label='الطابعات';}
  return `<p>تفضل، اضغط على الزر للانتقال مباشرة إلى ${esc(label)}:</p>${internalButton(SITE_URL + url, 'اذهب إلى ' + label)}`;
}
function teamAnswer(q) {
  if (!hasAny(q, ['فريق العمل','مدير','صاحب الشركة','المالك','الإدارة','الاداره','من المسؤول'])) return null;
  return `<p>معلومات فريق العمل والإدارة يتم الرجوع لها من صفحة الموقع، وليس من تخمينات خارجية.</p>${internalButton(SITE_URL + '/about.html', 'افتح صفحة من نحن / فريق العمل')}<a class="ai-btn ai-wa" href="${esc(waUrl('أريد التواصل مع إدارة شركة العدل'))}" target="_blank" rel="noopener">تواصل واتساب</a>`;
}

async function groqAnswer(message) {
  const apiKey = process.env.GROQ_API_KEY || process.env.GROQ_API_KWY;
  if (!apiKey) return 'المساعد غير مفعّل حاليًا. من فضلك أضف مفتاح Groq في Environment Variables باسم GROQ_API_KEY.';
  const system = `أنت مساعد موقع شركة العدل. ممنوع نهائيًا اختراع أسعار أو أسماء أو مواصفات غير موجودة في بيانات الموقع. لا تذكر أي سعر لماكينات التصوير أو الطابعات أو الأحبار أو قطع الغيار إلا إذا كان السعر موجودًا صراحة في بيانات الموقع. لو السعر غير متوفر قل: السعر غير متوفر حاليًا على صفحة المنتج ويمكن الاستفسار عبر واتساب. أسعار الورق فقط تُؤخذ من صفحة بورصة الورق، مع التنبيه أن شركة العدل لا تبيع الورق. لا تضع رابط واتساب في كل رد إلا عند الاستفسار أو السعر غير المتوفر. وجّه العميل للصفحة المناسبة داخل الموقع لأنه موجود بالفعل على الموقع.`;
  const r = await fetch(GROQ_API_URL, {method:'POST', headers:{'Authorization':`Bearer ${apiKey}`,'Content-Type':'application/json'}, body: JSON.stringify({model: MODEL, temperature: 0.1, max_tokens: 600, messages:[{role:'system',content:system},{role:'user',content:message}]})});
  if (!r.ok) throw new Error(`Groq error ${r.status}`);
  const data = await r.json();
  return data.choices?.[0]?.message?.content || 'لم أتمكن من تجهيز رد مناسب الآن.';
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const message = String(req.body?.message || '').trim();
    const history = Array.isArray(req.body?.history) ? req.body.history.slice(-6).map(x => String(x || '')).join(' ') : '';
    const context = `${history} ${message}`.trim();
    if (!message) return res.status(400).json({ error: 'Message is required' });

    const machineContext = hasAny(context, ['مكنة','ماكينة','طابعة','تصوير','ricoh','ريكو','الوان','أبيض وأسود','ابيض واسود']);
    const paperContext = hasAny(message, ['ورق','بورصة الورق','اسعار الورق','سعر الورق','رزمة','رزم','مرام','دبل']);

    let reply = null;
    if (isSmallTalk(message)) reply = smallTalkAnswer(message);
    else if (teamAnswer(message)) reply = teamAnswer(message);
    else if (paperContext && !machineContext) reply = paperAnswer(message);
    else reply = productAnswer(context) || (paperContext ? paperAnswer(message) : null) || pageButtonAnswer(message) || await groqAnswer(message);

    return res.status(200).json({ reply, format: 'html' });
  } catch (e) {
    return res.status(200).json({ reply: 'حصل ضغط مؤقت في المساعد. جرب مرة أخرى بعد لحظات أو تواصل معنا على واتساب 01094799247.' });
  }
};
