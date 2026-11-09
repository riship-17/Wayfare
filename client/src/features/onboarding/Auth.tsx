import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { loginSchema, registerSchema, type ApiUser } from '@wayfare/shared';
import { Skyline } from '@/components/brand/Illustrations';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { post, RequestError } from '@/lib/api';
import { clearUserData } from '@/lib/db';
import { keys } from '@/lib/queries';

function fieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const k = String(i.path[0] ?? '_');
    if (!out[k]) out[k] = i.message;
  }
  return out;
}

export function AuthScreen({ mode }: { mode: 'create' | 'sign-in' }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const create = mode === 'create';

  const submit = useMutation({
    mutationFn: (body: Record<string, string>) => post<{ user: ApiUser }>(create ? '/auth/register' : '/auth/login', body),
    onSuccess: async ({ user }) => {
      await clearUserData();
      qc.clear();
      qc.setQueryData(keys.me, { user, demoMode: false });
      if (user.role !== 'student') navigate('/admin');
      else navigate(user.onboarded ? '/app' : '/app/setup/university');
    },
    onError: (e) => {
      if (e instanceof RequestError) {
        setErrors(e.fields);
        setFormError(Object.keys(e.fields).length ? null : e.message);
      } else setFormError(t('common.loadError'));
    },
  });

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const parsed = (create ? registerSchema : loginSchema).safeParse(data);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error.issues));
      return;
    }
    setErrors({});
    setFormError(null);
    submit.mutate(data);
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex flex-1 flex-col gap-6 px-4">
        <ScreenHeader back="/app/welcome" title={create ? t('auth.createTitle') : t('auth.signInTitle')} sub={create ? t('auth.createSub') : t('auth.signInSub')} />
        <form className="flex flex-col gap-6" onSubmit={onSubmit} noValidate>
          {create && <Input name="name" label={t('auth.name')} autoComplete="given-name" error={errors.name} required />}
          <Input name="email" type="email" inputMode="email" label={t('auth.email')} autoComplete="email" error={errors.email} required />
          <Input
            name="password"
            type="password"
            label={t('auth.password')}
            autoComplete={create ? 'new-password' : 'current-password'}
            hint={create ? t('auth.passwordHint') : undefined}
            error={errors.password}
            required
          />
          {formError && (
            <p role="alert" className="rounded-2xl border-[2.5px] border-alert px-4 py-3 type-body-sm text-alert">
              {formError}
            </p>
          )}
          <Button type="submit" block loading={submit.isPending} loadingLabel={create ? 'Creating your account' : 'Signing in'}>
            {create ? t('auth.create') : t('auth.signIn')}
          </Button>
          <p className="type-body-sm text-ink-muted">{t('auth.privacy')}</p>
        </form>
        <Link to={create ? '/app/sign-in' : '/app/create'} className="tap self-center inline-flex min-h-11 items-center px-3 type-button-sm underline decoration-2 underline-offset-4">
          {create ? t('auth.toSignIn') : t('auth.toCreate')}
        </Link>
      </div>
      <Skyline className="mt-6 h-16" />
    </div>
  );
}

export const CreateScreen = () => <AuthScreen mode="create" />;
export const SignInScreen = () => <AuthScreen mode="sign-in" />;
