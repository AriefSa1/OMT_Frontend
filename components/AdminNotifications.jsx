'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell, Check, Send, Settings2, X } from 'lucide-react';
import InfoTooltip from './InfoTooltip';
import {
  fetchAdminUsers, fetchNotificationChannels, fetchNotificationConfig,
  updateNotificationConfig, sendNotification, sendTestNotification, fetchNotificationLogs,
  handleFileUpload as uploadNotificationFile
} from '../lib/api';

const CHANNEL_META = {
  discord: { label: 'Discord', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  telegram: { label: 'Telegram', color: 'bg-sky-100 text-sky-700 border-sky-200' },
  whatsapp: { label: 'WhatsApp', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
};

function ResultBanner({ results, onClose }) {
  if (!results) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-700">Hasil pengiriman</span>
        <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-3.5 w-3.5" /></button>
      </div>
      <div className="space-y-1">
        {results.map((r) => (
          <div key={r.channel} className="flex items-center gap-2 text-xs">
            {r.status === 'SENT'
              ? <Check className="h-3.5 w-3.5 text-emerald-600" />
              : <X className="h-3.5 w-3.5 text-rose-600" />}
            <span className="font-medium text-slate-700">{CHANNEL_META[r.channel]?.label || r.channel}:</span>
            <span className={r.status === 'SENT' ? 'text-emerald-700' : 'text-rose-600'}>
              {r.status === 'SENT' ? 'Terkirim' : (r.error || 'Gagal')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminNotifications() {
  const [users, setUsers] = useState([]);
  const [channels, setChannels] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [config, setConfig] = useState(null);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState('');
  const [sendResults, setSendResults] = useState(null);
  const [busy, setBusy] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(null);

  const [cfgForm, setCfgForm] = useState({ discordWebhookUrl: '', telegramChatId: '', isActive: true });
  const [msgForm, setMsgForm] = useState({ subject: '', message: '', channels: [], fileUrl: '', fileName: '' });

  const loadLogs = useCallback(async () => {
    const res = await fetchNotificationLogs(30);
    if (res.success) setLogs(res.data.logs || []);
  }, []);

  const onFileChange = async (e) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploadingFile(file.name);
      setError('');
      const res = await uploadNotificationFile(file);
      if (res.success) {
        setMsgForm((f) => ({ ...f, fileUrl: res.data.fileUrl, fileName: res.data.originalName || file.name }));
      } else {
        setError(res.error || 'Gagal upload file.');
      }
    } catch (err) {
      console.error(err);
      setError(`Gagal upload file: ${err.message}`);
    } finally {
      setUploadingFile(null);
      e.target.value = '';
    }
  };

  const clearUploadedFile = () => {
    setMsgForm((f) => ({ ...f, fileUrl: '', fileName: '' }));
  };

  useEffect(() => {
    (async () => {
      const [u, ch] = await Promise.all([fetchAdminUsers({ limit: 200 }), fetchNotificationChannels()]);
      if (u.success) {
        const list = u.data?.users || u.users || [];
        setUsers(list);
        if (list.length && !selectedUserId) setSelectedUserId(list[0].id);
      }
      if (ch.success) setChannels(ch.data.channels || []);
      loadLogs();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadConfig = useCallback(async (userId) => {
    if (!userId) return;
    const res = await fetchNotificationConfig(userId);
    if (res.success) {
      setConfig(res.data.config);
      setCfgForm({
        discordWebhookUrl: '',
        telegramChatId: res.data.config.telegramChatId || '',
        isActive: res.data.config.isActive !== false,
      });
    }
  }, []);

  useEffect(() => {
    loadConfig(selectedUserId);
  }, [selectedUserId, loadConfig]);

  const saveConfig = async () => {
    setBusy(true);
    setError('');
    const payload = { telegramChatId: cfgForm.telegramChatId, isActive: cfgForm.isActive };
    // Kirim webhook hanya bila admin mengetik yang baru (kosong = jangan ubah).
    if (cfgForm.discordWebhookUrl.trim()) payload.discordWebhookUrl = cfgForm.discordWebhookUrl.trim();
    const res = await updateNotificationConfig(selectedUserId, payload);
    if (res.success) {
      setConfig(res.data.config);
      setCfgForm((c) => ({ ...c, discordWebhookUrl: '' }));
    } else {
      setError(res.error || 'Gagal menyimpan konfigurasi.');
    }
    setBusy(false);
  };

  const toggleChannel = (id) => {
    setMsgForm((f) => ({ ...f, channels: f.channels.includes(id) ? f.channels.filter((c) => c !== id) : [...f.channels, id] }));
  };

  const doSend = async (isTest) => {
    setBusy(true);
    setError('');
    setSendResults(null);
    const res = isTest
      ? await sendTestNotification(selectedUserId, msgForm.channels)
      : await sendNotification({
        userId: selectedUserId,
        subject: msgForm.subject,
        message: msgForm.message,
        channels: msgForm.channels,
        fileUrl: msgForm.fileUrl || undefined,
      });
    if (res.data?.results) setSendResults(res.data.results);
    if (!res.success && !res.data?.results) setError(res.error || 'Gagal mengirim.');
    if (res.success && !isTest) setMsgForm((f) => ({ ...f, subject: '', message: '', fileUrl: '', fileName: '' }));
    await loadLogs();
    setBusy(false);
  };

  const selectClass = 'h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-800 focus:border-rose-500 focus:outline-none';
  const inputClass = 'mt-1 h-9 w-full rounded-md border border-slate-300 px-3 text-xs text-slate-800 focus:border-rose-500 focus:outline-none';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <Bell className="h-4 w-4 text-slate-500" />
        <span className="text-sm font-semibold text-slate-900">Notifikasi ke Pengguna</span>
        <span className="text-xs text-slate-500">· kirim rencana kerja atau hasil analisa</span>
        <div className="ml-auto flex flex-wrap gap-1.5">
          {channels.map((c) => (
            <span key={c.id} className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${CHANNEL_META[c.id]?.color || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
              {CHANNEL_META[c.id]?.label || c.id}{!c.available && ' (server belum siap)'}
            </span>
          ))}
        </div>
      </div>

      {error && <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Pemilih pengguna + konfigurasi kanal */}
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-slate-500">Pengguna tujuan</span>
              <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} className={selectClass}>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
              </select>
            </label>

            <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
              <Settings2 className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-xs font-semibold text-slate-700">Konfigurasi Kanal</span>
            </div>

            <label className="mt-3 block">
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                Discord Webhook URL
                <InfoTooltip label="Discord Webhook">Di server Discord: Pengaturan Channel → Integrations → Webhooks → New Webhook → Copy URL. Tempel di sini.</InfoTooltip>
                {config?.discordConfigured && <span className="text-emerald-600">· tersimpan {config.discordHint}</span>}
              </span>
              <input
                type="password"
                value={cfgForm.discordWebhookUrl}
                onChange={(e) => setCfgForm((c) => ({ ...c, discordWebhookUrl: e.target.value }))}
                placeholder={config?.discordConfigured ? 'Kosongkan = biarkan' : 'https://discord.com/api/webhooks/…'}
                className={inputClass}
              />
            </label>

            <label className="mt-3 block">
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                Telegram Chat ID
                <InfoTooltip label="Telegram Chat ID">ID chat tujuan. Pengguna kirim pesan ke bot Anda, lalu buka api.telegram.org/bot&lt;token&gt;/getUpdates untuk melihat chat.id. Butuh TELEGRAM_BOT_TOKEN di server.</InfoTooltip>
                {config?.telegramConfigured && <span className="text-emerald-600">· tersimpan</span>}
              </span>
              <input
                type="text"
                value={cfgForm.telegramChatId}
                onChange={(e) => setCfgForm((c) => ({ ...c, telegramChatId: e.target.value }))}
                placeholder="mis. 123456789"
                className={inputClass}
              />
            </label>

            <label className="mt-3 flex items-center gap-2 text-xs text-slate-600">
              <input type="checkbox" checked={cfgForm.isActive} onChange={(e) => setCfgForm((c) => ({ ...c, isActive: e.target.checked }))} className="h-3.5 w-3.5 rounded border-slate-300 text-rose-600" />
              Notifikasi aktif untuk pengguna ini
            </label>

            <button type="button" onClick={saveConfig} disabled={busy || !selectedUserId} className="mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
              Simpan Konfigurasi
            </button>
          </div>
        </div>

        {/* Susun & kirim pesan */}
        <div className="space-y-4 lg:col-span-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <label className="block">
              <span className="text-[11px] font-medium text-slate-500">Judul (opsional)</span>
              <input type="text" value={msgForm.subject} onChange={(e) => setMsgForm((f) => ({ ...f, subject: e.target.value }))} placeholder="mis. Rencana kerja minggu ini" className={inputClass} />
            </label>
            <label className="mt-3 block">
              <span className="text-[11px] font-medium text-slate-500">Pesan</span>
              <textarea value={msgForm.message} onChange={(e) => setMsgForm((f) => ({ ...f, message: e.target.value }))} rows={6} placeholder="Tulis rencana kerja atau tempel ringkasan hasil analisa toko di sini…" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:border-rose-500 focus:outline-none" />
            </label>
            <label className="mt-3 block">
              <span className="text-[11px] font-medium text-slate-500">File / Media</span>
              <input
                type="file"
                onChange={onFileChange}
                disabled={busy || Boolean(uploadingFile)}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-rose-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-rose-700 hover:file:bg-rose-100 disabled:opacity-40"
              />
              {uploadingFile && <span className="mt-1 block text-[11px] text-slate-500">Mengupload {uploadingFile}…</span>}
              {msgForm.fileUrl && (
                <div className="mt-2 flex items-center justify-between gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  <a href={msgForm.fileUrl} target="_blank" rel="noreferrer" className="truncate underline">
                    {msgForm.fileName || msgForm.fileUrl}
                  </a>
                  <button type="button" onClick={clearUploadedFile} className="font-semibold text-emerald-800 hover:text-emerald-950">
                    Hapus
                  </button>
                </div>
              )}
            </label>

            <div className="mt-3">
              <span className="text-[11px] font-medium text-slate-500">Kirim lewat</span>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {channels.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    disabled={!c.available}
                    onClick={() => toggleChannel(c.id)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition ${msgForm.channels.includes(c.id)
                      ? 'border-rose-300 bg-rose-50 text-rose-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      } disabled:cursor-not-allowed disabled:opacity-40`}
                    title={!c.available ? 'Kanal ini belum siap di server' : ''}
                  >
                    {CHANNEL_META[c.id]?.label || c.id}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => doSend(false)} disabled={busy || !msgForm.message.trim() || msgForm.channels.length === 0} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-rose-600 px-4 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-40">
                <Send className="h-3.5 w-3.5" /> Kirim
              </button>
              <button type="button" onClick={() => doSend(true)} disabled={busy || msgForm.channels.length === 0} className="inline-flex h-9 items-center rounded-md border border-slate-200 bg-white px-4 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40">
                Kirim Uji
              </button>
            </div>
          </div>

          {sendResults && <ResultBanner results={sendResults} onClose={() => setSendResults(null)} />}
        </div>
      </div>

      {/* Log pengiriman */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <span className="text-sm font-semibold text-slate-900">Riwayat Pengiriman</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Waktu</th>
                <th className="px-4 py-2.5">Penerima</th>
                <th className="px-4 py-2.5">Kanal</th>
                <th className="px-4 py-2.5">Judul</th>
                <th className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">
                  Belum ada pengiriman.
                  <span className="mt-1 block text-xs text-slate-400">Riwayat muncul setelah Anda mengirim notifikasi ke pengguna.</span>
                </td></tr>
              ) : logs.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-2.5 text-slate-500">{new Date(l.createdAt).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="px-4 py-2.5">{l.recipientName || '—'}</td>
                  <td className="px-4 py-2.5">{CHANNEL_META[l.channel]?.label || l.channel}</td>
                  <td className="px-4 py-2.5 text-slate-600">{l.subject || <span className="text-slate-300">—</span>}</td>
                  <td className="px-4 py-2.5">
                    {l.status === 'SENT' ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">Terkirim</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700" title={l.error || ''}>Gagal</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-[11px] text-slate-400">
        Prototype. Discord memakai webhook per pengguna. Telegram butuh TELEGRAM_BOT_TOKEN di server + chat ID pengguna. WhatsApp menyusul. Semua pengiriman tercatat di riwayat.
      </p>
    </div>
  );
}
