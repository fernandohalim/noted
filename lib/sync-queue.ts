const KEY = 'noted:pending-saves';

export interface PendingSave {
  fileId: string;
  content: string;
  expectedUpdatedAt: string;
  queuedAt: number;
}

export function readQueue(): PendingSave[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

function writeQueue(queue: PendingSave[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(queue));
}

export function enqueueSave(save: PendingSave): void {
  // Replace any pending save for the same file with this newer one
  const next = readQueue().filter((s) => s.fileId !== save.fileId);
  next.push(save);
  writeQueue(next);
}

export function removeFromQueue(fileId: string): void {
  writeQueue(readQueue().filter((s) => s.fileId !== fileId));
}

export function getPendingSave(fileId: string): PendingSave | null {
  return readQueue().find((s) => s.fileId === fileId) ?? null;
}