import Link from 'next/link';

export default function MesafeliSatisPage() {
  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-cream-border px-6 py-4 flex items-center gap-4 bg-cream">
        <Link href="/" className="text-muted hover:text-teal text-sm transition-colors">← Geri</Link>
        <h1 className="font-serif italic text-xl text-teal font-bold">CLASR</h1>
      </header>
      <main className="max-w-2xl mx-auto px-6 py-12">
        <h2 className="font-serif text-2xl font-bold text-teal mb-2">Mesafeli Satış Sözleşmesi</h2>
        <p className="text-muted text-xs mb-8">Son güncelleme: Mayıs 2025</p>

        <div className="space-y-6 text-muted text-sm leading-relaxed">
          <section>
            <h3 className="text-teal font-semibold mb-2">1. Taraflar</h3>
            <p className="mb-2"><span className="text-[#1A1A1A] font-medium">Satıcı:</span><br />
              Unvan: CLASR<br />
              E-posta: hello@clasr.ai<br />
              Web: https://clasr.ai
            </p>
            <p><span className="text-[#1A1A1A] font-medium">Alıcı:</span> Siteye kayıt olan ve ödeme işlemini gerçekleştiren kullanıcı.</p>
          </section>

          <section>
            <h3 className="text-teal font-semibold mb-2">2. Sözleşmenin Konusu</h3>
            <p>Bu sözleşme; alıcının, satıcıya ait clasr.ai internet sitesi üzerinden elektronik ortamda siparişini yaptığı aşağıda nitelikleri ve satış fiyatı belirtilen dijital hizmetin (yazılım aboneliği) satışı ve kullanımına ilişkin olarak 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği hükümleri gereğince tarafların hak ve yükümlülüklerini kapsamaktadır.</p>
          </section>

          <section>
            <h3 className="text-teal font-semibold mb-2">3. Hizmet Bilgileri</h3>
            <p>CLASR, yapay zeka destekli akademik makale sinyal okuma aracıdır. Sunulan abonelik planları:</p>
            <ul className="mt-2 space-y-1 list-disc list-inside text-gray-400">
              <li>Basic Plan: 19,99 USD/ay veya 159,99 USD/yıl — 40 analiz/ay, 5 sohbet/ay</li>
              <li>Pro Plan: 99,99 USD/ay veya 799,99 USD/yıl — 150 analiz/ay, 50 sohbet/ay</li>
            </ul>
            <p className="mt-2">Hizmet tamamen dijitaldir. Fiziksel teslimat yapılmamaktadır.</p>
          </section>

          <section>
            <h3 className="text-teal font-semibold mb-2">4. Ödeme Koşulları</h3>
            <p>Ödemeler Paddle altyapısı üzerinden kredi kartı veya banka kartı ile yapılmaktadır. Paddle, satıcının kayıt ortağı (Merchant of Record) olarak ödeme işlemcisi, vergi hesaplama ve tahsil işlemlerini yürütmektedir. Abonelikler seçilen plana göre aylık veya yıllık olarak önceden tahsil edilir. Ödeme bilgileri CLASR tarafından saklanmaz; Paddle güvenli ve PCI DSS uyumlu ödeme altyapısını kullanmaktadır.</p>
          </section>

          <section>
            <h3 className="text-teal font-semibold mb-2">5. Teslimat</h3>
            <p>Hizmet dijital nitelikte olup ödemenin onaylanmasının ardından abonelik anında aktive edilir. Herhangi bir fiziksel kargo veya teslimat söz konusu değildir.</p>
          </section>

          <section>
            <h3 className="text-teal font-semibold mb-2">6. Cayma Hakkı</h3>
            <p>6502 sayılı Kanun'un 49. maddesi uyarınca, dijital içerik ve hizmetlerde tüketici cayma hakkını kullanmadan önce ifaya başlanmasına açıkça rıza göstermiş ve cayma hakkını kaybedeceğini kabul etmişse cayma hakkı uygulanmaz. CLASR aboneliğini satın alan kullanıcı, hizmetin satın alma işleminin tamamlanmasının ardından derhal sunulmaya başlanacağını ve bu nedenle cayma hakkından feragat ettiğini kabul eder.</p>
            <p className="mt-2">Bununla birlikte, henüz aktive edilmemiş veya hiç kullanılmamış abonelikler için ihtiyari iade talepleri hello@clasr.ai adresine iletilmekte ve 14 gün içinde değerlendirilmektedir.</p>
          </section>

          <section>
            <h3 className="text-teal font-semibold mb-2">7. İptal ve İade</h3>
            <p>Aboneliğinizi dilediğiniz zaman Hesap Ayarları sayfasından iptal edebilirsiniz. İptal işlemi mevcut fatura döneminin sonunda geçerli olur; kalan süre için ücret iadesi yapılmaz. Yasal zorunluluk gerektiren durumlarda iade koşulları ayrıca değerlendirilir.</p>
          </section>

          <section>
            <h3 className="text-teal font-semibold mb-2">8. Gizlilik</h3>
            <p>Kişisel verilerinizin işlenmesine ilişkin ayrıntılar için <Link href="/privacy" className="text-teal-mid hover:underline">Gizlilik Politikamızı</Link> inceleyiniz. CLASR, KVKK kapsamındaki yükümlülüklerini yerine getirmektedir.</p>
          </section>

          <section>
            <h3 className="text-teal font-semibold mb-2">9. Uyuşmazlık Çözümü</h3>
            <p>Bu sözleşmeden doğan uyuşmazlıklarda, Türk tüketici mevzuatı kapsamında tüketici hakem heyetleri ve tüketici mahkemeleri yetkilidir. Taraflar öncelikle iletişim yoluyla çözüme ulaşmayı esas alır.</p>
          </section>

          <section>
            <h3 className="text-teal font-semibold mb-2">10. İletişim</h3>
            <p>Sözleşmeye ilişkin sorularınız için: <span className="text-teal-mid">hello@clasr.ai</span></p>
          </section>
        </div>
      </main>
    </div>
  );
}
