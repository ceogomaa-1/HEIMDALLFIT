import { Suspense } from "react";
import { SignInPage } from "../../../components/ui/sign-in-flow-1";

export default function ClientAuthPage() {
  return (
    <Suspense fallback={null}>
      <SignInPage portalType="client" />
    </Suspense>
  );
}
