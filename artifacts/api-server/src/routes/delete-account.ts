import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.get("/delete-account", (_req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Delete Account — StoryLamp</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #fdf6e3;
      color: #3d2c1e;
      line-height: 1.7;
      padding: 2rem 1rem;
    }
    .container { max-width: 680px; margin: 0 auto; }
    h1 { font-size: 2rem; margin-bottom: 0.25rem; color: #5b2d8e; }
    .subtitle { color: #888; font-size: 0.9rem; margin-bottom: 2rem; }
    h2 { font-size: 1.1rem; margin-top: 2rem; margin-bottom: 0.5rem; color: #5b2d8e; }
    p, li { margin-bottom: 0.6rem; }
    ul { padding-left: 1.4rem; }
    a { color: #5b2d8e; }
    hr { border: none; border-top: 1px solid #e0d5c1; margin: 2rem 0; }
    .card {
      background: #fff;
      border: 1px solid #e0d5c1;
      border-radius: 12px;
      padding: 1.5rem;
      margin-top: 1.5rem;
    }
    .step {
      display: flex;
      gap: 1rem;
      align-items: flex-start;
      margin-bottom: 1rem;
    }
    .step-num {
      background: #5b2d8e;
      color: #fff;
      border-radius: 50%;
      width: 28px;
      height: 28px;
      min-width: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.85rem;
      margin-top: 2px;
    }
    .warning {
      background: #fff4e5;
      border-left: 4px solid #f59e0b;
      padding: 0.75rem 1rem;
      border-radius: 4px;
      margin: 1.5rem 0;
      font-size: 0.95rem;
    }
    .email-btn {
      display: inline-block;
      background: #5b2d8e;
      color: #fff;
      padding: 0.65rem 1.4rem;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      margin-top: 1rem;
    }
  </style>
</head>
<body>
<div class="container">
  <h1>Delete Your Account</h1>
  <p class="subtitle">StoryLamp — Kids Audio Stories</p>

  <p>
    You have the right to delete your StoryLamp account and all associated personal data at any time.
    This page explains what gets deleted and how to make a request.
  </p>

  <div class="warning">
    ⚠️ <strong>Account deletion is permanent.</strong> Once deleted, your account, child profiles,
    listening history, and subscription cannot be recovered.
  </div>

  <h2>What gets deleted</h2>
  <ul>
    <li>Your phone number and account credentials</li>
    <li>All child profiles and their names / age ranges</li>
    <li>Your complete listening history and progress</li>
    <li>Your device push notification token</li>
    <li>Your subscription record (active subscriptions will not be refunded)</li>
  </ul>

  <h2>How to request deletion</h2>
  <div class="card">
    <div class="step">
      <div class="step-num">1</div>
      <div>Send an email to <a href="mailto:privacy@storylamp.app">privacy@storylamp.app</a> with the subject line <strong>"Delete My Account"</strong>.</div>
    </div>
    <div class="step">
      <div class="step-num">2</div>
      <div>Include the phone number associated with your account so we can identify it.</div>
    </div>
    <div class="step">
      <div class="step-num">3</div>
      <div>We will confirm deletion within <strong>30 days</strong> and send you a confirmation email.</div>
    </div>
    <a class="email-btn" href="mailto:privacy@storylamp.app?subject=Delete%20My%20Account">
      Email Us to Delete Account
    </a>
  </div>

  <hr />
  <p style="font-size:0.85rem; color:#999;">
    For questions about your data, see our <a href="/api/privacy">Privacy Policy</a>.<br />
    &copy; 2026 StoryLamp. All rights reserved.
  </p>
</div>
</body>
</html>`);
});

export default router;
