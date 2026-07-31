import React, { useEffect, useMemo, useState } from 'react';
import { useStore, type DMAutomationRule } from '../../store/useStore';
import { listInstagramMedia, type InstagramMediaItem } from '../../services/instagramService';
import { 
  X, 
  ChevronLeft, 
  Check, 
  Plus, 
  Info, 
  Sparkles,
  Trash2
} from 'lucide-react';
import clsx from 'clsx';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  editingRule?: DMAutomationRule | null;
}

// Mock Instagram Posts for Selection Grid (Step 1)
const mockPosts = [
  { id: 'post-1', title: '해외 출장이라 쓰고 관광데이트라 읽는다', image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&auto=format&fit=crop&q=80', gradient: 'from-orange-400 to-rose-500' },
  { id: 'post-2', title: '괴짜 철학관 다녀온 후기(완)', image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=300&auto=format&fit=crop&q=80', gradient: 'from-emerald-600 to-teal-700' },
  { id: 'post-3', title: '좋소 IT 회사에 CC가 없는 이유', image: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=300&auto=format&fit=crop&q=80', gradient: 'from-blue-600 to-cyan-600' },
  { id: 'post-4', title: '괴짜 철학관 다녀온 후기(2)', image: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=300&auto=format&fit=crop&q=80', gradient: 'from-pink-500 to-rose-600' },
  { id: 'post-5', title: '집구석에만 있으니 님 심심해서', image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&auto=format&fit=crop&q=80', gradient: 'from-amber-500 to-orange-600' },
  { id: 'post-6', title: '프로젝트 폭망과 우울증', image: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=300&auto=format&fit=crop&q=80', gradient: 'from-amber-400 to-orange-600' },
  { id: 'post-7', title: '왜 힘든 일은 한번에 일어날까', image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=300&auto=format&fit=crop&q=80', gradient: 'from-slate-700 to-slate-900' },
  { id: 'post-8', title: '무능한 대표가 폭주하면 생기는 일', image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&auto=format&fit=crop&q=80', gradient: 'from-lime-300 to-emerald-500' },
  { id: 'post-9', title: '능력없는 직원이 팀장 되면 벌어지는 일', image: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=300&auto=format&fit=crop&q=80', gradient: 'from-rose-500 to-pink-700' }
];

export const InstagramDmRuleCreateWizardModal: React.FC<Props> = ({
  isOpen,
  onClose,
  editingRule = null,
}) => {
  const state = useStore();
  const [posts, setPosts] = useState<InstagramMediaItem[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsError, setPostsError] = useState('');

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Step 1: Selected Post
  const [selectedPostId, setSelectedPostId] = useState<string>('');
  const [postType, setPostType] = useState<'uploaded' | 'upcoming'>('uploaded');

  // Step 2: Keywords
  const [keywordMode, setKeywordMode] = useState<'all' | 'specific'>('specific');
  const [keywordInput, setKeywordInput] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);

  // Step 3: DM Message & Buttons
  const [message, setMessage] = useState('');
  const [buttonCount, setButtonCount] = useState<0 | 1 | 2 | 3>(0);

  // Step 4: Button Links Config (up to 3 buttons)
  const [buttons, setButtons] = useState<Array<{ name: string; url: string }>>([
    { name: '', url: '' },
    { name: '', url: '' },
    { name: '', url: '' }
  ]);
  const [currentButtonIndex, setCurrentButtonIndex] = useState<number>(0);
  const [urlMode, setUrlMode] = useState<'new' | 'blocks'>('new');
  const [buttonUrlError, setButtonUrlError] = useState('');

  // Step 5: Comment Reply Option
  const [wantCommentReply, setWantCommentReply] = useState<'no' | 'yes'>('no');
  const [commentReplies, setCommentReplies] = useState<string[]>([]);
  const [newReplyInput, setNewReplyInput] = useState('');

  const availableLinks = useMemo(() => {
    const result: Array<{id: string; title: string; url: string}> = [];
    const visit = (links: typeof state.customLinks) => {
      links.forEach((link) => {
        if (link.url?.trim()) result.push({id: link.id, title: link.title || link.url, url: link.url});
        if (link.links?.length) visit(link.links);
      });
    };
    visit(state.customLinks);
    return result;
  }, [state.customLinks]);

  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setPostType(editingRule?.targetMode === 'next' ? 'upcoming' : 'uploaded');
    setSelectedPostId(editingRule?.postIds?.[0] || '');
    const isAllKeywords = editingRule?.keyword === '*' || editingRule?.keyword === '모두';
    setKeywordMode(isAllKeywords ? 'all' : 'specific');
    setKeywords(editingRule ? (editingRule.keywords?.filter((value) => value !== '*') || (isAllKeywords ? [] : [editingRule.keyword])) : []);
    setKeywordInput('');
    setMessage(editingRule?.responseMessage || '');
    const savedButtons = editingRule?.buttons?.length
      ? editingRule.buttons.map((button) => ({name: button.label, url: button.url}))
      : editingRule?.targetLinkUrl
        ? [{name: '링크 보기', url: editingRule.targetLinkUrl}]
        : [];
    setButtonCount(Math.min(savedButtons.length, 3) as 0 | 1 | 2 | 3);
    setButtons([0, 1, 2].map((index) => savedButtons[index] || {name: '', url: ''}));
    setCurrentButtonIndex(0);
    setUrlMode('new');
    setButtonUrlError('');
    const savedReplies = editingRule?.commentReplies || [];
    setWantCommentReply(savedReplies.length ? 'yes' : 'no');
    setCommentReplies(savedReplies);
    setNewReplyInput('');
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    let active = true;
    setPostsLoading(true);
    setPostsError('');
    void listInstagramMedia()
      .then((media) => { if (active) setPosts(media); })
      .catch((error) => {
        if (!active) return;
        console.error('Failed to load Instagram media', error);
        setPostsError('게시물을 불러오지 못했습니다. 계정 권한을 확인한 뒤 다시 시도해주세요.');
      })
      .finally(() => { if (active) setPostsLoading(false); });
    return () => {
      active = false;
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, editingRule]);

  if (!isOpen) return null;

  const handleAddKeyword = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    if (keywordInput.trim() && !keywords.includes(keywordInput.trim())) {
      setKeywords([...keywords, keywordInput.trim()]);
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (kw: string) => {
    setKeywords(keywords.filter(k => k !== kw));
  };

  const handleKeywordStepNext = () => {
    const pendingKeyword = keywordInput.trim();
    if (keywordMode === 'specific' && pendingKeyword && !keywords.includes(pendingKeyword)) {
      setKeywords([...keywords, pendingKeyword]);
      setKeywordInput('');
    }
    setStep(3);
  };

  const handleUpdateButtonName = (index: number, name: string) => {
    const next = [...buttons];
    next[index] = { ...next[index], name };
    setButtons(next);
  };

  const handleUpdateButtonUrl = (index: number, url: string) => {
    const next = [...buttons];
    next[index] = { ...next[index], url };
    setButtons(next);
    setButtonUrlError('');
  };

  const handleStep3Next = () => {
    if (buttonCount === 0) {
      setStep(5);
    } else {
      setCurrentButtonIndex(0);
      setStep(4);
    }
  };

  const handleStep4LinkNext = () => {
    const currentButton = buttons[currentButtonIndex];
    if (!currentButton?.name.trim()) {
      setButtonUrlError('버튼 이름을 입력해주세요.');
      return;
    }
    const rawUrl = currentButton.url.trim();
    if (!rawUrl) {
      setButtonUrlError('연결할 URL을 입력해주세요.');
      return;
    }
    const normalizedUrl = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    try {
      const parsedUrl = new URL(normalizedUrl);
      if (!parsedUrl.hostname.includes('.') || !['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('invalid url');
      }
    } catch {
      setButtonUrlError('올바른 주소를 입력해주세요. 예: naver.com 또는 https://naver.com');
      return;
    }
    handleUpdateButtonUrl(currentButtonIndex, normalizedUrl);
    if (currentButtonIndex + 1 < buttonCount) {
      setCurrentButtonIndex(currentButtonIndex + 1);
    } else {
      setStep(5);
    }
  };

  const handleSaveAutomationRule = () => {
    const mainKeyword = keywordMode === 'all' ? '*' : keywords[0] || '';
    const mainButtonUrl = buttons[0]?.url?.trim() || '';
    const selectedPost = posts.find((post) => post.id === selectedPostId);
    if (buttonCount > 0 && !mainButtonUrl) {
      alert('버튼으로 연결할 주소를 입력해주세요.');
      setStep(4);
      setCurrentButtonIndex(0);
      return;
    }

    const newRule: DMAutomationRule = {
      id: editingRule?.id || `rule-${Date.now()}`,
      keyword: mainKeyword,
      keywords: keywordMode === 'all' ? ['*'] : keywords,
      responseMessage: message || '안녕하세요! 요청하신 정보 링크입니다.',
      targetLinkUrl: mainButtonUrl,
      postIds: postType === 'uploaded' && selectedPostId ? [selectedPostId] : [],
      applyToAllPosts: false,
      targetMode: postType === 'upcoming' ? 'next' : 'selected',
      excludedPostIds: postType === 'upcoming' ? posts.map((post) => post.id) : [],
      postThumbnailUrl: postType === 'uploaded'
        ? (selectedPost?.thumbnailUrl || selectedPost?.mediaUrl || editingRule?.postThumbnailUrl || '')
        : '',
      postCaption: postType === 'uploaded'
        ? (selectedPost?.caption || editingRule?.postCaption || '')
        : '',
      buttons: buttons.slice(0, buttonCount).map((button) => ({
        label: button.name.trim(),
        url: button.url.trim(),
      })),
      commentReplies: wantCommentReply === 'yes' ? commentReplies : [],
      isActive: editingRule?.isActive ?? true
    };

    if (editingRule) {
      state.updateDMRule(editingRule.id, newRule);
      alert('DM 자동화가 수정되었습니다.');
    } else {
      state.addDMRule(newRule);
      alert('DM 자동화가 등록되었습니다.');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[250] flex items-center justify-center p-4 font-sans">
      <div className="bg-[#EDF2F7] rounded-3xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 border border-gray-200">
        
        {/* Header */}
        <div className="bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                if (step === 4 && currentButtonIndex > 0) {
                  setCurrentButtonIndex(currentButtonIndex - 1);
                } else if (step > 1) {
                  setStep((step - 1) as any);
                }
              }}
              className="p-1 text-gray-500 hover:text-black rounded-lg hover:bg-gray-100 transition cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h3 className="text-base font-extrabold text-gray-900">{editingRule ? 'DM 자동화 수정' : '자동화 만들기'}</h3>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Bar Header */}
        <div className="bg-white px-6 pb-4 border-b border-gray-100 shrink-0">
          <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden mb-2">
            <div 
              className="bg-black h-full transition-all duration-300" 
              style={{ width: `${(step / 5) * 100}%` }}
            />
          </div>
          <span className="text-xs font-bold text-gray-500">5단계 중 {step}단계</span>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#EDF2F7]">

          {/* =========================================================
             STEP 1 OF 5: Post Selection (Matching Screenshot 1)
             ========================================================= */}
          {step === 1 && (
            <div className="space-y-4">
              <h4 className="text-sm font-extrabold text-gray-900">
                어떤 게시물에 자동화를 적용할까요?
              </h4>

              {/* Radio Group */}
              <div className="space-y-2">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-gray-900">
                  <input
                    type="radio"
                    name="postType"
                    checked={postType === 'uploaded'}
                    onChange={() => setPostType('uploaded')}
                    className="w-4 h-4 text-black focus:ring-black"
                  />
                  <span className="flex items-center gap-1">
                    게시된 게시물 설정 <Info className="w-3.5 h-3.5 text-gray-400" />
                  </span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-gray-400">
                  <input
                    type="radio"
                    name="postType"
                    checked={postType === 'upcoming'}
                    onChange={() => {
                      setPostType('upcoming');
                      setSelectedPostId('');
                    }}
                    className="w-4 h-4 text-black focus:ring-black"
                  />
                  <span className={postType === 'upcoming' ? 'text-gray-900' : ''}>게시 예정 콘텐츠 미리 설정</span>
                </label>
              </div>

              {postType === 'upcoming' ? (
                <div className="rounded-2xl border-2 border-black bg-[#FFDA44] px-5 py-10 text-center shadow-sm">
                  <p className="text-2xl font-black text-black">NEXT</p>
                  <p className="mt-3 text-xs font-bold leading-relaxed text-gray-700">
                    지금 이후 가장 먼저 올리는 게시물에 이 자동화가 한 번 연결됩니다.
                  </p>
                </div>
              ) : (
                <>
                  {postsLoading && <div className="py-16 text-center text-xs font-bold text-gray-400">게시물을 불러오는 중...</div>}
                  {postsError && <div role="alert" className="p-4 rounded-2xl bg-red-50 text-red-700 text-xs font-bold">{postsError}</div>}
                  {!postsLoading && !postsError && posts.length === 0 && (
                    <div className="py-16 text-center text-xs font-bold text-gray-400">선택할 수 있는 게시물이 없습니다.</div>
                  )}
                  <div className="grid grid-cols-3 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
                {posts.map((post) => {
                  const isSelected = selectedPostId === post.id;
                  const imageUrl = post.thumbnailUrl || post.mediaUrl;
                  return (
                    <button
                      key={post.id}
                      onClick={() => setSelectedPostId(post.id)}
                      className={clsx(
                        "aspect-square rounded-2xl overflow-hidden relative border-2 transition-all cursor-pointer group shadow-2xs bg-gray-200",
                        isSelected ? "border-black ring-2 ring-black" : "border-transparent opacity-90 hover:opacity-100"
                      )}
                    >
                      <img 
                        src={imageUrl}
                        alt={post.caption || '인스타그램 게시물'}
                        className="w-full h-full object-cover relative z-0" 
                        onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-between p-2.5 z-10 text-left">
                        <div className="flex justify-end">
                          {isSelected && (
                            <div className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center shadow-md">
                              <Check className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] text-white font-extrabold line-clamp-2 leading-tight drop-shadow-sm">
                          {post.caption || '내용 없는 게시물'}
                        </span>
                      </div>
                    </button>
                  );
                })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* =========================================================
             STEP 2 OF 5: Keyword Settings (Matching Screenshot 2)
             ========================================================= */}
          {step === 2 && (
            <div className="space-y-5">
              <h4 className="text-sm font-extrabold text-gray-900">
                어떤 댓글에 DM을 보낼까요?
              </h4>

              {/* Radio Group */}
              <div className="space-y-3">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-gray-400">
                  <input
                    type="radio"
                    name="keywordMode"
                    checked={keywordMode === 'all'}
                    onChange={() => setKeywordMode('all')}
                    className="w-4 h-4 text-black focus:ring-black"
                  />
                  <span>모든 댓글</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-gray-900">
                  <input
                    type="radio"
                    name="keywordMode"
                    checked={keywordMode === 'specific'}
                    onChange={() => setKeywordMode('specific')}
                    className="w-4 h-4 text-black focus:ring-black"
                  />
                  <span>특정 키워드가 포함된 댓글만 전송 (예: 구매, 링크)</span>
                </label>
              </div>

              {/* Keywords Tag Input */}
              {keywordMode === 'specific' && (
                <div className="space-y-2 pt-2 text-left">
                  <label className="text-xs font-bold text-gray-700">키워드<span className="text-red-500">*</span></label>
                  <div className="bg-white p-3 rounded-2xl border border-gray-300 min-h-[60px] flex flex-wrap gap-2 items-center shadow-2xs">
                    {keywords.map((kw) => (
                      <span 
                        key={kw} 
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-900 text-xs font-bold rounded-xl border border-gray-200 shadow-2xs"
                      >
                        {kw}
                        <button 
                          onClick={() => handleRemoveKeyword(kw)}
                          className="hover:text-red-500 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}

                    <input
                      type="text"
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      onKeyDown={handleAddKeyword}
                      placeholder={keywords.length === 0 ? "키워드를 입력하세요" : ""}
                      className="flex-1 bg-transparent border-none text-xs font-bold focus:outline-none min-w-[100px]"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =========================================================
             STEP 3 OF 5: Write DM Message & Button Count (Matching Screenshot 3)
             ========================================================= */}
          {step === 3 && (
            <div className="space-y-5">
              <h4 className="text-sm font-extrabold text-gray-900 flex items-center gap-1">
                <span>인스타그램으로 보낼 메시지를 작성해 주세요.</span>
                <Info className="w-4 h-4 text-gray-400" />
              </h4>

              {/* Live Preview Container (Matching Screenshot 3) */}
              <div className="bg-white p-6 rounded-3xl border border-gray-200 flex items-end gap-3 shadow-2xs">
                <div className="w-10 h-10 rounded-full overflow-hidden border border-amber-300 shrink-0 bg-amber-100 flex items-center justify-center">
                  <img 
                    src={state.profile.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"} 
                    alt="프로필 이미지"
                    className="w-full h-full object-cover" 
                  />
                </div>

                <div className="bg-[#E5E7EB] p-4 rounded-2xl rounded-bl-xs text-xs font-semibold text-gray-900 shadow-2xs flex-1 space-y-2">
                  <p>{message || '보낼 메시지를 입력하세요'}</p>

                  {/* Render Button Slots based on buttonCount */}
                  {buttonCount > 0 && (
                    <div className="space-y-1.5 pt-1">
                      {Array.from({ length: buttonCount }).map((_, idx) => (
                        <div 
                          key={idx}
                          className="bg-white py-2.5 px-4 rounded-xl text-center text-xs font-bold text-gray-400 border border-gray-100 shadow-2xs truncate"
                        >
                          {buttons[idx]?.name || '버튼 이름을 입력하세요'}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Form Controls */}
              <div className="space-y-4 text-left">
                {/* Message Textarea */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700">메시지<span className="text-red-500">*</span></label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="보낼 메시지를 입력하세요"
                    rows={3}
                    className="w-full p-4 rounded-2xl border border-gray-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-black bg-white shadow-2xs"
                  />
                </div>

                {/* Message buttons selector */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-700">메시지 버튼 수<span className="text-red-500">*</span></label>
                  <div className="grid grid-cols-4 gap-2">
                    {[0, 1, 2, 3].map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setButtonCount(count as any)}
                        className={clsx(
                          "py-3 rounded-2xl font-extrabold text-xs transition cursor-pointer border shadow-2xs",
                          buttonCount === count 
                            ? "bg-black text-white border-black" 
                            : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                        )}
                      >
                        {count === 0 ? '없음' : `${count}개`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
             STEP 4 OF 5: Button Link Setup (Matching Screenshot 4)
             ========================================================= */}
          {step === 4 && (
            <div className="space-y-5">
              <h4 className="text-sm font-extrabold text-gray-900">
                {currentButtonIndex + 1}번 버튼 링크 설정
              </h4>

              {/* Live Preview Container (Matching Screenshot 4) */}
              <div className="bg-white p-6 rounded-3xl border border-gray-200 flex items-end gap-3 shadow-2xs">
                <div className="w-10 h-10 rounded-full overflow-hidden border border-amber-300 shrink-0 bg-amber-100 flex items-center justify-center">
                  <img 
                    src={state.profile.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"} 
                    alt="프로필 이미지"
                    className="w-full h-full object-cover" 
                  />
                </div>

                <div className="bg-[#E5E7EB] p-4 rounded-2xl rounded-bl-xs text-xs font-semibold text-gray-900 shadow-2xs flex-1 space-y-2">
                  <p>{message || '하이융ㅋ'}</p>

                  <div className="space-y-1.5 pt-1">
                    {Array.from({ length: buttonCount }).map((_, idx) => (
                      <div 
                        key={idx}
                        className={clsx(
                          "py-2.5 px-4 rounded-xl text-center text-xs font-bold border shadow-2xs truncate",
                          idx === currentButtonIndex 
                            ? "bg-white text-gray-900 border-black" 
                            : "bg-white/80 text-gray-400 border-gray-100"
                        )}
                      >
                        {buttons[idx]?.name || '버튼 이름을 입력하세요'}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Form Controls */}
              <div className="space-y-4 text-left">
                {/* Button Message Name */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700">버튼 이름<span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={buttons[currentButtonIndex]?.name || ''}
                    onChange={(e) => handleUpdateButtonName(currentButtonIndex, e.target.value)}
                    placeholder="버튼 이름을 입력하세요"
                    className="w-full p-3.5 rounded-2xl border border-gray-300 text-xs font-extrabold focus:outline-none focus:ring-2 focus:ring-black bg-white shadow-2xs"
                  />
                </div>

                {/* URL Options */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-700">URL<span className="text-red-500">*</span></label>
                  
                  {/* Segmented Option Selector */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setUrlMode('new')}
                      className={clsx(
                        "py-3 rounded-2xl text-xs font-extrabold transition cursor-pointer border shadow-2xs",
                        urlMode === 'new' ? "bg-black text-white border-black" : "bg-white text-gray-700 border-gray-200"
                      )}
                    >
                      새 링크 입력
                    </button>

                    <button
                      type="button"
                      onClick={() => setUrlMode('blocks')}
                      className={clsx(
                        "py-3 rounded-2xl text-xs font-extrabold transition cursor-pointer border shadow-2xs",
                        urlMode === 'blocks' ? "bg-black text-white border-black" : "bg-white text-gray-700 border-gray-200"
                      )}
                    >
                      내 링크 블록에서 선택
                    </button>
                  </div>

                  {urlMode === 'new' ? (
                    <input
                      type="url"
                      value={buttons[currentButtonIndex]?.url || ''}
                      onChange={(e) => handleUpdateButtonUrl(currentButtonIndex, e.target.value)}
                      placeholder="https://example.com"
                      className="w-full p-3.5 rounded-2xl border border-gray-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-black bg-white shadow-2xs"
                    />
                  ) : (
                    <select
                      value={buttons[currentButtonIndex]?.url || ''}
                      onChange={(e) => handleUpdateButtonUrl(currentButtonIndex, e.target.value)}
                      className="w-full p-3.5 rounded-2xl border border-gray-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-black bg-white shadow-2xs"
                    >
                      <option value="">연결할 링크를 선택하세요</option>
                      {availableLinks.map((link) => (
                        <option key={link.id} value={link.url}>{link.title}</option>
                      ))}
                    </select>
                  )}
                  {buttonUrlError ? (
                    <p role="alert" className="text-[11px] font-bold text-red-600">{buttonUrlError}</p>
                  ) : urlMode === 'new' && buttons[currentButtonIndex]?.url && !/^https?:\/\//i.test(buttons[currentButtonIndex].url) ? (
                    <p className="text-[11px] font-semibold text-gray-500">완료할 때 https://가 자동으로 추가됩니다.</p>
                  ) : (
                    <p className="text-[11px] font-semibold text-gray-500">naver.com, www.naver.com처럼 입력해도 됩니다.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
             STEP 5 OF 5: Comment Reply Option (Matching Screenshot 5)
             ========================================================= */}
          {step === 5 && (
            <div className="space-y-6 pt-4 text-left">
              <h4 className="text-base font-extrabold text-gray-900">
                메시지를 보낸 댓글에 자동 답글도 남길까요?
              </h4>

              {/* Radio Options */}
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer text-xs font-bold text-gray-900">
                  <input
                    type="radio"
                    name="wantCommentReply"
                    checked={wantCommentReply === 'no'}
                    onChange={() => setWantCommentReply('no')}
                    className="w-4 h-4 text-black focus:ring-black"
                  />
                  <span>답글을 남기지 않아요</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer text-xs font-bold text-gray-900">
                  <input
                    type="radio"
                    name="wantCommentReply"
                    checked={wantCommentReply === 'yes'}
                    onChange={() => setWantCommentReply('yes')}
                    className="w-4 h-4 text-black focus:ring-black"
                  />
                  <span>자동 답글을 남길게요</span>
                </label>
              </div>

              {/* Additional Comment Replies if Yes */}
              {wantCommentReply === 'yes' && (
                <div className="space-y-3 pt-2">
                  <p className="text-xs text-gray-500 font-medium">
                    자연스럽게 번갈아 사용할 답글을 등록하세요.
                  </p>
                  <div className="space-y-2">
                    {commentReplies.map((reply, idx) => (
                      <div key={idx} className="p-3 bg-white rounded-2xl border border-gray-200 text-xs font-bold text-gray-800 flex items-center justify-between gap-3 shadow-2xs">
                        <span className="min-w-0 flex-1 break-words">💬 {reply}</span>
                        <button 
                          type="button"
                          onClick={() => setCommentReplies(commentReplies.filter((_, i) => i !== idx))}
                          className="shrink-0 inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-red-600 hover:bg-red-50 cursor-pointer"
                          aria-label={`${reply} 삭제`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>삭제</span>
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newReplyInput}
                      onChange={(e) => setNewReplyInput(e.target.value)}
                      placeholder="답글 추가 (예: DM을 확인해 주세요! ❤️)"
                      className="flex-1 px-4 py-2.5 rounded-2xl border border-gray-300 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-black"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newReplyInput.trim()) {
                          setCommentReplies([...commentReplies, newReplyInput.trim()]);
                          setNewReplyInput('');
                        }
                      }}
                      className="px-4 py-2.5 bg-black hover:bg-gray-800 text-white rounded-2xl text-xs font-bold transition cursor-pointer"
                    >
                      추가
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer Action Button */}
        <div className="p-6 bg-white border-t border-gray-200 shrink-0">
          {step === 1 && (
            <button
              onClick={() => setStep(2)}
              disabled={postType === 'uploaded' ? (!selectedPostId || postsLoading) : postsLoading}
              className="w-full py-4 bg-black hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-extrabold text-sm rounded-2xl shadow-lg transition cursor-pointer"
            >
              다음
            </button>
          )}

          {step === 2 && (
            <button
              onClick={handleKeywordStepNext}
              disabled={keywordMode === 'specific' && keywords.length === 0 && !keywordInput.trim()}
              className="w-full py-4 bg-black hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-extrabold text-sm rounded-2xl shadow-lg transition cursor-pointer"
            >
              다음
            </button>
          )}

          {step === 3 && (
            <button
              onClick={handleStep3Next}
              disabled={!message.trim()}
              className="w-full py-4 bg-black hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-extrabold text-sm rounded-2xl shadow-lg transition cursor-pointer"
            >
              다음
            </button>
          )}

          {step === 4 && (
            <button
              onClick={handleStep4LinkNext}
              disabled={!buttons[currentButtonIndex]?.name.trim() || !buttons[currentButtonIndex]?.url.trim()}
              className="w-full py-4 bg-black hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-extrabold text-sm rounded-2xl shadow-lg transition cursor-pointer"
            >
              {currentButtonIndex + 1}/{buttonCount} 링크 설정 완료
            </button>
          )}

          {step === 5 && (
            <button
              onClick={handleSaveAutomationRule}
              disabled={wantCommentReply === 'yes' && commentReplies.length === 0}
              className="w-full py-4 bg-black hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-extrabold text-sm rounded-2xl shadow-lg transition cursor-pointer"
            >
              {editingRule ? '수정 완료' : '완료하고 저장'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
