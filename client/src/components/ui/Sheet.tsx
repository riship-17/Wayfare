import type { ReactNode } from 'react';
import { Drawer } from 'vaul';
import { X } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';

/** Bottom sheet (vaul). Used for filters, share with family and Emirates ID status updates. */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} repositionInputs={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-ink/40" />
        <Drawer.Content
          className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92dvh] w-full max-w-[480px] flex-col rounded-t-3xl bg-white shadow-float outline-none"
          aria-describedby={description ? undefined : undefined}
        >
          <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-hairline" aria-hidden />
          <div className="flex items-start justify-between gap-4 px-6 pt-4">
            <div className="flex flex-col gap-1">
              <Drawer.Title className="type-heading-2">{title}</Drawer.Title>
              {description ? <Drawer.Description className="type-body-sm text-ink-muted">{description}</Drawer.Description> : <Drawer.Description className="sr-only">{title}</Drawer.Description>}
            </div>
            <Drawer.Close className="tap -me-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-cornflower-wash" aria-label={t('common.close')}>
              <X size={20} weight="bold" aria-hidden />
            </Drawer.Close>
          </div>
          <div className="overflow-y-auto px-6 pt-6 pb-6">{children}</div>
          {footer && <div className="border-t-2 border-hairline px-6 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">{footer}</div>}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
