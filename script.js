(() => {
  const form = document.querySelector('#lead-form');
  const status = document.querySelector('#form-status');
  const serviceField = document.querySelector('#service-field');
  const startedAt = document.querySelector('#started-at');
  const submitButton = form?.querySelector('button[type="submit"]');

  if (startedAt) startedAt.value = String(Date.now());

  const chooseService = (service) => {
    if (serviceField) serviceField.value = service;
    const message = form?.elements?.message;
    if (message && !message.value.trim()) {
      message.value = `Интересует услуга: ${service}. `;
      message.setSelectionRange(message.value.length, message.value.length);
    }
    document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => form?.elements?.name?.focus(), 500);
  };

  document.querySelectorAll('[data-service]').forEach((element) => {
    element.addEventListener('click', () => chooseService(element.dataset.service || ''));
  });

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    status.className = 'form-status';
    status.textContent = '';

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'Отправляем…';

    const payload = Object.fromEntries(new FormData(form).entries());

    try {
      const response = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) {
        throw new Error(result.message || 'Не удалось отправить заявку.');
      }

      status.textContent = result.partial
        ? 'Заявка отправлена. Один из каналов временно недоступен, но обращение уже получено.'
        : 'Спасибо! Заявка отправлена в Telegram и на почту.';
      form.reset();
      serviceField.value = '';
      startedAt.value = String(Date.now());
    } catch (error) {
      status.className = 'form-status error';
      status.textContent = `${error.message} Напишите напрямую в Telegram или позвоните.`;
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Записаться на консультацию';
    }
  });
})();
