import React from 'react';

interface LayoutProps {
  sidebar?: React.ReactNode;
  header: React.ReactNode;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ sidebar, header, children }) => {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      {sidebar && (
        <div className="hidden md:flex md:flex-shrink-0">
          <div className="flex flex-col w-64 border-r border-gray-200 bg-white">
            {sidebar}
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 w-0 overflow-hidden">
        {header}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
