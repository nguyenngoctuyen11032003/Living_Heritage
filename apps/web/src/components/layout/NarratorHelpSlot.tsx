import { useContext, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { NarratorHelpSlotContext } from './narratorHelpContext';

/**
 * Puts a page's "Trợ giúp / Help" control into the NarratorShell header (B3: narrator chrome = back, topic, help only).
 * Use from any page rendered inside NarratorShell:
 *   <NarratorHelpSlot><Button variant="secondary" leftIcon={<CircleHelp />} onClick={open}>{t('help')}</Button></NarratorHelpSlot>
 * Renders nothing outside NarratorShell. Only one page should fill it at a time.
 */
export function NarratorHelpSlot({ children }: { children: ReactNode }) {
  const slot = useContext(NarratorHelpSlotContext);
  return slot ? createPortal(children, slot) : null;
}
