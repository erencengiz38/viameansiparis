import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q')
  if (!query?.trim()) {
    return NextResponse.json({ photos: [] })
  }

  const apiKey = process.env.PEXELS_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'API key eksik' }, { status: 500 })
  }

  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=15&orientation=square`

  const res = await fetch(url, {
    headers: { Authorization: apiKey },
    next: { revalidate: 60 },
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'Pexels hatası' }, { status: res.status })
  }

  const data = await res.json()

  const photos = (data.photos ?? []).map((p: any) => ({
    id: p.id,
    url: p.src.medium,
    thumb: p.src.small,
    alt: p.alt ?? p.photographer,
  }))

  return NextResponse.json({ photos })
}
