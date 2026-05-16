export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({
      error: 'GROQ_API_KEY is not configured on the server.'
    });
  }

  try {
    const { message, history = [], pageTitle = '', pageUrl = '' } = req.body || {};

    if (!message || typeof message !== 'string' || message.trim().length < 1) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const systemPrompt = `
أنت موظف خدمة عملاء محترف داخل موقع شركة العدل لتجارة ماكينات التصوير والطابعات.

بيانات الشركة الثابتة:
- الاسم: شركة العدل لتجارة ماكينات التصوير والطابعات.
- النشاط: بيع وصيانة ماكينات تصوير وطابعات Ricoh، وبيع الأحبار وقطع الغيار ومستلزمات الطباعة.
- العنوان: جمصة، الدقهلية - شارع الشباب بجوار مسجد السلام.
- واتساب/هاتف: 01094799247.

نطاق الرد المسموح:
- ماكينات تصوير Ricoh أبيض وأسود وألوان.
- طابعات ديجيتال، بلوتارات، طابعات حبر، طابعات طبية، وماكينات ما بعد الطباعة.
- الأحبار، قطع الغيار، الصيانة، عقود الصيانة، الدعم الفني، البيع، الترشيحات، وطريقة التواصل.

قواعد مهمة جدًا:
1) رد باللهجة المصرية المهذبة، مختصر وواضح، وكأنك موظف مبيعات/خدمة عملاء.
2) لا تذكر أنك نموذج ذكاء اصطناعي ولا تتكلم في أي موضوع خارج خدمات الشركة.
3) لا تخترع أسعار نهائية. لو العميل سأل عن السعر، قل إن السعر بيتحدد حسب الموديل والحالة والتجهيزات والضمان، واطلب منه إرسال تفاصيله على واتساب.
4) لو العميل عايز صيانة، اطلب موديل الماكينة + وصف العطل + صورة الخطأ إن وجدت.
5) لو العميل محتار في ماكينة، اسأله عن: ألوان ولا أبيض وأسود؟ A4 ولا A3؟ حجم الاستخدام اليومي؟ الميزانية التقريبية؟
6) اختم غالبًا بدعوة عملية للتواصل: "ابعت لنا التفاصيل على واتساب 01094799247".
7) لو السؤال خارج المجال، اعتذر بلطف وارجعه لخدمات الشركة.
`;

    const safeHistory = Array.isArray(history)
      ? history.slice(-8).map((m) => ({
          role: m && m.role === 'assistant' ? 'assistant' : 'user',
          content: String((m && m.content) || '').slice(0, 900)
        }))
      : [];

    const userContent = `صفحة الموقع الحالية: ${String(pageTitle).slice(0, 140)}\nالرابط: ${String(pageUrl).slice(0, 220)}\nرسالة العميل: ${message.trim().slice(0, 1500)}`;

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
        temperature: 0.25,
        max_tokens: 360,
        messages: [
          { role: 'system', content: systemPrompt },
          ...safeHistory,
          { role: 'user', content: userContent }
        ]
      })
    });

    const data = await groqResponse.json().catch(() => ({}));

    if (!groqResponse.ok) {
      return res.status(groqResponse.status).json({
        error: data?.error?.message || 'Groq API error',
        fallback: 'حصل ضغط مؤقت على خدمة الرد. ابعت لنا طلبك على واتساب 01094799247 وهنرد عليك فورًا.'
      });
    }

    const reply = data?.choices?.[0]?.message?.content?.trim();
    return res.status(200).json({
      reply: reply || 'تحت أمرك يا فندم. ابعت لنا تفاصيل طلبك أو موديل الماكينة على واتساب 01094799247.'
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Server error',
      fallback: 'حصل خطأ مؤقت. تقدر تتواصل معنا مباشرة على واتساب 01094799247.'
    });
  }
}
