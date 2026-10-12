import React from 'react';
import Svg, { Path, Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

// Spring blossom — the "Scan schedule" icon (leaf = event, snow = task, flower = scan).
// Same five-petal blossom as the WHEN logo, in spring green with a white centre.
export const SPRING = '#66bb55';      // accent (stripes, tints)
export const SPRING_DARK = '#4a9a3b'; // buttons + text on light backgrounds

let seq = 0;

export default function SpringFlower({ size = 24 }) {
  const id = React.useRef(`sf${++seq}`).current;
  return (
    <Svg width={size} height={size} viewBox="-1 -1 50 50">
      <Defs>
        <RadialGradient id={`${id}p`} gradientUnits="userSpaceOnUse" cx="24" cy="24" r="20"><Stop offset="0" stopColor="#e6f7d9" /><Stop offset="0.45" stopColor="#a9dd8c" /><Stop offset="1" stopColor="#5daf4a" /></RadialGradient>
      </Defs>
      <Path d="M24 23 C 17.6 19.5, 16.2 9.6, 20.2 5.4 C 21.9 4.1, 23.5 5.2, 24 7.2 C 24.5 5.2, 26.1 4.1, 27.8 5.4 C 31.8 9.6, 30.4 19.5, 24 23 Z" fill={`url(#${id}p)`} stroke="#5aa548" strokeWidth="0.55" strokeLinejoin="round" transform="rotate(0 24 24)" />
      <Path d="M24 23 C 17.6 19.5, 16.2 9.6, 20.2 5.4 C 21.9 4.1, 23.5 5.2, 24 7.2 C 24.5 5.2, 26.1 4.1, 27.8 5.4 C 31.8 9.6, 30.4 19.5, 24 23 Z" fill={`url(#${id}p)`} stroke="#5aa548" strokeWidth="0.55" strokeLinejoin="round" transform="rotate(72 24 24)" />
      <Path d="M24 23 C 17.6 19.5, 16.2 9.6, 20.2 5.4 C 21.9 4.1, 23.5 5.2, 24 7.2 C 24.5 5.2, 26.1 4.1, 27.8 5.4 C 31.8 9.6, 30.4 19.5, 24 23 Z" fill={`url(#${id}p)`} stroke="#5aa548" strokeWidth="0.55" strokeLinejoin="round" transform="rotate(144 24 24)" />
      <Path d="M24 23 C 17.6 19.5, 16.2 9.6, 20.2 5.4 C 21.9 4.1, 23.5 5.2, 24 7.2 C 24.5 5.2, 26.1 4.1, 27.8 5.4 C 31.8 9.6, 30.4 19.5, 24 23 Z" fill={`url(#${id}p)`} stroke="#5aa548" strokeWidth="0.55" strokeLinejoin="round" transform="rotate(216 24 24)" />
      <Path d="M24 23 C 17.6 19.5, 16.2 9.6, 20.2 5.4 C 21.9 4.1, 23.5 5.2, 24 7.2 C 24.5 5.2, 26.1 4.1, 27.8 5.4 C 31.8 9.6, 30.4 19.5, 24 23 Z" fill={`url(#${id}p)`} stroke="#5aa548" strokeWidth="0.55" strokeLinejoin="round" transform="rotate(288 24 24)" />
      <Circle cx="24" cy="24" r="5" fill="#ffffff" stroke="#8cc874" strokeWidth="0.7" />
      <Circle cx="24.00" cy="21.60" r="0.65" fill="#9fd486" />
      <Circle cx="26.28" cy="23.26" r="0.65" fill="#9fd486" />
      <Circle cx="25.41" cy="25.94" r="0.65" fill="#9fd486" />
      <Circle cx="22.59" cy="25.94" r="0.65" fill="#9fd486" />
      <Circle cx="21.72" cy="23.26" r="0.65" fill="#9fd486" />
    </Svg>
  );
}
