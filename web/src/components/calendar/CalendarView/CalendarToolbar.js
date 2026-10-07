import React from 'react';
import { useUI } from '../../../context/UIContext';
import { CATEGORIES } from '../Sidebar/Categories';
import './CalendarToolbar.css';

const CalendarToolbar = () => {
  const { searchQuery, setSearchQuery, selectedCategory, setSelectedCategory } = useUI();

  return (
    <div className="calendar-toolbar">
      <div className="calendar-toolbar-search-wrap">
        <span className="calendar-toolbar-search-icon">🔍</span>
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
