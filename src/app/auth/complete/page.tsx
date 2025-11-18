import React, { Suspense } from 'react';
import AuthCompleteClient from '@/components/AuthCompleteClient';

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><div className="text-center"><div className="text-exroast-gold text-4xl mb-4">Finalizing sign-in…</div><div className="text-gray-400">You will be redirected shortly.</div></div></div>}>
      {/* Client component handles reading search params and finalizing the session */}
      <AuthCompleteClient />
    </Suspense>
  );
}
