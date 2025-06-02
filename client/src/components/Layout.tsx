import React, { ReactNode } from 'react';
import Header from './header';
import Footer from './footer';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <Header />
      <main className="flex-grow pt-20">
        {children}
      </main>
      <Footer />
    </div>
  );
}