import React, { useState } from 'react';
import BudgetDashboard from './BudgetDashboard';
import PlanningView from './PlanningView';
import PersonnelManager from './PersonnelManager';
import ExecutedBudgets from './ExecutedBudgets';
import MessageModal from './components/MessageModal';
import { AppProvider } from './contexts/AppContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import AuthWrapper from './components/AuthWrapper';
import { useAppContext } from './contexts/AppContext';
import UserAdmin from './components/UserAdmin';

const AppContent = () => {
  const { logOut, user } = useAppContext();
  const { theme, toggleTheme } = useTheme();
  const [activeView, setActiveView] = useState('dashboard');
  const isAdmin = Boolean(user?.roles?.includes('admin'));

  const getButtonClass = (viewName) => 
    `px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ` +
    (activeView === viewName 
      ? 'bg-indigo-600 text-white' 
      : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-600');

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Planificador de Proyectos</h1>
          
          <div className="flex items-center gap-2">
            {user && <span className='text-sm'>{user.email}</span>}
            <button onClick={toggleTheme} className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700">
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            {user && (
              <button 
                onClick={logOut}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded transition duration-300 ease-in-out"
              >
                Cerrar Sesión
              </button>
            )}
          </div>
        </div>

        <div className="mb-6 flex items-center gap-4">
          <button onClick={() => setActiveView('dashboard')} className={getButtonClass('dashboard')}>
            Dashboard (Carga)
          </button>
          <button onClick={() => setActiveView('planning')} className={getButtonClass('planning')}>
            Planificación
          </button>
          <button onClick={() => setActiveView('executed')} className={getButtonClass('executed')}>
            Ejecutados
          </button>
          <button onClick={() => setActiveView('personnel')} className={getButtonClass('personnel')}>
            Gestión de Personal
          </button>
          {isAdmin && (
            <button onClick={() => setActiveView('users')} className={getButtonClass('users')}>
              Usuarios
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6">
          {activeView === 'dashboard' && <BudgetDashboard />}
          {activeView === 'planning' && <PlanningView />}
          {activeView === 'executed' && <ExecutedBudgets />}
          {activeView === 'personnel' && <PersonnelManager />}
          {activeView === 'users' && <UserAdmin />}
        </div>

        <MessageModal />
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <AuthWrapper>
          <AppContent />
        </AuthWrapper>
      </AppProvider>
    </ThemeProvider>
  );
}

export default App;
