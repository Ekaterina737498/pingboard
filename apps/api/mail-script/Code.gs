// Отправка писем PingBoard из Gmail. Настройка: docs/deploy.md, раздел «Почта».
// Секрет хранится в Script Properties под именем MAIL_SECRET, а не в коде.

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const secret =
      PropertiesService.getScriptProperties().getProperty('MAIL_SECRET');

    if (!secret || secret.length < 32 || data.secret !== secret) {
      return reply({ ok: false, error: 'unauthorized' });
    }
    // Только один получатель на запрос.
    if (!isSingleEmail(data.to) || !data.subject || !data.text) {
      return reply({ ok: false, error: 'bad_request' });
    }

    MailApp.sendEmail({
      to: data.to,
      subject: String(data.subject),
      body: String(data.text),
      name: 'PingBoard',
    });
    return reply({ ok: true });
  } catch (error) {
    console.error(error);
    return reply({ ok: false, error: 'send_failed' });
  }
}

// Запустите один раз в редакторе, чтобы выдать скрипту разрешение на отправку.
function authorize() {
  console.log('Осталось писем на сегодня: ' + MailApp.getRemainingDailyQuota());
}

function isSingleEmail(value) {
  return typeof value === 'string' && /^[^\s,;<>@]+@[^\s,;<>@]+$/.test(value);
}

function reply(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
