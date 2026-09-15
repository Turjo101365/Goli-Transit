# 🍎 EZZ GO — iOS & Mac Build & Distribution Guide

GitHub Actions-এর **macOS runner (`macos-14`)** ব্যবহার করে স্বয়ংক্রিয়ভাবে ক্লাউডে Xcode দিয়ে iOS এবং Mac-এর জন্য ইনস্টলেশন ফাইল তৈরি করা হয়।

---

## 🚀 কীভাবে কাজ করে?

1. কোড যখন GitHub-এর `main` ব্রাঞ্চে পুশ করা হয় (অথবা Actions ট্যাব থেকে `workflow_dispatch` চালানো হয়):
2. GitHub-এর নিজস্ব **macOS Apple Silicon (M1/M2) runner** চালু হয়।
3. স্বয়ংক্রিয়ভাবে Node.js, Frontend dependencies, Capacitor iOS কোড সিঙ্ক হয়।
4. `xcodebuild` দিয়ে সম্পূর্ণ অ্যাপটি কম্পাইল করা হয়:
   - `EZZ-GO.ipa` (আইফোন এবং আইপ্যাডের জন্য)
   - `EZZ-GO-Mac.zip` (Mac Apple Silicon ও সিমুলেটরের জন্য)
5. বিল্ড শেষ হলে GitHub Releases (`ios-latest` ট্যাগ) এবং GitHub Actions Artifacts-এ ফাইলগুলো আপলোড হয়।

---

## 📥 ডাউনলোড করার লিংক

বিল্ড সম্পন্ন হলে GitHub থেকে সরাসরি ডাউনলোড করা যাবে:
- **iOS IPA (iPhone/iPad):** `https://github.com/<username>/<repo>/releases/download/ios-latest/EZZ-GO.ipa`
- **Mac Bundle (Mac M1/M2/M3/M4):** `https://github.com/<username>/<repo>/releases/download/ios-latest/EZZ-GO-Mac.zip`

---

## 📱 সাধারণ ব্যবহারকারীরা কীভাবে iOS-এ ইনস্টল ও ব্যবহার করবে?

Apple-এর সিকিউরিটির কারণে App Store ছাড়া সরাসরি Safari থেকে `.ipa` ফাইলে ট্যাপ করে সাধারণ Android APK-এর মতো ইনস্টল হয় না। ব্যবহারকারীরা নিচের যেকোনো একটি সহজ পদ্ধতিতে এটি ব্যবহার করতে পারবে:

### পদ্ধতি ১: কোনো কম্পিউটার ছাড়া সরাসরি আইফোনে (সবচেয়ে সহজ)
- **Scarlet ([usescarlet.com](https://usescarlet.com)):**
  1. আইফোনের Safari দিয়ে Scarlet ইনস্টল করুন।
  2. GitHub Release থেকে `EZZ-GO.ipa` ডাউনলোড করুন।
  3. Scarlet ওপেন করে ওপরের ডানপাশের Import আইকনে ট্যাপ করে `EZZ-GO.ipa` সিলেক্ট করলেই অ্যাপ ইনস্টল হয়ে যাবে।
- **TrollStore (iOS 14 - 17.0):**
  1. `EZZ-GO.ipa` ডাউনলোড করে সরাসরি TrollStore-এ শেয়ার করুন -> ১ ক্লিকে পার্মানেন্ট ইনস্টল (কখনো এক্সপায়ার হবে না)।

### পদ্ধতি ২: Mac বা Windows PC ব্যবহার করে (AltStore / Sideloadly)
- **Sideloadly ([sideloadly.io](https://sideloadly.io)):**
  1. পিসিতে Sideloadly ওপেন করে iPhone কেবল দিয়ে কানেক্ট করুন।
  2. `EZZ-GO.ipa` ফাইলটি ড্র্যাগ করে ছেড়ে দিন।
  3. আপনার ফ্রি Apple ID দিয়ে **Start** চাপুন। অ্যাপটি সরাসরি আপনার আইফোনে ইনস্টল হয়ে যাবে!
- **AltStore ([altstore.io](https://altstore.io)):**
  1. পিসিতে AltServer এবং ফোনে AltStore ইনস্টল করা থাকলে "My Apps" থেকে `+` চেপে `EZZ-GO.ipa` সিলেক্ট করুন।

### পদ্ধতি ৩: Mac ব্যবহারকারীদের জন্য (Apple Silicon Mac)
- `EZZ-GO-Mac.zip` ফাইলটি ডাউনলোড করে আনজিপ করুন।
- `EZZ-GO.app` সরাসরি ওপেন করে Mac-এ চালানো যাবে অথবা PlayCover দিয়ে চালানো যাবে।

### পদ্ধতি ৪: সবচেয়ে সহজ বিকল্প — Safari Web App (PWA)
ব্যবহারকারীকে কোনো ফাইল ডাউনলোড বা সাইডলোড না করিয়ে সরাসরি অ্যাপের মতো ব্যবহার করাতে চাইলে:
1. iPhone-এর **Safari** দিয়ে লাইভ ওয়েবসাইট লিংকে যান।
2. নিচের **Share** বাটন (⎋) চাপুন।
3. **"Add to Home Screen" (হোম স্ক্রিনে যোগ করুন ⊞)** সিলেক্ট করুন।
4. সাথে সাথে আসল অ্যাপের মতো আইকন চলে আসবে এবং ফুলস্ক্রিনে নেটিভ অ্যাপের মতো চলবে!

---

## ⚡ কীভাবে বিল্ড রান করবেন?

টার্মিনালে শুধু নিচের কমান্ড দিয়ে GitHub-এ পুশ করলেই Actions চালু হয়ে যাবে:

```bash
git push origin main
```
তারপর GitHub রিপোজিটরির **Actions** ট্যাবে গেলে লাইভ বিল্ড দেখা যাবে এবং শেষ হলে **Releases** সেকশনে ফাইল পাওয়া যাবে।
