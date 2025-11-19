import { Suspense } from "react";
import LoginContent from "../login/login-content";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

function AuthLoading() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <AnimatedBackground />
    </div>
  );
}

export default function AuthPage() {
  return (
    <div className="min-h-screen bg-black">
      <AnimatedBackground />
      <Header />
      <Suspense fallback={<AuthLoading />}>
        <LoginContent />
      </Suspense>
      <Footer />
    </div>
  );
}
