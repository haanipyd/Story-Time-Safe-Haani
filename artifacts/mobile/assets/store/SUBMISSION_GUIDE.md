# Play Store Submission — Step-by-Step Guide

All code, store assets, and compliance checks are complete. Follow these steps in order to publish Storytime on Google Play.

---

## Prerequisites

- [ ] Expo account at [expo.dev](https://expo.dev) (must be the account owner of project `81f7b1ff-f137-4b6c-b245-a1aa6141387c`)
- [ ] EAS CLI installed: `npm install -g eas-cli`
- [ ] Google Play developer account ($25 one-time fee if not already registered)
- [ ] Logged in to EAS: `eas login`

---

## Step 1 — Build the signed AAB

Run from inside `artifacts/mobile/`:

```bash
cd artifacts/mobile
eas build --platform android --profile production
```

- EAS manages the signing keystore automatically on first build.
- Build takes ~10–15 minutes on EAS servers.
- When finished, download the `.aab` from [expo.dev/builds](https://expo.dev/builds) or use the URL printed in the terminal.
- **Important:** After the build, go to expo.dev → Project → Credentials → Android Keystore and download the keystore backup. Store it somewhere safe outside the repo — losing it means you cannot ship future updates.

---

## Step 2 — Create the app in Google Play Console

1. Go to [play.google.com/console](https://play.google.com/console)
2. Click **Create app**
3. Fill in:
   - **App name**: `Storytime — Kids Audio Stories`
   - **Default language**: English (United Kingdom) or English (United States)
   - **App or game**: App
   - **Free or paid**: Free (subscription is in-app)
4. Accept the declarations and click **Create app**

---

## Step 3 — Fill in the store listing

Use the copy in `PLAY_STORE_LISTING.md` for all text fields.

Navigate to **Store presence → Main store listing**:

| Field | Value |
|-------|-------|
| App name | `Storytime — Kids Audio Stories` |
| Short description | `Magical bedtime stories for kids, read aloud in soothing voices. Ages 2–12.` |
| Full description | (paste from `PLAY_STORE_LISTING.md`) |

Upload assets (all files are in this `assets/store/` directory):

| Asset | File |
|-------|------|
| App icon (512 × 512) | `icon-512.png` |
| Feature graphic (1024 × 500) | `feature-graphic.png` |
| Phone screenshots | `screenshot-home.png`, `screenshot-playback.png` |

---

## Step 4 — App content & content rating

**Store presence → Store settings:**
- Category: **Education**
- Tags: Kids, Audiobooks, Bedtime

**Policy → App content → Privacy policy:**
- URL: `https://story-time-safe--haanipyd.replit.app/api/privacy`

**Policy → App content → Content rating:**
- Click **Start questionnaire**, choose **Education**
- Answer the IARC questions using the answers in `PLAY_STORE_LISTING.md`
- Expected result: **Everyone** or **Everyone 3+**

**Policy → App content → Target audience and content:**
- Select age groups: **5 and under**, **6–8**, **9–12**
- This enrols the app in the **Designed for Families** programme
- Confirm you comply with the Families Policy (the app has no ads, no tracking SDKs)

---

## Step 5 — Upload the AAB to Internal Testing

1. Navigate to **Release → Testing → Internal testing**
2. Click **Create new release**
3. Upload the `.aab` file from Step 1
4. Add release notes: `Initial release of Storytime — Kids Audio Stories`
5. Click **Save**, then **Review release**, then **Start rollout to Internal testing**

The app status will show as **Published** in Internal Testing within a few minutes.

---

## Step 6 — Add internal testers

1. Still in **Internal testing**, click the **Testers** tab
2. Create a tester list and add your email addresses
3. Share the opt-in link with testers so they can install the build

---

## Step 7 — Promote to Production (after testing)

Once internal testing is complete:

1. **Release → Testing → Internal testing → Releases tab**
2. Click **Promote release → Production**
3. Set rollout: **100%**
4. Submit for review — Google typically takes **3–7 business days** for new apps

---

## Automatic submit (optional)

If you have a Google service account key, you can skip manual upload:

1. Create a service account in [Google Cloud Console](https://console.cloud.google.com) with Play Developer API access
2. Download the JSON key and save it as `artifacts/mobile/google-services-key.json`
3. Grant it access in Play Console → Setup → API access
4. Then run:

```bash
cd artifacts/mobile
eas submit --platform android --profile production
```

The root `eas.json` already points to `./google-services-key.json` for this workflow.

---

## Checklist summary

- [ ] EAS build completed, `.aab` downloaded
- [ ] Keystore backup saved outside the repo
- [ ] Google Play app created (`com.storytime.kids`)
- [ ] Store listing filled in (title, descriptions, assets uploaded)
- [ ] Privacy policy URL set
- [ ] Content rating questionnaire completed (IARC)
- [ ] Designed for Families target ages selected
- [ ] AAB uploaded to Internal Testing track
- [ ] Internal testers added and opt-in link shared
