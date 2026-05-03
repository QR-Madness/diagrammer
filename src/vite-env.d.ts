/// <reference types="vite/client" />

declare module 'nspell' {
  interface NSpell {
    correct(word: string): boolean;
    suggest(word: string): string[];
    spell(word: string): { correct: boolean; forbidden: boolean; warn: boolean };
    add(word: string, model?: string): NSpell;
    remove(word: string): NSpell;
    wordCharacters(): string | undefined;
    dictionary(dic: string | Buffer): NSpell;
    personal(personal: string | Buffer): NSpell;
  }
  function nspell(aff: string | Buffer | { aff: string | Buffer; dic?: string | Buffer }, dic?: string | Buffer): NSpell;
  export default nspell;
}
