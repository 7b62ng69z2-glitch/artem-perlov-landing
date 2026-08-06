import nodemailer from 'nodemailer';

const MAX = { name: 80, phone: 40, message: 1500, service: 120 };

function clean(value, maxLength) {
  return String(value ?? '')
    .trim()
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .slice(0, maxLength);
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  })[char]);
}

function response(statusCode, body) {
  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

async function sendTelegram(config, lead) {
  if (!config.telegramToken || !config.telegramChatId) {
    throw new Error('Telegram environment variables are missing');
  }

  const text = [
    '🏠 Новая заявка с лендинга',
    '',
    `Имя: ${lead.name}`,
    `Телефон: ${lead.phone}`,
    lead.service ? `Услуга: ${lead.service}` : null,
    `Задача: ${lead.message}`,
    '',
    `Время: ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`,
  ].filter(Boolean).join('\n');

  const apiResponse = await fetch(`https://api.telegram.org/bot${config.telegramToken}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: config.telegramChatId,
      text,
      disable_web_page_preview: true,
    }),
  });

  const result = await apiResponse.json().catch(() => ({}));
  if (!apiResponse.ok || !result.ok) {
    throw new Error(`Telegram error: ${result.description || apiResponse.status}`);
  }
}

async function sendEmail(config, lead) {
  if (!config.smtpUser || !config.smtpPass || !config.emailTo) {
    throw new Error('Email environment variables are missing');
  }

  const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465,
    auth: { user: config.smtpUser, pass: config.smtpPass },
  });

  const safe = Object.fromEntries(
    Object.entries(lead).map(([key, value]) => [key, escapeHtml(value)]),
  );

  await transporter.sendMail({
    from: `Лендинг Артёма Перлова <${config.smtpUser}>`,
    to: config.emailTo,
    subject: `Новая заявка с сайта — ${lead.name}`,
    text: [
      'Новая заявка с лендинга',
      `Имя: ${lead.name}`,
      `Телефон: ${lead.phone}`,
      lead.service ? `Услуга: ${lead.service}` : null,
      `Задача: ${lead.message}`,
    ].filter(Boolean).join('\n'),
    html: `
      <h2>Новая заявка с лендинга</h2>
      <p><strong>Имя:</strong> ${safe.name}</p>
      <p><strong>Телефон:</strong> ${safe.phone}</p>
      ${safe.service ? `<p><strong>Услуга:</strong> ${safe.service}</p>` : ''}
      <p><strong>Задача:</strong><br>${safe.message.replace(/\n/g, '<br>')}</p>
    `,
  });
}

export default async (request) => {
  if (request.method !== 'POST') {
    return response(405, { ok: false, message: 'Метод не поддерживается.' });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return response(400, { ok: false, message: 'Некорректные данные формы.' });
  }

  if (body.website) return response(200, { ok: true });

  const startedAt = Number(body.startedAt || 0);
  if (startedAt && Date.now() - startedAt < 1800) {
    return response(400, { ok: false, message: 'Форма отправлена слишком быстро.' });
  }

  const lead = {
    name: clean(body.name, MAX.name),
    phone: clean(body.phone, MAX.phone),
    message: clean(body.message, MAX.message),
    service: clean(body.service, MAX.service),
  };

  if (lead.name.length < 2 || lead.phone.length < 6 || lead.message.length < 5 || !body.consent) {
    return response(400, { ok: false, message: 'Проверьте заполнение полей и согласие на обработку данных.' });
  }

  const config = {
    telegramToken: process.env.TELEGRAM_BOT_TOKEN,
    telegramChatId: process.env.TELEGRAM_CHAT_ID,
    smtpHost: process.env.SMTP_HOST || 'smtp.mail.ru',
    smtpPort: Number(process.env.SMTP_PORT || 465),
    smtpUser: process.env.SMTP_USER,
    smtpPass: process.env.SMTP_PASS,
    emailTo: process.env.LEAD_EMAIL_TO || process.env.SMTP_USER,
  };

  const results = await Promise.allSettled([
    sendTelegram(config, lead),
    sendEmail(config, lead),
  ]);

  const telegramOk = results[0].status === 'fulfilled';
  const emailOk = results[1].status === 'fulfilled';

  if (!telegramOk) console.error('Telegram delivery failed:', results[0].reason);
  if (!emailOk) console.error('Email delivery failed:', results[1].reason);

  if (!telegramOk && !emailOk) {
    return response(502, { ok: false, message: 'Сейчас не удалось отправить заявку.' });
  }

  return response(200, {
    ok: true,
    partial: !(telegramOk && emailOk),
    channels: { telegram: telegramOk, email: emailOk },
  });
};
