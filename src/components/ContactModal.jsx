import { useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { X, Send, Paperclip, CheckCircle2, Trash2 } from 'lucide-react';

const MAX_FILES = 3;
const MAX_SIZE_MB = 5;

export default function ContactModal({ open, onClose }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const fileRef = useRef(null);

  if (!open) return null;

  function handleFileChange(e) {
    const selected = Array.from(e.target.files || []);
    const valid = selected.filter(f => f.size <= MAX_SIZE_MB * 1024 * 1024);
    setFiles(prev => [...prev, ...valid].slice(0, MAX_FILES));
    if (fileRef.current) fileRef.current.value = '';
  }

  function removeFile(idx) {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit() {
    setError('');

    if (!name.trim() || !email.trim() || !message.trim()) {
      setError('Preencha todos os campos obrigatórios');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Informe um e-mail válido');
      return;
    }

    setLoading(true);

    try {
      // Upload de anexos
      const attachmentUrls = [];
      for (const file of files) {
        const path = `contact/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage
          .from('contact-attachments')
          .upload(path, file);
        if (!upErr) {
          const { data: urlData } = supabase.storage
            .from('contact-attachments')
            .getPublicUrl(path);
          attachmentUrls.push(urlData.publicUrl);
        }
      }

      // Salvar no banco
      const { error: insertErr } = await supabase
        .from('contact_submissions')
        .insert({
          name: name.trim(),
          email: email.trim(),
          message: message.trim(),
          attachment_urls: attachmentUrls,
        });

      if (insertErr) {
        setError('Um erro ocorreu, por favor tente novamente');
        setLoading(false);
        return;
      }

      setSent(true);
    } catch {
      setError('Um erro ocorreu, por favor tente novamente');
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setName('');
    setEmail('');
    setMessage('');
    setFiles([]);
    setError('');
    setSent(false);
    setLoading(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={handleClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-slide-up overflow-hidden" onClick={e => e.stopPropagation()}>

        {/* ── Formulário ── */}
        {!sent && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-800">Fale conosco</h3>
              <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nome</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-primary-500 focus:outline-none text-slate-800 transition-colors"
                placeholder="Seu nome" autoFocus />
            </div>

            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-primary-500 focus:outline-none text-slate-800 transition-colors"
                placeholder="seu@email.com" />
            </div>

            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Mensagem</label>
              <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-primary-500 focus:outline-none text-slate-800 transition-colors resize-none"
                placeholder="Escreva sua mensagem..." />
            </div>

            {/* Anexos */}
            <div className="mb-5">
              <button type="button" onClick={() => fileRef.current?.click()}
                disabled={files.length >= MAX_FILES}
                className="text-sm text-primary-500 font-semibold flex items-center gap-1.5 hover:text-primary-600 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                <Paperclip size={14} /> Anexar arquivos
                <span className="text-slate-400 font-normal">({files.length}/{MAX_FILES}, máx {MAX_SIZE_MB}MB)</span>
              </button>
              <input ref={fileRef} type="file" multiple onChange={handleFileChange} className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.txt,.csv" />
              {files.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 text-xs text-slate-600">
                      <Paperclip size={12} className="text-slate-400 shrink-0" />
                      <span className="truncate flex-1">{f.name}</span>
                      <span className="text-slate-400 shrink-0">{(f.size / 1024).toFixed(0)}KB</span>
                      <button onClick={() => removeFile(i)} className="text-slate-400 hover:text-red-500 cursor-pointer shrink-0">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && <p className="text-red-500 text-xs font-bold mb-4 text-center">{error}</p>}

            <button onClick={handleSubmit} disabled={loading}
              className="w-full bg-primary-500 text-white font-bold py-3 rounded-xl hover:bg-primary-600 active:scale-95 transition-all shadow-lg min-h-[48px] flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer">
              {loading ? <span className="animate-pulse">Enviando...</span> : <><Send size={16} /> Enviar mensagem</>}
            </button>
          </div>
        )}

        {/* ── Agradecimento ── */}
        {sent && (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 size={32} className="text-green-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Mensagem enviada!</h3>
            <p className="text-sm text-slate-500 mb-1">Obrigado pelo contato, {name.split(' ')[0]}.</p>
            <p className="text-sm text-slate-500 mb-1">
              Responderemos em breve no email:
            </p>
            <p className="text-sm font-bold text-slate-700 mb-6">{email}</p>
            <button onClick={handleClose}
              className="w-full bg-primary-500 text-white font-bold py-3 rounded-xl hover:bg-primary-600 active:scale-95 transition-all min-h-[48px] cursor-pointer">
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
