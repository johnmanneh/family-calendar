import React from 'react';
import { useUI } from '../../../context/UIContext';
import { CATEGORIES } from '../Sidebar/Categories';
import Icon from '../../common/Icon/Icon';
import './CalendarToolbar.css';

const CalendarToolbar = ({ scope = 'all', setScope, groups = [] }) => {
  const { searchQuery, setSearchQuery, selectedCategory, setSelectedCategory } = useUI();

  return (
    <div className="calendar-toolbar">
      <div className="calendar-toolbar-search-wrap">
        <span className="calendar-toolbar-search-icon"><Icon name="search" size={14} color="#8e8e93" /></span>
        <input
          type="text"
          className="calendar-toolbar-search"
          placeholder="Search events…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
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

      {/* Scope chips — only for people in a group: All · Family · <groups> */}
      {groups.length > 0 && setScope && (
        <div className="calendar-toolbar-chips calendar-toolbar-scope">
          {[
            { key: 'all', label: 'All' },
            { key: 'family', label: 'Family' },
            ...groups.map(g => ({ key: Number(g.id), label: g.name, isGroup: true })),
          ].map(chip => (
            <button
              key={String(chip.key)}
              className={`calendar-toolbar-chip${scope === chip.key ? ' calendar-toolbar-chip-active' : ''}`}
              onClick={() => setScope(chip.key)}
            >
              {chip.isGroup && <Icon name="users" size={12} style={{ marginRight: 4 }} />}
              {chip.label}
            </button>
          ))}
        </div>
      )}

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
    </div>
  );
};

export default CalendarToolbar;
