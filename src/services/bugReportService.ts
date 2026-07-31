import { collection, doc, limit, onSnapshot, query, serverTimestamp, updateDoc, where, writeBatch, type Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface BugReportInput {
  uid: string;
  reporterEmail: string;
  reporterName: string;
  category: string;
  title: string;
  description: string;
  reproductionSteps: string;
  expectedResult: string;
  actualResult: string;
  sourceUrl: string;
  // attachmentUrl holds the first image so reports written before multi-image
  // support — and any client still reading that field — keep rendering.
  attachmentUrl?: string;
  attachmentUrls?: string[];
  userAgent: string;
  viewport: string;
  cardColor?: string;
}

export interface BugReportRecord extends BugReportInput {
  id: string;
  status: BugReportStatus;
  createdAt?: Timestamp | null;
}

export interface BugReportReplyInput {
  uid: string;
  authorName: string;
  message: string;
}

export interface BugReportReplyRecord extends BugReportReplyInput {
  id: string;
  createdAt?: Timestamp | null;
}

export type BugReportCategory = '버그' | '개선사항' | '건의사항' | '기타';
export type BugReportStatus = 'new' | 'in_progress' | 'resolved';

export async function submitBugReport(input: BugReportInput): Promise<string> {
  const { reporterEmail, sourceUrl, userAgent, viewport, ...publicInput } = input;
  const report = doc(collection(db, 'bugReports'));
  const batch = writeBatch(db);
  batch.set(report, {
    ...publicInput,
    status: 'new',
    visibilityVersion: 2,
    createdAt: serverTimestamp(),
  });
  batch.set(doc(db, 'bugReportPrivate', report.id), {
    uid: input.uid,
    reporterEmail,
    sourceUrl,
    userAgent,
    viewport,
    createdAt: serverTimestamp(),
  });
  await batch.commit();
  return report.id;
}

export function subscribeBugReports(onChange: (reports: BugReportRecord[]) => void, onError?: (error: Error) => void) {
  const reportsQuery = query(collection(db, 'bugReports'), where('visibilityVersion', '==', 2), limit(100));
  return onSnapshot(reportsQuery, (snapshot) => {
    const reports = snapshot.docs.map((report) => ({ id: report.id, ...report.data() } as BugReportRecord));
    reports.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    onChange(reports);
  }, (error) => onError?.(error));
}

export function subscribeBugReportReplies(
  reportId: string,
  onChange: (replies: BugReportReplyRecord[]) => void,
  onError?: (error: Error) => void,
) {
  const repliesQuery = query(collection(db, 'bugReports', reportId, 'replies'), limit(100));
  return onSnapshot(repliesQuery, (snapshot) => {
    const replies = snapshot.docs.map((reply) => ({ id: reply.id, ...reply.data() } as BugReportReplyRecord));
    replies.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
    onChange(replies);
  }, (error) => onError?.(error));
}

export async function submitBugReportReply(
  reportId: string,
  input: BugReportReplyInput,
): Promise<string> {
  const reply = doc(collection(db, 'bugReports', reportId, 'replies'));
  const batch = writeBatch(db);
  batch.set(reply, {
    ...input,
    createdAt: serverTimestamp(),
  });
  await batch.commit();
  return reply.id;
}

export async function deleteBugReportReply(reportId: string, replyId: string): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'bugReports', reportId, 'replies', replyId));
  await batch.commit();
}

export async function deleteBugReport(reportId: string): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'bugReports', reportId));
  batch.delete(doc(db, 'bugReportPrivate', reportId));
  await batch.commit();
}

export async function updateBugReportDescription(reportId: string, description: string): Promise<void> {
  await updateDoc(doc(db, 'bugReports', reportId), {
    description,
    updatedAt: serverTimestamp(),
  });
}

export async function updateBugReportDetails(
  reportId: string,
  updates: Partial<Pick<BugReportInput, 'description' | 'category' | 'attachmentUrl' | 'attachmentUrls'>>,
): Promise<void> {
  await updateDoc(doc(db, 'bugReports', reportId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function updateBugReportStatus(
  reportId: string,
  status: BugReportStatus,
): Promise<void> {
  await updateDoc(doc(db, 'bugReports', reportId), {
    status,
    updatedAt: serverTimestamp(),
  });
}
