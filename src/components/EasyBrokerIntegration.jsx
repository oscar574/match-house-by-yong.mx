import React, { useState } from 'react';
import { Plug, CheckCircle2, Clock, Wifi, WifiOff, Eye, RefreshCw, FileText, EyeOff, BadgeCheck, AlertTriangle, Info } from 'lucide-react';
import { EB_MODES, getEasyBrokerMode, setEasyBrokerMode, modeWarning } from '@/lib/commissionRules';

export default function EasyBrokerIntegration({ syncSummary }) {
  const [mode, setMode] = useState(getEasyBrokerMode());
  const [testing, setTesting] = useState(null);
  const [testResult, setTestResult] = useState(null);

  const apiKeyConfigured = false; // No API key configured yet — never expose keys.
  const mlsAccess = false;
  const lastSync = syncSummary?.lastSync || 'Never';

  const handleMode = (m) => {
    setMode(m);
    setEasyBrokerMode(m);
  };

  const runTest = (kind) => {
    setTesting(kind);
    setTestResult(null);
    setTimeout(() => {
      setTesting(null);
      if (kind === 'connection') {
        setTestResult({ kind, ok: false, msg: 'API key not configured.' });
      } else {
        setTestResult({ kind, ok: false, msg: 'MLS API access is required for shared commission listings.' });
      }
    }, 900);
  };

  const stats = syncSummary || {
    totalImported: 0, visible: 0, hidden: 0,
    hiddenNoCommission: 0, hiddenPhotos: 0, hiddenConstruction: 0,
    hiddenDuplicates: 0, pendingReview: 0
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm mb-4 border border-[#C9A45C]/20">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#E6D3A3]/30 flex items-center justify-center">
            <Plug size={16} className="text-[#C9A45C]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-latitud-black">EasyBroker MLS Integration Center</p>
            <p className="text-[11px] text-latitud-gray">Commission-gated MLS sync</p>
          </div>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${apiKeyConfigured ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-latitud-gray'}`}>
          {apiKeyConfigured ? 'Connected' : 'Not connected'}
        </span>
      </div>

      {/* Mode selector */}
      <div className="mb-3">
        <p className="text-[11px] font-semibold text-latitud-gray uppercase tracking-wider mb-1.5">Data source mode</p>
        <div className="grid grid-cols-3 gap-2">
          {EB_MODES.map(m => (
            <button
              key={m.value}
              onClick={() => handleMode(m.value)}
              className={`relative px-2 py-2.5 rounded-xl text-[11px] font-semibold transition-colors ${
                mode === m.value ? 'bg-latitud-black text-white' : 'bg-latitud-light text-latitud-gray'
              }`}
            >
              {m.label}
              {m.value === 'mls' && (
                <span className="absolute -top-1.5 -right-1 bg-[#C9A45C] text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">REC</span>
              )}
            </button>
          ))}
        </div>
        <div className="mt-2 flex items-start gap-1.5 text-[11px] text-latitud-gray bg-latitud-light rounded-lg p-2">
          <Info size={12} className="text-[#C9A45C] mt-0.5 shrink-0" />
          <p>{modeWarning(mode)}</p>
        </div>
        {mode === 'standard' && (
          <p className="mt-1.5 text-[11px] text-[#B42318] flex items-center gap-1">
            <AlertTriangle size={11} /> Standard mode will not show the full collaborator MLS inventory. Use MLS mode for shared commission listings.
          </p>
        )}
      </div>

      {/* Connection status */}
      <div className="rounded-xl border border-gray-100 p-3 mb-3 space-y-1.5">
        <p className="text-[11px] font-semibold text-latitud-gray uppercase tracking-wider mb-1">Connection</p>
        <Row label="API key configured" value={apiKeyConfigured ? 'Yes' : 'No'} ok={apiKeyConfigured} />
        <Row label="Current mode" value={mode === 'demo' ? 'Demo' : mode === 'standard' ? 'Standard' : 'MLS'} />
        <Row label="MLS API available" value={mlsAccess ? 'Yes' : 'Unknown'} ok={mlsAccess} />
        <Row label="Last sync" value={lastSync} />
      </div>

      {/* Commercial filters */}
      <div className="rounded-xl border border-gray-100 p-3 mb-3">
        <p className="text-[11px] font-semibold text-latitud-gray uppercase tracking-wider mb-2">Commercial filters</p>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            'Only houses', 'Only sale', 'Shared commission required',
            'Hide unknown commission', 'Hide incomplete listings', 'Duplicate protection enabled'
          ].map(f => (
            <div key={f} className="flex items-center gap-1.5 text-[11px] text-latitud-black">
              <CheckCircle2 size={12} className="text-green-500 shrink-0" /> {f}
            </div>
          ))}
        </div>
      </div>

      {/* Buttons */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <ActionBtn icon={Wifi} label="Test Connection" loading={testing === 'connection'} onClick={() => runTest('connection')} />
        <ActionBtn icon={Wifi} label="Test MLS Access" loading={testing === 'mls'} onClick={() => runTest('mls')} />
        <ActionBtn icon={Eye} label="Sync MLS Preview" disabled={!apiKeyConfigured} onClick={() => {}} />
        <ActionBtn icon={RefreshCw} label="Sync MLS Now" primary disabled={!apiKeyConfigured || !mlsAccess} onClick={() => {}} />
        <ActionBtn icon={FileText} label="Sync Logs" onClick={() => {}} />
        <ActionBtn icon={EyeOff} label="Hidden Properties" onClick={() => {}} />
        <ActionBtn icon={BadgeCheck} label="Commission Review" onClick={() => {}} />
      </div>

      {testResult && !testResult.ok && (
        <p className="text-[11px] text-[#B42318] mb-3 flex items-center gap-1">
          <AlertTriangle size={11} /> {testResult.msg}
        </p>
      )}

      {!apiKeyConfigured && (
        <p className="text-[11px] text-latitud-gray mb-3 flex items-center gap-1">
          <WifiOff size={11} /> API key not configured. Sync is disabled until an EasyBroker MLS API key is added in backend settings.
        </p>
      )}

      {/* Sync summary */}
      <div className="rounded-xl bg-latitud-light p-3">
        <p className="text-[11px] font-semibold text-latitud-gray uppercase tracking-wider mb-2">Sync summary</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <Sum label="Total imported" value={stats.totalImported} />
          <Sum label="Visible to buyer" value={stats.visible} accent />
          <Sum label="Total hidden" value={stats.hidden} />
          <Sum label="Hidden: no commission" value={stats.hiddenNoCommission} />
          <Sum label="Hidden: missing photos" value={stats.hiddenPhotos} />
          <Sum label="Hidden: missing m²" value={stats.hiddenConstruction} />
          <Sum label="Hidden: duplicates" value={stats.hiddenDuplicates} />
          <Sum label="Pending review" value={stats.pendingReview} />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, ok }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-latitud-gray">{label}</span>
      <span className={`flex items-center gap-1 font-medium ${ok ? 'text-green-600' : 'text-latitud-black'}`}>
        {ok !== undefined && (ok ? <CheckCircle2 size={11} /> : <Clock size={11} className="text-latitud-gray" />)}
        {value}
      </span>
    </div>
  );
}

function ActionBtn({ icon: Icon, label, onClick, loading, disabled, primary }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-[11px] font-semibold transition-colors ${
        disabled
          ? 'bg-gray-100 text-latitud-gray/50 cursor-not-allowed'
          : primary
          ? 'bg-latitud-orange text-white'
          : 'bg-latitud-light text-latitud-gray'
      }`}
    >
      <Icon size={13} /> {label}
    </button>
  );
}

function Sum({ label, value, accent }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-latitud-gray text-[11px]">{label}</span>
      <span className={`font-bold ${accent ? 'text-latitud-orange' : 'text-latitud-black'}`}>{value ?? 0}</span>
    </div>
  );
}