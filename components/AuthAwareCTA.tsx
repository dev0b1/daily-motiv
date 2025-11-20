"use client";

import { useState } from "react";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from "next/navigation";

interface Props extends React.HTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
}

export default function AuthAwareCTA({ children, className, ...rest }: Props) {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        router.push('/app');
      } else {
        router.push('/template');
      }
    } catch (err) {
      console.error('AuthAwareCTA error', err);
      router.push('/template');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button {...rest} onClick={handleClick} className={className} disabled={loading}>
      {children}
    </button>
  );
}
