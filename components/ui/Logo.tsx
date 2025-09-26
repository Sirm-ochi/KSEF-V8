import React from 'react';

interface LogoProps {
  className?: string;
  width?: number | string;
  height?: number | string;
}

const Logo: React.FC<LogoProps> = ({ className, width = "48", height = "48" }) => {
  return (
    <svg 
      width={width} 
      height={height} 
      viewBox="0 0 100 100" 
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-labelledby="ksef-logo-title"
    >
      <title id="ksef-logo-title">Kenya Science and Engineering Fair Logo</title>
      
      <defs>
        <clipPath id="shieldClip">
          <path d="M 50, 15 C 25, 30, 25, 70, 50, 85 C 75, 70, 75, 30, 50, 15 Z" />
        </clipPath>
      </defs>
      
      <circle cx="50" cy="50" r="49" fill="#FFFFFF"/>
      
      <path 
        d="M50,15.9c-2.1,0-4.1,0.3-6,0.8L42.3,13c0.7-0.2,1.5-0.4,2.3-0.5l1-3.9C47.1,8.2,48.5,8,50,8s2.9,0.2,4.4,0.5l1,3.9c0.8,0.1,1.6,0.3,2.3,0.5l-1.7,3.7c-1.9-0.5-3.9-0.8-6-0.8z M29.4,21.5c-1.6,1.1-3,2.4-4.3,3.9l-3.3-2.3c1.5-1.8,3.2-3.4,5.1-4.7L29.4,21.5z M84.8,18.4c1.9,1.4,3.6,2.9,5.1,4.7l-3.3,2.3c-1.3-1.5-2.7-2.8-4.3-3.9L84.8,18.4z M16.7,34.5c-0.8,1.5-1.5,3.1-2.1,4.7L10.8,38c0.7-1.8,1.5-3.6,2.5-5.3L16.7,34.5z M86.7,32.7c1,1.7,1.8,3.5,2.5,5.3l-3.8,1.2c-0.6-1.6-1.3-3.2-2.1-4.7L86.7,32.7z M9,50c0,1.5,0.1,3.1,0.4,4.6l-3.9-0.6C5.2,52.5,5,51.3,5,50s0.2-2.5,0.5-3.9l3.9,0.6C9.1,46.9,9,48.5,9,50z M91,50c0-1.5-0.1-3.1-0.4-4.6l3.9,0.6c0.3,1.4,0.5,2.6,0.5,3.9s-0.2,2.5-0.5,3.9l-3.9-0.6C90.9,53.1,91,51.5,91,50z M14.6,60.8c-0.6,1.6-1.3,3.2-2.1,4.7l3.4,2.2c1-1.7,1.8-3.5,2.5-5.3L14.6,60.8z M83.3,65.5c0.8,1.5,1.5,3.1,2.1,4.7l3.4-2.2c-1-1.8-1.8-3.6-2.5-5.3L83.3,65.5z M25.2,78.5c1.3,1.5,2.7,2.8,4.3,3.9l2.5-3.1c-1.6-1.1-3-2.4-4.3-3.9L25.2,78.5z M70.6,79.4c1.6,1.1,3,2.4,4.3,3.9l2.5-3.1c-1.3-1.5-2.7-2.8-4.3-3.9L70.6,79.4z M50,84.1c2.1,0,4.1-0.3,6-0.8l1.7,3.7c-0.7,0.2-1.5,0.4-2.3,0.5l-1,3.9C52.9,91.8,51.5,92,50,92s-2.9-0.2-4.4-0.5l-1-3.9c-0.8-0.1-1.6-0.3-2.3-0.5l1.7-3.7C46.1,83.8,48.1,84.1,50,84.1z"
        fill="#E2E8F0"
      />
      
      <g transform="translate(50, 50) scale(0.9)">
        <ellipse cx="0" cy="0" rx="42" ry="18" stroke="#00A8E8" strokeWidth="4" fill="none" transform="rotate(30)" />
        <ellipse cx="0" cy="0" rx="42" ry="18" stroke="#00A8E8" strokeWidth="4" fill="none" transform="rotate(-30)" />
        <ellipse cx="0" cy="0" rx="18" ry="42" stroke="#00A8E8" strokeWidth="4" fill="none" />
      </g>
      
      <g clipPath="url(#shieldClip)">
        <rect x="20" y="15" width="60" height="70" fill="#009530" />
        <rect x="20" y="15" width="60" height={70 * 2/3} fill="#CE2A28" />
        <rect x="20" y="15" width="60" height={70 * 1/3} fill="#000000" />
        <rect x="20" y={15 + (70/3) - 1} width="60" height="2" fill="#FFFFFF" />
        <rect x="20" y={15 + (70*2/3) - 1} width="60" height="2" fill="#FFFFFF" />
      </g>
      
      <path d="M 50, 15 C 25, 30, 25, 70, 50, 85 C 75, 70, 75, 30, 50, 15 Z" fill="none" stroke="#475569" strokeWidth="2" />
      
      <circle cx="50" cy="50" r="8" fill="#003459"/>
    </svg>
  );
};

export default Logo;
