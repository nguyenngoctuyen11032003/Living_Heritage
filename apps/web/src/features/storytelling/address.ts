import { useT } from '@/i18n';
import { hasHonorific } from './questions';

/** "ông/bà Lan" — or the name as given when it already starts with a form of address ("Bà Lan"). */
export function useAddress() {
  const t = useT('narrator');
  return (name: string) => (hasHonorific(name) ? name : t('address', { name }));
}
