
const crypto = require('crypto');

const ONESIGNAL_URL = 'https://api.onesignal.com/notifications';

async function sendAdminNotification({
  adminId,
  title,
  message,
  type = 'general',
  data = {},
}) {
  if (!adminId) {
    throw new Error('Admin ID is required.');
  }

  if (!process.env.ONESIGNAL_APP_ID || !process.env.ONESIGNAL_REST_API_KEY) {
    throw new Error('OneSignal environment variables are missing.');
  }

  const externalId = `MUSEHRA-admin-${adminId}`;

  const payload = {
    app_id: process.env.ONESIGNAL_APP_ID,
    include_aliases: {
      external_id: [externalId],
    },
    target_channel: 'push',
    headings: {
      en: title,
    },
    contents: {
      en: message,
    },
    data: {
      type,
      ...data,
    },
    idempotency_key: crypto.randomUUID(),
  };

  const response = await fetch(ONESIGNAL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Key ${process.env.ONESIGNAL_REST_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json();

  if (!response.ok) {
    console.error('OneSignal API error:', result);
    throw new Error('Failed to send OneSignal notification.');
  }

  if (!result.id) {
    console.warn('OneSignal did not find a subscribed admin device:', result);
    return result;
  }

  console.log('OneSignal notification sent:', result.id);

  return result;
}

module.exports = {
  sendAdminNotification,
};
