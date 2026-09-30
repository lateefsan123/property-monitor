import { Lexer } from 'marked';

// Parse into tokens, never HTML. Each platform renders text through React.
export function assistantTokens(content) {
  return Lexer.lex(String(content || ''), { gfm: true, breaks: true });
}

export function assistantLink(href) {
  try {
    const url = new URL(href);
    return ['https:', 'http:', 'mailto:'].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}
