# 🔥 Souls DEX: The Shrine of Equivalent Exchange

> *"Lekelenmiş (Tarnished) olanlar için bir sığınak... Zeka arayan İnancından vazgeçmeli, İnanç arayan ise Zekasını feda etmeli."*

**Souls DEX**, İTÜ Blockchain Kulübü 7. Hafta projesi kapsamında geliştirilmiş, **Souls-like** temalı bir merkeziyetsiz borsadır (DEX).

Bu proje, oyuncuların (kullanıcıların) iki ana stat olan **Intelligence (INT)** ve **Faith (FTH)** arasında, **Uniswap V2 AMM** mantığını kullanarak takas yapmasını sağlar.

---

## ⚔️ Konsept: Zeka ve İnanç Dengesi (AMM Mantığı)

Souls evreninde "stat" değiştirmek (respec) zordur. Souls DEX'te ise bu denge matematiksel bir formülle korunur:

$$x \cdot y = k$$

* **Havuz (Bonfire):** Likidite havuzu, dünyanın dengesidir.
* **Kıtlık Kuralı:** Eğer havuzdaki **Intelligence** azalırsa (herkes INT alıyorsa), kalan INT'lerin değeri artar. Onu almak için daha fazla **Faith** feda etmeniz gerekir.
* **Equivalent Exchange:** Değer yoktan var edilmez, sadece dönüştürülür.

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