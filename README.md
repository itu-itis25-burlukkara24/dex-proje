## 📜 The Lore: Equivalent Exchange (Eşdeğer Takas Yasası)

*"Kadim zamanlarda, bir Tarnished hem büyücü (Intelligence) hem de rahip (Faith) olamazdı. Birinden vazgeçmeden, diğerinde ustalaşmak imkansızdı."*

**Souls DEX**, bu kadim kuralı **AMM (Otomatik Piyasa Yapıcı)** teknolojisiyle yeniden yazar. Burada takas, bir tüccarla değil, matematiksel bir "Yasa" ile yapılır.

### 🔥 Bonfire (Likidite Havuzu)
DEX'in kalbinde sönmeyen bir ateş yanar. Bu ateşe **Likidite Havuzu** denir.
- Eğer ateşe odun atmazsanız (Likidite Eklemezseniz), ateş söner ve kimse ısınamaz (Takas yapamaz).
- Ateşi besleyenler, bu ekosistemin "Ateş Bekçileri"dir.

### ⚖️ The Law of Scarcity (Kıtlık Kuralı)
Evrenin dengesi şu formülle korunur: `x * y = k`.
- Havuzdaki **Intelligence** parşömenleri azalırsa, kalanlar nadirleşir ve değerleri artar.
- Onları almak isteyen kişi, sunağa çok daha fazla **Faith** yani rahiplik becerisi bırakmak zorundadır.

**Özetle:** Souls DEX'te fiyatı belirleyen bir patron yoktur; fiyatı belirleyen tek şey, havuzdaki **kıtlık ve bolluktur.**

---

## 🛠️ Kurulum ve Hazırlık (Gereksinimler)

Bu projeyi çalıştırmak için bilgisayarınızda **Foundry** ve **Node.js** kurulu olmalıdır.

### 1. Foundry Kurulumu
Eğer bilgisayarınızda Forge ve Anvil yüklü değilse, git bash terminaline şu komutları sırasıyla yazın:

    curl -L https://foundry.paradigm.xyz | bash
    (bulunduğunuz git bash terminalinden çıkın ve)
    foundryup
    (yazın)

### 2. Proje Kütüphanelerini Yükleme
Projeyi indirdikten sonra klasörün içinde şu komutları çalıştırın:

    # OpenZeppelin kontratlarını indir
    forge install OpenZeppelin/openzeppelin-contracts --no-commit
    (eğer olmazsa --no-commit'i silip deneyin)

    # Node.js paketlerini yükle
    npm install

---

## 🚀 Çalıştırma Rehberi (Adım Adım)

Kurulum bittikten sonra projeyi ayağa kaldırmak için sırasıyla şunları yapın:

### Adım 1: Motoru Çalıştır (Anvil)
Yerel blockchain ağını başlatmak için terminale şunu yazın (Bu terminali kapatmayın!):

    anvil

### Adım 2: Evreni İnşa Et (Deploy)
Yeni bir terminal açın. Sırasıyla **Intelligence**, **Faith** ve **DEX** kontratlarını ağa yükleyin:

    # 1. Intelligence (INT) Tokenını Bas (1000 Adet)
    forge create src/MockToken.sol:MockToken --rpc-url http://127.0.0.1:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast --constructor-args "Intelligence" "INT" 1000

    # 2. Faith (FTH) Tokenını Bas (1000 Adet)
    forge create src/MockToken.sol:MockToken --rpc-url http://127.0.0.1:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast --constructor-args "Faith" "FTH" 1000

    # 3. Souls DEX'i Kur
    # ÖNEMLİ: Aşağıdaki <INT_ADDRESS> ve <FTH_ADDRESS> kısımlarına yukarıda çıkan adresleri yapıştırın.
    forge create src/SimpleDEX.sol:SimpleDEX --rpc-url http://127.0.0.1:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast --constructor-args <INT_ADDRESS> <FTH_ADDRESS>

### Adım 3: Bağlantıyı Kur
Deploy işlemi bitince, terminalde size verilen adresleri projenin ana dizinindeki `.env` dosyasına kaydedin.

### Adım 4: Başlat!
Her şey hazırsa uygulamayı çalıştırın:

    npm start

---

## 🎮 Oynanış

Terminal menüsünden kaderini seç:

1.  **Likidite Ekle:** Bonfire'ı harla. Havuza hem INT hem FTH ekleyerek diğer oyunculara takas imkanı sun.
2.  **Swap Yap:** Buildini değiştir. Faith ver, Intelligence al (veya tam tersi).
3.  **Bakiyeleri Gör:** Envanterini ve piyasa durumunu kontrol et.

---

> *"Put these foolish ambitions to rest... or deploy the contract."*
>
> **Geliştirici:** İTÜ Blockchain Kulübü Üyesi - Yusuf