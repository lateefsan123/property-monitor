import { memo, useMemo } from 'react';
import { assistantLink, assistantTokens } from '../../shared/assistant-markdown.js';

function Inline({ tokens = [] }) {
  return tokens.map((token, i) => {
    const children = token.tokens ? <Inline tokens={token.tokens} /> : token.text;
    switch (token.type) {
      case 'strong': return <strong key={i}>{children}</strong>;
      case 'em': return <em key={i}>{children}</em>;
      case 'del': return <del key={i}>{children}</del>;
      case 'codespan': return <code key={i}>{token.text}</code>;
      case 'br': return <br key={i} />;
      case 'link': {
        const href = assistantLink(token.href);
        return href ? <a key={i} href={href} target="_blank" rel="noopener noreferrer">{children}</a> : <span key={i}>{children}</span>;
      }
      // Images stay as alt text: responses must not load remote tracking assets.
      default: return <span key={i}>{children || token.raw}</span>;
    }
  });
}

function Blocks({ tokens }) {
  return tokens.map((token, i) => {
    switch (token.type) {
      case 'space': return null;
      case 'heading': {
        const Heading = `h${Math.min(token.depth + 1, 6)}`;
        return <Heading key={i}><Inline tokens={token.tokens} /></Heading>;
      }
      case 'paragraph': case 'text': return <p key={i}>{token.tokens ? <Inline tokens={token.tokens} /> : token.text}</p>;
      case 'list': {
        const List = token.ordered ? 'ol' : 'ul';
        return <List key={i} start={token.ordered ? token.start : undefined}>{token.items.map((item, j) => <li key={j}>{item.task && <span aria-label={item.checked ? 'Completed' : 'Not completed'}>{item.checked ? '☑ ' : '☐ '}</span>}<Blocks tokens={item.tokens} /></li>)}</List>;
      }
      case 'blockquote': return <blockquote key={i}><Blocks tokens={token.tokens} /></blockquote>;
      case 'code': return <pre key={i} tabIndex={0} aria-label="Code block"><code>{token.text}</code></pre>;
      case 'hr': return <hr key={i} />;
      case 'table': return <div className="assistant-table" key={i} tabIndex={0} role="region" aria-label="Response table"><table><thead><tr>{token.header.map((cell, j) => <th key={j} scope="col"><Inline tokens={cell.tokens} /></th>)}</tr></thead><tbody>{token.rows.map((row, j) => <tr key={j}>{row.map((cell, k) => <td key={k}><Inline tokens={cell.tokens} /></td>)}</tr>)}</tbody></table></div>;
      default: return <p key={i}>{token.text || token.raw}</p>;
    }
  });
}

export default memo(function AssistantMessage({ message }) {
  const tokens = useMemo(() => message.role === 'user' ? [] : assistantTokens(message.content), [message.role, message.content]);
  return <div className={`assistant-chat-message is-${message.role}`}>
    <span className="assistant-speaker">{message.role === 'user' ? 'You' : 'Repeat AI'}: </span>
    {message.role === 'user' ? message.content : <div className="assistant-prose"><Blocks tokens={tokens} /></div>}
  </div>;
});
