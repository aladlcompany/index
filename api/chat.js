import fs from 'fs';
import path from 'path';

const SITE_URL = 'https://eladlshop.vercel.app';
const WHATSAPP_NUMBER = '201094799247';
const PHONE_DISPLAY = '01094799247';

function readJson(relPath, fallback = []) {
  try {
    const file = path.join(process.cwd(), relPath);
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (_) {
    return fallback;
  }
}

const PRODUCTS = readJson('data/products.json');
const PAPER_PRODUCTS = readJson('data/paper-products.json');

const TEAM_MEMBERS = [
  { role: 'المدير التنفيذي', name: 'م. محمد عاطف', details: 'خبرة أكثر من 12 سنة في حلول الطباعة المؤسسية وإدارة المشروعات التقنية.' },
  { role: 'مدير خدمة العملاء', name: 'أحمد محمود', details: 'متخصص في متابعة العملاء وتنسيق خدمات ما بعد البيع والصيانة.' },
  { role: 'مدير الصيانة', name: 'خالد إبراهيم', details: 'خبير في صيانة ماكينات ريكو وتشخيص الأعطال المتقدمة.' }
];

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
    .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[ـ\u064B-\u0652]/g, '')
    .replace(/[()\[\]{}.,،:؛!?؟|\\/\-+_="'`~@#$%^&*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasAny(q, words) {
  return words.some(w => q.includes(normalize(w)));
}

function productText(p) {
  const specs = Array.isArray(p.specs) ? p.specs.map(s => `${s.label || ''} ${s.value || ''}`).join(' ') : '';
  return normalize([p.name, p.category, p.functions, p.paperSize, p.speed, p.condition, p.description, p.price, specs].join(' '));
}

function productHref(name) {
  return `${SITE_URL}/products.html#product-details/${encodeURIComponent(name)}`;
}

function whatsappHref(text) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

function whatsappButton(text, label = 'تواصل عبر واتساب') {
  const encoded = encodeURIComponent(text || '');
  return `<a class="ai-action-btn ai-whatsapp-btn" href="javascript:void(0)" onclick="if(window.openWhatsApp){window.openWhatsApp('${WHATSAPP_NUMBER}', decodeURIComponent('${encoded}'));}else{window.open('https://wa.me/${WHATSAPP_NUMBER}?text=${encoded}','_blank');}" rel="noopener"><span>${esc(label)}</span><span class="ai-whatsapp-icon"><i class="fab fa-whatsapp"></i></span></a>`;
}

function esc(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function button(url, label, cls = 'ai-action-btn') {
  return `<a class="${cls}" href="${esc(url)}" target="${url.startsWith('https://wa.me') ? '_blank' : '_self'}" rel="noopener">${esc(label)}</a>`;
}

function inferIntent(message) {
  const q = normalize(message);
  const wantsPrice = hasAny(q, ['سعر', 'اسعار', 'بكام', 'كام', 'تكلفة', 'ثمن']);
  const wantsPaper = hasAny(q, ['ورق', 'بورصه', 'بوصه الورق', 'a4 70', 'a4 80', 'a3 80', 'كرتونه ورق', 'رزمة']);
  const wantsCopier = hasAny(q, ['مكنه', 'ماكينه', 'مكن', 'ماكينات', 'تصوير', 'copier']);
  const wantsPrinter = hasAny(q, ['طابعه', 'طابعة', 'printer']);
  const wantsMachine = wantsCopier || wantsPrinter || hasAny(q, ['ريكو', 'ricoh']);
  const wantsProducts = wantsMachine || hasAny(q, ['منتجات', 'موديلات', 'رشح', 'عايز', 'محتاج', 'اعرض']);
  const color = hasAny(q, ['الوان', 'ألوان', 'لون', 'color', 'c300', 'c305', 'c307', 'c350', 'c450', 'c550']) ? 'color' : (hasAny(q, ['ابيض واسود', 'ابيض و اسود', 'اسود', 'black', 'bw']) ? 'bw' : null);
  const size = hasAny(q, ['a3', 'ايه ثري', 'اى ثري', 'اي ثري']) ? 'A3' : (hasAny(q, ['a4', 'ايه فور', 'اى فور', 'اي فور']) ? 'A4' : null);
  const exactTokens = q.split(' ').filter(t => t.length >= 2);
  return { q, wantsPrice, wantsPaper, wantsMachine, wantsCopier, wantsPrinter, wantsProducts, color, size, exactTokens };
}

function productMatches(intent) {
  let matches = PRODUCTS.map(p => ({ p, text: productText(p), score: 0 }));

  if (intent.wantsCopier && !intent.wantsPrinter) {
    matches = matches.filter(({ p }) => p.category === 'bw-copiers' || p.category === 'color-copiers');
  }

  if (intent.wantsPrinter && !intent.wantsCopier) {
    matches = matches.filter(({ p }) => !['bw-copiers','color-copiers'].includes(p.category));
  }

  matches = matches.filter(({ p, text }) => {
    if (intent.color === 'color') return p.category === 'color-copiers' || text.includes('الوان') || /\bmp\s*c/i.test(p.name);
    if (intent.color === 'bw') return p.category === 'bw-copiers' || text.includes('ابيض واسود') || text.includes('اسود');
    return true;
  });

  matches = matches.filter(({ text }) => {
    if (intent.size === 'A3') return text.includes('a3');
    if (intent.size === 'A4') return text.includes('a4');
    return true;
  });

  for (const item of matches) {
    const p = item.p;
    const t = item.text;
    if (intent.color && ((intent.color === 'color' && p.category === 'color-copiers') || (intent.color === 'bw' && p.category === 'bw-copiers'))) item.score += 40;
    if (intent.size && t.includes(intent.size.toLowerCase())) item.score += 35;
    for (const tok of intent.exactTokens) {
      if (['عايز','محتاج','سعر','كام','ماكينه','مكنه','مكن','تصوير','طابعه','الوان','ابيض','اسود','a3','a4'].includes(tok)) continue;
      if (t.includes(tok)) item.score += 12;
    }
    const modelBits = normalize(p.name).match(/\b(c?\d{3,4}s?)\b/g) || [];
    for (const bit of modelBits) if (intent.q.includes(bit)) item.score += 80;
  }

  const relevant = matches.filter(x => x.score > 0 || (intent.color && intent.size));
  return relevant.sort((a, b) => b.score - a.score).map(x => x.p);
}

function teamReply(message) {
  const q = normalize(message);
  const asksTeam = hasAny(q, ['فريق العمل', 'الفريق', 'العاملين', 'الموظفين', 'الاداره', 'الإداره', 'الادارة', 'الإدارة', 'مدير', 'صاحب', 'مين المسؤول', 'مين مسئول', 'مسؤول الشركة', 'مسئول الشركة', 'مؤسس', 'من يدير', 'خدمه العملاء', 'خدمة العملاء', 'الصيانه', 'الصيانة']);
  if (!asksTeam) return null;
  let matches = TEAM_MEMBERS;
  if (hasAny(q, ['مدير الشركة', 'مدير الشركه', 'المدير التنفيذي', 'صاحب', 'مؤسس', 'من يدير'])) {
    matches = TEAM_MEMBERS.filter(m => m.role.includes('التنفيذي'));
  } else if (hasAny(q, ['خدمة العملاء', 'خدمه العملاء', 'عملاء'])) {
    matches = TEAM_MEMBERS.filter(m => m.role.includes('خدمة العملاء'));
  } else if (hasAny(q, ['صيانة', 'صيانه', 'الصيانة', 'الصيانه'])) {
    matches = TEAM_MEMBERS.filter(m => m.role.includes('الصيانة'));
  }
  const rows = matches.map(m => `<strong>${esc(m.role)}: ${esc(m.name)}</strong><br>${esc(m.details)}`).join('<br><br>');
  return {
    format: 'html',
    reply: `حسب بيانات صفحة من نحن / فريق العمل:<br><br>${rows}<br><br>${button(`${SITE_URL}/about.html#team`, 'عرض صفحة فريق العمل', 'ai-product-link')}`
  };
}

function paperMatches(intent) {
  let rows = PAPER_PRODUCTS;
  if (intent.size) rows = rows.filter(p => normalize(p.size).includes(intent.size.toLowerCase()));
  const q = intent.q;
  const names = ['امنيه','مرام','شيمكس','بروجيكتا','ازهار','مالتي','بيبروان','ارتورك','بريو','ايكوروكس','paperone','chamex'];
  const requestedName = names.find(n => q.includes(n));
  if (requestedName) rows = rows.filter(p => normalize(p.name).includes(requestedName));
  if (q.includes('70')) rows = rows.filter(p => normalize(p.weight).includes('70'));
  if (q.includes('80')) rows = rows.filter(p => normalize(p.weight).includes('80'));
  return rows;
}

function formatProductList(products, includePrice = true) {
  if (!products.length) return '';
  return products.map((p, i) => {
    const price = p.price && normalize(p.price) !== 'غير متوفر' ? `${esc(p.price)} جنيه` : 'غير متوفر حاليًا';
    return `<div class="ai-product-result"><strong>${i + 1}. ${esc(p.name)}</strong><br>` +
      `${p.paperSize ? `المقاس: ${esc(p.paperSize)}<br>` : ''}` +
      `${p.speed ? `السرعة: ${esc(p.speed)}<br>` : ''}` +
      `${p.functions ? `الوظائف: ${esc(p.functions)}<br>` : ''}` +
      `${includePrice ? `السعر: ${price}<br>` : ''}` +
      `${button(productHref(p.name), 'صفحة التفاصيل', 'ai-product-link')}` +
      `</div>`;
  }).join('');
}

function handleDeterministic(message, history) {
  const team = teamReply(message);
  if (team) return team;

  const intent = inferIntent(message);

  if (intent.wantsPaper || (intent.wantsPrice && hasAny(intent.q, ['ورق', 'بورصه']))) {
    const rows = paperMatches(intent);
    if (!rows.length) {
      return {
        format: 'html',
        reply: `أسعار بورصة الورق المطلوبة غير متاحة حاليًا في صفحة البورصة.<br><br><strong>تنبيه مهم:</strong> شركة العدل لا تبيع الورق؛ نشاطنا بيع وصيانة ماكينات التصوير والطابعات والأحبار وقطع الغيار.<br>${whatsappButton('السلام عليكم، أريد الاستفسار عن أسعار بورصة الورق والبدائل المتاحة.', 'استفسار عبر واتساب')}`
      };
    }
    const list = rows.map(r => `<div class="ai-product-result"><strong>${esc(r.name)}</strong><br>المقاس: ${esc(r.size)} | الوزن: ${esc(r.weight)}<br>سعر البورصة: <strong>${esc(r.price)} جنيه</strong></div>`).join('');
    return {
      format: 'html',
      reply: `دي أسعار بورصة الورق المطابقة لطلب حضرتك:<br>${list}<br><strong>تنبيه مهم:</strong> الأسعار دي بورصة استرشادية وقد تتغير حسب السوق، وشركة العدل لا تبيع الورق؛ إحنا متخصصين في بيع وصيانة ماكينات التصوير والطابعات والأحبار وقطع الغيار.<br>${button(`${SITE_URL}/paper-prices.html`, 'فتح صفحة بورصة الورق', 'ai-product-link')}`
    };
  }

  if (intent.wantsMachine && (!intent.color || !intent.size) && !intent.wantsPrice) {
    return {
      format: 'html',
      reply: `تمام يا فندم، قبل ما أرشح لحضرتك الموديلات المناسبة محتاج أعرف:<br><br>1) حضرتك محتاجها <strong>ألوان</strong> ولا <strong>أبيض وأسود</strong>؟<br>2) المقاس المطلوب <strong>A4</strong> ولا <strong>A3</strong>؟<br>3) الاستخدام اليومي تقريبًا كام ورقة؟<br><br>اكتبلي مثلًا: <strong>ألوان A3 استخدام متوسط</strong>، وأنا أعرض كل الموديلات المطابقة ومع كل ماكينة صفحة التفاصيل بتاعتها.`
    };
  }

  if (intent.wantsMachine || intent.wantsProducts || intent.wantsPrice) {
    const matches = productMatches(intent);
    if (matches.length) {
      if (intent.wantsPrice) {
        const hasPriced = matches.filter(p => p.price && normalize(p.price) !== 'غير متوفر');
        if (!hasPriced.length) {
          return {
            format: 'html',
            reply: `الموديل/المنتج موجود ضمن بياناتنا، لكن السعر غير متوفر حاليًا لأن السعر بيتغير حسب الحالة والتجهيزات والضمان.<br><br>${formatProductList(matches, true)}<br>${whatsappButton('السلام عليكم، أريد معرفة السعر الحالي والتوفر للمنتجات التي ظهرت في الشات.', 'استفسار عن السعر عبر واتساب')}`
          };
        }
      }
      return {
        format: 'html',
        reply: `دي كل النتائج المطابقة لطلب حضرتك، ومع كل ماكينة صفحة التفاصيل الخاصة بها:<br>${formatProductList(matches, true)}`
      };
    }
    return {
      format: 'html',
      reply: `المنتج المطلوب غير ظاهر ضمن بيانات المنتجات الحالية. ممكن يكون غير متوفر أو الاسم محتاج توضيح.<br><br>من فضلك اكتب الموديل كامل أو المواصفات: ألوان/أبيض وأسود + A4/A3 + حجم الاستخدام.<br>${whatsappButton('السلام عليكم، أريد الاستفسار عن منتج أو بدائل غير موجودة في نتائج الموقع.', 'استفسار عن البدائل عبر واتساب')}`
    };
  }

  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, history = [], pageTitle = '', pageUrl = '' } = req.body || {};
    if (!message || typeof message !== 'string' || message.trim().length < 1) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const deterministic = handleDeterministic(message, history);
    if (deterministic) return res.status(200).json(deterministic);

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({
        error: 'GROQ_API_KEY is not configured on the server.',
        fallback: 'إعدادات الشات لم تكتمل بعد. برجاء المحاولة لاحقًا أو التواصل عبر واتساب.'
      });
    }

    const systemPrompt = `
أنت مساعد خدمة عملاء داخل موقع شركة العدل لتجارة ماكينات التصوير والطابعات.

بيانات الشركة:
- النشاط: بيع وصيانة ماكينات تصوير وطابعات Ricoh، والأحبار، وقطع الغيار، وعقود الصيانة.
- العنوان: جمصة، الدقهلية - شارع الشباب بجوار مسجد السلام.
- الهاتف/واتساب: ${PHONE_DISPLAY}.
- رابط الموقع الأساسي: ${SITE_URL}.
- فريق العمل حسب صفحة من نحن:
  * المدير التنفيذي: م. محمد عاطف.
  * مدير خدمة العملاء: أحمد محمود.
  * مدير الصيانة: خالد إبراهيم.

قواعد إلزامية:
1) رد باللهجة المصرية المهذبة وباختصار.
2) لا تقل للعميل "زور موقعنا" أو "على موقعنا" لأنه يتحدث من داخل الموقع. وجّهه للصفحة المناسبة فقط عند وجود رابط واضح.
3) لا تضع رقم واتساب أو رابط واتساب في كل رد. استخدم واتساب فقط لو السعر غير متاح، المنتج غير متاح، العميل طلب تواصل/شراء/حجز، أو يحتاج تأكيد توفر.
4) لا تخترع أسعارًا نهائيًا. الأسعار تؤخذ فقط من بيانات المنتجات أو بورصة الورق.
5) شركة العدل لا تبيع الورق؛ أسعار الورق بورصة استرشادية فقط.
6) لو العميل يسأل عن ماكينة ولا توجد مواصفات كافية، اسأله: ألوان ولا أبيض وأسود؟ A4 ولا A3؟ حجم الاستخدام اليومي؟
7) لو سأل عن صيانة، اطلب موديل الماكينة ووصف العطل ورسالة الخطأ إن وجدت.
8) لو سأل عن فريق العمل أو مدير الشركة أو خدمة العملاء أو مدير الصيانة، جاوب من بيانات فريق العمل فقط ولا تخترع أسماء.
`;

    const safeHistory = Array.isArray(history)
      ? history.slice(-8).map((m) => ({ role: m && m.role === 'assistant' ? 'assistant' : 'user', content: String((m && m.content) || '').slice(0, 900) }))
      : [];

    const userContent = `صفحة الموقع الحالية: ${String(pageTitle).slice(0, 140)}\nالرابط: ${String(pageUrl).slice(0, 220)}\nرسالة العميل: ${message.trim().slice(0, 1500)}`;

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
        temperature: 0.18,
        max_tokens: 420,
        messages: [{ role: 'system', content: systemPrompt }, ...safeHistory, { role: 'user', content: userContent }]
      })
    });

    const data = await groqResponse.json().catch(() => ({}));
    if (!groqResponse.ok) {
      return res.status(groqResponse.status).json({
        error: data?.error?.message || 'Groq API error',
        fallback: 'حصل ضغط مؤقت في خدمة الرد. حاول تاني بعد لحظات، ولو طلبك عاجل تواصل معنا على واتساب.'
      });
    }

    const reply = data?.choices?.[0]?.message?.content?.trim();
    return res.status(200).json({ format: 'text', reply: reply || 'تحت أمر حضرتك، ممكن توضح المطلوب: ماكينة، طابعة، حبر، قطع غيار، صيانة، أم بورصة ورق؟' });
  } catch (error) {
    return res.status(500).json({ error: 'Server error', fallback: 'حصل خطأ مؤقت. حاول مرة أخرى بعد لحظات.' });
  }
}
