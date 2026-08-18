import React, { useRef, useState } from 'react';
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle, Trash2, ArrowUpRight } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface TabAttachmentDropzoneProps {
  title: string;
  expectedFileName: string;
  description: string;
  fileName?: string;
  rowCount?: number;
  loadedAt?: string;
  accept?: string;
  colorTheme?: 'sky' | 'orange' | 'rose' | 'indigo';
  onFileSelected: (buffer: ArrayBuffer, file: File) => void;
  onClearData?: () => void;
  emptyNotice?: string;
}

export const TabAttachmentDropzone: React.FC<TabAttachmentDropzoneProps> = ({
  title,
  expectedFileName,
  description,
  fileName,
  rowCount = 0,
  loadedAt,
  accept = '.xlsx, .xls, .csv',
  colorTheme = 'sky',
  onFileSelected,
  onClearData,
  emptyNotice,
}) => {
  const { isDark } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const hasLoaded = Boolean(fileName && rowCount > 0);

  const themeColors = {
    sky: {
      border: isDark ? 'border-sky-500/30 hover:border-sky-500/60' : 'border-sky-200 hover:border-sky-400',
      activeBorder: isDark ? 'border-sky-400 bg-sky-950/30' : 'border-sky-500 bg-sky-50',
      badge: isDark ? 'bg-sky-500/20 text-[#38BDF8] border-sky-500/30' : 'bg-sky-100 text-sky-800 border-sky-200',
      btn: isDark ? 'bg-sky-500 hover:bg-sky-400 text-slate-950' : 'bg-sky-600 hover:bg-sky-700 text-white',
      accent: isDark ? 'text-[#38BDF8]' : 'text-sky-700',
      glow: 'shadow-sky-500/10',
    },
    orange: {
      border: isDark ? 'border-orange-500/30 hover:border-orange-500/60' : 'border-orange-200 hover:border-orange-400',
      activeBorder: isDark ? 'border-orange-400 bg-orange-950/30' : 'border-orange-500 bg-orange-50',
      badge: isDark ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' : 'bg-orange-100 text-orange-800 border-orange-200',
      btn: isDark ? 'bg-orange-500 hover:bg-orange-400 text-slate-950' : 'bg-orange-600 hover:bg-orange-700 text-white',
      accent: isDark ? 'text-orange-400' : 'text-orange-700',
      glow: 'shadow-orange-500/10',
    },
    rose: {
      border: isDark ? 'border-rose-500/30 hover:border-rose-500/60' : 'border-rose-200 hover:border-rose-400',
      activeBorder: isDark ? 'border-rose-400 bg-rose-950/30' : 'border-rose-500 bg-rose-50',
      badge: isDark ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-rose-100 text-rose-800 border-rose-200',
      btn: isDark ? 'bg-rose-500 hover:bg-rose-400 text-white' : 'bg-rose-600 hover:bg-rose-700 text-white',
      accent: isDark ? 'text-rose-400' : 'text-rose-700',
      glow: 'shadow-rose-500/10',
    },
    indigo: {
      border: isDark ? 'border-indigo-500/30 hover:border-indigo-500/60' : 'border-indigo-200 hover:border-indigo-400',
      activeBorder: isDark ? 'border-indigo-400 bg-indigo-950/30' : 'border-indigo-500 bg-indigo-50',
      badge: isDark ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'bg-indigo-100 text-indigo-800 border-indigo-200',
      btn: isDark ? 'bg-indigo-500 hover:bg-indigo-400 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white',
      accent: isDark ? 'text-indigo-400' : 'text-indigo-700',
      glow: 'shadow-indigo-500/10',
    },
  }[colorTheme];

  const processFile = async (file: File) => {
    try {
      setErrorMsg(null);
      const buffer = await file.arrayBuffer();
      onFileSelected(buffer, file);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao processar arquivo.');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative p-5 rounded-2xl border transition-all duration-200 backdrop-blur-md shadow-xs ${
        isDark ? 'bg-slate-900/60' : 'bg-white'
      } ${
        isDragging ? themeColors.activeBorder : themeColors.border
      }`}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleInputChange}
        accept={accept}
        className="hidden"
      />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left info */}
        <div className="flex items-start gap-3.5">
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`p-3 rounded-xl cursor-pointer border transition ${
              hasLoaded
                ? isDark
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : `${themeColors.badge} hover:scale-105`
            }`}
            title="Clique para anexar planilha"
          >
            {hasLoaded ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <UploadCloud className="w-5 h-5" />
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className={`text-sm font-bold tracking-tight flex items-center gap-1.5 ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}>
                {title}
              </h3>
              {hasLoaded ? (
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                  isDark
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  <CheckCircle2 className="w-3 h-3" />
                  {rowCount} registros carregados
                </span>
              ) : (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                  isDark
                    ? 'bg-slate-800 text-slate-400 border-slate-700'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  Aguardando Anexo
                </span>
              )}
            </div>

            <p className={`text-xs mt-1 max-w-2xl leading-relaxed ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}>
              {description}
            </p>

            <div className={`flex flex-wrap items-center gap-3 mt-2 text-[11px] font-mono ${
              isDark ? 'text-slate-500' : 'text-slate-500'
            }`}>
              <span>
                Planilha esperada:{' '}
                <strong className={`font-semibold ${
                  isDark ? 'text-slate-300' : 'text-slate-800'
                }`}>
                  {expectedFileName}
                </strong>
              </span>
              {hasLoaded && fileName && (
                <span className={`font-medium ${
                  isDark ? 'text-emerald-400' : 'text-emerald-700'
                }`}>
                  • Arquivo anexado: <strong className={isDark ? 'text-white' : 'text-slate-900'}>{fileName}</strong> ({loadedAt || 'agora'})
                </span>
              )}
            </div>

            {errorMsg && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-rose-500 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-start lg:self-center shrink-0">
          {hasLoaded && onClearData && (
            <button
              type="button"
              onClick={onClearData}
              className={`px-3 py-2 text-xs font-semibold rounded-xl border transition flex items-center gap-1.5 cursor-pointer ${
                isDark
                  ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border-slate-800 hover:border-rose-500/30'
                  : 'text-slate-600 hover:text-rose-700 hover:bg-rose-50 border-slate-200 hover:border-rose-200'
              }`}
              title="Remover planilha desta aba"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpar</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer shadow-xs ${themeColors.btn}`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{hasLoaded ? 'Substituir Planilha' : 'Anexar Planilha'}</span>
            <ArrowUpRight className="w-3.5 h-3.5 opacity-70" />
          </button>
        </div>
      </div>

      {!hasLoaded && emptyNotice && (
        <div className={`mt-3 pt-3 border-t text-[11px] flex items-center justify-between ${
          isDark ? 'border-slate-800/80 text-slate-400' : 'border-slate-100 text-slate-500'
        }`}>
          <span>{emptyNotice}</span>
          <span className="text-[10px] font-mono">Arraste ou clique no botão acima</span>
        </div>
      )}
    </div>
  );
};

