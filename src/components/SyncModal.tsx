import { useState } from 'react';
import { X, Cloud, Upload, Download, AlertCircle, RefreshCw, User, Lock } from 'lucide-react';
import { encryptPortfolio, decryptPortfolio, hashUserId } from '../utils/syncCrypto';

const WORKER_URL = 'https://my-stock-proxy.zxc14708.workers.dev';
const SYNC_ID_STORAGE = 'portfolio_sync_id';
const LAST_SYNC_STORAGE = 'portfolio_last_sync';

type Status = 'idle' | 'busy' | 'success' | 'error';

interface Props {
  onClose: () => void;
  onImportDone: () => void;
}

export function SyncModal({ onClose, onImportDone }: Props) {
  const [userId, setUserId] = useState<string>(() => {
    return localStorage.getItem(SYNC_ID_STORAGE) ?? '';
  });
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const [lastSync, setLastSync] = useState<number | null>(() => {
    const v = localStorage.getItem(LAST_SYNC_STORAGE);
    return v ? Number(v) : null;
  });

  function handleIdChange(value: string) {
    setUserId(value);
    localStorage.setItem(SYNC_ID_STORAGE, value);
    setStatus('idle');
    setMessage('');
  }

  async function handleUpload() {
    if (!userId.trim()) { setMessage('아이디를 입력해주세요'); setStatus('error'); return; }
    if (!password)      { setMessage('비밀번호를 입력해주세요'); setStatus('error'); return; }

    setStatus('busy'); setMessage('암호화 중...');
    try {
      const encrypted = await encryptPortfolio(password);
      const kvKey = await hashUserId(userId.trim());
      setMessage('업로드 중...');
      const res = await fetch(`${WORKER_URL}?action=sync&key=${kvKey}`, {
        method: 'PUT',
        body: encrypted,
      });
      if (!res.ok) throw new Error(`서버 오류 (${res.status})`);
      const now = Date.now();
      localStorage.setItem(LAST_SYNC_STORAGE, String(now));
      setLastSync(now);
      setStatus('success');
      setMessage('업로드 완료! 다른 기기에서 같은 아이디·비밀번호로 불러올 수 있습니다.');
    } catch (e) {
      setStatus('error');
      setMessage(`업로드 실패: ${e instanceof Error ? e.message : '알 수 없는 오류'}`);
    }
  }

  async function handleDownload() {
    if (!userId.trim()) { setMessage('아이디를 입력해주세요'); setStatus('error'); return; }
    if (!password)      { setMessage('비밀번호를 입력해주세요'); setStatus('error'); return; }

    setStatus('busy'); setMessage('다운로드 중...');
    try {
      const kvKey = await hashUserId(userId.trim());
      const res = await fetch(`${WORKER_URL}?action=sync&key=${kvKey}`);
      if (res.status === 404) throw new Error('해당 아이디의 데이터가 없습니다. 먼저 업로드해주세요.');
      if (!res.ok) throw new Error(`서버 오류 (${res.status})`);
      const encrypted = await res.text();
      setMessage('복호화 중...');
      await decryptPortfolio(encrypted, password);
      const now = Date.now();
      localStorage.setItem(LAST_SYNC_STORAGE, String(now));
      setLastSync(now);
      setStatus('success');
      setMessage('불러오기 완료! 페이지를 새로고침합니다...');
      setTimeout(() => { onImportDone(); onClose(); }, 1500);
    } catch (e) {
      setStatus('error');
      const msg = e instanceof Error ? e.message : '알 수 없는 오류';
      setMessage(msg.includes('없습니다') ? msg : '복호화 실패: 비밀번호를 확인해주세요');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#1a1d2e] border border-[#2e3151] rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2e3151]">
          <div className="flex items-center gap-2">
            <Cloud size={16} className="text-blue-400" />
            <h2 className="text-white font-semibold">기기 간 동기화</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* 아이디 */}
          <div>
            <label className="text-gray-400 text-xs font-medium block mb-1.5 flex items-center gap-1.5">
              <User size={11} /> 아이디
            </label>
            <input
              value={userId}
              onChange={e => handleIdChange(e.target.value)}
              placeholder="사용할 아이디 입력..."
              className="w-full bg-[#0f1117] border border-[#2e3151] text-white text-sm rounded-lg px-3 py-2.5 outline-none focus:border-blue-500 placeholder:text-gray-700"
            />
            <p className="text-gray-600 text-xs mt-1.5">
              모든 기기에서 동일한 아이디를 사용하세요. 서버에는 해시값만 저장됩니다.
            </p>
          </div>

          {/* 비밀번호 */}
          <div>
            <label className="text-gray-400 text-xs font-medium block mb-1.5 flex items-center gap-1.5">
              <Lock size={11} /> 비밀번호 <span className="text-gray-600">(서버에 저장되지 않음)</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setStatus('idle'); setMessage(''); }}
              placeholder="비밀번호 입력..."
              className="w-full bg-[#0f1117] border border-[#2e3151] text-white text-sm rounded-lg px-3 py-2.5 outline-none focus:border-blue-500 placeholder:text-gray-700"
            />
            <p className="text-gray-600 text-xs mt-1.5">
              분실 시 복구 불가 — 업로드·다운로드 모두 동일한 비밀번호를 사용하세요.
            </p>
          </div>

          {/* 상태 메시지 */}
          {message && (
            <div className={`flex items-start gap-2 px-3 py-2.5 rounded-lg text-xs ${
              status === 'error'   ? 'bg-red-950/40 border border-red-800/40 text-red-400' :
              status === 'success' ? 'bg-emerald-950/40 border border-emerald-800/40 text-emerald-400' :
              'bg-blue-950/30 border border-blue-800/30 text-blue-400'
            }`}>
              {status === 'error' && <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />}
              {status === 'busy'  && <RefreshCw size={13} className="flex-shrink-0 mt-0.5 animate-spin" />}
              <span>{message}</span>
            </div>
          )}

          {/* 마지막 동기화 */}
          {lastSync && (
            <p className="text-gray-600 text-xs">
              마지막 동기화: {new Date(lastSync).toLocaleString('ko-KR')}
            </p>
          )}

          {/* 버튼 */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleUpload}
              disabled={status === 'busy'}
              className="flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-white text-sm font-semibold transition-colors"
            >
              <Upload size={14} />
              이 기기 → 클라우드
            </button>
            <button
              onClick={handleDownload}
              disabled={status === 'busy'}
              className="flex items-center justify-center gap-2 py-2.5 bg-[#2e3151] hover:bg-[#3a3f6b] disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-white text-sm font-semibold transition-colors"
            >
              <Download size={14} />
              클라우드 → 이 기기
            </button>
          </div>

          {/* 보안 안내 */}
          <div className="bg-[#0f1117] rounded-lg px-3 py-2.5 space-y-1">
            <p className="text-gray-500 text-xs font-medium">보안 안내</p>
            <p className="text-gray-600 text-xs">• 데이터는 AES-256-GCM으로 브라우저에서 암호화 후 전송</p>
            <p className="text-gray-600 text-xs">• 비밀번호는 서버에 전달되지 않음 — 분실 시 복구 불가</p>
            <p className="text-gray-600 text-xs">• 서버에는 암호문만 저장됨 (내용 해독 불가)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
