import React from 'react';
import { AlertCircle, X } from 'lucide-react';

interface ErrorModalProps {
  isOpen: boolean;
  error: string | null;
  onClose: () => void;
  darkMode: boolean;
}

const ErrorModal: React.FC<ErrorModalProps> = ({ isOpen, error, onClose, darkMode }) => {
  if (!isOpen || !error) return null;

  const cardBg = darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200';
  const textColor = darkMode ? 'text-zinc-100' : 'text-slate-800';
  const subText = darkMode ? 'text-zinc-400' : 'text-slate-500';
  const buttonBg = darkMode ? 'bg-yellow-500 text-zinc-900 hover:bg-yellow-400' : 'bg-blue-600 text-white hover:bg-blue-700';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className={`w-full max-w-md rounded-xl shadow-2xl ${cardBg} border-2 ${darkMode ? 'border-red-500/50' : 'border-red-500'}`}>
        <div className="p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className={`p-3 rounded-full ${darkMode ? 'bg-red-500/20' : 'bg-red-100'}`}>
              <AlertCircle className="text-red-500" size={24} />
            </div>
            <div className="flex-1">
              <h3 className={`text-xl font-bold mb-2 ${textColor}`}>
                Erro no Sistema
              </h3>
              <p className={`text-sm ${subText} mb-4`}>
                O sistema não conseguiu prosseguir devido a um erro:
              </p>
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-zinc-950 border border-zinc-800' : 'bg-red-50 border border-red-200'}`}>
                <p className={`text-sm font-mono break-words ${darkMode ? 'text-red-400' : 'text-red-700'}`}>
                  {error}
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className={`p-1 rounded ${darkMode ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-slate-100 text-slate-500'}`}
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="flex justify-end mt-6">
            <button 
              onClick={onClose}
              className={`px-6 py-2.5 rounded-lg font-medium transition-colors ${buttonBg}`}
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorModal;


