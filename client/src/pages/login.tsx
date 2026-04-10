import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await apiRequest("POST", "/api/auth/login", { password });
      onLogin();
    } catch {
      toast({ title: "Incorrect password", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-full max-w-sm px-6">
        {/* Logo / Title */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 mb-3">
            <svg viewBox="0 0 32 32" width="32" height="32" fill="none" aria-label="Command Centre">
              <rect x="2" y="2" width="28" height="28" rx="6" stroke="currentColor" strokeWidth="2"/>
              <circle cx="16" cy="16" r="5" stroke="currentColor" strokeWidth="2"/>
              <line x1="16" y1="2" x2="16" y2="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="16" y1="24" x2="16" y2="30" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="2" y1="16" x2="8" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="24" y1="16" x2="30" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span className="text-xl font-semibold tracking-tight text-foreground">Command Centre</span>
          </div>
          <p className="text-sm text-muted-foreground">Enter your password to continue</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              autoFocus
              className="w-full px-4 py-3 rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              data-testid="input-password"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-40"
            data-testid="button-login"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
