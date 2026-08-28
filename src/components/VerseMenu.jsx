import { HIGHLIGHT_COLORS } from '../data/bookMeta'

// Всплывающее меню при тапе на стих
function VerseMenu({ verseRef, verseText, activeColor, onClose, onBookmark, onShare, onHighlight, onEnterSelection }) {
  return (
    <div className="verse-menu-backdrop" onClick={onClose}>
      <div className="verse-menu" onClick={(e) => e.stopPropagation()}>
        <div className="verse-menu-top">
          <button className="verse-menu-plus" onClick={onEnterSelection} title="Выбрать несколько">+</button>
          <div className="verse-menu-ref">{verseRef}</div>
          <button className="verse-menu-close" onClick={onClose} title="Закрыть">×</button>
        </div>

        <div className="verse-menu-text">{verseText}</div>

        <div className="verse-menu-actions">
          <button className="verse-menu-action" onClick={onBookmark}>⭐ Закладка</button>
          <button className="verse-menu-action" onClick={onShare}>↗ Поделиться</button>
        </div>

        <div className="verse-menu-colors">
          {HIGHLIGHT_COLORS.map((c) => (
            <button
              key={c.id}
              className={`color-dot ${activeColor === c.id ? 'color-dot-active' : ''}`}
              style={{ background: c.hex }}
              onClick={() => onHighlight(activeColor === c.id ? null : c.id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default VerseMenu