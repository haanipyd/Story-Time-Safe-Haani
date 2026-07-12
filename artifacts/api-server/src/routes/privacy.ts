import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.get("/privacy", (_req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Privacy Policy — Storytime</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #fdf6e3;
      color: #3d2c1e;
      line-height: 1.7;
      padding: 2rem 1rem;
    }
    .container { max-width: 760px; margin: 0 auto; }
    h1 { font-size: 2rem; margin-bottom: 0.25rem; color: #5b2d8e; }
    .subtitle { color: #888; font-size: 0.9rem; margin-bottom: 2rem; }
    h2 { font-size: 1.2rem; margin-top: 2rem; margin-bottom: 0.5rem; color: #5b2d8e; }
    p, li { margin-bottom: 0.6rem; }
    ul { padding-left: 1.4rem; }
    a { color: #5b2d8e; }
    hr { border: none; border-top: 1px solid #e0d5c1; margin: 2rem 0; }
    .badge {
      display: inline-block;
      background: #5b2d8e;
      color: #fff;
      border-radius: 4px;
      padding: 0.15rem 0.5rem;
      font-size: 0.8rem;
      margin-bottom: 1rem;
    }
  </style>
</head>
<body>
<div class="container">
  <h1>Privacy Policy</h1>
  <p class="subtitle">Storytime — Kids Audio Stories &nbsp;|&nbsp; Last updated: July 12, 2026</p>
  <span class="badge">Designed for Families</span>

  <p>
    Storytime ("we", "our", or "us") is an audio storytelling app for children. We take the privacy
    of children and families very seriously. This policy explains what data we collect, why we collect
    it, and how we protect it — in compliance with the Children's Online Privacy Protection Act
    (COPPA), the General Data Protection Regulation (GDPR), and Google Play's Families policy.
  </p>

  <h2>1. Who This App Is For</h2>
  <p>
    Storytime is designed for children aged 2–12, used under parental supervision. A parent or
    guardian must create an account and may set up child profiles on their device. We do not
    knowingly allow children to create their own accounts without parental involvement.
  </p>

  <h2>2. Data We Collect</h2>
  <ul>
    <li>
      <strong>Phone number</strong> — used for account creation via one-time password (OTP)
      authentication. We store your phone number to identify your account.
    </li>
    <li>
      <strong>Child profiles</strong> — name and age range you provide when adding a child profile.
      This is used to personalize story recommendations within the app.
    </li>
    <li>
      <strong>Listening history</strong> — which stories have been played and for how long,
      associated with your account. Used to track progress and generate bedtime recommendations.
    </li>
    <li>
      <strong>Device push token</strong> — if you grant notification permission, we store your
      device's push token to deliver bedtime reminders. Notifications are sent only to your device.
    </li>
    <li>
      <strong>Subscription status</strong> — whether you have an active premium subscription,
      managed through our payment provider. We do not store full payment card details.
    </li>
  </ul>

  <h2>3. Data We Do NOT Collect</h2>
  <ul>
    <li>We do not collect location data.</li>
    <li>We do not access your contacts, camera, or microphone.</li>
    <li>We do not serve behavioural advertisements or use ad tracking SDKs.</li>
    <li>We do not sell or share personal data with third parties for marketing purposes.</li>
    <li>We do not collect data from children's devices beyond what is described above.</li>
  </ul>

  <h2>4. How We Use Your Data</h2>
  <ul>
    <li>To authenticate your account via OTP and maintain your session.</li>
    <li>To display and recommend age-appropriate stories for your children.</li>
    <li>To track listening progress so children can resume stories.</li>
    <li>To send optional bedtime reminder notifications (only if permission is granted).</li>
    <li>To manage your subscription and premium access.</li>
  </ul>

  <h2>5. COPPA Compliance</h2>
  <p>
    Storytime complies with COPPA. We do not collect personal information directly from children.
    All accounts are created and controlled by a parent or guardian. If you believe a child under 13
    has created an account without parental consent, please contact us immediately at
    <a href="mailto:privacy@storytime.kids">privacy@storytime.kids</a> and we will delete the
    account and associated data promptly.
  </p>

  <h2>6. Data Sharing</h2>
  <p>We share data only with the following service providers, strictly for operating the app:</p>
  <ul>
    <li><strong>MSG91</strong> — OTP SMS delivery (phone number transmitted for verification only).</li>
    <li><strong>Razorpay</strong> — payment processing (subscription status only; no raw card data).</li>
    <li><strong>Expo / EAS (Expo Application Services)</strong> — push notification delivery via device token.</li>
  </ul>
  <p>We do not share data with advertisers, data brokers, or analytics platforms.</p>

  <h2>7. Data Retention</h2>
  <p>
    We retain your account data for as long as your account is active. You may delete your account
    and all associated data at any time by contacting us at
    <a href="mailto:privacy@storytime.kids">privacy@storytime.kids</a>. We will process deletion
    requests within 30 days.
  </p>

  <h2>8. Security</h2>
  <p>
    Data is transmitted over HTTPS/TLS. Passwords are never stored — authentication uses OTP codes
    that expire after a short window. JWT tokens used for sessions are signed with a secret key and
    expire regularly.
  </p>

  <h2>9. Your Rights</h2>
  <p>
    Depending on your jurisdiction, you may have the right to access, correct, or delete personal
    data we hold about you. To exercise these rights, contact us at
    <a href="mailto:privacy@storytime.kids">privacy@storytime.kids</a>.
  </p>

  <h2>10. Changes to This Policy</h2>
  <p>
    We may update this policy from time to time. We will notify you of material changes via the app
    or by email. Continued use of the app after changes constitutes acceptance of the updated policy.
  </p>

  <h2>11. Contact Us</h2>
  <p>
    If you have questions about this privacy policy or our data practices, please contact:<br />
    <a href="mailto:privacy@storytime.kids">privacy@storytime.kids</a>
  </p>

  <hr />
  <p style="font-size:0.85rem; color:#999;">
    &copy; 2026 Storytime. All rights reserved. This app is rated for all ages and is part of
    Google Play's Families programme.
  </p>
</div>
</body>
</html>`);
});

export default router;
