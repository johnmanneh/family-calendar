import React from 'react';
import './AuthLink.css';

const AuthLink = ({ text, linkText, linkUrl }) => {
  return (
    <p className="auth-link">
      {text} <a href={linkUrl}>{linkText}</a>
    </p>
  );
};

export default AuthLink;