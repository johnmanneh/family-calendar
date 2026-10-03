import React from 'react';
import './Button.css';

const Button = ({ text, onClick, disabled, loading, type, variant, className }) => {
    return (
      <button
        className={`btn-primary ${variant === 'danger' ? 'btn-danger' : ''} ${className || ''}`}
        onClick={onClick}
        disabled={disabled || loading}
        type={type || 'button'}
      >
        {loading ? 'Loading...' : text}
      </button>
    );
  };

export default Button;