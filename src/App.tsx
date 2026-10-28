import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { LandingPage } from './pages/LandingPage';
import { WizardPage } from './pages/WizardPage';
import { ResultPage } from './pages/ResultPage';
import { HistoryPage } from './pages/HistoryPage';
import { SharedPage } from './pages/SharedPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-[#0c0d12] text-zinc-100">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/new" element={<WizardPage />} />
            <Route path="/a/:id" element={<ResultPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/s/:id" element={<SharedPage />} />
          </Routes>
        </main>
        <footer className="border-t border-zinc-800/80 py-8 bg-[#0a0b0f] text-center text-xs text-zinc-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p>
              Experiment Analyzer — Built for Appwrite Databases Hackathon 2026.
            </p>
            <div className="flex items-center gap-4 text-zinc-400">
              <span>Appwrite TablesDB</span>
              <span>•</span>
              <span>SciPy Statistics</span>
              <span>•</span>
              <span>Row-Level Security</span>
            </div>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
};

export default App;
