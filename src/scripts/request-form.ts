import {
  buildMailto,
  buildPayload,
  errorsFromFormspree,
  isSpam,
  SEND_FAILED_MESSAGE,
  validateRequest,
  type FieldErrors,
  type RequestFields,
  type ServiceKey,
} from '../lib/form';

const FIELDS = ['name', 'email', 'website', 'message'] as const;

function readFields(form: HTMLFormElement): RequestFields {
  const data = new FormData(form);
  const get = (key: string) => String(data.get(key) ?? '');
  return {
    name: get('name'),
    email: get('email'),
    website: get('website'),
    message: get('message'),
    service: (get('service') || 'rescue') as ServiceKey,
    company: get('company'),
  };
}

function showErrors(form: HTMLFormElement, errors: FieldErrors) {
  for (const key of FIELDS) {
    const input = form.elements.namedItem(key) as HTMLInputElement | null;
    const message = form.querySelector<HTMLElement>(`#rf-${key}-error`);
    if (!input || !message) continue;
    const error = errors[key];
    if (error) {
      input.setAttribute('aria-invalid', 'true');
      message.textContent = error;
      message.hidden = false;
    } else {
      input.removeAttribute('aria-invalid');
      message.textContent = '';
      message.hidden = true;
    }
  }
}

function setStatus(form: HTMLFormElement, tone: 'info' | 'error', content: string | Node[]) {
  const status = form.querySelector<HTMLElement>('[role="status"]');
  if (!status) return;
  status.dataset.tone = tone;
  status.replaceChildren(...(typeof content === 'string' ? [document.createTextNode(content)] : content));
}

function emailLink(email: string, href = `mailto:${email}`): HTMLAnchorElement {
  const a = document.createElement('a');
  a.href = href;
  a.textContent = email;
  return a;
}

function showThanks(form: HTMLFormElement) {
  for (const child of Array.from(form.children)) {
    if (child.getAttribute('role') !== 'status') (child as HTMLElement).hidden = true;
  }
  setStatus(
    form,
    'info',
    'Thanks, your request is on its way. We’ll take a look at your site and reply within one business day.',
  );
  const status = form.querySelector<HTMLElement>('[role="status"]');
  if (status) {
    status.tabIndex = -1;
    status.focus();
  }
}

async function handleSubmit(form: HTMLFormElement, event: SubmitEvent) {
  event.preventDefault();
  const fields = readFields(form);
  const { ok, errors } = validateRequest(fields);
  showErrors(form, errors);

  if (!ok) {
    const firstInvalid = FIELDS.find((key) => errors[key]);
    if (firstInvalid) (form.elements.namedItem(firstInvalid) as HTMLElement | null)?.focus();
    setStatus(form, 'error', '');
    return;
  }

  if (isSpam(fields)) {
    showThanks(form);
    return;
  }

  const email = form.dataset.email ?? '';
  const endpoint = form.dataset.endpoint ?? '';

  if (!endpoint) {
    const href = buildMailto(email, fields);
    window.location.href = href;
    setStatus(form, 'info', [
      document.createTextNode('Your email app should open with your request ready to send. If it didn’t, email us at '),
      emailLink(email, href),
      document.createTextNode('.'),
    ]);
    return;
  }

  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  const label = button?.textContent ?? '';
  if (button) {
    button.disabled = true;
    button.textContent = 'Sending…';
  }

  const failed = (message: string | null) => {
    if (!message) {
      setStatus(form, 'error', '');
      return;
    }
    setStatus(form, 'error', [
      document.createTextNode(`${message} `),
      emailLink(email, buildMailto(email, fields)),
      document.createTextNode('.'),
    ]);
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(buildPayload(fields)),
    });
    if (response.ok) {
      showThanks(form);
      return;
    }
    const { fieldErrors, formError } = errorsFromFormspree(await response.json().catch(() => null));
    showErrors(form, fieldErrors);
    const firstInvalid = FIELDS.find((key) => fieldErrors[key]);
    if (firstInvalid) (form.elements.namedItem(firstInvalid) as HTMLElement | null)?.focus();
    failed(formError);
  } catch {
    failed(SEND_FAILED_MESSAGE);
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = label;
    }
  }
}

export function initRequestForms() {
  for (const form of document.querySelectorAll<HTMLFormElement>('form.request-form')) {
    form.addEventListener('submit', (event) => handleSubmit(form, event as SubmitEvent));

    // Once a field has been flagged, re-check it as the visitor corrects it.
    for (const key of FIELDS) {
      const input = form.elements.namedItem(key) as HTMLInputElement | null;
      input?.addEventListener('blur', () => {
        if (input.getAttribute('aria-invalid') !== 'true') return;
        const { errors } = validateRequest(readFields(form));
        const current = Object.fromEntries(
          FIELDS.filter((k) => k === key || form.querySelector(`#rf-${k}[aria-invalid="true"]`)).map((k) => [k, errors[k]]),
        ) as FieldErrors;
        showErrors(form, current);
      });
    }
  }
}
