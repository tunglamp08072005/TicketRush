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
const DEFAULT_HOLD_MINUTES = 30;

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
  const validItems = readAll().filter(item => {
    const expiresAt = new Date(item.expiresAt).getTime();
    return Number.isFinite(expiresAt) && expiresAt > now;
  });

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

export function removePendingReservation(reservationId: string): void {
  const nextItems = getPendingReservations().filter(item => item.id !== reservationId);
  writeAll(nextItems);
}
