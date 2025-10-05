# dtln-rs

<div align="center">

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node Version](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen.svg)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-lightgrey.svg)

**Node.js için yüksek performanslı gerçek zamanlı gürültü bastırma**

*Rust ile geliştirildi 🦀 | DTLN Sinir Ağı ile desteklenir 🧠 | Üretime hazır 🚀*

**Türkçe** | [**English**](README.md)

</div>

---

### 🎯 Genel Bakış

**dtln-rs**, Node.js için yüksek performanslı bir ses gürültü bastırma kütüphanesidir ve [Dual-Signal Transformation LSTM Network (DTLN)](https://github.com/breizhn/DTLN) mimarisi üzerine inşa edilmiştir. Maksimum performans için Rust ile geliştirilmiş ve native Node.js eklentisi olarak paketlenmiştir. Gerçek zamanlıya yakın gürültü azaltma özellikleri şunlar için mükemmeldir:

- 🎙️ Sesli aramalar ve konferanslar (WebRTC entegrasyonu)
- 🎵 Ses akışı uygulamaları
- 🎧 Podcast ve ses prodüksiyon araçları
- 📞 VoIP uygulamaları
- 🤖 Sesli AI asistanları

### ✨ Temel Özellikler

- ⚡ **Ultra hızlı**: Modern donanımda **gerçek zamandan 55x daha hızlı** işler
- 🎯 **Yüksek Kalite**: En gelişmiş DTLN sinir ağı mimarisine dayalıdır
- 🔌 **Tak ve Kullan**: Önceden derlenmiş binary'ler dahil - Rust kurulumu gerektirmez
- 🌍 **Çapraz platform**: macOS (Intel & Apple Silicon), Linux (x64 & ARM64)
- 🪶 **Hafif**: Sadece ~4MB ML modeli, edge deployment için optimize edilmiş
- 🔒 **Thread-safe**: Eşzamanlı işleme için tasarlanmış
- 📦 **Sıfır bağımlılık**: Kendi kendine yeten native modül

### 🚀 Hızlı Başlangıç

#### Kurulum

```bash
npm install dtln-rs
```

**Bu kadar!** Önceden derlenmiş binary'ler şunlar için dahildir:
- ✅ macOS ARM64 (Apple Silicon)
- ✅ macOS x64 (Intel)
- ✅ Linux x64
- ✅ Linux ARM64

#### Temel Kullanım

```javascript
const dtln = require('dtln-rs');

// Denoiser başlat
const denoiser = dtln.dtln_create();

// Ses bufferlarını hazırla (16kHz, mono, Float32Array)
const inputAudio = new Float32Array(512);  // Gürültülü sesiniz
const outputAudio = new Float32Array(512); // Temiz ses çıktısı

// Ses frame'ini işle
const isStarved = dtln.dtln_denoise(denoiser, inputAudio, outputAudio);

// Temizle
dtln.dtln_stop(denoiser);
```

### 📊 Performans Benchmarkları

MacBook Pro M1 üzerinde gerçek dünya performansı:

| Ses Süresi | İşlem Süresi | Gerçek-zamanlı Faktör |
|------------|--------------|----------------------|
| 10.00s | 195ms | **0.019x** ⚡ |
| 7.06s | 132ms | **0.019x** ⚡ |
| 22.10s | 333ms | **0.015x** ⚡ |

*0.019x gerçek-zamanlı faktör, **gerçek zamandan 55x daha hızlı** demektir* 🚀

### 📖 API Referansı

#### `dtln_create()`

Yeni bir DTLN denoiser instance'ı oluşturur.

**Döndürür:** Denoiser handle

**Örnek:**
```javascript
const denoiser = dtln.dtln_create();
```

---

#### `dtln_denoise(denoiser, inputSamples, outputSamples)`

Ses örneklerini işler ve gürültüyü kaldırır.

**Parametreler:**
- `denoiser`: `dtln_create()`'den dönen denoiser handle
- `inputSamples`: Giriş sesi Float32Array (16kHz, mono, -1.0 to 1.0)
- `outputSamples`: Temiz sesi alacak Float32Array (giriş ile aynı uzunlukta)

**Döndürür:** Boolean - işlemci gerçek zamandan yavaşsa `true`

**Örnek:**
```javascript
const isStarved = dtln.dtln_denoise(denoiser, inputFrame, outputFrame);
if (isStarved) {
  console.warn('⚠️ İşlem gerçek zamandan yavaş');
}
```

---

#### `dtln_stop(denoiser)`

Denoiser instance'ını durdurur ve temizler. İşiniz bittiğinde mutlaka çağırın!

**Parametreler:**
- `denoiser`: Durdurulacak denoiser handle

**Örnek:**
```javascript
dtln.dtln_stop(denoiser);
```

### 🎛️ Ses Gereksinimleri

| Parametre | Değer |
|-----------|-------|
| Örnekleme Hızı | 16kHz (16000 Hz) |
| Kanallar | Mono (1 kanal) |
| Format | Float32Array |
| Aralık | -1.0 to 1.0 |
| Frame Boyutu | 512 örnek (32ms önerilir) |

### 🌐 WebRTC Entegrasyon Örneği

```javascript
const dtln = require('dtln-rs');

class RealtimeDenoiser {
  constructor() {
    this.denoiser = dtln.dtln_create();
    this.frameSize = 512; // 16kHz'de 32ms
  }

  /**
   * Sesi gerçek zamanlı olarak işle
   * @param {Float32Array} audioData - Giriş sesi (16kHz mono)
   * @returns {Float32Array} Gürültüsü alınmış ses
   */
  process(audioData) {
    const output = new Float32Array(audioData.length);

    // 512 örneklik parçalar halinde işle
    for (let i = 0; i < audioData.length; i += this.frameSize) {
      const chunk = audioData.slice(i, Math.min(i + this.frameSize, audioData.length));
      const outChunk = new Float32Array(this.frameSize);

      // Son parça küçükse doldur
      const padded = new Float32Array(this.frameSize);
      padded.set(chunk);

      dtln.dtln_denoise(this.denoiser, padded, outChunk);
      output.set(outChunk.slice(0, chunk.length), i);
    }

    return output;
  }

  destroy() {
    dtln.dtln_stop(this.denoiser);
  }
}

// WebRTC'de kullanım
const denoiser = new RealtimeDenoiser();

audioContext.createScriptProcessor(512, 1, 1).onaudioprocess = (e) => {
  const input = e.inputBuffer.getChannelData(0);
  const output = e.outputBuffer.getChannelData(0);

  const clean = denoiser.process(input);
  output.set(clean);
};

// Temizlik
window.addEventListener('beforeunload', () => denoiser.destroy());
```

### 🛠️ Platform Desteği

| Platform | Durum | Kurulum |
|----------|-------|---------|
| macOS ARM64 (M1/M2/M3) | ✅ Prebuilt | `npm install` (Rust gerekmez) |
| macOS x64 (Intel) | ✅ Prebuilt | `npm install` (Rust gerekmez) |
| Linux x64 | ✅ Prebuilt | `npm install` (Rust gerekmez) |
| Linux ARM64 | 🔨 Kaynaktan derleme | Rust toolchain gerekir |
| Windows x64 | 🔨 Kaynaktan derleme | Rust + MSVC gerekir |

#### Kaynaktan Derleme

Platformunuz için önceden derlenmiş binary yoksa:

```bash
# Rust'ı yükleyin https://rustup.rs/
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Modülü derleyin
npm install
```

### 📦 İçindekiler

- **Prebuilt Binary'ler**: macOS & Linux için kullanıma hazır
- **DTLN Modelleri**: Quantized TensorFlow Lite modelleri (~4MB)
- **Kaynak Kodu**: Tam Rust implementasyonu
- **Örnekler**: Gerçek dünya kullanım örnekleri

### 🏗️ Mimari

```
┌─────────────────────────────────────────┐
│         Uygulamanız                     │
│         (Node.js / JavaScript)          │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│          dtln-rs (Native Addon)         │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │   DTLN Motoru (Rust)              │ │
│  │  ┌──────────────┐ ┌─────────────┐│ │
│  │  │  Model 1     │ │  Model 2    ││ │
│  │  │  (Frekans)   │ │  (Zaman)    ││ │
│  │  └──────────────┘ └─────────────┘│ │
│  └───────────────────────────────────┘ │
│               │                         │
│               ▼                         │
│  ┌───────────────────────────────────┐ │
│  │   TensorFlow Lite (Static)        │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### 🧪 Testleri Çalıştırma

Gerçek ses örnekleri ile test edin:

```bash
# Simüle edilmiş ses ile örnek çalıştır
node example.js

# Gerçek WAV dosyaları ile test et (repo'da dahil)
node test-real-audio.js
```

### 🤝 Katkıda Bulunma

Katkılarınızı bekliyoruz! Sorun bildirimleri ve pull request'ler göndermekten çekinmeyin.

1. Repository'i fork edin
2. Feature branch'i oluşturun (`git checkout -b feature/harika-ozellik`)
3. Değişikliklerinizi commit edin (`git commit -m 'Harika özellik ekle'`)
4. Branch'e push edin (`git push origin feature/harika-ozellik`)
5. Pull Request açın

### 📄 Lisans

Bu proje MIT Lisansı altında lisanslanmıştır - detaylar için [LICENSE](LICENSE) dosyasına bakın.

### 🙏 Teşekkürler

Bu proje şu mükemmel çalışmalar üzerine inşa edilmiştir:

- **[DTLN (Dual-signal Transformation LSTM Network)](https://github.com/breizhn/DTLN)** - Nils Westhausen
  - Orijinal DTLN makalesi: ["Dual-signal Transformation LSTM Network for Real-time Noise Suppression"](https://arxiv.org/abs/2005.07551)
  - Gürültü bastırma için en gelişmiş deep learning yaklaşımı

- **[TensorFlow Lite](https://www.tensorflow.org/lite)** - Google
  - Hafif ML çıkarım motoru
  - Edge cihazlarda gerçek zamanlı işlemeyi mümkün kılar

- **[Orijinal dtln-rs implementasyonu](https://github.com/discord/dtln-rs)** - Discord/Jason Thomas
  - DTLN'in ilk Rust portu
  - Bu geliştirilmiş multi-platform versiyonun temeli

Rust ve Node.js topluluklarına mükemmel araçlar ve kütüphaneler için özel teşekkürler!

### 📞 Destek

- 🐛 **Sorunlar**: [GitHub Issues](https://github.com/hayatialikeles/dtln-rs/issues)
- 💬 **Tartışmalar**: [GitHub Discussions](https://github.com/hayatialikeles/dtln-rs/discussions)
- 📧 **E-posta**: hayatialikeles@gmail.com

### 🔗 Linkler

- [GitHub Repository](https://github.com/hayatialikeles/dtln-rs)
- [npm Paketi](https://www.npmjs.com/package/dtln-rs)
- [Orijinal DTLN Makalesi](https://arxiv.org/abs/2005.07551)

---

<div align="center">

**Rust ile ❤️ ile yapıldı 🦀**

*Faydalı bulduysanız bu repository'e ⭐ yıldız verin!*

</div>
