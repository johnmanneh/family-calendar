import React from 'react';
import './Input.css';

const Input = ({ label, type = 'text', value = '', onChange, placeholder, name, min }) => {
  return (
    <div className="form-group">
      {label && <label>{label}</label>}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        name={name}
        min={type === 'number' ? (min !== undefined ? min : '0') : undefined}
      />
    </div>
  );
};

export default Input;