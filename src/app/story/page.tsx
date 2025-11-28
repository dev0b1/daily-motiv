"use client";

import { useState, useEffect } from "react";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { SparkStorm } from "@/components/SparkStorm";
import RoastCreator from "@/components/RoastCreator";

export default function StoryPage() {
  const supabase = createClientComponentClient();
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const router = useRouter();

  useEffect(() => {
    // fetch session to determine whether we should hide footer / show account links
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setCurrentUser(session.user);
        } else {
          // Redirect to the app entry if unauthenticated — consolidate routes
          router.replace('/app');
        }
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-black">
      <AnimatedBackground />
  <SparkStorm />
      {/* Pass the fetched currentUser into Header to avoid UI flash of public links */}
      <Header userProp={currentUser} />
      
      <main className="pt-32 pb-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            <div className="text-center space-y-4">
              <h1 className="text-5xl md:text-6xl font-black text-gradient">
                  Tell Your Story ✨
                </h1>
                <p className="text-2xl text-white font-bold">
                  Share what happened — we'll turn it into a short motivation track.
                </p>
            </div>

            <RoastCreator />
          </motion.div>
        </div>
  </main>
    </div>
  );
}
