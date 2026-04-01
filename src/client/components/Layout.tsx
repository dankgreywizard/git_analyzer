/**
 * Copyright 2026 Robert Wheeler(dankgreywizard)
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 */
import React from 'react';

/**
 * Properties for the Layout component.
 */
interface LayoutProps {
  sidebar?: React.ReactNode;
  header: React.ReactNode;
  children: React.ReactNode;
  nav?: React.ReactNode;
}

/**
 * Main application layout component that provides a sidebar, header, and main content area.
 * @param props The component properties.
 * @returns The rendered Layout component.
 */
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
