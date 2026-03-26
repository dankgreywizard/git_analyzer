import React from 'react';

interface LayoutProps {
  sidebar?: React.ReactNode;
  header: React.ReactNode;
  children: React.ReactNode;
  nav?: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ sidebar, header, children, nav }) => {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Primary Navigation Sidebar */}
      {nav && (
        <div className="flex flex-shrink-0 bg-gray-900 w-16 md:w-20 relative z-50">
          {nav}
        </div>
      )}

      {/* Secondary Sidebar (e.g., Chat History) */}
      {sidebar && (
        <div className="hidden md:flex md:flex-shrink-0">
          <div className="flex flex-col w-64 border-r border-gray-200 bg-white">
            {sidebar}
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {header}
        <main className="flex-1 relative focus:outline-none overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
