import React, { useState, useEffect } from 'react';
import { Plug, CheckCircle2, Clock, Wifi, WifiOff, Eye, RefreshCw, FileText, EyeOff, BadgeCheck, AlertTriangle, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { EB_MODES, getEasyBrokerMode, setEasyBrokerMode, modeWarning } from '@/lib/commissionRules';

export default function EasyBrokerIntegration({ syncSummary, onNavigateReview, onSynced }) {
  const [mode, setMode] = useState(getEasyBrokerMode());
  const [testing, setTesting] = useState(null);
  const [connStatus, setConnStatus] = useState(null);
  const [mlsStatus, setMlsStatus] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [previewResult, setPreviewResult] = useState(null);
  const [logs, setLogs] = useState(null);
  const [showLogs, setShowLogs] = useState(false);

  const apiKeyConfigured = connStatus?.status === 'connected';
  const mlsAccess = mlsStatus?.mls_available === true;
  const lastSync = logs && logs.length > 0 ? new Date(logs[0].started_at).toLocaleString() : (syncSummary?.lastSync || 'Never');

  useEffect(() => {
    // Auto-check connection status on mount (admin-only page).
    runTest('connection', true);
    runTest('mls', true);
    loadLogs();
  }, []);

  const handleMode = (m) => {
    setMode(m);
    setEasyBrokerMode(m);
  };

  const runTest = async (kind, silent) => {
    setTesting(kind);
    try {
      const res = await base44.functions.invoke(kind === 'connection' ? 'testEasyBrokerConnection' : 'testEasyBrokerMLSAccess', {});
      const data = res.data || res;
      if (kind === 'connection') setConnStatus(data); else setMlsStatus(data);
    } catch (e) {
      if (kind === 'connection') setConnStatus({ status: 'network_error', message: 'No se pudo conectar.' });
      else setMlsStatus({ status: 'network_error', message: 'No se pudo conectar.' });
    } finally {
      setTesting(null);
    }
  };

  const runSyncPreview = async () => {
    setSyncing(true);
    setPreviewResult(null);
    try {
      const res = await base44.functions.invoke('syncEasyBrokerMLSProperties', { preview: true });
      const data = res.data || res;
      setPreviewResult(data);
    } catch (e) {
      setPreviewResult({ status: 'error', message: e.message || 'Error en preview.' });
    } finally {
      setSyncing(false);
    }
  };

  const runSyncNow = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await base44.functions.invoke('syncEasyBrokerMLSProperties', { preview: false });
      const data = res.data || res;
      setSyncResult(data);
      if (onSynced) await onSynced();
      await loadLogs();
    } catch (e) {
      setSyncResult({ status: 'error', message: e.message || 'Error en sincronización.' });
    } finally {
      setSyncing(false);
    }
  };

  const loadLogs = async () => {
    try {
      const l = await base44.entities.SyncLog.list('-started_at', 8);
      setLogs(l);
    } catch (e) { /* ignore */ }
  };

  const stats = syncSummary || {
    totalImported: 0, visible: 0, hidden: 0,
    hiddenNoCommission: 0, hiddenPhotos: 0, hiddenConstruction: 0,
    hiddenDuplicates: 0, pendingReview: 0
  };

  const connLabel = connStatus ? {
    connected: 'Connected',
    api_key_missing: 'API key missing',
    api_key_invalid: 'API key invalid',
    account_inactive: 'Account inactive',
    network_error: 'Network error',
    unexpected_response: 'Unexpected response'
  }[connStatus.status] : 'Checking…';

  const mlsLabel = mlsStatus ? {
    mls_available: 'Available',
    api_key_missing: 'API key missing',
    api_key_invalid: 'API key invalid',
    mls_unavailable: 'MLS plan required',
    network_error: 'Network error',
    unexpected_response: 'Unexpected response'
  }[mlsStatus.status] : 'Checking…';

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
        <Row label="API key configured" value={connLabel} ok={apiKeyConfigured} />
        <Row label="Current mode" value={mode === 'demo' ? 'Demo' : mode === 'standard' ? 'Standard' : 'MLS'} />
        <Row label="MLS API available" value={mlsLabel} ok={mlsAccess} />
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
        <ActionBtn icon={Eye} label="Sync MLS Preview" loading={syncing} onClick={runSyncPreview} />
        <ActionBtn icon={RefreshCw} label="Sync MLS Now" primary loading={syncing} disabled={!mlsAccess} onClick={runSyncNow} />
        <ActionBtn icon={FileText} label="Sync Logs" onClick={() => setShowLogs(s => !s)} />
        <ActionBtn icon={EyeOff} label="Hidden Properties" onClick={() => onNavigateReview && onNavigateReview()} />
        <ActionBtn icon={BadgeCheck} label="Commission Review" onClick={() => onNavigateReview && onNavigateReview()} />
      </div>

      {/* Messages */}
      {connStatus && !apiKeyConfigured && connStatus.message && (
        <p className="text-[11px] text-[#B42318] mb-3 flex items-start gap-1">
          <AlertTriangle size={11} className="mt-0.5 shrink-0" /> {connStatus.message}
        </p>
      )}
      {mlsStatus && !mlsAccess && mlsStatus.message && (
        <p className="text-[11px] text-[#B42318] mb-3 flex items-start gap-1">
          <AlertTriangle size={11} className="mt-0.5 shrink-0" /> {mlsStatus.message}
        </p>
      )}

      {/* Preview result */}
      {previewResult && (
        <div className="rounded-xl bg-[#EAF2FF] p-3 mb-3">
          <p className="text-[11px] font-semibold text-latitud-black uppercase tracking-wider mb-2 flex items-center gap-1">
            <Eye size={12} className="text-latitud-orange" /> Sync Preview (no changes applied)
          </p>
          {previewResult.status === 'ok' && previewResult.summary ? (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Sum label="Pages" value={previewResult.summary.pages_processed} />
              <Sum label="Visible to buyer" value={previewResult.summary.visible_count} accent />
              <Sum label="Total hidden" value={previewResult.summary.hidden_count} />
              <Sum label="Hidden: no commission" value={previewResult.summary.no_commission_count} />
              <Sum label="Hidden: missing photos" value={previewResult.summary.missing_photos_count} />
              <Sum label="Hidden: missing m²" value={previewResult.summary.missing_construction_count} />
            </div>
          ) : (
            <p className="text-[11px] text-[#B42318]">{previewResult.message || previewResult.error || 'Error en preview.'}</p>
          )}
        </div>
      )}

      {/* Sync result */}
      {syncResult && (
        <div className={`rounded-xl p-3 mb-3 ${syncResult.status === 'ok' ? 'bg-green-50' : 'bg-red-50'}`}>
          <p className={`text-[11px] font-semibold uppercase tracking-wider mb-2 ${syncResult.status === 'ok' ? 'text-green-700' : 'text-[#B42318]'}`}>
            {syncResult.status === 'ok' ? 'Sync completed' : 'Sync failed'}
          </p>
          {syncResult.status === 'ok' && syncResult.summary ? (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Sum label="Imported" value={syncResult.summary.imported_count} />
              <Sum label="Updated" value={syncResult.summary.updated_count} />
              <Sum label="Visible to buyer" value={syncResult.summary.visible_count} accent />
              <Sum label="Total hidden" value={syncResult.summary.hidden_count} />
              <Sum label="Duplicates" value={syncResult.summary.duplicate_count} />
              <Sum label="Errors" value={syncResult.summary.error_count} />
              <Sum label="Duration" value={syncResult.summary.duration_seconds + 's'} />
            </div>
          ) : (
            <p className="text-[11px] text-[#B42318]">{syncResult.message || syncResult.error || 'Error.'}</p>
          )}
        </div>
      )}

      {/* Warning: synced but 0 visible */}
      {syncResult && syncResult.status === 'ok' && syncResult.summary && syncResult.summary.visible_count === 0 && (syncResult.summary.imported_count + syncResult.summary.updated_count) > 0 && (
        <p className="text-[11px] text-[#B42318] mb-3 flex items-start gap-1 bg-red-50 rounded-lg p-2">
          <AlertTriangle size={11} className="mt-0.5 shrink-0" /> Sync completed but 0 properties are visible to buyers. Review the hidden reasons above and the EasyBroker MLS Review tab.
        </p>
      )}

      {/* Sync logs */}
      {showLogs && (
        <div className="rounded-xl border border-gray-100 p-3 mb-3">
          <button onClick={() => setShowLogs(false)} className="flex items-center justify-between w-full mb-2">
            <p className="text-[11px] font-semibold text-latitud-gray uppercase tracking-wider">Recent sync logs</p>
            <ChevronUp size={14} className="text-latitud-gray" />
          </button>
          {!logs || logs.length === 0 ? (
            <p className="text-[11px] text-latitud-gray">No sync logs yet.</p>
          ) : (
            <div className="space-y-2">
              {logs.map(l => (
                <div key={l.id} className="flex items-center justify-between text-[11px] py-1.5 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      l.status === 'synced' ? 'bg-green-500' :
                      l.status === 'sync_error' ? 'bg-red-500' :
                      l.status === 'partial' ? 'bg-yellow-500' : 'bg-gray-300'
                    }`} />
                    <span className="text-latitud-gray">{new Date(l.started_at).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-latitud-gray">
                    <span className="text-green-600">{l.visible_count || 0} vis</span>
                    <span className="text-latitud-gray">{l.hidden_count || 0} hidden</span>
                    <span>{l.duration_seconds || 0}s</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!apiKeyConfigured && !testing && (
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
      } ${loading ? 'opacity-60' : ''}`}
    >
      {loading ? <RefreshCw size={13} className="animate-spin" /> : <Icon size={13} />} {label}
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