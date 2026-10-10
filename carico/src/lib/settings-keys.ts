/**
 * Chiavi delle preferenze in localStorage e script del tema.
 * Stanno in un modulo normale (non "use client"): il layout server li usa come
 * valori veri e propri, non come riferimenti a codice client.
 */
export const THEME_KEY = "carico:theme";
export const UNIT_KEY = "carico:unit";

/** Script inline eseguito prima del rendering per evitare il lampo di tema sbagliato. */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${THEME_KEY}')||'system';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';}catch(e){document.documentElement.dataset.theme='light';}})();`;
