
import React, { ReactNode } from 'react';

// FIX: Extended CardProps to include all standard div attributes to allow passing props like `onClick`.
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

// FIX: Destructured and spread `...props` to the underlying div element.
const Card: React.FC<CardProps> = ({ children, className = '', ...props }) => {
  return (
    <div className={`bg-card-light dark:bg-card-dark rounded-xl shadow-lg p-6 ${className}`} {...props}>
      {children}
    </div>
  );
};

export default Card;
