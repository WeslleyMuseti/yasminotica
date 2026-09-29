import React, { useState, useRef } from 'react';
import { 
  Upload, Eye, Trash2, Download, Camera, CheckCircle2, 
  AlertCircle, X, RotateCw, ZoomIn, ZoomOut, Maximize2, FileText, Image as ImageIcon 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Utilitário para comprimir imagens antes de salvar no Firestore
 * Redimensiona para no máximo 1200px mantendo legibilidade total de RGs, CPFs e contas de luz
 */
const compressImageFile = (file) => {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('Nenhum arquivo fornecido'));

    // Se for PDF, salva diretamente em base64 sem passar pelo canvas de imagem
    if (file.type === 'application/pdf') {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        const maxDimension = 1280;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Tenta WebP de alta fidelidade; se não suportar, usa JPEG
        try {
          const webpData = canvas.toDataURL('image/webp', 0.82);
          if (webpData.startsWith('data:image/webp')) {
            resolve(webpData);
            return;
          }
        } catch {}

        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export default function DocumentAttachmentInput({
  label,
  helperText,
  value,
  onChange,
  icon: Icon = FileText,
  accentColor = 'sky', // 'sky' | 'indigo' | 'emerald' | 'violet' | 'teal'
  readOnly = false,
  clientName = ''
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const fileInputRef = useRef(null);

  const isPdf = typeof value === 'string' && value.startsWith('data:application/pdf');

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      alert(`O arquivo selecionado possui ${sizeMB}MB. O limite máximo permitido é de 4MB para manter o sistema leve e rápido.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsProcessing(true);
    try {
      const compressedBase64 = await compressImageFile(file);
      onChange(compressedBase64);
    } catch (err) {
      console.error('Erro ao processar imagem:', err);
      alert('Não foi possível processar este arquivo. Tente outra foto em formato JPG, PNG ou PDF.');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownload = () => {
    if (!value) return;
    const a = document.createElement('a');
    a.href = value;
    const ext = isPdf ? 'pdf' : 'jpg';
    const safeTitle = (label || 'documento').toLowerCase().replace(/\s+/g, '_');
    const safeName = (clientName || 'cliente').toLowerCase().replace(/\s+/g, '_');
    a.download = `${safeTitle}_${safeName}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const colorStyles = {
    sky: {
      border: 'border-sky-500/30 hover:border-sky-500/60',
      badge: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
      icon: 'text-sky-400',
      btn: 'hover:bg-sky-500/20 text-sky-400'
    },
    indigo: {
      border: 'border-indigo-500/30 hover:border-indigo-500/60',
      badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
      icon: 'text-indigo-400',
      btn: 'hover:bg-indigo-500/20 text-indigo-400'
    },
    emerald: {
      border: 'border-emerald-500/30 hover:border-emerald-500/60',
      badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      icon: 'text-emerald-400',
      btn: 'hover:bg-emerald-500/20 text-emerald-400'
    },
    violet: {
      border: 'border-violet-500/30 hover:border-violet-500/60',
      badge: 'bg-violet-500/10 text-violet-400 border-violet-500/30',
      icon: 'text-violet-400',
      btn: 'hover:bg-violet-500/20 text-violet-400'
    },
    teal: {
      border: 'border-teal-500/30 hover:border-teal-500/60',
      badge: 'bg-teal-500/10 text-teal-400 border-teal-500/30',
      icon: 'text-teal-400',
      btn: 'hover:bg-teal-500/20 text-teal-400'
    }
  }[accentColor] || colorStyles.sky;

  return (
    <div className="space-y-1.5 w-full">
      {/* Label e Status */}
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-black uppercase tracking-widest text-slate-300 flex items-center gap-1.5">
          <Icon size={13} className={colorStyles.icon} />
          <span>{label}</span>
        </label>
        {value ? (
          <span className="flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 size={10} /> Anexado
          </span>
        ) : (
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
            Não anexado
          </span>
        )}
      </div>

      {/* Caixa do Anexo */}
      <div 
        className={`relative rounded-2xl border transition-all overflow-hidden ${
          value 
            ? 'bg-black/50 border-white/15 p-3' 
            : 'bg-black/30 border-dashed border-white/15 hover:border-white/30 p-4'
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <input 
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
          disabled={readOnly || isProcessing}
        />

        {value ? (
          /* Estado com Documento Anexado */
          <div className="flex flex-col sm:flex-row items-center gap-3.5">
            {/* Thumbnail */}
            <div 
              onClick={() => { setZoomLevel(1); setRotation(0); setShowLightbox(true); }}
              className="relative w-full sm:w-28 h-24 rounded-xl overflow-hidden bg-slate-900 border border-white/10 cursor-pointer group flex-shrink-0 flex items-center justify-center"
              title="Clique para ampliar o documento"
            >
              {isPdf ? (
                <div className="flex flex-col items-center justify-center text-rose-400 p-2 text-center">
                  <FileText size={32} />
                  <span className="text-[10px] font-black uppercase tracking-wider mt-1 text-slate-300">Documento PDF</span>
                </div>
              ) : (
                <img 
                  src={value} 
                  alt={label} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 backdrop-blur-xs">
                <Maximize2 size={18} className="text-white drop-shadow-md" />
                <span className="text-[10px] font-bold text-white uppercase">Ver</span>
              </div>
            </div>

            {/* Informações e Ações */}
            <div className="flex-1 min-w-0 w-full space-y-2">
              <div>
                <p className="text-xs font-bold text-white truncate">
                  {label}
                </p>
                <p className="text-[10px] text-slate-400">
                  {isPdf ? 'Arquivo em formato PDF' : 'Foto em alta resolução comprimida para o banco'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setZoomLevel(1); setRotation(0); setShowLightbox(true); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 text-xs font-bold transition-all"
                >
                  <Eye size={13} /> Visualizar
                </button>

                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-bold transition-all"
                  title="Baixar cópia no computador"
                >
                  <Download size={13} /> Baixar
                </button>

                {!readOnly && (
                  <>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isProcessing}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-bold transition-all"
                      title="Trocar por outra foto"
                    >
                      <Upload size={13} /> Trocar
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Deseja remover o anexo de "${label}"?`)) {
                          onChange('');
                        }
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-400 text-xs font-bold transition-all ml-auto"
                      title="Excluir documento anexado"
                    >
                      <Trash2 size={13} />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Estado Vazio (Sem Anexo) */
          <div 
            onClick={() => !readOnly && fileInputRef.current?.click()}
            className={`flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left cursor-pointer p-1 rounded-xl transition-all ${
              readOnly ? 'cursor-default opacity-60' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 shrink-0">
                <Camera size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-200">
                  {readOnly ? 'Nenhum documento anexado' : 'Anexar Foto ou Comprovante'}
                </p>
                <p className="text-[10px] text-slate-400">
                  {helperText || 'Tire uma foto ou envie arquivo JPG, PNG ou PDF'}
                </p>
              </div>
            </div>

            {!readOnly && (
              <button
                type="button"
                disabled={isProcessing}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-bold transition-all flex items-center gap-1.5 shrink-0"
              >
                <Upload size={13} />
                <span>{isProcessing ? 'Processando...' : 'Selecionar'}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* ─── MODAL LIGHTBOX / TELA CHEIA (ZOOM & INSPEÇÃO PELOS ADMINS) ─── */}
      <AnimatePresence>
        {showLightbox && value && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-md flex flex-col p-4 sm:p-6"
            onClick={() => setShowLightbox(false)}
          >
            {/* Barra Superior do Lightbox */}
            <div 
              className="flex items-center justify-between gap-4 pb-4 border-b border-white/10 shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Icon size={16} className={colorStyles.icon} />
                  <span>{label}</span>
                </h3>
                {clientName && (
                  <p className="text-xs text-slate-400">Cliente: <strong>{clientName}</strong></p>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Controles de Zoom e Rotação */}
                {!isPdf && (
                  <>
                    <button
                      type="button"
                      onClick={() => setZoomLevel(prev => Math.min(prev + 0.25, 3))}
                      className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all"
                      title="Aproximar (Zoom In)"
                    >
                      <ZoomIn size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoomLevel(prev => Math.max(prev - 0.25, 0.5))}
                      className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all"
                      title="Afastar (Zoom Out)"
                    >
                      <ZoomOut size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setRotation(prev => (prev + 90) % 360)}
                      className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all"
                      title="Girar 90°"
                    >
                      <RotateCw size={16} />
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-black transition-all shadow-lg shadow-sky-500/30"
                  title="Baixar arquivo original"
                >
                  <Download size={14} /> <span>Baixar</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowLightbox(false)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-rose-500 hover:text-white text-slate-300 transition-all ml-2"
                  title="Fechar (Esc)"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Conteúdo Central da Imagem / PDF com Pan e Zoom */}
            <div 
              className="flex-1 flex items-center justify-center overflow-auto p-4 custom-scrollbar"
              onClick={(e) => e.stopPropagation()}
            >
              {isPdf ? (
                <iframe 
                  src={value} 
                  title={label} 
                  className="w-full h-full max-w-4xl max-h-[85vh] rounded-2xl bg-white shadow-2xl border border-white/20"
                />
              ) : (
                <div 
                  className="transition-transform duration-200 flex items-center justify-center max-w-full max-h-full"
                  style={{
                    transform: `scale(${zoomLevel}) rotate(${rotation}deg)`
                  }}
                >
                  <img 
                    src={value} 
                    alt={label} 
                    className="max-w-[85vw] max-h-[80vh] object-contain rounded-xl shadow-2xl border border-white/10"
                  />
                </div>
              )}
            </div>

            <div className="pt-2 text-center text-slate-400 text-[11px] shrink-0">
              Clique em qualquer lugar fora da foto ou no botão Fechar para retornar ao cadastro.
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
