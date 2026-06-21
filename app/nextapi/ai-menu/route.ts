import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'OpenAI API key yapılandırılmamış' }, { status: 500 })
  }

  const formData = await req.formData()
  const image = formData.get('image') as File | null
  const description = (formData.get('description') as string) || ''

  if (!image) {
    return NextResponse.json({ error: 'Resim zorunlu' }, { status: 400 })
  }

  const imageBytes = await image.arrayBuffer()
  const base64Image = Buffer.from(imageBytes).toString('base64')
  const mimeType = image.type || 'image/jpeg'

  const prompt = `Sen bir restoran menüsü analiz uzmanısın. Bu menü resmini analiz et ve tüm ürünleri çıkar.
${description ? `Ek bağlam: ${description}` : ''}

Şu JSON yapısını döndür (başka hiçbir şey ekleme, sadece JSON):
{
  "categories": [
    {
      "name": "Kategori adı Türkçe",
      "nameEn": "Category name in English",
      "items": [
        {
          "name": "Ürün adı Türkçe",
          "nameEn": "Item name in English",
          "description": "Açıklama Türkçe veya null",
          "descriptionEn": "Description in English or null",
          "price": 0.00
        }
      ]
    }
  ]
}

Kurallar:
- Görselde gördüğün TÜM ürünleri çıkar
- Menü Türkçe ise İngilizce çeviri ekle, İngilizce ise Türkçe çeviri ekle
- Fiyatları sayı olarak ver (para birimi sembolü ekleme)
- Fiyat okunaklıysa o fiyatı yaz; eğer görselde fiyat yoksa veya okunamıyorsa o yemek türünün Türkiye'deki ortalama fiyatını tahmin et (örn. çorba ~120, kebap ~350, tatlı ~150) — ASLA 0 yazma
- Kategorisi olmayan ürünleri "Genel" / "General" kategorisine ekle
- SADECE JSON döndür, ekstra metin ekleme`

  const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${base64Image}`, detail: 'low' },
            },
            { type: 'text', text: prompt },
          ],
        },
      ],
      max_tokens: 4096,
    }),
  })

  if (!openaiRes.ok) {
    const errText = await openaiRes.text()
    return NextResponse.json({ error: 'OpenAI API hatası', details: errText }, { status: 500 })
  }

  const openaiData = await openaiRes.json()
  const content = openaiData.choices?.[0]?.message?.content

  if (!content) {
    return NextResponse.json({ error: 'OpenAI yanıt vermedi' }, { status: 500 })
  }

  try {
    const parsed = JSON.parse(content)
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ error: 'Geçersiz yanıt formatı', raw: content }, { status: 500 })
  }
}
