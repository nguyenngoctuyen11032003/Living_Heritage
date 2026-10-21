import { createContext } from 'react';

/** The NarratorShell header's help slot element (null outside NarratorShell or before mount). See NarratorHelpSlot.tsx. */
export const NarratorHelpSlotContext = createContext<HTMLElement | null>(null);
