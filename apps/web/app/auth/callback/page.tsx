import { Suspense } from "react";
import { AuthCallbackPage } from "../../../components/auth-callback-page";

export default function AuthCallbackRoute() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#050506] text-white">
          <div className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/70 backdrop-blur-md">
            Confirming your access...
          </div>
        </div>
      }
    >
      <AuthCallbackPage />
    </Suspense>
  );
}
