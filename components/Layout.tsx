import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ArrowRightLeft, 
  Settings, 
  PieChart, 
  Menu,
  X,
  Sun,
  Moon,
  Landmark,
  HelpCircle
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  darkMode: boolean;
  toggleTheme: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, darkMode, toggleTheme }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/transactions', icon: ArrowRightLeft, label: 'Lançamentos' },
    { to: '/accounts', icon: Landmark, label: 'Contas & Caixas' },
    { to: '/reports', icon: PieChart, label: 'Relatórios' },
    { to: '/settings', icon: Settings, label: 'Configurações' },
    { to: '/help', icon: HelpCircle, label: 'Ajuda' },
  ];

  // Theme-based classes
  const sidebarBg = darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200';
  const mainBg = darkMode ? 'bg-zinc-950' : 'bg-slate-50';
  const textColor = darkMode ? 'text-zinc-100' : 'text-slate-800';
  
  // Logo Logic
  const logoUrl = darkMode 
    ? "https://i.imgur.com/7gq3Tf6.png"  // White Logo for Dark Mode
    : "https://i.imgur.com/2s0t654.png"; // Blue Logo for Light Mode

  const NavItem = ({ to, icon: Icon, label }: any) => (
    <NavLink
      to={to}
      className={({ isActive }) => `
        flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group
        ${isActive 
          ? (darkMode ? 'bg-zinc-800 text-yellow-400' : 'bg-blue-50 text-blue-600 shadow-sm')
          : (darkMode ? 'text-zinc-400 hover:text-yellow-200 hover:bg-zinc-800/50' : 'text-slate-500 hover:text-blue-600 hover:bg-slate-50')
        }
      `}
      onClick={() => setIsMobileMenuOpen(false)}
    >
      <Icon size={20} className="stroke-[1.5]" />
      <span className="font-medium">{label}</span>
      {/* Active Indicator */}
      <div className={`ml-auto w-1.5 h-1.5 rounded-full ${darkMode ? 'bg-yellow-500' : 'bg-blue-600'} opacity-0 transition-opacity duration-200 group-[.active]:opacity-100`} />
    </NavLink>
  );

  return (
    <div className={`flex h-screen w-full overflow-hidden ${mainBg} ${textColor} transition-colors duration-300`}>
      
      {/* Sidebar for Desktop */}
      <aside className={`hidden md:flex w-64 flex-col border-r ${sidebarBg} transition-colors duration-300`}>
        <div className="p-6 flex items-center justify-center">
          <img 
            src={logoUrl} 
            alt="Lidera Flow Logo" 
            className="h-16 w-auto object-contain transition-opacity duration-300" 
          />
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-2">
          {navItems.map((item) => <NavItem key={item.to} {...item} />)}
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-zinc-800">
           <div className={`p-4 rounded-xl ${darkMode ? 'bg-zinc-800/50' : 'bg-slate-100'} flex items-center justify-between`}>
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${darkMode ? 'bg-yellow-500/20 text-yellow-500' : 'bg-blue-500/20 text-blue-600'}`}>
                    <span className="font-bold text-xs">LF</span>
                </div>
                <div className="text-sm">
                  <p className="font-semibold">Admin</p>
                  <p className="text-xs opacity-60">Financeiro</p>
                </div>
              </div>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Mobile Header */}
        <header className={`md:hidden flex items-center justify-between p-4 border-b ${sidebarBg}`}>
          <img 
            src={logoUrl} 
            alt="Lidera Flow Logo" 
            className="h-10 w-auto object-contain" 
          />
          <button onClick={toggleMobileMenu} className="p-2">
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </header>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className={`absolute inset-0 z-50 ${sidebarBg} md:hidden flex flex-col p-4`}>
             <div className="flex justify-between items-center mb-8">
                <img 
                  src={logoUrl} 
                  alt="Lidera Flow Logo" 
                  className="h-12 w-auto object-contain" 
                />
                <button onClick={toggleMobileMenu}><X size={24}/></button>
             </div>
             <nav className="space-y-2">
              {navItems.map((item) => <NavItem key={item.to} {...item} />)}
             </nav>
          </div>
        )}

        {/* Top Bar (Theme Toggle) */}
        <div className={`h-16 px-8 flex items-center justify-end border-b gap-4 ${sidebarBg} transition-colors duration-300`}>
          <button 
            onClick={toggleTheme}
            className={`p-2 rounded-full transition-all duration-300 ${darkMode ? 'bg-zinc-800 hover:bg-zinc-700 text-yellow-400' : 'bg-slate-100 hover:bg-slate-200 text-blue-600'}`}
            title="Toggle Theme"
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;