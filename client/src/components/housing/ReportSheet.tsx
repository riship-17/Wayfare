import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { brokerReportSchema } from '@wayfare/shared';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Field';
import { Sheet } from '@/components/ui/Sheet';
import { RequestError } from '@/lib/api';
import { useBrokerReport } from '@/lib/queries';

export function ReportSheet({ open, onOpenChange, listingId }: { open: boolean; onOpenChange: (o: boolean) => void; listingId?: string }) {
  const { t } = useTranslation();
  const report = useBrokerReport();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget)) as { contact: string; description: string };
    const parsed = brokerReportSchema.safeParse({ ...data, listingId });
    if (!parsed.success) {
      const out: Record<string, string> = {};
      for (const i of parsed.error.issues) out[String(i.path[0])] ??= i.message;
      return setErrors(out);
    }
    setErrors({});
    report.mutate(parsed.data, {
      onSuccess: () => {
        onOpenChange(false);
        toast(t('report.sent'));
      },
      onError: (err) => (err instanceof RequestError && Object.keys(err.fields).length ? setErrors(err.fields) : toast.error(err instanceof Error ? err.message : t('common.loadError'))),
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t('report.title')} description={t('report.sub')}>
      <form className="flex flex-col gap-6" onSubmit={submit} noValidate>
        <Input name="contact" label={t('report.contact')} hint={t('report.contactHint')} error={errors.contact} required />
        <Textarea name="description" label={t('report.what')} error={errors.description} required />
        <Button type="submit" block loading={report.isPending} loadingLabel="Sending">
          {t('report.send')}
        </Button>
      </form>
    </Sheet>
  );
}
