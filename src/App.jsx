import React from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import './index.css';

// CONTEXTOS Y COMPONENTES
import { AppProvider, useAppContext } from './contexts/AppContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import BudgetDashboard from './BudgetDashboard';
import PersonnelManager from './PersonnelManager';
import MessageModal from './components/MessageModal';

const ThemeToggleButton = () => {
  const { theme, toggleTheme } = useTheme();
  console.log('ThemeToggleButton rendered. Current theme:', theme);

  return (
    <button
      onClick={() => {
        console.log('Toggle theme button clicked!');
        toggleTheme();
      }}
      className="absolute top-4 right-4 z-50 px-4 py-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
    >
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  );
};

const AppContent = () => {
  const { userId } = useAppContext();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-900 p-4 font-inter text-gray-800 dark:text-gray-200">
      <ThemeToggleButton />
      <MessageModal />

      <h1 className="text-4xl font-extrabold text-center text-indigo-800 dark:text-indigo-300 mb-8 drop-shadow-md">
        📊 Planificador de Recursos y Presupuestos
      </h1>
      
      {userId && (
        <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-md mb-6 text-center text-sm text-gray-600 dark:text-gray-300 border border-blue-200 dark:border-gray-600">
          Tu ID de Usuario (para datos privados): <span className="font-mono text-blue-700 dark:text-blue-400 break-all">{userId}</span>
        </div>
      )}

      <nav className="flex justify-center mb-8 gap-4">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `px-6 py-3 rounded-full text-lg font-semibold transition-colors duration-300 ${
              isActive
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`
          }
        >
          Panel de Presupuestos
        </NavLink>
        <NavLink
          to="/personal"
          className={({ isActive }) =>
            `px-6 py-3 rounded-full text-lg font-semibold transition-colors duration-300 ${
              isActive
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`
          }
        >
          Gestión de Personal
        </NavLink>
      </nav>

      <Routes>
        <Route path="/" element={<BudgetDashboard />} />
        <Route path="/personal" element={<PersonnelManager />} />
      </Routes>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </AppProvider>
    </BrowserRouter>
  );
}

export default App;
