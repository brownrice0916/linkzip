import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { auth, logout } from '../../lib/firebase';
import { deleteMyAccount } from '../../services/accountService';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldAlert, 
  User, 
  Mail, 
  Trash2, 
  AlertTriangle, 
  LogOut, 
  Key,
  CheckCircle2
} from 'lucide-react';

const SettingsEditor = () => {
  const state = useStore();
  const tr = (ko: string, en: string) => state.language === 'ko' ? ko : en;
  const navigate = useNavigate();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const user = state.user || auth.currentUser;

  const handleDeleteAccount = async () => {
    if (confirmInput.trim() !== '탈퇴합니다') {
      setErrorMsg("'탈퇴합니다'를 정확히 입력해주세요.");
      return;
    }

    setIsDeleting(true);
    setErrorMsg('');

    try {
      await deleteMyAccount();

      // The server removes the Auth user last. Clear local state after the
      // complete cleanup succeeds so a failed request never looks successful.
      state.setUser(null);
      alert('회원 탈퇴가 완료되었습니다. 그동안 이용해주셔서 감사합니다.');
      navigate('/');
    } catch (error: any) {
      console.error('Account deletion error:', error);
      setIsDeleting(false);

      if (error.code === 'functions/failed-precondition') {
        setErrorMsg('보안을 위해 다시 로그인하신 직후에 회원 탈퇴를 진행해주세요.');
      } else {
        setErrorMsg('탈퇴 처리 중 오류가 발생했습니다: ' + (error.message || '다시 시도해주세요.'));
      }
    }
  };

  return (
    <div className="space-y-6 pb-20 font-sans">
      
      {/* 1. Profile Account Info Card */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
          <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center font-bold">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">내 계정 정보</h3>
            <p className="text-xs text-gray-500">현재 로그인된 계정 프로필</p>
          </div>
        </div>

        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between text-xs py-2 border-b border-gray-50">
            <span className="font-semibold text-gray-500">이메일 계정</span>
            <span className="font-bold text-gray-900">{user?.email || '이메일 정보 없음'}</span>
          </div>

          <div className="flex items-center justify-between text-xs py-2 border-b border-gray-50">
            <span className="font-semibold text-gray-500">프로필 URL 아이디</span>
            <span className="font-bold text-[#ff5f35]">@{state.profile.username || 'username'}</span>
          </div>

          <div className="flex items-center justify-between text-xs py-2">
            <span className="font-semibold text-gray-500">계정 상태</span>
            <span className="inline-flex items-center gap-1 font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5" /> 활성화됨
            </span>
          </div>
        </div>
      </div>

      {user?.email?.toLowerCase() === 'brownrice0916@gmail.com' && (
        <button type="button" onClick={() => navigate('/site-admin')} className="group flex w-full cursor-pointer items-center gap-4 rounded-3xl border-2 border-[#171714] bg-[#fff4c7] p-6 text-left shadow-[5px_5px_0_#ff5f35] transition hover:-translate-y-0.5 hover:bg-[#ffed9c]">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-[#171714] bg-[#ffcf4a] text-[#171714] transition group-hover:rotate-[-3deg]"><Key className="h-5 w-5" /></span>
          <span className="min-w-0 flex-1"><strong className="block text-sm font-black text-[#171714]">사이트 관리자</strong><span className="mt-1 block text-xs font-semibold text-[#6d6558]">가입자와 비공개 베타 초대코드를 관리합니다.</span></span>
        </button>
      )}

      {/* 2. Logout Action Card */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-gray-900">로그아웃</h3>
          <p className="text-xs text-gray-500 mt-0.5">현재 기기에서 안전하게 로그아웃합니다.</p>
        </div>

        <button
          onClick={async () => {
            await logout();
            navigate('/');
          }}
          className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-full text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
        >
          <LogOut className="w-4 h-4 text-gray-600" />
          로그아웃
        </button>
      </div>

      {/* 3. Danger Zone / Withdraw Account Card */}
      <div className="space-y-4 rounded-3xl border-2 border-[#d8d2c7] bg-[#fffdf8] p-6 shadow-[4px_4px_0_#e8e1d5]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border-2 border-[#171714] bg-[#ffcf4a] text-[#171714]">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-[#171714]">{tr('계정 삭제', 'Delete account')}</h3>
            <p className="text-xs font-semibold text-[#8a6a15]">계정과 저장된 데이터를 영구적으로 제거합니다.</p>
          </div>
        </div>

        <p className="text-xs text-gray-600 leading-relaxed font-medium">
          회원 탈퇴 시 저장된 모든 링크, 디자인 설정, 프로필 데이터 및 계정이 영구 삭제되며, 삭제된 정보는 절대 복구할 수 없습니다.
        </p>

        <div className="pt-2">
          <button
            onClick={() => {
              setConfirmInput('');
              setErrorMsg('');
              setIsDeleteModalOpen(true);
            }}
            className="flex cursor-pointer items-center gap-2 rounded-full border-2 border-[#171714] bg-[#171714] px-6 py-3 text-xs font-black text-white shadow-[3px_3px_0_#ff5f35] transition hover:-translate-y-0.5 hover:bg-black"
          >
            <Trash2 className="w-4 h-4" />
            {tr('회원 탈퇴', 'Delete account')}
          </button>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#171714]/55 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md space-y-5 rounded-3xl border-2 border-[#171714] bg-[#fffdf8] p-6 shadow-[8px_8px_0_#ff5f35] animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-[#171714] bg-[#ffcf4a]">
                <AlertTriangle className="h-7 w-7 text-[#171714]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">정말 회원 탈퇴하시겠습니까?</h3>
                <p className="text-xs font-bold text-[#8a6a15]">이 작업은 취소할 수 없습니다.</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              탈퇴 시 사용자의 모든 링크 데이터, 커스텀 디자인, 프로필 정보가 시스템에서 영구히 삭제됩니다.
              확인을 위해 아래 입력창에 <strong className="font-black text-[#171714]">'탈퇴합니다'</strong>를 입력해 주세요.
            </p>

            <div className="space-y-1">
              <input
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="탈퇴합니다"
                className="w-full rounded-2xl border-2 border-[#d8d2c7] bg-[#f4f1e8] px-4 py-3 text-sm font-bold text-gray-900 focus:border-[#171714] focus:bg-white focus:outline-none focus:ring-0"
              />
              {errorMsg && (
                <p className="pt-1 text-xs font-bold text-[#b45309]">{errorMsg}</p>
              )}
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting || confirmInput.trim() !== '탈퇴합니다'}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border-2 border-[#171714] bg-[#171714] py-3 text-xs font-black text-white shadow-[3px_3px_0_#ff5f35] transition hover:bg-black disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-300 disabled:shadow-none"
              >
                <Trash2 className="w-4 h-4" />
                {isDeleting ? '탈퇴 처리 중...' : '회원 탈퇴 확정'}
              </button>

              <button
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
                className="w-full cursor-pointer rounded-full border-2 border-[#d8d2c7] bg-[#f4f1e8] py-2.5 text-xs font-bold text-gray-800 transition hover:border-[#171714] hover:bg-white"
              >
                취소하고 계속 이용하기
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SettingsEditor;
