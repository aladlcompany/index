تم تركيب مساعد Groq داخل موقع شركة العدل.

الملفات التي تمت إضافتها:
1) api/chat.js
   هذا هو ملف السيرفر على Vercel. يحمي مفتاح Groq ويمنع ظهوره للزوار.

2) groq-assistant-client.js
   هذا هو سكريبت واجهة الشات. يلتقط رسائل العملاء من الشات الموجود ويرسلها إلى /api/chat.

3) .env.example
   مثال لأسماء متغيرات البيئة المطلوبة على Vercel.

خطوات التشغيل على Vercel:
1) ارفع هذا المشروع على GitHub ثم اربطه بـ Vercel.
2) من Vercel افتح Project Settings > Environment Variables.
3) أضف المتغيرات:
   GROQ_API_KEY = مفتاح Groq الخاص بك
   GROQ_MODEL = llama-3.1-8b-instant
4) اعمل Redeploy للموقع.
5) افتح الموقع وجرب الشات.

ملاحظات مهمة:
- لا تضع مفتاح Groq داخل أي ملف HTML أو JavaScript ظاهر للزائر.
- لو الموقع اشتغل على GitHub Pages فقط، ملف api/chat.js لن يعمل. لازم Vercel أو أي استضافة تدعم Serverless Functions.
- الردود مقيدة بخدمات شركة العدل: ماكينات تصوير، طابعات، أحبار، قطع غيار، صيانة، أسعار، وترشيحات.
