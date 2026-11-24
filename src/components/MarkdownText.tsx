import React from 'react';

function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="font-semibold text-slate-900 dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 text-[0.9em] font-mono"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <em key={idx} className="italic">
          {part.slice(1, -1)}
        </em>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

export const MarkdownText: React.FC<{ content: string; className?: string }> = ({
  content,
  className = '',
}) => {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: { ordered: boolean; text: string; indent: number }[] = [];

  const flushList = (keyPrefix: string) => {
    if (listItems.length === 0) return;
    const isOrdered = listItems[0].ordered;
    const ListTag = isOrdered ? 'ol' : 'ul';
    elements.push(
      <ListTag
        key={keyPrefix}
        className={`my-2 space-y-1.5 pl-5 ${isOrdered ? 'list-decimal' : 'list-disc'}`}
      >
        {listItems.map((item, i) => (
          <li
            key={i}
            className={`leading-relaxed ${
              item.indent >= 2 ? 'ml-4 list-[circle] text-[0.95em]' : ''
            }`}
          >
            {renderInline(item.text)}
          </li>
        ))}
      </ListTag>
    );
    listItems = [];
  };

  lines.forEach((rawLine, idx) => {
    const leadingSpaces = rawLine.match(/^(\s*)/)?.[1]?.length || 0;
    const line = rawLine.trim();

    if (!line) {
      flushList(`list-${idx}`);
      return;
    }

    // Đường kẻ ngang phân cách --- hoặc ***
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
      flushList(`list-${idx}`);
      elements.push(
        <hr
          key={idx}
          className="my-3.5 border-slate-200/80 dark:border-slate-700/70"
        />
      );
      return;
    }

    if (line.startsWith('#### ') || line.startsWith('### ')) {
      flushList(`list-${idx}`);
      const clean = line.replace(/^#+\s+/, '');
      elements.push(
        <h4
          key={idx}
          className="font-bold text-sm sm:text-base text-slate-900 dark:text-white mt-3.5 mb-1.5"
        >
          {renderInline(clean)}
        </h4>
      );
      return;
    }

    if (line.startsWith('## ') || line.startsWith('# ')) {
      flushList(`list-${idx}`);
      const clean = line.replace(/^#+\s+/, '');
      elements.push(
        <h3
          key={idx}
          className="font-bold text-base sm:text-lg text-slate-900 dark:text-white mt-4 mb-1.5"
        >
          {renderInline(clean)}
        </h3>
      );
      return;
    }

    const bulletMatch = line.match(/^[-*•]\s+(.*)$/);
    if (bulletMatch) {
      if (listItems.length > 0 && listItems[0].ordered && leadingSpaces < 2) {
        flushList(`list-switch-${idx}`);
      }
      listItems.push({ ordered: false, text: bulletMatch[1], indent: leadingSpaces });
      return;
    }

    const orderedMatch = line.match(/^\d+[.)]\s+(.*)$/);
    if (orderedMatch) {
      if (listItems.length > 0 && !listItems[0].ordered && leadingSpaces < 2) {
        flushList(`list-switch-${idx}`);
      }
      listItems.push({ ordered: true, text: orderedMatch[1], indent: leadingSpaces });
      return;
    }

    if (line.startsWith('> ')) {
      flushList(`list-${idx}`);
      elements.push(
        <blockquote
          key={idx}
          className="border-l-4 border-emerald-500 pl-3.5 py-1.5 my-2.5 italic text-slate-600 dark:text-slate-300 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-r-lg"
        >
          {renderInline(line.slice(2))}
        </blockquote>
      );
      return;
    }

    flushList(`list-${idx}`);
    elements.push(
      <p key={idx} className="leading-relaxed my-1.5">
        {renderInline(line)}
      </p>
    );
  });

  flushList('list-end');

  return <div className={`text-sm sm:text-[15px] break-words ${className}`}>{elements}</div>;
};
