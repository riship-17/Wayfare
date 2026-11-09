import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { loginSchema, type ApiUser } from '@wayfare/shared';
import { Skyline } from '@/components/brand/Illustrations';
import { WayfareLogo } from '@/components/brand/WayfarePin';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { errorMessage, post, STATIC_DEMO } from '@/lib/api';
import { clearUserData } from '@/lib/db';
import { keys, useDemoLogin, useMe } from '@/lib/queries';

export function AdminLogin() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const me = useMe();
  const demo = useDemoLogin();
  const [params] = useSearchParams();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(params.get('student') ? 'That account is a student account. Sign in with your university staff account.' : null);
  const login = useMutation({
    mutationFn: (body: { email: string; password: string }) => post<{ user: ApiUser }>('/auth/login', body),
    onSuccess: async ({ user }) => {
      await clearUserData();
      qc.clear();
      qc.setQueryData(keys.me, { user, demoMode: me.data?.demoMode ?? false });
      if (user.role === 'student') setFormError('That account is a student account. Sign in with your university staff account.');
      else navigate('/admin/listings');
    },
    onError: (e) => setFormError(errorMessage(e)),
  });
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget)) as { email: string; password: string };
    const parsed = loginSchema.safeParse(data);
    if (!parsed.success) {
      const out: Record<string, string> = {};
      for (const i of parsed.error.issues) out[String(i.path[0])] ??= i.message;
      return setErrors(out);
    }
    setErrors({});
    login.mutate(parsed.data);
  };
  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <main id="main" className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-12">
        <Link to="/" className="tap self-start rounded-full"><WayfareLogo /></Link>
        <div className="flex flex-col gap-2">
          <p className="type-overline text-ink-muted">University portal</p>
          <h1 className="type-display">Sign in to verify listings</h1>
          <p className="type-body text-ink-muted">For accommodation and student services staff.</p>
          {STATIC_DEMO && <p className="type-body-sm text-ink-muted">Online demo: use the demo housing office account below. Verifying a place here updates the student app in this browser.</p>}
        </div>
        <form className="flex flex-col gap-6" onSubmit={submit} noValidate>
          <Input name="email" type="email" label="Staff email" autoComplete="email" error={errors.email} />
          <Input name="password" type="password" label="Password" autoComplete="current-password" error={errors.password} />
          {formError && <p role="alert" className="rounded-2xl border-[2.5px] border-alert px-4 py-3 type-body-sm text-alert">{formError}</p>}
          <Button type="submit" block loading={login.isPending} loadingLabel="Signing in">Sign in</Button>
        </form>
        {me.data?.demoMode && (
          <Button variant="ghost" className="self-center" loading={demo.isPending} loadingLabel="Opening" onClick={() => demo.mutate('admin', { onSuccess: () => navigate('/admin/listings'), onError: (e) => setFormError(errorMessage(e)) })}>
            Use the demo housing office account
          </Button>
        )}
      </main>
      <Skyline className="h-16" />
    </div>
  );
}
