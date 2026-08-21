# FiveM Moderation Bot

FiveM sunucuları için özel olarak geliştirilmiş, yüksek performanslı, SQLite tabanlı, modern Discord moderasyon, ticket, mülakat, ekip, istatistik ve çekiliş botu.

---

##  Özellikler & Sistemler

###  Moderasyon Sistemleri
- **Whitelist Yönetimi:** `/wl-ver` (HEX ID veya Steam profil linki ile Whitelist verme), `/wl-al` (Whitelist alma)
- **Whitelist Uyarı & Ceza:** `/wl-uyari` (I, II, III Puan), `/wl-uyari-kaldir`, `/wl-ceza` (Süreli / Kalıcı), `/wl-ceza-kaldir`, `/otoceza` (3. Uyarıdan sonra ne yapılsın?)
- **Case ID Takibi:** Tüm cezalar ve uyarılar için `AKY-XXXXX` formatında benzersiz vaka takip numarası
- **Şeffaf Bilgilendirme & Log:** Components V2 kartlarıyla `#ceza-bilgilendirme` ve `#whitelist-ceza-log` kanallarına anlık broadcast
- **Ban & Ceza Affı:** `/ban`, `/unban`, `/perma-ban`, `/perma-unban`, `/banaffi`
- **Mute Yönetimi:** `/mute`, `/unmute`, `/allmute` (Kanal genelinde toplu susturma)
- **Rol Yönetimi:** `/rol-ver`, `/rol-al`
- **Sicil Sorgulama:** `/sicil` — Kullanıcının tüm uyarı, ceza, ban, mute ve mülakat geçmişini detaylı listeler

###  Destek & Ticket Sistemi
- **Ticket Paneli:** `/ticketkurulum` ile butonlu modern ticket açma paneli
- **Ticket Yönetimi:** Üstlen (`ticketClaim`), Bırak (`ticketUnclaim`), Kullanıcı Ekle/Çıkar, Ping ve Kapatma butonları
- **HTML Transkript Arşivi:** Ticket kapandığında mesajları, ekleri ve detayları kaydeden HTML transkript üreticisi (`transcriptGenerator`)

###  Mülakat & IC İsim Onay Sistemi
- **Sesli Mülakat:** Mülakat bekleme odasındaki kullanıcıyı otomatik odaya çekme, ilgilenme ve sonuçlandırma
- **IC Karakter İsmi:** Butonlu onay/red paneli ile isim değişiklik taleplerini yönetme (`/basvurumesaj`)

###  Ekip (Team) Sistemi
- `/ekip-olustur`, `/ekip-sil`, `/ekip-bilgi`, `/ekip-davet`, `/ekip-puan`
- Ekip lideri (Boss) ve OG yönetimi, ekip içi roller ve özel ses kanalı entegrasyonu

###  İstatistik & Bilgi Panelleri
- **Kullanıcı Bilgi:** `/kullanici-bilgi` — `@napi-rs/canvas` ile oluşturulan modern monochrome (siyah-beyaz) istatistik kartı
- **Davet Takibi:** `/davetler` (Kullanıcının davet sayıları), `/daily-invite-log` (Günlük davet log kanalı ayarlama)
- **Konum / Nerede:** `/nerede` (Kullanıcının hangi ses kanalında olduğunu bulur)
- **Yetkili İstatistikleri:** `/yetkili-stat` (Detaylı ses, ticket, mülakat, ceza ve puan analizi), `/yetkili-top` (Yetkili puan sıralaması)
- **Yetkili Ses Kontrol:** `/yetkilises` — Seste olan ve olmayan yetkilileri listeleyip tek tuşla sese çağırma paneli

###  Çekiliş (Giveaway) Sistemi
- `/cekilis-baslat`, `/cekilis-bitir`, `/cekilis-reroll`
- Arka planda çalışan zamanlayıcı (`giveawayManager`), butonla katılım ve kazananlara otomatik DM bildirimi

###  Sunucu & Sistem Yönetimi
- **`/kur`:** Tüm log kategorilerini ve kanallarını otomatik oluşturur, izinleri ayarlar ve `config.json`'a işler
- **`/kaldir`:** Botun oluşturduğu tüm kanal/kategorileri sunucudan temizler
- **`/db-sil`:** Veritabanındaki tabloları sıfırlar (Sadece yetkili geliştiriciler)
- **`/cfg-duzenle`:** Rol, kanal ve sunucu IP ayarlarını dinamik olarak düzenler
- **`/cfg-sil`:** `config.json` dosyasını sıfırlar
- **`/sunucu`:** Sunucu durumunu (Aktif/Bakım/Kapalı) duyurur
- **`/dmduyuru`:** Rate-limit korumalı toplu DM duyuru gönderimi
- **`/yardim`:** Tüm komutları kategorilerine göre listeler

---

##  Kurulum & Çalıştırma

> [!IMPORTANT]
> **Önemli Not:** Botu kullanmaya başlamadan önce `config.json` dosyasından sunucunuzun **rollerini (`roles`)** ayarlayınız. Ayrıca geliştirici komutlarını (`/db-sil`, `/otoceza` vb.) sorunsuz kullanabilmek için `config.json` içindeki **`developers`** listesine kendi Discord kullanıcı ID'nizi eklemeyi unutmayın!

1. **Gereksinimler:**
   - Node.js v22.23.2-LTS
   - npm

2. **Bağımlılıkları Yükleyin:**
   ```bash
   npm install
   ```

3. **Çevre Değişkenleri (.env):**
   Proje ana dizinindeki `.env` dosyasını yapılandırın.
   ```env
   BOT_TOKEN=DISCORD_BOT_TOKENINIZ
   GUILD_ID=SUNUCU_IDNIZ
   ```

4. **Botu Başlatın:**
   ```bash
   # Geliştirme modu (nodemon)
   npm run dev

   # Normal üretim modu
   npm start
   
   # Windows için tek tıkla başlatma
   start.bat
   ```

5. **İlk Kurulum:**
   - Bot sunucunuza katıldıktan sonra `/kur` komutunu çalıştırarak tüm kanalları, kategorileri ve log sistemini tek tıkla kurabilirsiniz.

---

## 📄 Lisans
[](https://github.com/akuyage/gelismis-ticket#-lisans)
Bu proje [Akuyage License](https://github.com/akuyage/gelismis-ticket/blob/main/LICENSE) ile lisanslanmıştır.

Botu kullandığınızda botun Discord profil durumunda, botun kullanıldığı proje adıyla birlikte aşağıdaki formatta geliştirici atfı bulunmalıdır:

`<Proje Adı> - akuyage`

Örnek:

`Ticket - akuyage`

Bu atıf, bot aktif olarak kullanıldığı sürece görünür ve okunabilir olmalıdır. Ayrıntılı şartlar için [LICENSE](https://github.com/akuyage/gelismis-ticket/blob/main/LICENSE) dosyasına bakın.

[https://discord.gg/kK8Gdqk88a](https://discord.gg/kK8Gdqk88a)

*Powered by akuyage*
