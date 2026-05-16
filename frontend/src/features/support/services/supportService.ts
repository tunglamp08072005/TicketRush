import { getAuthSession } from '../../auth/utils/authStorage';

const API_URL = 'http://localhost:8080/api/support/requests';

export type SupportIssueType = 'payment' | 'account' | 'ticket' | 'feedback' | 'other';

export interface SubmitSupportRequestPayload {
  issueType: SupportIssueType;
  title: string;
  content: string;
  contactEmail?: string;
  evidence?: File | null;
}

export async function submitSupportRequest(payload: SubmitSupportRequestPayload): Promise<string> {
  const { token } = getAuthSession();
  if (!token) {
    throw new Error('Vui lòng đăng nhập để gửi yêu cầu hỗ trợ.');
  }

  const formData = new FormData();
  formData.append('issueType', payload.issueType);
  formData.append('title', payload.title);
  formData.append('content', payload.content);

  if (payload.contactEmail?.trim()) {
    formData.append('contactEmail', payload.contactEmail.trim());
  }
  if (payload.evidence) {
    formData.append('evidence', payload.evidence);
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const message = await response.text();
  if (!response.ok) {
    throw new Error(message || 'Không thể gửi yêu cầu hỗ trợ');
  }

  return message || 'Yêu cầu hỗ trợ đã được gửi';
}
