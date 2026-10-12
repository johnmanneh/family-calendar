import React from 'react';
import { useUI } from '../../../context/UIContext';
import { CATEGORIES } from '../Sidebar/Categories';
import Icon from '../../common/Icon/Icon';
import Avatar from '../../common/Avatar/Avatar';
import './CalendarToolbar.css';

// showSearch: on phones the search bar + category chips only appear after tapping 🔍
const CalendarToolbar = ({ scope = 'all', setScope, groups = [], kids = [], showSearch = true, autoFocusSearch = false }) => {
  const { searchQuery, setSearchQuery, selectedCategory, setSelectedCategory } = useUI();

  const hasScopes = setScope && (groups.length > 0 || kids.length > 0);
  // Nothing to show (phone, search closed, no groups/kids) → no empty bar
  if (!showSearch && !hasScopes) return null;

  return (
    <div className="calendar-toolbar">
      {showSearch && (
      <div className="calendar-toolbar-search-wrap">
        <span className="calendar-toolbar-search-icon"><Icon name="search" size={14} color="#8e8e93" /></span>
        <input
          type="text"
          className="calendar-toolbar-search"
          placeholder="Search events…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          autoFocus={autoFocusSearch}
        />
        {searchQuery && (
          <button
            className="calendar-toolbar-clear"
            onClick={() => setSearchQuery('')}
            title="Clear search"
          >
            ×
          </button>
        )}
      </div>
      )}

      {/* Scope chips: All · each child · Family · <groups> — kids come first */}
      {hasScopes && (
        <div className="calendar-toolbar-chips calendar-toolbar-scope">
          {[
            { key: 'all', label: 'All' },
            ...kids.map(k => ({ key: `kid:${k.id}`, label: k.first_name, kid: k })),
            { key: 'family', label: 'Family' },
            ...groups.map(g => ({ key: Number(g.id), label: g.name, isGroup: true })),
          ].map(chip => (
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
      <div className="calendar-toolbar-chips">
        <button
          className={`calendar-toolbar-chip${!selectedCategory ? ' calendar-toolbar-chip-active' : ''}`}
          onClick={() => setSelectedCategory('')}
        >
          All
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat.name}
            className={`calendar-toolbar-chip${selectedCategory === cat.name ? ' calendar-toolbar-chip-active' : ''}`}
            style={selectedCategory === cat.name ? { backgroundColor: cat.color, borderColor: cat.color } : {}}
            onClick={() => setSelectedCategory(selectedCategory === cat.name ? '' : cat.name)}
          >
            {cat.icon} {cat.name}
          </button>
        ))}
      </div>
      )}
    </div>
  );
};

export default CalendarToolbar;
