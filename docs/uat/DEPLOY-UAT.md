# Panduan: jalankan SEMS untuk UAT di `https://sems-uptm.afifnajmi.com`

Sistem dijalankan di **laptop awak**, dan **Cloudflare Tunnel** menyambungkannya ke internet dengan HTTPS.
Penguji hanya nampak alamat `https://sems-uptm.afifnajmi.com`. Tiada port dibuka pada router awak,
dan MySQL serta phpMyAdmin **tidak** terdedah.

```
Penguji (telefon / laptop)  ->  Cloudflare  ->  tunnel (cloudflared di laptop)  ->  backend SEMS :5000
                                                                                   (hidangkan aplikasi + API)
                                                                                         |
                                                                                    MySQL (XAMPP)
```

## A. Satu kali sahaja

### 1. Beli domain `afifnajmi.com` (belum wujud setakat semakan DNS)
- Cara paling mudah: **Cloudflare Registrar** (harga kos, kira-kira USD 10 hingga 12 setahun untuk `.com`). Domain terus berada di Cloudflare.
- Kalau beli di tempat lain (Namecheap, Exabytes, dll.): tambah domain ke akaun Cloudflare (pelan **Free**), kemudian tukar *nameserver* di tempat beli kepada dua nameserver yang Cloudflare beri. Tunggu sehingga Cloudflare tunjuk **Active** (beberapa minit hingga beberapa jam).

### 2. Pasang cloudflared
```bash
winget install --id Cloudflare.cloudflared
```
Tutup dan buka semula terminal, kemudian semak: `cloudflared --version`.

### 3. Cipta terowong dan sambungkan nama domain
Jalankan satu demi satu:
```bash
cloudflared tunnel login
cloudflared tunnel create sems-uat
cloudflared tunnel route dns sems-uat sems-uptm.afifnajmi.com
```
- `login` membuka pelayar: pilih domain `afifnajmi.com`.
- `create` mencetak **Tunnel ID** dan menyimpan fail kelayakan `C:\Users\najim\.cloudflared\<TUNNEL-ID>.json`.
- `route dns` mencipta rekod `sems-uptm` di Cloudflare secara automatik.

Cipta fail `C:\Users\najim\.cloudflared\config.yml` (gantikan `<TUNNEL-ID>`):
```yaml
tunnel: sems-uat
credentials-file: C:\Users\najim\.cloudflared\<TUNNEL-ID>.json

ingress:
  - hostname: sems-uptm.afifnajmi.com
    service: http://localhost:5000
  - service: http_status:404
```

### 4. Google login (kalau mahu butang Google berfungsi)
Google Cloud Console > APIs & Services > Credentials > OAuth client ID awak > **Authorized JavaScript origins** > tambah:
```
https://sems-uptm.afifnajmi.com
```

### 5. Emel OTP (WAJIB untuk daftar akaun, lupa password dan tukar emel)
Dalam `backend\.env` isi:
```
GMAIL_USER=emel.gmail.awak@gmail.com
GMAIL_APP_PASSWORD=16 aksara dari myaccount.google.com/apppasswords
```
Gunakan **akaun Gmail khas untuk UAT**, bukan akaun peribadi. App Password memerlukan 2-Step Verification.
Gmail membenarkan kira-kira 500 emel sehari, mencukupi untuk 50+ penguji.

## B. Setiap kali mahu jalankan UAT

1. Tutup pelayan dev biasa (tetingkap Backend dan Frontend daripada `start-sems.bat`) kerana port 5000 mesti kosong.
2. Klik dua kali **`start-uat.bat`** di akar projek. Ia akan:
   - memulakan MySQL kalau belum hidup,
   - membina aplikasi (kali pertama, atau jalankan `start-uat.bat rebuild` selepas kod diubah),
   - memulakan backend dalam mod pengeluaran,
   - memulakan terowong (kalau langkah A selesai).
3. Dari **telefon dengan data mudah alih** (bukan WiFi rumah), buka `https://sems-uptm.afifnajmi.com`, kemudian cuba daftar akaun.
4. Biarkan tetingkap **Backend** dan **Tunnel** terbuka sepanjang UAT.

### Sebelum penguji masuk
- [ ] `JWT_SECRET` kuat (sudah ditukar), `GMAIL_*` diisi, dan emel OTP dicuba sendiri.
- [ ] Sandaran DB: `C:\xampp\mysql\bin\mysqldump.exe -u root sems_uptm > sandaran-sebelum-uat.sql`
- [ ] Laptop **tidak tidur**: Settings > System > Power > *Screen and sleep* > "Never" (ketika dicas), atau
  `powercfg /change standby-timeout-ac 0`.
- [ ] Laptop bersambung kuasa dan internet stabil (guna kabel LAN kalau boleh).
- [ ] Data contoh (seed) dimuatkan, dan akaun admin dicipta.
- [ ] Fail `docs/uat/SEMS-UAT-Workbook.xlsx` dan Google Form sedia.

### Sepanjang UAT
- Semak tetingkap Backend sesekali: ralat akan tertera di situ.
- Bukan semua penguji ada IP berbeza (WiFi kelas berkongsi satu IP). `start-uat.bat` sudah menaikkan had kepada 40 log masuk dan 40 permintaan OTP setiap 15 minit bagi satu IP. Ubah nilai `LOGIN_RATE_MAX`, `OTP_RATE_MAX` dan `GLOBAL_RATE_MAX` dalam `start-uat.bat` kalau perlu.
- Penguji terkunci (5 password salah): Admin > Users > **Reset password** untuk akaun itu.

### Selepas UAT
1. Tutup tetingkap Tunnel dan Backend. Pautan awam terus tidak boleh dicapai.
2. Eksport data yang perlu (Audit Log CSV, keputusan Google Form).
3. Padam data UAT atau pulihkan sandaran:
   `C:\xampp\mysql\bin\mysql.exe -u root sems_uptm < sandaran-sebelum-uat.sql`
4. Padam folder `backend\uploads` (kecuali `.gitkeep` dan folder `avatars` kosong) kalau mahu buang dokumen ujian.

## C. Ujian cepat tanpa membeli domain
Untuk mencuba terowong hari ini dengan pautan rawak (percuma, tanpa akaun Cloudflare): pasang cloudflared
(langkah A.2), kemudian jalankan `start-uat.bat` sahaja. Selagi terowong bernama (langkah A.3) belum disediakan,
skrip itu sendiri membuka Quick Tunnel dalam tetingkap "SEMS UAT Tunnel".

Cloudflared mencetak pautan seperti `https://xxxx-xxxx.trycloudflare.com` dalam tetingkap itu. Pautan ini bertukar
setiap kali dijalankan, dan butang Google tidak berfungsi padanya (alamat tidak didaftarkan di Google Cloud).
Sesuai untuk ujian sendiri dan demo; untuk 50+ penguji gunakan domain tetap.

## D. Keselamatan
- Hanya port aplikasi (5000) disambungkan melalui terowong. Jangan sambungkan `localhost:80` (phpMyAdmin) atau `3306` (MySQL).
- XAMPP `root` tanpa password hanya selamat kerana MySQL tak terdedah. Jangan buka port 3306 pada firewall atau router.
- Penguji diminta guna **data palsu sahaja** (ID, IC, password). Lihat Lampiran A dalam `SEMS-UAT-Plan.docx`.
- Selepas UAT, tukar `JWT_SECRET` (semua sesi tamat) dan padam akaun penguji.

## E. Kalau ada masalah
| Gejala | Punca biasa | Penyelesaian |
|---|---|---|
| Tetingkap Backend tulis `[config error] JWT_SECRET...` | Rahsia terlalu pendek atau masih nilai contoh | Letak rentetan rawak 32+ aksara dalam `backend\.env`. |
| Tetingkap Backend tulis `[config error] FRONTEND_URL...` | Nilai bukan `https://` | `start-uat.bat` menetapkannya; jangan jalankan `node server.js` terus dengan `NODE_ENV=production`. |
| Pautan awam tunjuk ralat 502 / 1033 | Terowong atau backend tak hidup | Pastikan kedua-dua tetingkap terbuka. |
| `ERR_TOO_MANY_REDIRECTS` atau halaman kosong pada `http://localhost:5000` | Mod HTTPS-sahaja aktif | Gunakan alamat `https://sems-uptm.afifnajmi.com`, atau jalankan dengan `set UAT_HTTPS_ONLY=0`. |
| Kod OTP tak sampai | `GMAIL_*` kosong atau salah | Isi App Password, kemudian mulakan semula backend. |
| Ramai penguji dapat "Too many login attempts" | Berkongsi satu IP | Naikkan `LOGIN_RATE_MAX` dalam `start-uat.bat`. |
