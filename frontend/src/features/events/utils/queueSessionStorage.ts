const queueTokenKey = (eventId: number) => `virtual_queue_token_${eventId}`;
const queueAdmittedUntilKey = (eventId: number) => `virtual_queue_admitted_until_${eventId}`;

export function getQueueTokenFromSession(eventId: number): string {
  if (!Number.isFinite(eventId)) {
    return '';
  }

  try {
    return sessionStorage.getItem(queueTokenKey(eventId)) || '';
  } catch {
    return '';
  }
}

export function setQueueTokenInSession(eventId: number, queueToken: string): void {
  if (!Number.isFinite(eventId) || !queueToken) {
    return;
  }

  try {
    sessionStorage.setItem(queueTokenKey(eventId), queueToken);
  } catch {
    // Ignore storage restrictions in private mode.
  }
}

export function setQueueAdmittedUntilInSession(eventId: number, admittedUntilEpochMs: number | null): void {
  if (!Number.isFinite(eventId)) {
    return;
  }

  try {
    if (!admittedUntilEpochMs || admittedUntilEpochMs <= 0) {
      sessionStorage.removeItem(queueAdmittedUntilKey(eventId));
      return;
    }

    sessionStorage.setItem(queueAdmittedUntilKey(eventId), String(admittedUntilEpochMs));
  } catch {
    // Ignore storage restrictions in private mode.
  }
}

export function getQueueAdmittedUntilFromSession(eventId: number): number | null {
  if (!Number.isFinite(eventId)) {
    return null;
  }

  try {
    const value = sessionStorage.getItem(queueAdmittedUntilKey(eventId));
    if (!value) {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function listQueueEventIdsInSession(): number[] {
  try {
    const ids: number[] = [];
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i);
      if (!key || !key.startsWith('virtual_queue_token_')) {
        continue;
      }

      const maybeId = Number(key.replace('virtual_queue_token_', ''));
      if (Number.isFinite(maybeId)) {
        ids.push(maybeId);
      }
    }

    return ids;
  } catch {
    return [];
  }
}

export function clearQueueTokenInSession(eventId: number): void {
  if (!Number.isFinite(eventId)) {
    return;
  }

  try {
    sessionStorage.removeItem(queueTokenKey(eventId));
    sessionStorage.removeItem(queueAdmittedUntilKey(eventId));
  } catch {
    // Ignore storage restrictions in private mode.
  }
}

export function clearAllQueueTokensInSession(): void {
  try {
    const eventIds = listQueueEventIdsInSession();
    for (const eventId of eventIds) {
      clearQueueTokenInSession(eventId);
    }
  } catch {
    // Ignore storage restrictions in private mode.
  }
}
