import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Bug,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  MessageCircle,
  Pencil,
  Plus,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { useStore } from "../store/useStore";
import { uploadPublicImage } from "../services/storageService";
import {
  deleteBugReport,
  deleteBugReportReply,
  subscribeBugReports,
  subscribeBugReportReplies,
  submitBugReport,
  submitBugReportReply,
  updateBugReportDetails,
  updateBugReportStatus,
  type BugReportCategory,
  type BugReportRecord,
  type BugReportReplyRecord,
  type BugReportStatus,
} from "../services/bugReportService";

type LocationState = { sourceUrl?: string } | null;

const cardColors = [
  "#ffe08a",
  "#d8b4f1",
  "#ffb4c8",
  "#9edcf7",
  "#aee3bf",
  "#ffc39d",
  "#c8c2ff",
  "#f5a7df",
  "#9be5df",
  "#d5eb8e",
  "#f2b5a7",
  "#b9d1ff",
];
const reportCategories: BugReportCategory[] = [
  "버그",
  "개선사항",
  "건의사항",
  "기타",
];
const reportStatuses: Array<{
  value: BugReportStatus;
  label: string;
  description: string;
}> = [
  { value: "new", label: "수정 전", description: "아직 확인하지 않은 제보" },
  {
    value: "in_progress",
    label: "수정 중",
    description: "확인 후 수정하고 있는 제보",
  },
  { value: "resolved", label: "수정 완료", description: "수정이 끝난 제보" },
];
const normalizeReportStatus = (
  status: BugReportRecord["status"]
): BugReportStatus =>
  status === "in_progress" || status === "resolved" ? status : "new";
const MAX_REPORT_IMAGES = 5;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
// Reports created before multi-image support only have attachmentUrl, so read
// the list first and fall back to the single field.
const reportImageUrls = (report: BugReportRecord): string[] => {
  const urls = Array.isArray(report.attachmentUrls)
    ? report.attachmentUrls.filter(
        (url): url is string => typeof url === "string" && url.length > 0
      )
    : [];
  if (urls.length > 0) return urls;
  return report.attachmentUrl ? [report.attachmentUrl] : [];
};
// Sequential on purpose: uploadPublicImage builds the storage path from
// Date.now() plus the file name, so two screenshots sharing a name could
// overwrite each other if their uploads raced.
const uploadReportImages = async (uid: string, files: File[]) => {
  const urls: string[] = [];
  for (const file of files) {
    urls.push(await uploadPublicImage(`profiles/${uid}/bug-reports`, file));
  }
  return urls;
};
const cardColorForId = (id: string) => {
  const hash = Array.from(id).reduce(
    (total, character) => (total * 31 + character.charCodeAt(0)) >>> 0,
    0
  );
  return cardColors[hash % cardColors.length];
};

const BugReportReplies: React.FC<{
  reportId: string;
  userId?: string;
  authorName: string;
}> = ({ reportId, userId, authorName }) => {
  const [replies, setReplies] = useState<BugReportReplyRecord[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [deletingReplyId, setDeletingReplyId] = useState("");
  const [error, setError] = useState("");

  useEffect(
    () =>
      subscribeBugReportReplies(
        reportId,
        (nextReplies) => {
          setReplies(nextReplies);
          setLoading(false);
          setError("");
        },
        () => {
          setLoading(false);
          setError("답글을 불러오지 못했어요.");
        }
      ),
    [reportId]
  );

  const submitReply = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextMessage = message.trim();
    if (!userId || !nextMessage || sending) return;
    setSending(true);
    setError("");
    try {
      await submitBugReportReply(reportId, {
        uid: userId,
        authorName,
        message: nextMessage,
      });
      setMessage("");
    } catch (submitError) {
      console.error("Bug report reply submission failed", submitError);
      setError("답글을 등록하지 못했어요.");
    } finally {
      setSending(false);
    }
  };

  const removeReply = async (reply: BugReportReplyRecord) => {
    if (!userId || reply.uid !== userId || deletingReplyId) return;
    if (!window.confirm("이 답글을 삭제할까요?")) return;
    setDeletingReplyId(reply.id);
    try {
      await deleteBugReportReply(reportId, reply.id);
    } catch (deleteError) {
      console.error("Bug report reply deletion failed", deleteError);
      setError("답글을 삭제하지 못했어요.");
    } finally {
      setDeletingReplyId("");
    }
  };

  return (
    <section className="border-t border-black/10 bg-white/15 px-4 py-3">
      <div className="flex items-center gap-1.5 text-[10px] font-black text-black/55">
        <MessageCircle className="h-3.5 w-3.5" /> 답글 {replies.length}
      </div>
      {!loading && replies.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {replies.map((reply) => (
            <div
              key={reply.id}
              className="flex items-start gap-2 rounded-xl bg-white/45 px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <strong className="text-[10px] font-black">
                    {reply.authorName || "베타테스터"}
                  </strong>
                  <span className="text-[8px] font-bold text-black/35">
                    {reply.createdAt?.toDate?.().toLocaleString("ko-KR", {
                      month: "numeric",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    }) || "방금 전"}
                  </span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-[11px] font-semibold leading-4 text-black/70">
                  {reply.message}
                </p>
              </div>
              {reply.uid === userId && (
                <button
                  type="button"
                  onClick={() => void removeReply(reply)}
                  disabled={deletingReplyId === reply.id}
                  aria-label="내 답글 삭제"
                  className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-black/35 hover:bg-red-500 hover:text-white disabled:cursor-wait disabled:opacity-50"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      <form onSubmit={submitReply} className="mt-2 flex items-end gap-2">
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          maxLength={1000}
          rows={2}
          placeholder="답글을 입력하세요"
          aria-label="답글 내용"
          className="min-h-14 min-w-0 flex-1 resize-none rounded-xl border border-black/10 bg-white/55 px-3 py-2 text-[11px] font-semibold outline-none placeholder:text-black/30 focus:border-black/35"
        />
        <button
          type="submit"
          disabled={!message.trim() || sending || !userId}
          className="flex h-10 shrink-0 cursor-pointer items-center gap-1 rounded-full bg-[#171714] px-3 text-[10px] font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send className="h-3.5 w-3.5" /> 등록
        </button>
      </form>
      {error && <p className="mt-2 text-[9px] font-bold text-red-700">{error}</p>}
    </section>
  );
};

const BugReportGallery: React.FC<{
  images: string[];
  canEdit: boolean;
  busy: boolean;
  onRemove: (imageUrl: string) => void;
}> = ({ images, canEdit, busy, onRemove }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  // Confirmation lives in the page, not window.confirm: embedded browsers and
  // some in-app webviews suppress native dialogs, which silently returns false
  // and makes the delete look broken.
  const [pendingRemoval, setPendingRemoval] = useState<string | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  // Leaving edit mode, or the list changing under us, drops a stale prompt.
  useEffect(() => {
    setPendingRemoval(null);
  }, [canEdit, images.length]);

  // Deleting the last image would leave activeIndex past the end, so pull it
  // back into range whenever the count shrinks.
  useEffect(() => {
    setActiveIndex((current) => Math.min(current, Math.max(0, images.length - 1)));
  }, [images.length]);

  const syncActiveIndex = () => {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    // Round rather than floor so a half-finished drag doesn't flip the counter.
    const next = Math.round(track.scrollLeft / track.clientWidth);
    setActiveIndex(Math.min(images.length - 1, Math.max(0, next)));
  };

  const scrollToIndex = (index: number) => {
    const track = trackRef.current;
    if (!track) return;
    const clamped = Math.min(images.length - 1, Math.max(0, index));
    track.scrollTo({ left: clamped * track.clientWidth, behavior: "smooth" });
  };

  if (images.length === 0) return null;

  return (
    <div className="relative border-y border-black/10 bg-white/25">
      <div
        ref={trackRef}
        onScroll={syncActiveIndex}
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {images.map((imageUrl, index) => (
          <div
            key={imageUrl}
            className="flex aspect-[4/3] max-h-72 w-full shrink-0 snap-center items-center justify-center"
          >
            <img
              src={imageUrl}
              alt={`오류 제보 첨부 ${index + 1}`}
              loading="lazy"
              draggable={false}
              className="h-full w-full object-contain"
            />
          </div>
        ))}
      </div>
      {images.length > 1 && (
        <>
          <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[9px] font-black text-white">
            {activeIndex + 1}/{images.length}
          </span>
          {/* Touch devices swipe the track directly; these are for mouse users. */}
          {activeIndex > 0 && (
            <button
              type="button"
              onClick={() => scrollToIndex(activeIndex - 1)}
              aria-label="이전 사진"
              className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/85 text-black/60 shadow transition hover:bg-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          {activeIndex < images.length - 1 && (
            <button
              type="button"
              onClick={() => scrollToIndex(activeIndex + 1)}
              aria-label="다음 사진"
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/85 text-black/60 shadow transition hover:bg-white"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
          <div className="pointer-events-auto absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/40 px-2 py-1">
            {images.map((imageUrl, index) => (
              <button
                key={imageUrl}
                type="button"
                onClick={() => scrollToIndex(index)}
                aria-label={`${index + 1}번째 사진 보기`}
                aria-current={index === activeIndex}
                className={`h-1.5 cursor-pointer rounded-full transition-all ${
                  index === activeIndex ? "w-4 bg-white" : "w-1.5 bg-white/50"
                }`}
              />
            ))}
          </div>
        </>
      )}
      {canEdit && !pendingRemoval && (
        <button
          type="button"
          onClick={() => setPendingRemoval(images[activeIndex])}
          disabled={busy}
          aria-label={`${activeIndex + 1}번째 사진 삭제`}
          className="absolute right-2 top-2 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-white/85 text-black/55 shadow transition hover:bg-red-500 hover:text-white disabled:cursor-wait disabled:opacity-50"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      {canEdit && pendingRemoval && (
        <div
          role="alertdialog"
          aria-label="사진 삭제 확인"
          className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 bg-black/75 px-3 py-2"
        >
          <span className="min-w-0 truncate text-[10px] font-black text-white">
            이 사진을 삭제할까요?
          </span>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPendingRemoval(null)}
              className="cursor-pointer rounded-full bg-white/25 px-2.5 py-1 text-[10px] font-black text-white transition hover:bg-white/40"
            >
              취소
            </button>
            <button
              type="button"
              onClick={() => {
                // Delete the image the prompt was opened for, even if the
                // carousel was swiped while the prompt was up.
                onRemove(pendingRemoval);
                setPendingRemoval(null);
              }}
              disabled={busy}
              className="cursor-pointer rounded-full bg-red-500 px-2.5 py-1 text-[10px] font-black text-white transition hover:bg-red-600 disabled:cursor-wait disabled:opacity-50"
            >
              삭제
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const BugReportPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useStore((state) => state.user);
  const profile = useStore((state) => state.profile);
  const reporterNickname =
    profile.name?.trim() ||
    profile.username?.trim() ||
    user?.displayName?.trim() ||
    "베타테스터";
  const isSiteAdmin =
    user?.email?.trim().toLowerCase() === "brownrice0916@gmail.com";
  const sourceUrl = useMemo(
    () =>
      (location.state as LocationState)?.sourceUrl ||
      document.referrer ||
      window.location.href,
    [location.state]
  );
  const [reports, setReports] = useState<BugReportRecord[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [boardError, setBoardError] = useState("");
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [draftColor, setDraftColor] = useState(cardColors[0]);
  const [draftCategory, setDraftCategory] = useState<BugReportCategory>("버그");
  const [deletingReportId, setDeletingReportId] = useState("");
  const [pendingDeleteReportId, setPendingDeleteReportId] = useState("");
  const [editingReportId, setEditingReportId] = useState("");
  const [editingDescription, setEditingDescription] = useState("");
  const [editingCategory, setEditingCategory] =
    useState<BugReportCategory>("버그");
  const [savingReportId, setSavingReportId] = useState("");
  const [uploadingReportId, setUploadingReportId] = useState("");
  const [updatingStatusReportId, setUpdatingStatusReportId] = useState("");
  const [activeStatus, setActiveStatus] = useState<BugReportStatus>("new");
  const [expandedResolvedReportId, setExpandedResolvedReportId] = useState("");
  const descriptionInputRef = useRef<HTMLTextAreaElement | null>(null);
  const reportImageInputRef = useRef<HTMLInputElement | null>(null);
  const imageTargetReportIdRef = useRef("");
  const reportsByStatus = useMemo(
    () =>
      reportStatuses.reduce<Record<BugReportStatus, BugReportRecord[]>>(
        (groupedReports, status) => {
          groupedReports[status.value] = reports.filter(
            (report) => normalizeReportStatus(report.status) === status.value
          );
          return groupedReports;
        },
        { new: [], in_progress: [], resolved: [] }
      ),
    [reports]
  );
  const activeStatusConfig =
    reportStatuses.find((status) => status.value === activeStatus) ??
    reportStatuses[0];
  const activeStatusReports = reportsByStatus[activeStatus];

  useEffect(
    () =>
      subscribeBugReports(
        (nextReports) => {
          setReports(nextReports);
          setLoadingReports(false);
          setBoardError("");
        },
        () => {
          setLoadingReports(false);
          setBoardError(
            "제보 목록을 불러오지 못했어요. 잠시 후 새로고침해 주세요."
          );
        }
      ),
    []
  );

  const attachmentPreviews = useMemo(
    () => attachments.map((file) => URL.createObjectURL(file)),
    [attachments]
  );
  // Cleanup runs when `attachments` changes as well as on unmount, so the
  // previous batch's blob URLs are released as soon as they stop being shown.
  useEffect(
    () => () => {
      attachmentPreviews.forEach((preview) => URL.revokeObjectURL(preview));
    },
    [attachmentPreviews]
  );

  const resetComposer = () => {
    setDescription("");
    setAttachments([]);
    setFormError("");
  };

  const closeComposer = () => {
    if (submitting) return;
    setIsComposerOpen(false);
    resetComposer();
  };

  const openComposer = () => {
    setDraftColor(cardColors[Math.floor(Math.random() * cardColors.length)]);
    setDraftCategory("버그");
    setIsComposerOpen(true);
    window.setTimeout(() => descriptionInputRef.current?.focus(), 0);
  };

  const selectAttachments = (event: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files || []);
    event.target.value = "";
    if (picked.length === 0) return;
    const accepted = picked.filter(
      (file) => file.type.startsWith("image/") && file.size <= MAX_IMAGE_BYTES
    );
    const remainingSlots = MAX_REPORT_IMAGES - attachments.length;
    const added = accepted.slice(0, Math.max(0, remainingSlots));
    if (added.length > 0) setAttachments((current) => [...current, ...added]);
    // Both limits can trip at once, so report whichever actually dropped files
    // rather than assuming a single cause.
    if (accepted.length < picked.length) {
      setFormError("5MB 이하의 이미지 파일만 첨부할 수 있어요.");
    } else if (added.length < accepted.length) {
      setFormError(`사진은 최대 ${MAX_REPORT_IMAGES}장까지 첨부할 수 있어요.`);
    } else {
      setFormError("");
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((current) => current.filter((_, item) => item !== index));
    setFormError("");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;
    if (!description.trim()) {
      setFormError("오류 내용을 입력해 주세요.");
      return;
    }
    setSubmitting(true);
    setFormError("");
    try {
      const attachmentUrls = await uploadReportImages(user.uid, attachments);
      await submitBugReport({
        uid: user.uid,
        reporterEmail: user.email || "",
        reporterName: reporterNickname,
        category: draftCategory,
        title: "",
        description: description.trim(),
        reproductionSteps: "",
        expectedResult: "",
        actualResult: "",
        sourceUrl,
        attachmentUrl: attachmentUrls[0] || "",
        attachmentUrls,
        userAgent: navigator.userAgent,
        viewport: `${window.innerWidth}×${window.innerHeight} @${
          window.devicePixelRatio || 1
        }x`,
        cardColor: draftColor,
      });
      setIsComposerOpen(false);
      resetComposer();
      setSubmitted(true);
      window.setTimeout(() => setSubmitted(false), 3000);
    } catch (error) {
      console.error("Bug report submission failed", error);
      setFormError("제보를 접수하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  // Confirmed by an in-page prompt rather than window.confirm, which embedded
  // browsers and in-app webviews suppress -- it then returns false and the
  // delete silently does nothing.
  const handleDelete = async (report: BugReportRecord) => {
    setPendingDeleteReportId("");
    if (!user || report.uid !== user.uid || deletingReportId) return;
    setDeletingReportId(report.id);
    try {
      await deleteBugReport(report.id);
    } catch (error) {
      console.error("Bug report deletion failed", error);
      window.alert("제보를 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setDeletingReportId("");
    }
  };

  const startEditing = (report: BugReportRecord) => {
    if (!user || report.uid !== user.uid) return;
    setEditingReportId(report.id);
    setEditingDescription(report.description);
    setEditingCategory(
      reportCategories.includes(report.category as BugReportCategory)
        ? (report.category as BugReportCategory)
        : "버그"
    );
  };

  const cancelEditing = () => {
    if (savingReportId) return;
    setEditingReportId("");
    setEditingDescription("");
  };

  const saveEditing = async (reportId: string) => {
    const nextDescription = editingDescription.trim();
    const report = reports.find((item) => item.id === reportId);
    if (!user || report?.uid !== user.uid || !nextDescription || savingReportId)
      return;
    setSavingReportId(reportId);
    try {
      await updateBugReportDetails(reportId, {
        description: nextDescription,
        category: editingCategory,
      });
      setEditingReportId("");
      setEditingDescription("");
    } catch (error) {
      console.error("Bug report update failed", error);
      window.alert(
        "수정 내용을 저장하지 못했어요. 잠시 후 다시 시도해 주세요."
      );
    } finally {
      setSavingReportId("");
    }
  };

  const changeReportStatus = async (
    report: BugReportRecord,
    nextStatus: BugReportStatus
  ) => {
    if (!isSiteAdmin || updatingStatusReportId) return;
    if (normalizeReportStatus(report.status) === nextStatus) return;
    setUpdatingStatusReportId(report.id);
    try {
      await updateBugReportStatus(report.id, nextStatus);
    } catch (error) {
      console.error("Bug report status update failed", error);
      window.alert("수정 상태를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setUpdatingStatusReportId("");
    }
  };

  const openReportImagePicker = (report: BugReportRecord) => {
    if (!user || report.uid !== user.uid) return;
    if (reportImageUrls(report).length >= MAX_REPORT_IMAGES) {
      window.alert(`사진은 최대 ${MAX_REPORT_IMAGES}장까지 첨부할 수 있어요.`);
      return;
    }
    imageTargetReportIdRef.current = report.id;
    reportImageInputRef.current?.click();
  };

  // The update rule only accepts a report whose category is one of the four
  // known values, so a legacy or unexpected value has to be normalized before
  // any image write — otherwise the write is rejected outright.
  const categoryForWrite = (report: BugReportRecord): BugReportCategory =>
    reportCategories.includes(report.category as BugReportCategory)
      ? (report.category as BugReportCategory)
      : "버그";

  const appendReportImages = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const picked = Array.from(event.target.files || []);
    event.target.value = "";
    const reportId = imageTargetReportIdRef.current;
    imageTargetReportIdRef.current = "";
    if (picked.length === 0 || !reportId || !user || uploadingReportId) return;
    const targetReport = reports.find((report) => report.id === reportId);
    if (!targetReport || targetReport.uid !== user.uid) return;
    const accepted = picked.filter(
      (file) => file.type.startsWith("image/") && file.size <= MAX_IMAGE_BYTES
    );
    if (accepted.length < picked.length) {
      window.alert("5MB 이하의 이미지 파일만 첨부할 수 있어요.");
    }
    const currentUrls = reportImageUrls(targetReport);
    const added = accepted.slice(0, MAX_REPORT_IMAGES - currentUrls.length);
    if (added.length === 0) return;
    setUploadingReportId(reportId);
    try {
      const uploadedUrls = await uploadReportImages(user.uid, added);
      const attachmentUrls = [...currentUrls, ...uploadedUrls];
      await updateBugReportDetails(reportId, {
        attachmentUrl: attachmentUrls[0] || "",
        attachmentUrls,
        category: categoryForWrite(targetReport),
      });
    } catch (error) {
      console.error("Bug report image update failed", error);
      window.alert("이미지를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setUploadingReportId("");
    }
  };

  const removeReportImage = async (
    report: BugReportRecord,
    imageUrl: string
  ) => {
    // BugReportGallery already confirmed with its own in-page prompt.
    if (!user || report.uid !== user.uid || uploadingReportId) return;
    const attachmentUrls = reportImageUrls(report).filter(
      (url) => url !== imageUrl
    );
    setUploadingReportId(report.id);
    try {
      await updateBugReportDetails(report.id, {
        attachmentUrl: attachmentUrls[0] || "",
        attachmentUrls,
        category: categoryForWrite(report),
      });
    } catch (error) {
      console.error("Bug report image removal failed", error);
      window.alert("사진을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setUploadingReportId("");
    }
  };

  return (
    <div className="min-h-screen bg-[#68ad5c] text-[#171714]">
      <header className="sticky top-0 z-20 border-b border-black/10 bg-[#68ad5c]/95 backdrop-blur">
        <div className="flex min-h-20 items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/admin")}
              aria-label="내 프로필로 돌아가기"
              className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/20 hover:bg-white/35"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#fffdf8] text-[#171714] shadow-sm">
              <Bug className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black text-white/75">
                LINKZIP PRIVATE BETA
              </p>
              <h1 className="truncate text-xl font-black text-white sm:text-2xl">
                베타테스터 오류 제보 보드
              </h1>
              <p className="truncate text-[11px] font-semibold text-white/75">
                발견한 오류와 개선이 필요한 부분을 자유롭게 남겨주세요.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={openComposer}
            className="hidden cursor-pointer items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-black shadow-md transition hover:-translate-y-0.5 sm:flex"
          >
            <Plus className="h-5 w-5" /> 제보 작성
          </button>
        </div>
      </header>

      <main className="px-3 py-5 sm:px-4">
        {boardError && (
          <div className="mx-auto mt-10 max-w-md rounded-2xl bg-white p-5 text-center text-sm font-bold text-red-600 shadow-lg">
            {boardError}
          </div>
        )}
        {!loadingReports &&
          !boardError &&
          reports.length === 0 &&
          !isComposerOpen && (
            <button
              type="button"
              onClick={openComposer}
              className="mx-auto mt-16 block max-w-md cursor-pointer rounded-3xl border-2 border-dashed border-white/60 bg-white/15 p-10 text-center text-white transition hover:bg-white/25"
            >
              <Bug className="mx-auto h-10 w-10" />
              <strong className="mt-4 block text-xl">
                첫 번째 오류를 제보해 주세요
              </strong>
              <span className="mt-2 block text-xs font-semibold text-white/75">
                우측 하단 + 버튼으로 바로 작성할 수 있어요.
              </span>
            </button>
          )}
        {!loadingReports &&
          !boardError &&
          (isComposerOpen || reports.length > 0) && (
            <section className="space-y-5">
              {isComposerOpen && (
                <form
                  onSubmit={handleSubmit}
                  className="mx-auto mb-5 max-w-xl overflow-hidden rounded-sm shadow-[0_3px_12px_rgba(0,0,0,0.24)] ring-2 ring-white/80"
                  style={{ backgroundColor: draftColor }}
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex flex-wrap gap-1.5">
                        {reportCategories.map((category) => (
                          <button
                            key={category}
                            type="button"
                            onClick={() => setDraftCategory(category)}
                            className={`cursor-pointer rounded-full px-2.5 py-1 text-[9px] font-black transition ${
                              draftCategory === category
                                ? "bg-[#171714] text-white"
                                : "bg-white/35 text-black/55 hover:bg-white/60"
                            }`}
                          >
                            {category}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-1">
                        <label
                          aria-label="이미지 추가"
                          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-black/10 hover:bg-black/20"
                        >
                          <ImagePlus className="h-3.5 w-3.5" />
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={selectAttachments}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={closeComposer}
                          aria-label="작성 취소"
                          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-black/10 hover:bg-black/20"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <textarea
                      ref={descriptionInputRef}
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      maxLength={2000}
                      rows={8}
                      className="mt-4 min-h-52 w-full resize-y border-0 bg-transparent p-0 text-base font-semibold leading-6 outline-none placeholder:text-black/30"
                      placeholder="발견한 오류를 자유롭게 적어주세요."
                    />
                    {attachmentPreviews.length > 0 && (
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {attachmentPreviews.map((preview, index) => (
                          <div
                            key={preview}
                            className="relative aspect-square overflow-hidden bg-white/35"
                          >
                            <img
                              src={preview}
                              alt={`첨부 미리보기 ${index + 1}`}
                              className="h-full w-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => removeAttachment(index)}
                              aria-label={`${index + 1}번째 사진 빼기`}
                              className="absolute right-1 top-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-white shadow"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {attachments.length < MAX_REPORT_IMAGES && (
                      <label className="mt-3 flex min-h-16 cursor-pointer items-center justify-center gap-2 border border-dashed border-black/20 bg-white/20 text-[10px] font-black hover:bg-white/35">
                        <ImagePlus className="h-4 w-4" />
                        스크린샷 추가 ({attachments.length}/{MAX_REPORT_IMAGES})
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={selectAttachments}
                          className="hidden"
                        />
                      </label>
                    )}
                    {formError && (
                      <p className="mt-3 rounded-lg bg-red-50/80 px-3 py-2 text-[10px] font-bold text-red-700">
                        {formError}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-black/10 bg-white/12 px-4 py-3">
                    <span className="truncate text-[10px] font-bold text-black/50">
                      {reporterNickname}
                    </span>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex cursor-pointer items-center gap-1.5 rounded-full bg-[#171714] px-4 py-2 text-[10px] font-black text-white disabled:cursor-wait disabled:opacity-60"
                    >
                      <Send className="h-3.5 w-3.5" />
                      등록
                    </button>
                  </div>
                </form>
              )}
              <div
                role="tablist"
                aria-label="제보 수정 상태"
                className="grid grid-cols-3 gap-1 rounded-2xl bg-black/10 p-1.5 sm:mx-auto sm:max-w-2xl sm:gap-2 sm:p-2"
              >
                {reportStatuses.map((status) => (
                  <button
                    key={status.value}
                    type="button"
                    role="tab"
                    aria-selected={activeStatus === status.value}
                    onClick={() => {
                      setActiveStatus(status.value);
                      setExpandedResolvedReportId("");
                    }}
                    className={`flex min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-2 py-3 text-xs font-black transition sm:text-sm ${
                      activeStatus === status.value
                        ? "bg-[#171714] text-white shadow-[3px_3px_0_rgba(255,255,255,0.65)]"
                        : "bg-white/20 text-white hover:bg-white/30"
                    }`}
                  >
                    <span className="truncate">{status.label}</span>
                    <span
                      className={`flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[9px] ${
                        activeStatus === status.value
                          ? "bg-white text-[#171714]"
                          : "bg-white/25 text-white"
                      }`}
                    >
                      {reportsByStatus[status.value].length}
                    </span>
                  </button>
                ))}
              </div>

              <section
                role="tabpanel"
                className="min-w-0 rounded-2xl bg-black/8 p-2.5 sm:p-4"
              >
                <header className="mb-4 px-1 py-1">
                  <h2 className="text-lg font-black text-white sm:text-xl">
                    {activeStatusConfig.label}
                  </h2>
                  <p className="mt-0.5 text-[10px] font-bold text-white/65 sm:text-xs">
                    {activeStatusConfig.description}
                  </p>
                </header>
                <div className="columns-1 gap-4 md:columns-2 xl:columns-3">
                  {activeStatusReports.length === 0 && (
                    <div className="w-full rounded-xl border border-dashed border-white/30 px-4 py-12 text-center text-[11px] font-bold text-white/55">
                      해당 제보가 없어요.
                    </div>
                  )}
                  {activeStatusReports.map((report) =>
                    activeStatus === "resolved" &&
                    expandedResolvedReportId !== report.id ? (
                      <button
                        key={report.id}
                        type="button"
                        onClick={() => setExpandedResolvedReportId(report.id)}
                        className="mb-4 flex min-h-24 w-full min-w-0 break-inside-avoid cursor-pointer items-center gap-3 rounded-sm px-4 py-4 text-left shadow-[0_2px_8px_rgba(0,0,0,0.18)] transition hover:-translate-y-0.5"
                        style={{
                          backgroundColor:
                            report.cardColor || cardColorForId(report.id),
                        }}
                      >
                        <Check className="h-4 w-4 shrink-0" />
                        <span className="min-w-0 flex-1 truncate text-sm font-black">
                          {report.title?.trim() ||
                            report.description.trim().split("\n")[0] ||
                            "내용 없는 제보"}
                        </span>
                        <span className="hidden shrink-0 text-[9px] font-bold text-black/45 sm:block">
                          {report.createdAt
                            ?.toDate?.()
                            .toLocaleDateString("ko-KR") || "방금 전"}
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0" />
                      </button>
                    ) : (
                <article
                  key={report.id}
                  className={`mb-4 inline-block w-full min-w-0 break-inside-avoid overflow-hidden rounded-sm align-top shadow-[0_2px_8px_rgba(0,0,0,0.18)] transition ${
                    report.status === "resolved" ? "ring-2 ring-white/80" : ""
                  }`}
                  style={{
                    backgroundColor:
                      report.cardColor || cardColorForId(report.id),
                  }}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="rounded-full bg-white/35 px-2.5 py-1 text-[9px] font-black text-black/55">
                          {reportCategories.includes(
                            report.category as BugReportCategory
                          )
                            ? report.category
                            : "버그"}
                        </span>
                        <span
                          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-black ${
                            normalizeReportStatus(report.status) === "resolved"
                              ? "bg-[#171714] text-white"
                              : normalizeReportStatus(report.status) ===
                                  "in_progress"
                                ? "bg-[#ffd24d] text-[#171714]"
                                : "bg-white/35 text-black/55"
                          }`}
                        >
                          {normalizeReportStatus(report.status) ===
                            "resolved" && <Check className="h-3 w-3" />}
                          {
                            reportStatuses.find(
                              (status) =>
                                status.value ===
                                normalizeReportStatus(report.status)
                            )?.label
                          }
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {activeStatus === "resolved" && (
                          <button
                            type="button"
                            onClick={() => setExpandedResolvedReportId("")}
                            aria-label="완료된 제보 접기"
                            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-black/8 text-black/45 transition hover:bg-black hover:text-white"
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <span className="text-[9px] font-bold text-black/45">
                          {report.createdAt
                            ?.toDate?.()
                            .toLocaleDateString("ko-KR") || "방금 전"}
                        </span>
                        {isSiteAdmin && (
                          <select
                            value={normalizeReportStatus(report.status)}
                            onChange={(event) =>
                              void changeReportStatus(
                                report,
                                event.target.value as BugReportStatus
                              )
                            }
                            disabled={updatingStatusReportId === report.id}
                            aria-label="제보 수정 상태"
                            className="h-7 max-w-[76px] cursor-pointer rounded-full border-0 bg-white/50 px-2 text-[9px] font-black text-[#171714] outline-none disabled:cursor-wait disabled:opacity-50"
                          >
                            {reportStatuses.map((status) => (
                              <option key={status.value} value={status.value}>
                                {status.label}
                              </option>
                            ))}
                          </select>
                        )}
                        {report.uid === user?.uid && (
                          <>
                            <button
                              type="button"
                              onClick={() => openReportImagePicker(report)}
                              disabled={uploadingReportId === report.id}
                              aria-label="제보 사진 추가"
                              title={`사진 추가 (${reportImageUrls(report).length}/${MAX_REPORT_IMAGES})`}
                              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-black/8 text-black/45 transition hover:bg-black hover:text-white disabled:cursor-wait disabled:opacity-50"
                            >
                              <ImagePlus className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => startEditing(report)}
                              aria-label="제보 편집"
                              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-black/8 text-black/45 transition hover:bg-black hover:text-white"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                        {report.uid === user?.uid && (
                          <button
                            type="button"
                            onClick={() => setPendingDeleteReportId(report.id)}
                            disabled={Boolean(deletingReportId)}
                            aria-label="내 제보 삭제"
                            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-black/8 text-black/45 transition hover:bg-red-500 hover:text-white disabled:cursor-wait disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    {pendingDeleteReportId === report.id && (
                      <div
                        role="alertdialog"
                        aria-label="제보 삭제 확인"
                        className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#171714] px-3 py-2"
                      >
                        <span className="text-[10px] font-black leading-4 text-white">
                          이 제보를 삭제할까요? 되돌릴 수 없어요.
                        </span>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPendingDeleteReportId("")}
                            className="cursor-pointer rounded-full bg-white/25 px-2.5 py-1 text-[10px] font-black text-white transition hover:bg-white/40"
                          >
                            취소
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(report)}
                            disabled={Boolean(deletingReportId)}
                            className="cursor-pointer rounded-full bg-red-500 px-2.5 py-1 text-[10px] font-black text-white transition hover:bg-red-600 disabled:cursor-wait disabled:opacity-50"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    )}
                    {report.title && (
                      <h2 className="mt-3 whitespace-pre-wrap text-base font-black leading-snug">
                        {report.title}
                      </h2>
                    )}
                    {editingReportId === report.id ? (
                      <div className="mt-3">
                        <div className="mb-2 flex flex-wrap gap-1.5">
                          {reportCategories.map((category) => (
                            <button
                              key={category}
                              type="button"
                              onClick={() => setEditingCategory(category)}
                              className={`cursor-pointer rounded-full px-2.5 py-1 text-[9px] font-black transition ${
                                editingCategory === category
                                  ? "bg-[#171714] text-white"
                                  : "bg-white/35 text-black/55 hover:bg-white/60"
                              }`}
                            >
                              {category}
                            </button>
                          ))}
                        </div>
                        <textarea
                          autoFocus
                          value={editingDescription}
                          onChange={(event) =>
                            setEditingDescription(event.target.value)
                          }
                          maxLength={2000}
                          rows={8}
                          className="min-h-40 w-full resize-y border border-black/20 bg-white/35 p-3 text-xs font-semibold leading-5 outline-none focus:border-black/50"
                        />
                      </div>
                    ) : (
                      <p className="mt-2 whitespace-pre-wrap text-xs font-semibold leading-5 text-black/75">
                        {report.description}
                      </p>
                    )}
                    {report.reproductionSteps && (
                      <div className="mt-3 border-t border-black/10 pt-3">
                        <p className="text-[9px] font-black text-black/45">
                          재현 방법
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-[11px] font-semibold leading-5 text-black/70">
                          {report.reproductionSteps}
                        </p>
                      </div>
                    )}
                  </div>
                  <BugReportGallery
                    images={reportImageUrls(report)}
                    // Only while the card is in edit mode: otherwise a delete
                    // button sits over every screenshot during normal reading.
                    canEdit={editingReportId === report.id}
                    busy={uploadingReportId === report.id}
                    onRemove={(imageUrl) =>
                      void removeReportImage(report, imageUrl)
                    }
                  />
                  {/* Sits below the screenshots as a full-width bar, matching the
                      card's own footer — placed next to the textarea it read as a
                      stray pair of buttons floating mid-card. */}
                  {editingReportId === report.id && (
                    <div className="flex items-center justify-end gap-2 border-t border-black/10 bg-white/20 px-4 py-3">
                      <button
                        type="button"
                        onClick={cancelEditing}
                        disabled={Boolean(savingReportId)}
                        className="flex h-8 cursor-pointer items-center gap-1 rounded-full bg-black/10 px-3 text-[10px] font-black disabled:opacity-50"
                      >
                        <X className="h-3 w-3" /> 취소
                      </button>
                      <button
                        type="button"
                        onClick={() => void saveEditing(report.id)}
                        disabled={
                          !editingDescription.trim() || Boolean(savingReportId)
                        }
                        className="flex h-8 cursor-pointer items-center gap-1 rounded-full bg-[#171714] px-3 text-[10px] font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Check className="h-3 w-3" /> 저장
                      </button>
                    </div>
                  )}
                  <BugReportReplies
                    reportId={report.id}
                    userId={user?.uid}
                    authorName={reporterNickname}
                  />
                  <footer className="flex items-center justify-between gap-2 border-t border-black/10 px-4 py-3 text-[10px] font-bold text-black/55">
                    <span className="truncate">
                      {report.uid === user?.uid
                        ? reporterNickname
                        : report.reporterName || "베타테스터"}
                    </span>
                    <span className="shrink-0">#{report.id.slice(0, 6)}</span>
                  </footer>
                </article>
                    )
                  )}
                </div>
              </section>
            </section>
          )}
      </main>

      {!isComposerOpen && (
        <button
          type="button"
          onClick={openComposer}
          aria-label="오류 제보 작성"
          className="fixed bottom-6 right-6 z-30 flex h-16 w-16 cursor-pointer items-center justify-center rounded-full bg-[#ff4d9a] text-white shadow-[0_8px_24px_rgba(0,0,0,0.28)] transition hover:scale-105 sm:h-18 sm:w-18"
        >
          <Plus className="h-8 w-8" />
        </button>
      )}

      <input
        ref={reportImageInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={appendReportImages}
        className="hidden"
      />

      {submitted && (
        <div className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#171714] px-5 py-3 text-xs font-black text-white shadow-xl">
          오류 제보가 등록됐어요!
        </div>
      )}
    </div>
  );
};

export default BugReportPage;
