# CLAUDE.md — OrchestraOS Master Specification
# Bu dosya projenin tek kaynağıdır. Her şeyi buradan oku.

---

## 🎯 Ürün Vizyonu

OrchestraOS, şirketlerin tüm iş gücünü AI çalışanlarla yönettiği bir SaaS platformu.
- Kullanıcı = CEO
- AI Worker'lar = Gerçek departman çalışanları (Sophia, Ayşe, Marco, Kenji, Elif)
- Worker'lar chat'te konuşur, tool çağırır, gerçek veri işler, email okur, karar alır

**Kritik Prensip**: Bu bir chatbot DEĞİL. Worker'lar gerçek iş yapıyor — fatura kesiyor, müşteri kaydı açıyor, stok güncelliyor, email'leri işliyor.

---

## 🏗️ Tech Stack

| Katman | Teknoloji | Not |
|--------|-----------|-----|
| Frontend | Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, shadcn/ui | Mevcut |
| State | Zustand | Mevcut |
| Database | PostgreSQL 16 (Hetzner self-hosted) | Migration gerekli |
| ORM | Prisma | Yeni — Supabase client yerine |
| Auth | NextAuth.js (Auth.js v5) | Yeni — Supabase Auth yerine |
| AI | Claude API (Anthropic SDK, tool_use) | Mevcut |
| Email | Gmail API (OAuth2, gerçek email okuma/gönderme) | Implement edilecek |
| Hosting | Vercel (frontend) + Hetzner (DB + services) | |
| Cron/Jobs | node-cron veya Vercel Cron | Worker heartbeat, email polling |

---

## 📋 MASTER GÖREV LİSTESİ

### GÖREV 1: SUPABASE → PRISMA + NEXTAUTH MİGRASYONU
### GÖREV 2: AI WORKER TOOL EXECUTION SİSTEMİNİ ÇALIŞTIR
### GÖREV 3: GERÇEK EMAİL İŞLEME SİSTEMİ
### GÖREV 4: PİPELİNE & EVENT ROUTING SİSTEMİ
### GÖREV 5: UX AKIŞLARINI BAĞLA
### GÖREV 6: WORKER HEARTBEAT & STATUS SİSTEMİ
### GÖREV 7: SEED DATA & DEMO DENEYİMİ

---

## 🔒 GÜVENLİK KURALLARI

1. org_id izolasyonu: HER Prisma query'de orgId filtresi ZORUNLU
2. Auth kontrolü: Her API route ve server action'da auth() kontrolü
3. Input validation: Zod ile tüm API input'larını validate et
4. Token encryption: Gmail OAuth token'ları DB'de encrypt
5. Rate limiting: Chat API'da kullanıcı başı rate limit

---

## 🌍 ENVIRONMENT VARIABLES

```env
DATABASE_URL="postgresql://orchestraos_user:SIFRE@HETZNER_IP:5432/orchestraos"
NEXTAUTH_SECRET="openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
ANTHROPIC_API_KEY="sk-ant-..."
GMAIL_CLIENT_ID="..."
GMAIL_CLIENT_SECRET="..."
GMAIL_REDIRECT_URI="http://localhost:3000/api/email/callback"
ENCRYPTION_KEY="32-byte-hex-key"
```
