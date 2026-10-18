import React, { useRef, useState } from 'react';
import { useUI } from '../../../context/UIContext';
import Icon from '../../common/Icon/Icon';
import Avatar from '../../common/Avatar/Avatar';
import './CalendarToolbar.css';

const CalendarToolbar = ({ scope = 'all', setScope, groups = [], kids = [], showSearch = true, autoFocusSearch = false }) => {
  const { searchQuery, setSearchQuery } = useUI();
  const [searchOpen, setSearchOpen] = useState(false);
  const inputRef = useRef(null);

  const openSearch = () => {
    setSearchOpen(true);
    setTimeout(() => inputRef.current?.focus(), 40);
  };
  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery('');
  };

  const hasScopes = setScope && (groups.length > 0 || kids.length > 0);

  const scopeChips = [
    { key: 'all', label: 'All' },
    ...kids.map(k => ({ key: `kid:${k.id}`, label: k.first_name, kid: k })),
    { key: 'family', label: 'Family' },
    ...groups.map(g => ({ key: Number(g.id), label: g.name, isGroup: true })),
  ];

  return (
    <div className="calendar-toolbar">

      {/* ── Row 1: scope chips + search icon (or expanded search) ── */}
      <div className="calendar-toolbar-row1">
        {searchOpen ? (
          /* Expanded search — replaces the chip row */
          <div className="calendar-toolbar-search-wrap">
            <span className="calendar-toolbar-search-icon"><Icon name="search" size={14} color="#8e8e93" /></span>
            <input
              ref={inputRef}
              type="text"
              className="calendar-toolbar-search"
              placeholder="Search events…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <button className="calendar-toolbar-clear" onClick={closeSearch}>×</button>
          </div>
        ) : (
          <>
            {hasScopes && (
              <div className="calendar-toolbar-chips calendar-toolbar-scope">
                {scopeChips.map(chip => (
                  <button
                    key={String(chip.key)}
                    className={`calendar-toolbar-chip${chip.kid ? ' calendar-toolbar-chip-kid' : ''}${scope === chip.key ? ' calendar-toolbar-chip-active' : ''}`}
                    onClick={() => setScope(chip.key)}
                  >
                    {chip.kid && <Avatar member={chip.kid} size={20} className="calendar-toolbar-chip-avatar" />}
                    {chip.isGroup && <Icon name="users" size={12} style={{ marginRight: 4 }} />}
                    {chip.label}
                  </button>
                ))}
              </div>
            )}
            {showSearch && (
              <button className="calendar-toolbar-search-btn" onClick={openSearch} aria-label="Search">
                <Icon name="search" size={16} />
              </button>
            )}
          </>
        )}
      </div>

    </div>
  );
};

export default CalendarToolbar;
