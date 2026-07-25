import React, { useState } from 'react';
import { useStore, type DMAutomationRule, type TeamMember } from '../../store/useStore';
import { 
  Bot, 
  Users, 
  MessageSquare, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Mail, 
  Phone, 
  Key, 
  Zap, 
  Sparkles,
  UserPlus,
  Send,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
  HelpCircle,
  ChevronRight
} from 'lucide-react';
import { FaInstagram } from 'react-icons/fa';
import { InstagramDmWizardModal } from './InstagramDmWizardModal';
import clsx from 'clsx';

const AutomationEditor = () => {
  const state = useStore();

  // Wizard Modal State
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  // Meta Instagram Token State
  const [metaToken, setMetaToken] = useState(state.metaAccessToken || '');

  // DM Automation State
  const [newKeyword, setNewKeyword] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newTargetUrl, setNewTargetUrl] = useState('');
  const [isDmModalOpen, setIsDmModalOpen] = useState(false);

  // Team Member State
  const [newTeamEmail, setNewTeamEmail] = useState('');
  const [newTeamRole, setNewTeamRole] = useState<'admin' | 'editor' | 'viewer'>('editor');

  // Alimtalk State
  const [alimtalk, setAlimtalk] = useState(state.alimtalkSettings || {
    apiKey: '',
    apiSecret: '',
    senderPhone: '',
    templateCode: '',
    isEnabled: false
  });

  const handleSaveMetaToken = () => {
    state.setMetaAccessToken(metaToken.trim());
    alert('인스타그램 Meta Graph API Access Token이 저장되었습니다.');
  };

  const handleAddDMRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyword.trim() || !newMessage.trim()) return;

    const rule: DMAutomationRule = {
      id: `rule-${Date.now()}`,
      keyword: newKeyword.trim(),
      responseMessage: newMessage.trim(),
      targetLinkUrl: newTargetUrl.trim() || `https://linkzip.kr/${state.profile.username || 'preview'}`,
      isActive: true
    };

    state.addDMRule(rule);
    setNewKeyword('');
    setNewMessage('');
    setNewTargetUrl('');
    setIsDmModalOpen(false);
  };

  const handleInviteTeamMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamEmail.trim()) return;

    const member: TeamMember = {
      id: `member-${Date.now()}`,
      email: newTeamEmail.trim(),
      role: newTeamRole,
      status: 'pending',
      invitedAt: new Date().toISOString().split('T')[0]
    };

    state.addTeamMember(member);
    setNewTeamEmail('');
    alert(`${newTeamEmail} 님에게 ${newTeamRole.toUpperCase()} 권한 초대 메일을 발송했습니다.`);
  };

  const handleSaveAlimtalk = () => {
    state.setAlimtalkSettings(alimtalk);
    alert('카카오 알림톡 설정이 저장되었습니다.');
  };

  return (
    <div className="space-y-8 pb-20 font-sans">
      
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-bold mb-2">
          <Zap className="w-3.5 h-3.5" /> Growth & Marketing
        </div>
        <h2 className="text-xl font-bold text-gray-900 tracking-tight">Growth & Automation (자동화 및 성장)</h2>
        <p className="text-xs text-gray-500 font-medium mt-1">
          인스타그램 DM 자동화, 팀원 초대, 카카오 알림톡 연동을 한곳에서 관리하세요.
        </p>
      </div>

      {/* 1. Instagram DM Automation Card */}
      <div 
        onClick={() => setIsWizardOpen(true)}
        className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 hover:border-purple-300 hover:shadow-md transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-500 via-pink-500 to-amber-400 text-white flex items-center justify-center shadow-md shrink-0 group-hover:scale-105 transition-transform">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-gray-900 group-hover:text-purple-600 transition-colors">
                무제한 인스타그램 DM 자동화
              </h3>
              {state.instagramAccount ? (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {state.instagramAccount} 연결됨
                </span>
              ) : (
                <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full">
                  미연동
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              팔로워 댓글/DM 키워드 감지 시 자동 반응 메시지 발송 &amp; 연동 관리
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsWizardOpen(true);
            }}
            className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-2xl text-xs font-extrabold transition flex items-center gap-2 shadow-md group-hover:shadow-lg cursor-pointer"
          >
            <FaInstagram className="w-4 h-4" />
            <span>DM 자동화 대시보드 바로가기</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Team Collaboration Card */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">팀 멤버 초대 & 협업 (Team Members)</h3>
            <p className="text-xs text-gray-500">함께 페이지를 관리할 팀원을 이메일로 초대하세요.</p>
          </div>
        </div>

        {/* Invite Form */}
        <form onSubmit={handleInviteTeamMember} className="flex gap-2">
          <input
            type="email"
            value={newTeamEmail}
            onChange={(e) => setNewTeamEmail(e.target.value)}
            placeholder="team.member@company.com"
            className="flex-1 px-4 py-3 rounded-2xl border border-gray-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-black bg-gray-50 focus:bg-white"
          />
          <select
            value={newTeamRole}
            onChange={(e) => setNewTeamRole(e.target.value as any)}
            className="px-4 py-3 rounded-2xl border border-gray-200 text-xs font-bold bg-gray-50 focus:bg-white cursor-pointer"
          >
            <option value="admin">Admin (전체 권한)</option>
            <option value="editor">Editor (편집 권한)</option>
            <option value="viewer">Viewer (조회 권한)</option>
          </select>
          <button
            type="submit"
            className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl shadow-md transition flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            초대 발송
          </button>
        </form>

        {/* Team Members List Table */}
        <div className="space-y-2">
          {state.teamMembers.length === 0 ? (
            <div className="p-4 rounded-2xl bg-gray-50 text-center text-xs text-gray-400 font-medium">
              아직 등록된 팀원이 없습니다. 위 양식에서 팀원을 초대해보세요.
            </div>
          ) : (
            state.teamMembers.map((member) => (
              <div key={member.id} className="p-4 rounded-2xl border border-gray-100 bg-gray-50/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-xs text-gray-700">
                    {member.email[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900">{member.email}</p>
                    <span className="text-[10px] text-gray-400 font-medium">초대일: {member.invitedAt}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold uppercase">
                    {member.role}
                  </span>
                  <button
                    onClick={() => state.removeTeamMember(member.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 3. Kakao Alimtalk & Email Integration Card */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center font-bold shadow-md">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">카카오 알림톡 & 이메일 알림 연동</h3>
            <p className="text-xs text-gray-500">솔라피 / 알리고 연동을 통해 신규 리드/구독 발생 시 카카오 알림톡을 발송합니다.</p>
          </div>
        </div>

        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">API Key (솔라피/알리고)</label>
              <input
                type="text"
                value={alimtalk.apiKey}
                onChange={(e) => setAlimtalk({ ...alimtalk, apiKey: e.target.value })}
                placeholder="SOLAPI_API_KEY"
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-black bg-gray-50 focus:bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">API Secret</label>
              <input
                type="password"
                value={alimtalk.apiSecret}
                onChange={(e) => setAlimtalk({ ...alimtalk, apiSecret: e.target.value })}
                placeholder="••••••••••••••••"
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-black bg-gray-50 focus:bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">발신자 전화번호</label>
              <input
                type="text"
                value={alimtalk.senderPhone}
                onChange={(e) => setAlimtalk({ ...alimtalk, senderPhone: e.target.value })}
                placeholder="01012345678"
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-black bg-gray-50 focus:bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">알림톡 템플릿 코드</label>
              <input
                type="text"
                value={alimtalk.templateCode}
                onChange={(e) => setAlimtalk({ ...alimtalk, templateCode: e.target.value })}
                placeholder="KA01TP2304..."
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-black bg-gray-50 focus:bg-white"
              />
            </div>
          </div>

          <button
            onClick={handleSaveAlimtalk}
            className="w-full py-3 bg-amber-400 hover:bg-amber-500 text-amber-950 text-xs font-bold rounded-2xl transition shadow-md cursor-pointer"
          >
            카카오 알림톡 설정 저장하기
          </button>
        </div>
      </div>

      {/* Instagram 5-Step DM Onboarding Wizard Modal */}
      <InstagramDmWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onOpenRuleModal={() => setIsDmModalOpen(true)}
      />

      {/* DM Rule Creation Modal */}
      {isDmModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 font-sans">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">새 DM 자동화 규칙 생성</h3>
                <p className="text-xs text-gray-500">인스타 댓글/DM 감지 키워드 및 답장 문구 입력</p>
              </div>
            </div>

            <form onSubmit={handleAddDMRule} className="space-y-4 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">감지 키워드 (Keyword)</label>
                <input
                  type="text"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  placeholder="예: 링크, 이벤트, 할인"
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-600 bg-gray-50 focus:bg-white"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">자동 발송 메시지</label>
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="안녕하세요! 문의하신 주소입니다: https://linkzip.kr/username"
                  rows={3}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-600 bg-gray-50 focus:bg-white resize-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">연결 타겟 URL (선택)</label>
                <input
                  type="url"
                  value={newTargetUrl}
                  onChange={(e) => setNewTargetUrl(e.target.value)}
                  placeholder="https://linkzip.kr/username"
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-600 bg-gray-50 focus:bg-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-bold shadow-md transition cursor-pointer"
                >
                  규칙 추가 완료
                </button>
                <button
                  type="button"
                  onClick={() => setIsDmModalOpen(false)}
                  className="py-3 px-5 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 rounded-2xl text-xs font-bold transition cursor-pointer"
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AutomationEditor;
