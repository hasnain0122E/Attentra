import AuthShell from "@/components/auth/AuthShell";
import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <AuthShell
      title="Welcome back"
      description="Sign in to access your Attentra workspace and routing infrastructure."
      bottomText="Don't have an account?"
      bottomLinkText="Create one"
      bottomLinkHref="/signup"
    >
      <LoginForm />
    </AuthShell>
  );
}