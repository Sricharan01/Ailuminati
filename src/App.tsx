import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DocumentProvider } from './contexts/DocumentContext';
import { LoginForm } from './components/Auth/LoginForm';
import { Header } from './components/Layout/Header';
import { Navigation } from './components/Layout/Navigation';
import { UploadInterface } from './components/Documents/UploadInterface';
import { RecordsList } from './components/Documents/RecordsList';
import { DocumentsList } from './components/Documents/DocumentsList';
import { AnalyticsDashboard } from './components/Analytics/Dashboard';
import { UserManagement } from './components/Admin/UserManagement';
import { TemplateManager } from './components/Admin/TemplateManager';
import { QRUpload } from './components/Mobile/QRUpload';
import { AuditLog } from './components/Security/AuditLog';

function AppContent() {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState('upload');

  if (!user) {
    return <LoginForm />;
  }

  const renderCurrentView = () => {
    switch (currentView) {
      case 'upload':
        return <UploadInterface />;
      case 'records':
        return <RecordsList />;
      case 'documents':
        return <DocumentsList />;
      case 'analytics':
        return <AnalyticsDashboard />;
      case 'mobile':
        return <QRUpload />;
      case 'audit':
        return <AuditLog />;
      case 'users':
        return <UserManagement />;
      case 'settings':
        return <TemplateManager />;
      default:
        return <UploadInterface />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Navigation currentView={currentView} onViewChange={setCurrentView} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderCurrentView()}
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <DocumentProvider>
        <AppContent />
      </DocumentProvider>
    </AuthProvider>
  );
}

export default App;