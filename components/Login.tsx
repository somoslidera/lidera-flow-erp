import React from 'react';
import { authService } from '../services/firebase';
import { LogIn } from 'lucide-react';

interface LoginProps {
  darkMode: boolean;
}

const Login: React.FC<LoginProps> = ({ darkMode }) => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await authService.signInWithGoogle();
    } catch (error: any) {
      console.error("Login error:", error);
      let errorMessage = "Erro ao fazer login. Tente novamente.";
      
      if (error?.code === 'auth/popup-closed-by-user') {
        errorMessage = "Login cancelado. Por favor, tente novamente.";
      } else if (error?.code === 'auth/popup-blocked') {
        errorMessage = "Popup bloqueado pelo navegador. Por favor, permita popups para este site.";
      } else if (error?.code === 'auth/network-request-failed') {
        errorMessage = "Erro de conexão. Verifique sua conexão com a internet.";
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      setLoading(false);
    }
  };

  const bgColor = darkMode ? 'bg-zinc-950' : 'bg-slate-50';
  const cardBg = darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200';
  const textColor = darkMode ? 'text-zinc-100' : 'text-slate-800';
  const subText = darkMode ? 'text-zinc-400' : 'text-slate-500';

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${bgColor}`}>
      <div className={`w-full max-w-md rounded-2xl shadow-2xl p-8 ${cardBg} border`}>
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img 
              src="/lidera-logo.png" 
              alt="Lidera Logo" 
              className="h-12 w-auto object-contain" 
            />
            <h1 className={`text-3xl font-bold ${textColor}`}>Lidera Flow</h1>
          </div>
          <p className={subText}>Sistema de Gestão Financeira</p>
        </div>

        {error && (
          <div className={`mb-4 p-3 rounded-lg ${darkMode ? 'bg-red-950/20 border-red-800 text-red-300' : 'bg-red-50 border-red-200 text-red-700'} border`}>
            {error}
          </div>
        )}

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-lg font-medium transition-all ${
            darkMode 
              ? 'bg-white text-gray-900 hover:bg-gray-100' 
              : 'bg-blue-600 text-white hover:bg-blue-700'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {loading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-current"></div>
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <LogIn size={20} />
              <span>Entrar com Google</span>
            </>
          )}
        </button>

        <p className={`mt-6 text-center text-xs ${subText}`}>
          Ao continuar, você concorda com os termos de uso do Lidera Flow
        </p>
      </div>
    </div>
  );
};

export default Login;


