# Storytime — Play Store Listing Copy

## App Details

- **Package name**: `com.storytime.kids`
- **EAS Project ID**: `81f7b1ff-f137-4b6c-b245-a1aa6141387c`
- **Privacy Policy URL**: `https://story-time-safe--haanipyd.replit.app/api/privacy`

---

## Store Listing

### Title
```
Storytime — Kids Audio Stories
```

### Short Description (≤ 80 characters)
```
Magical bedtime stories for kids, read aloud in soothing voices. Ages 2–12.
```

### Full Description (≤ 4000 characters)
```
Storytime is the cozy bedtime companion for children aged 2–12. 

Drift off to dreamland with a growing library of original audio stories featuring beloved characters — a sleepy elephant who can't find the perfect nap spot, young Krishna and his mischievous butter adventures, fairy-tale heroes, and many more.

✨ WHAT MAKES STORYTIME SPECIAL

🎧 Beautiful audio narration — every story is narrated with warm, expressive voices designed to capture children's imagination and ease them into sleep.

📚 Growing story library — new stories added regularly across categories: bedtime, adventure, mythology, nature, and more.

👶 Age-appropriate content — stories are tagged by age range (2–4, 4–7, 7–12) so you always find the perfect fit.

🌙 Bedtime reminders — set a gentle reminder so story time becomes a calming nightly ritual.

🔖 Progress tracking — the app remembers where your child left off, so they can pick up right where the story paused.

👨‍👩‍👧 Family profiles — add multiple children and track each child's listening history separately.

🚫 NO ADS, EVER — Storytime is completely ad-free. No tracking, no behavioural advertising, no data sold to third parties.

🔒 PRIVACY & SAFETY

Storytime is built with children's privacy as a first principle:
• No advertising SDKs or tracking libraries
• COPPA compliant — we do not collect data directly from children
• Phone-number authentication for parents (OTP-based, no passwords)
• All data transmitted over secure HTTPS connections
• Full privacy policy at: https://story-time-safe--haanipyd.replit.app/api/privacy

📱 PREMIUM SUBSCRIPTION

Unlock unlimited access to the full story library with a Storytime Premium subscription. Free users get access to a rotating selection of stories each week.

Give your child the gift of stories. Download Storytime and start tonight's bedtime adventure.
```

---

## Categorisation

- **Category**: Education
- **Content Rating**: Everyone (Designed for Families programme)
- **Target Age Group**: Ages 5 and under / Ages 6–8 / Ages 9–12 (select all three in Designed for Families)
- **Ads**: No ads

---

## Store Assets

Place the following files in this directory before uploading to the Play Console:

| File | Dimensions | Required |
|------|-----------|---------|
| `icon-512.png` | 512 × 512 px | ✅ App icon |
| `feature-graphic.png` | 1024 × 500 px | ✅ Feature graphic |
| `screenshot-home.png` | 9:16 portrait | ✅ Screenshot 1 — Home screen |
| `screenshot-playback.png` | 9:16 portrait | ✅ Screenshot 2 — Playback screen |

> **Note:** Google Play automatically applies rounded corners and shadow to your icon — upload the flat 512×512 version without pre-applied rounding.

---

## Content Rating Questionnaire Answers

When completing the IARC content rating questionnaire in Play Console:

- **Violence**: None
- **Sexual content**: None
- **Language**: None
- **Controlled substances**: None
- **Gambling**: None
- **User-generated content**: No
- **Location sharing**: No
- **Personal information collection**: Yes — phone number (for parent account only)
- **Social features**: No

Expected rating: **Everyone** (E) or **Everyone 3+**

---

## Designed for Families Checklist

- [x] No behavioural advertising SDKs (AdMob, Facebook Audience Network, etc.)
- [x] No `expo-ads-admob` or any ad library in package.json
- [x] Privacy policy URL set to `/api/privacy` endpoint
- [x] No sensitive Android permissions (no `READ_CONTACTS`, `CAMERA`, `RECORD_AUDIO`, location)
- [x] Content appropriate for target age range
- [x] COPPA compliance documented in privacy policy
- [x] Parent-controlled account creation (OTP on phone)

---

## EAS Build & Submit Commands

Run these from inside `artifacts/mobile/`:

```bash
# 1. Build signed AAB
eas build --platform android --profile production

# 2a. Submit automatically (requires google-services-key.json service account)
eas submit --platform android --profile production

# 2b. Or upload manually:
#   Play Console → Your App → Release → Internal Testing → Create New Release
#   Upload the .aab file from the EAS build artifacts page
```

**Keystore management**: EAS manages the signing keystore by default. After the first build, download and store the keystore backup from expo.dev → Your Project → Credentials → Android Keystore. Keep this backup somewhere safe outside the repo.

---

## Promote to Production

After Internal Testing review passes:
1. Play Console → Release → Internal Testing → Promote Release → Production
2. Set rollout percentage (100% for initial launch)
3. Submit for Google review (typically 3–7 days for new apps)
