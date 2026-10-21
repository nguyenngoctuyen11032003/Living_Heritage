// Registry of all namespaces (lead-owned). Workstreams edit only their own dict/<ns>.*.ts files.
import commonVi from './dict/common.vi';
import commonEn from './dict/common.en';
import landingVi from './dict/landing.vi';
import landingEn from './dict/landing.en';
import legalVi from './dict/legal.vi';
import legalEn from './dict/legal.en';
import authVi from './dict/auth.vi';
import authEn from './dict/auth.en';
import narratorVi from './dict/narrator.vi';
import narratorEn from './dict/narrator.en';
import familyVi from './dict/family.vi';
import familyEn from './dict/family.en';
import reviewVi from './dict/review.vi';
import reviewEn from './dict/review.en';
import vaultVi from './dict/vault.vi';
import vaultEn from './dict/vault.en';
import booksVi from './dict/books.vi';
import booksEn from './dict/books.en';
import knowledgeVi from './dict/knowledge.vi';
import knowledgeEn from './dict/knowledge.en';
import adminVi from './dict/admin.vi';
import adminEn from './dict/admin.en';

export const dictionaries = {
  vi: {
    common: commonVi,
    landing: landingVi,
    legal: legalVi,
    auth: authVi,
    narrator: narratorVi,
    family: familyVi,
    review: reviewVi,
    vault: vaultVi,
    books: booksVi,
    knowledge: knowledgeVi,
    admin: adminVi,
  },
  en: {
    common: commonEn,
    landing: landingEn,
    legal: legalEn,
    auth: authEn,
    narrator: narratorEn,
    family: familyEn,
    review: reviewEn,
    vault: vaultEn,
    books: booksEn,
    knowledge: knowledgeEn,
    admin: adminEn,
  },
} as const;

export type Dictionaries = (typeof dictionaries)['vi'];
export type Namespace = keyof Dictionaries;
