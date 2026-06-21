'use client'
import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { cn } from '@/lib/utils'

export default function LandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params)
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,700;0,9..40,900&family=Playfair+Display:ital,wght@0,700;0,900;1,700&display=swap');
        .hero-text { font-family: 'Playfair Display', serif; }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(32px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin-slow { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.8)} }
        .float { animation: float 4s ease-in-out infinite; }
        .fade-up-1 { animation: fadeUp 0.7s 0.1s ease both; }
        .fade-up-2 { animation: fadeUp 0.7s 0.25s ease both; }
        .fade-up-3 { animation: fadeUp 0.7s 0.4s ease both; }
        .fade-up-4 { animation: fadeUp 0.7s 0.55s ease both; }
        .spin-slow { animation: spin-slow 20s linear infinite; }
        .pulse-dot { animation: pulse-dot 2s ease infinite; }
        .card-hover { transition: transform 0.3s ease, box-shadow 0.3s ease; }
        .card-hover:hover { transform: translateY(-4px); box-shadow: 0 24px 48px rgba(87,207,66,0.12); }
        .text-gradient { background: linear-gradient(135deg, #57CF42 0%, #a3f587 50%, #57CF42 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .bg-glow { background: radial-gradient(ellipse 80% 50% at 50% -20%, rgba(87,207,66,0.12) 0%, transparent 60%); }
      `}</style>

      {/* Nav */}
      <nav className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrollY > 40 ? 'bg-[#0a0a0a]/90 backdrop-blur-md border-b border-white/5' : ''
      )}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="Viamean Software" width={28} height={28} className="rounded-lg object-contain" />
            <div className="flex flex-col leading-none">
              <span className="font-bold text-white text-base tracking-tight">JetSipariş</span>
              <span className="text-[10px] text-white/30 font-medium">by Viamean Software</span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-white/50">
            <a href="#features" className="hover:text-white transition-colors">Özellikler</a>
            <a href="#how" className="hover:text-white transition-colors">Nasıl Çalışır</a>
          </div>
          <Link href={`/${locale}/login`}
            className="bg-[#57CF42] hover:bg-[#4ab938] text-black font-semibold text-sm px-5 py-2 rounded-xl transition-all hover:scale-105">
            Giriş Yap →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center bg-glow overflow-hidden">
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-[#57CF42]/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#57CF42]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-24 right-24 opacity-15 hidden lg:block spin-slow">
          <svg width="200" height="200" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="90" fill="none" stroke="#57CF42" strokeWidth="1" strokeDasharray="8 6"/>
            <circle cx="100" cy="100" r="60" fill="none" stroke="#57CF42" strokeWidth="0.5" strokeDasharray="4 8"/>
          </svg>
        </div>

        <div className="max-w-6xl mx-auto px-6 pt-24 pb-16 w-full grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="fade-up-1 inline-flex items-center gap-2 bg-[#57CF42]/10 border border-[#57CF42]/20 text-[#57CF42] text-xs font-semibold px-4 py-2 rounded-full mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-[#57CF42] inline-block pulse-dot" />
              QR Menü & Sipariş Sistemi
            </div>
            <h1 className="hero-text fade-up-2 text-5xl md:text-6xl lg:text-7xl font-black leading-[1.05] mb-6">
              Masada QR,<br />
              <span className="text-gradient">Mutfakta Anında.</span>
            </h1>
            <p className="fade-up-3 text-white/50 text-lg leading-relaxed mb-10 max-w-lg">
              Müşteri QR okuttu, garson siparişi gördü, aşçı hazırladı. Kağıt yok, bekleme yok, hata yok.
            </p>
            <div className="fade-up-4 flex flex-col sm:flex-row gap-4">
              <Link href={`/${locale}/login`}
                className="inline-flex items-center justify-center gap-2 bg-[#57CF42] hover:bg-[#4ab938] text-black font-bold text-base px-8 py-4 rounded-2xl transition-all hover:scale-105 shadow-2xl shadow-[#57CF42]/25">
                Hemen Başla
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd"/></svg>
              </Link>
              <a href="#how"
                className="inline-flex items-center justify-center gap-2 border border-white/10 hover:border-white/25 text-white/60 hover:text-white font-semibold text-base px-8 py-4 rounded-2xl transition-all">
                Nasıl çalışır?
              </a>
            </div>
            <div className="fade-up-4 flex gap-8 mt-14 pt-10 border-t border-white/5">
              {[{n:'3 sn',l:'sipariş mutfağa'},{n:'0',l:'kağıt & karışıklık'},{n:'%100',l:'gerçek zamanlı'}].map(s => (
                <div key={s.l}>
                  <p className="text-2xl font-black text-[#57CF42]">{s.n}</p>
                  <p className="text-xs text-white/30 mt-0.5">{s.l}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Phone mockup */}
          <div className="float hidden lg:flex justify-center">
            <div className="relative">
              <div className="w-56 h-96 bg-[#111] border border-white/10 rounded-3xl shadow-2xl shadow-black/60 overflow-hidden p-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 bg-[#57CF42]/20 rounded-lg" />
                  <div className="flex-1">
                    <div className="h-2.5 bg-white/10 rounded-full w-24 mb-1" />
                    <div className="h-2 bg-white/5 rounded-full w-16" />
                  </div>
                </div>
                <p className="text-white/30 text-[10px] font-bold uppercase tracking-wider mb-2">Kategoriler</p>
                <div className="grid grid-cols-2 gap-1.5 mb-3">
                  {[{n:'🍖 Ana Yemek',c:'#57CF42'},{n:'🥤 İçecekler',c:'#3b82f6'},{n:'🍰 Tatlılar',c:'#f59e0b'},{n:'🥗 Başlangıç',c:'#ec4899'}].map(c => (
                    <div key={c.n} className="rounded-xl p-2.5 aspect-[4/3] flex items-end border border-white/5" style={{background:`${c.c}12`}}>
                      <p className="text-[9px] font-semibold text-white/60">{c.n}</p>
                    </div>
                  ))}
                </div>
                <div className="h-10 rounded-xl flex items-center justify-center border border-[#57CF42]/20" style={{background:'rgba(87,207,66,0.1)'}}>
                  <p className="text-[#57CF42] text-[10px] font-bold">🛒 Sepeti Görüntüle (3 ürün)</p>
                </div>
              </div>
              {/* Floating notification */}
              <div className="absolute -right-8 top-12 bg-[#111] border border-[#57CF42]/30 rounded-2xl px-3 py-2 shadow-xl w-44">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-[#57CF42]/20 rounded-lg flex items-center justify-center text-xs">🔔</div>
                  <div>
                    <p className="text-white text-[10px] font-bold">Masa 5 — Hazır!</p>
                    <p className="text-white/40 text-[9px]">Servise çıkabilirsiniz</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[#57CF42] text-xs font-bold uppercase tracking-widest mb-3">Özellikler</p>
            <h2 className="hero-text text-4xl md:text-5xl font-black">Her rol için tasarlandı</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon:'📱', role:'Müşteri', color:'#57CF42', title:'QR Tara, Sipariş Ver',
                desc:'Masadaki QR kodu tara, menüyü gör, seçeneklerini belirle, sipariş ver.',
                items:['Kategori bazlı menü','Ürün görselleri & seçenekler','Garson çağır / Hesap iste','Uygulama & üyelik gereksiz'] },
              { icon:'👨‍🍳', role:'Aşçı', color:'#f59e0b', title:'Sipariş Geldi, Hazırla',
                desc:'Yeni sipariş anında ekrana düşer. Ürün görseli, masa no, adet — hepsi net.',
                items:['Anlık WebSocket bildirimi','Ürün fotosu & detay','Tek tuş "HAZIR!" butonu','Seçenekler (usul, boy…) görünür'] },
              { icon:'🛎️', role:'Garson', color:'#3b82f6', title:'Hazır Geldi, Götür',
                desc:'Mutfak "Hazır" dediği an bildirim gelir. Hangi masa, ne sipariş, önünde.',
                items:['Mutfakta & serviste ayrı liste','Garson çağrısı & hesap bildirimi','Masa numarası & toplam tutar','Teslim et, listeden düş'] },
            ].map(f => (
              <div key={f.role} className="card-hover bg-white/[0.03] border border-white/8 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{background:`${f.color}18`}}>{f.icon}</div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest" style={{color:f.color}}>{f.role}</p>
                    <p className="font-bold text-white text-sm">{f.title}</p>
                  </div>
                </div>
                <p className="text-white/35 text-sm leading-relaxed mb-4">{f.desc}</p>
                <ul className="space-y-2">
                  {f.items.map(item => (
                    <li key={item} className="flex items-center gap-2 text-sm text-white/55">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{background:f.color}} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-24 px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[#57CF42] text-xs font-bold uppercase tracking-widest mb-3">Akış</p>
            <h2 className="hero-text text-4xl md:text-5xl font-black">4 adımda iş bitti</h2>
          </div>
          <div className="space-y-4">
            {[
              { n:'01', t:'Restoran & Menü Kur', d:'Kategorileri ekle, ürünleri fotoğrafla yükle, QR masaları oluştur. 15 dakikada hazır.' },
              { n:'02', t:'Müşteri QR Okuttu', d:'Masadaki QR\'ı telefona tutan müşteri anında menüyü görür. Uygulama indirmez, kayıt olmaz.' },
              { n:'03', t:'Sipariş Mutfağa Düştü', d:'Müşteri "Onayla"ya bastı mı, 1 saniyede aşçının ekranına düşer. WebSocket, gerçek zamanlı.' },
              { n:'04', t:'Garson Haberi Aldı', d:'Aşçı "Hazır!" dedi mi garsonun telefonuna anında bildirim gelir. Masa numarası, ürünler net.' },
            ].map((s, i) => (
              <div key={s.n} className="flex gap-5 items-start bg-white/[0.02] border border-white/5 rounded-2xl p-5 hover:border-[#57CF42]/20 transition-colors">
                <div className="flex-shrink-0 w-10 h-10 bg-[#57CF42]/10 border border-[#57CF42]/20 rounded-xl flex items-center justify-center">
                  <span className="text-[#57CF42] text-xs font-black">{s.n}</span>
                </div>
                <div>
                  <p className="font-bold text-white mb-1">{s.t}</p>
                  <p className="text-white/40 text-sm leading-relaxed">{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="py-16 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="bg-[#57CF42]/5 border border-[#57CF42]/15 rounded-2xl px-8 py-8 grid md:grid-cols-4 gap-8 items-start">
            <div>
              <p className="text-[#57CF42] text-xs font-bold uppercase tracking-widest mb-1">Güvenlik</p>
              <h3 className="font-black text-xl text-white leading-tight">Sahte sipariş yok</h3>
            </div>
            {[
              { icon:'🔐', t:'Session Token', d:'QR okundukta 2 saatlik token üretilir. Eve giden müşteri sipariş veremez.' },
              { icon:'🛡️', t:'IDOR Koruması', d:'Hiçbir kullanıcı başka restoranın verisine erişemez.' },
              { icon:'📸', t:'Güvenli Yükleme', d:'Magic bytes kontrolü, path traversal koruması, 5 MB limit.' },
            ].map(s => (
              <div key={s.t} className="flex gap-3">
                <span className="text-xl flex-shrink-0 mt-0.5">{s.icon}</span>
                <div>
                  <p className="font-bold text-sm text-white mb-1">{s.t}</p>
                  <p className="text-white/35 text-xs leading-relaxed">{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-glow pointer-events-none" />
        <div className="relative max-w-2xl mx-auto">
          <h2 className="hero-text text-5xl md:text-6xl font-black mb-6">
            Başlamaya<br /><span className="text-gradient">hazır mısın?</span>
          </h2>
          <p className="text-white/40 text-lg mb-10">Menünü kur, QR'ları yaz, masalara koy.<br />İlk siparişini bugün al.</p>
          <Link href={`/${locale}/login`}
            className="inline-flex items-center gap-3 bg-[#57CF42] hover:bg-[#4ab938] text-black font-black text-lg px-10 py-5 rounded-2xl transition-all hover:scale-105 shadow-2xl shadow-[#57CF42]/25">
            Giriş Yap & Başla
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd"/></svg>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="Viamean Software" width={22} height={22} className="rounded object-contain" />
            <div className="flex flex-col leading-none">
              <span className="font-bold text-white text-sm">JetSipariş</span>
              <span className="text-[9px] text-white/25">by Viamean Software</span>
            </div>
          </div>
          <p className="text-white/20 text-xs">© 2026 JetSipariş. QR menü & sipariş sistemi.</p>
          <div className="flex items-center gap-4">
            <div className="flex gap-6 text-xs text-white/30">
              <a href="#" className="hover:text-white/60 transition-colors">Gizlilik</a>
              <a href="#" className="hover:text-white/60 transition-colors">Kullanım Şartları</a>
            </div>
            <div className="flex items-center gap-1.5 border-l border-white/10 pl-4">
              <Image src="/logo.png" alt="Viamean" width={14} height={14} className="rounded object-contain opacity-50" />
              <span className="text-[10px] text-white/20">Viamean Software</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
