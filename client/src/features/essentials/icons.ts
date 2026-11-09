import { Bank, DeviceMobile, FirstAid, House, IdentificationCard, Info, Phone, Train, type Icon } from '@phosphor-icons/react';

export const SERVICE_ICONS: Record<string, Icon> = {
  sim: DeviceMobile,
  train: Train,
  identification: IdentificationCard,
  bank: Bank,
  house: House,
  'first-aid': FirstAid,
  phone: Phone,
  info: Info,
};
