import React from 'react';
import { SEO } from './SEO';

interface NotFoundPageProps {
  onBack?: () => void;
}

export default function NotFoundPage({ onBack }: NotFoundPageProps) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <SEO
        title="Page Not Found — Techsari Zawadi"
        description="The page you are looking for does not exist. Return to the Zawadi homepage to find scholarships for African students."
        path="/404"
      />
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-4xl font-black text-primary mb-3">404</h1>
        <p className="text-on-surface-variant text-sm mb-8">
          This page does not exist. It may have been moved or the link you followed may be broken.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-3 rounded-xl bg-primary text-on-primary font-bold text-sm cursor-pointer hover:opacity-90 transition-opacity"
          >
            Go to Homepage
          </button>
          <button
            onClick={() => window.location.href = '/scholarships'}
            className="px-6 py-3 rounded-xl bg-surface border border-outline-variant text-on-surface font-bold text-sm cursor-pointer hover:bg-surface-variant transition-colors"
          >
            Browse Scholarships
          </button>
        </div>
      </div>
    </div>
  );
}
