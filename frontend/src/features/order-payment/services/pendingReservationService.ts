export interface PendingReservation {
  id: string;
  eventId: number;
  eventName: string;
  eventLocation: string;
  seatIds: number[];
  seatCodes: string[];
  totalAmount: number;
  createdAt: string;
  expiresAt: string;
}

const STORAGE_KEY = 'ticketrush.pendingReservations';
const HOLD_COOLDOWN_KEY = 'ticketrush.holdCooldownUntil';
const DEFAULT_HOLD_MINUTES = 30;
const HOLD_COOLDOWN_MINUTES = 5;

function readAll(): PendingReservation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as PendingReservation[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed;
  } catch {
    return [];
  }
}

function writeAll(items: PendingReservation[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function getPendingReservations(): PendingReservation[] {
  const now = Date.now();
  const expiredItems: PendingReservation[] = [];
  const validItems = readAll().filter(item => {
    const expiresAt = new Date(item.expiresAt).getTime();
    const isValid = Number.isFinite(expiresAt) && expiresAt > now;
    if (!isValid && Number.isFinite(expiresAt)) {
      expiredItems.push(item);
    }
    return isValid;
  });

  if (expiredItems.length > 0) {
    const cooldownUntil = Math.max(
      ...expiredItems.map(item => new Date(item.expiresAt).getTime() + HOLD_COOLDOWN_MINUTES * 60 * 1000),
    );
    startHoldCooldownUntil(cooldownUntil);
  }

  writeAll(validItems);
  return validItems.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

export function createPendingReservation(input: {
  eventId: number;
  eventName: string;
  eventLocation: string;
  seatIds: number[];
  seatCodes: string[];
  totalAmount: number;
  holdMinutes?: number;
}): PendingReservation {
  const createdAt = new Date();
  const holdMinutes = input.holdMinutes ?? DEFAULT_HOLD_MINUTES;
  const expiresAt = new Date(createdAt.getTime() + holdMinutes * 60 * 1000);

  const reservation: PendingReservation = {
    id: `RES-${crypto.randomUUID()}`,
    eventId: input.eventId,
    eventName: input.eventName,
    eventLocation: input.eventLocation,
    seatIds: input.seatIds,
    seatCodes: input.seatCodes,
    totalAmount: input.totalAmount,
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  const nextItems = [reservation, ...getPendingReservations()];
  writeAll(nextItems);

  return reservation;
}

export function removePendingReservation(reservationId: string, options: { startCooldown?: boolean } = {}): void {
  const nextItems = getPendingReservations().filter(item => item.id !== reservationId);
  writeAll(nextItems);

  if (options.startCooldown) {
    startHoldCooldown();
  }
}

function startHoldCooldownUntil(cooldownUntil: number): void {
  if (!Number.isFinite(cooldownUntil) || cooldownUntil <= Date.now()) {
    return;
  }

  const raw = localStorage.getItem(HOLD_COOLDOWN_KEY);
  const currentCooldownUntil = raw ? Number(raw) : 0;
  const nextCooldownUntil = Number.isFinite(currentCooldownUntil)
    ? Math.max(currentCooldownUntil, cooldownUntil)
    : cooldownUntil;

  localStorage.setItem(HOLD_COOLDOWN_KEY, String(nextCooldownUntil));
}

export function startHoldCooldown(): void {
  const cooldownUntil = Date.now() + HOLD_COOLDOWN_MINUTES * 60 * 1000;
  startHoldCooldownUntil(cooldownUntil);
}

export function clearHoldCooldown(): void {
  localStorage.removeItem(HOLD_COOLDOWN_KEY);
}

export function getHoldCooldownSecondsLeft(): number {
  const raw = localStorage.getItem(HOLD_COOLDOWN_KEY);
  const cooldownUntil = raw ? Number(raw) : NaN;
  if (!Number.isFinite(cooldownUntil)) {
    return 0;
  }

  const secondsLeft = Math.ceil((cooldownUntil - Date.now()) / 1000);
  if (secondsLeft <= 0) {
    clearHoldCooldown();
    return 0;
  }

  return secondsLeft;
}
