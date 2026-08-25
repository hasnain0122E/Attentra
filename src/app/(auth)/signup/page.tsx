import AuthShell from "@/components/auth/AuthShell";
import SignupForm from "@/components/auth/SignupForm";

export default function SignupPage() {
  return (
    <AuthShell
      title="Create your account"
      description="Start building with intelligent model routing through Attentra."
      bottomText="Already have an account?"
      bottomLinkText="Sign in"
      bottomLinkHref="/login"
    >
      <SignupForm />
    </AuthShell>
  );
}