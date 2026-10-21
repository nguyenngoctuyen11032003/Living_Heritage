// Copy used by the specs comes straight from the app dictionaries, so wording changes never break selectors.
import auth_vi from '../../src/i18n/dict/auth.vi';
import auth_en from '../../src/i18n/dict/auth.en';
import common_vi from '../../src/i18n/dict/common.vi';
import common_en from '../../src/i18n/dict/common.en';
import knowledge_vi from '../../src/i18n/dict/knowledge.vi';
import knowledge_en from '../../src/i18n/dict/knowledge.en';
import landing_vi from '../../src/i18n/dict/landing.vi';
import landing_en from '../../src/i18n/dict/landing.en';
import narrator_vi from '../../src/i18n/dict/narrator.vi';
import narrator_en from '../../src/i18n/dict/narrator.en';
import review_vi from '../../src/i18n/dict/review.vi';
import review_en from '../../src/i18n/dict/review.en';
import vault_vi from '../../src/i18n/dict/vault.vi';
import vault_en from '../../src/i18n/dict/vault.en';

export const vi = { auth: auth_vi, common: common_vi, knowledge: knowledge_vi, landing: landing_vi, narrator: narrator_vi, review: review_vi, vault: vault_vi };
export const en = { auth: auth_en, common: common_en, knowledge: knowledge_en, landing: landing_en, narrator: narrator_en, review: review_en, vault: vault_en };

/** Fill `{name}` placeholders. */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));
}

/** Exact-match regex for a dictionary string (placeholders become wildcards). */
export function exact(template: string): RegExp {
  const src = template.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\{\w+\}/g, '.+');
  return new RegExp(`^\\s*${src}\\s*$`);
}
