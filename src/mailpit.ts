import { apps } from './apps';

export type MailpitMessage = {
  ID: string;
  Subject: string;
  From?: { Address?: string; Name?: string }[];
  To?: { Address?: string; Name?: string }[];
  Created?: string;
};

type MailpitListResponse = {
  total: number;
  messages: MailpitMessage[];
};

function mailpitBaseUrl(): string {
  // Same host as public web in local docker; Mailpit UI/API on 8025.
  const publicUrl = new URL(apps.public());
  return `${publicUrl.protocol}//${publicUrl.hostname}:8025`;
}

export async function listMailpitMessages(
  search = '',
): Promise<MailpitMessage[]> {
  const url = new URL('/api/v1/messages', mailpitBaseUrl());
  if (search) url.searchParams.set('query', search);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Mailpit list failed (${response.status}): ${await response.text()}`,
    );
  }
  const data = (await response.json()) as MailpitListResponse;
  return data.messages ?? [];
}

export async function waitForMailpitMessage(
  search: string,
  options: { timeoutMs?: number; pollMs?: number } = {},
): Promise<MailpitMessage> {
  const timeoutMs = options.timeoutMs ?? 30_000;
  const pollMs = options.pollMs ?? 1_000;
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      const messages = await listMailpitMessages(search);
      if (messages.length > 0) return messages[0]!;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
  throw new Error(
    `Mailpit: no message matching "${search}" within ${timeoutMs}ms` +
      (lastError ? ` (last error: ${String(lastError)})` : ''),
  );
}

export async function getMailpitMessageHtml(id: string): Promise<string> {
  const response = await fetch(
    new URL(`/api/v1/message/${id}`, mailpitBaseUrl()),
  );
  if (!response.ok) {
    throw new Error(
      `Mailpit message failed (${response.status}): ${await response.text()}`,
    );
  }
  const data = (await response.json()) as { HTML?: string; Text?: string };
  return data.HTML || data.Text || '';
}
