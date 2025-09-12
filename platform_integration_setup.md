# Platform Integration Setup Guide

## 📱 Overview

AooChat รองรับการเชื่อมต่อกับ Platform ต่างๆ ผ่าน Webhook API โดยแต่ละ Platform จะมีวิธีการตั้งค่าที่แตกต่างกัน

## 🔗 Webhook URLs

Production:

- Facebook: `https://your-domain.com/api/webhooks/facebook`
- Instagram: `https://your-domain.com/api/webhooks/instagram`
- LINE: `https://your-domain.com/api/webhooks/line`
- WhatsApp: `https://your-domain.com/api/webhooks/whatsapp`

Development (with ngrok):

- Facebook: `https://xxxxx.ngrok.io/api/webhooks/facebook`
- etc...

---

## 1️⃣ Facebook Messenger Setup

### Prerequisites

- Facebook Developer Account
- Facebook Page
- Facebook App

### Steps

1. **Create Facebook App**

   - Go to https://developers.facebook.com
   - Create new app → Type: Business
   - Add Messenger product

2. **Configure Webhooks**

   - Go to Messenger → Settings → Webhooks
   - Callback URL: `https://your-domain.com/api/webhooks/facebook`
   - Verify Token: Set in `.env` as `META_VERIFY_TOKEN`
   - Subscribe to fields:
     - messages
     - messaging_postbacks
     - messaging_optins
     - message_deliveries
     - message_reads

3. **Generate Page Access Token**

   - Go to Messenger → Settings → Access Tokens
   - Select your page → Generate Token
   - Save token in `.env` as `FACEBOOK_PAGE_ACCESS_TOKEN`

4. **Subscribe Page to App**
   - Use Graph API Explorer or curl:
   ```bash
   curl -X POST "https://graph.facebook.com/v18.0/{page-id}/subscribed_apps?subscribed_fields=messages,messaging_postbacks&access_token={page-access-token}"
   ```

### Environment Variables

```env
FACEBOOK_APP_ID=your_app_id
FACEBOOK_APP_SECRET=your_app_secret
FACEBOOK_PAGE_ACCESS_TOKEN=your_page_token
META_VERIFY_TOKEN=your_verify_token
```

---

## 2️⃣ Instagram Direct Messages Setup

### Prerequisites

- Instagram Business/Creator Account
- Facebook Page connected to Instagram
- Same Facebook App as Messenger

### Steps

1. **Enable Instagram Messaging**

   - In Facebook App → Add Product → Instagram
   - Enable Instagram Messaging

2. **Connect Instagram to Facebook Page**

   - Go to Facebook Page Settings → Instagram
   - Connect your Instagram account

3. **Configure Webhooks**

   - Go to Instagram → Webhooks
   - Callback URL: `https://your-domain.com/api/webhooks/instagram`
   - Verify Token: Same as Facebook
   - Subscribe to fields:
     - messages
     - messaging_postbacks
     - message_reactions

4. **Get Instagram Access Token**
   - Same as Facebook Page Token if connected

### Environment Variables

```env
INSTAGRAM_APP_ID=same_as_facebook
INSTAGRAM_APP_SECRET=same_as_facebook
INSTAGRAM_ACCESS_TOKEN=your_instagram_token
```

---

## 3️⃣ LINE Official Account Setup

### Prerequisites

- LINE Business ID
- LINE Official Account
- LINE Developers Console Access

### Steps

1. **Create LINE Channel**

   - Go to https://developers.line.biz
   - Create new channel → Messaging API

2. **Configure Channel**

   - Channel name, description, icon
   - Get Channel ID and Channel Secret

3. **Set Webhook URL**

   - Webhook URL: `https://your-domain.com/api/webhooks/line`
   - Enable webhooks
   - Disable auto-reply messages

4. **Generate Channel Access Token**

   - Go to Messaging API tab
   - Issue channel access token (long-lived)

5. **Configure Features**
   - Disable LINE Official Account features that conflict:
     - Auto-reply
     - Greeting message (unless using webhook)

### Environment Variables

```env
LINE_CHANNEL_ID=your_channel_id
LINE_CHANNEL_SECRET=your_channel_secret
LINE_CHANNEL_ACCESS_TOKEN=your_channel_token
```

---

## 4️⃣ WhatsApp Business API Setup

### Prerequisites

- Facebook Business Verification
- WhatsApp Business Account
- Phone number not registered with WhatsApp

### Steps

1. **Setup WhatsApp Business**

   - Go to Facebook Business Manager
   - Create WhatsApp Business Account
   - Verify business

2. **Add Phone Number**

   - Add phone number
   - Verify via SMS/Voice
   - Register number

3. **Create WhatsApp App**

   - In Facebook App → Add Product → WhatsApp
   - Configure WhatsApp Business API

4. **Configure Webhooks**

   - Webhook URL: `https://your-domain.com/api/webhooks/whatsapp`
   - Verify Token: Set in `.env`
   - Subscribe to fields:
     - messages
     - message_status
     - message_template_status_update

5. **Get Permanent Token**
   - System User → Generate Token
   - Add WhatsApp permissions

### Environment Variables

```env
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_id
WHATSAPP_PHONE_NUMBER_ID=your_phone_id
WHATSAPP_ACCESS_TOKEN=your_permanent_token
WHATSAPP_APP_SECRET=your_app_secret
WHATSAPP_VERIFY_TOKEN=your_verify_token
```

---

## 🔐 Security Best Practices

1. **Verify Webhook Signatures**

   - Always verify webhook signatures
   - Each platform has different signature methods

2. **Use HTTPS**

   - Webhooks must use HTTPS in production
   - Use ngrok for local development

3. **Rate Limiting**

   - Implement rate limiting on webhook endpoints
   - Prevent abuse and DDoS

4. **Error Handling**

   - Always return 200 OK to prevent retries
   - Log errors for debugging

5. **Token Security**
   - Never expose tokens in client-side code
   - Rotate tokens regularly
   - Use environment variables

---

## 🧪 Testing Webhooks

### Using ngrok for Local Development

1. Install ngrok:

```bash
npm install -g ngrok
# or
brew install ngrok
```

2. Start your Next.js dev server:

```bash
npm run dev
```

3. Start ngrok tunnel:

```bash
ngrok http 3000
```

4. Use ngrok URL for webhook configuration:

```
https://xxxxx.ngrok.io/api/webhooks/[platform]
```

### Testing Tools

- **Facebook**: Graph API Explorer
- **LINE**: LINE Official Account Manager (send test messages)
- **WhatsApp**: WhatsApp Business API Test Numbers

### Webhook Testing Checklist

- [ ] Webhook URL is accessible
- [ ] Signature verification works
- [ ] Messages are received and stored
- [ ] Real-time updates work
- [ ] Error handling works
- [ ] Rate limiting works

---

## 📊 Monitoring

### Webhook Health Checks

Monitor webhook health:

- Success rate
- Response time
- Error rate
- Message volume

### Logging

Log all webhook events:

```typescript
// In webhook-handler.ts
await supabase.from("webhook_logs").insert({
  platform,
  event_type,
  payload,
  status: "success" | "failed",
  error_message,
  processing_time,
  created_at,
});
```

### Alerting

Set up alerts for:

- Webhook failures > 1%
- Response time > 1s
- Signature verification failures
- Rate limit exceeded

---

## 🚀 Deployment Checklist

- [ ] All environment variables set
- [ ] HTTPS configured
- [ ] Webhook URLs updated in platform settings
- [ ] Signature verification enabled
- [ ] Rate limiting configured
- [ ] Error logging enabled
- [ ] Monitoring configured
- [ ] Backup webhook endpoints ready

---

## 📚 Additional Resources

- [Facebook Messenger Platform](https://developers.facebook.com/docs/messenger-platform)
- [Instagram Messaging API](https://developers.facebook.com/docs/instagram-api/guides/messaging)
- [LINE Messaging API](https://developers.line.biz/en/docs/messaging-api/)
- [WhatsApp Business API](https://developers.facebook.com/docs/whatsapp)
