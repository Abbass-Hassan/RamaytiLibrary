import React, { useState, useEffect } from 'react';
import { Text, Platform } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

/**
 * Icon component with fallback for handling cases where vector icons fail to load
 * 
 * @param {string} name - The icon name from Ionicons
 * @param {number} size - The size of the icon
 * @param {string} color - The color of the icon
 * @param {object} style - Additional styles to apply
 * @returns {React.Component} - Icon component with fallback
 */
const Icon = ({ name, size, color, style }) => {
  const [iconError, setIconError] = useState(false);
  
  // Define fallback characters for common icons
  const getFallbackChar = (iconName) => {
    const fallbacks = {
      'bookmark': '★',
      'bookmark-outline': '☆',
      'search': '🔍',
      'chevron-up': '▲',
      'chevron-down': '▼',
      'menu': '☰',
      'home': '⌂',
      'settings': '⚙️',
      'person': '👤',
      'arrow-back': '←',
      'arrow-forward': '→',
      'close': '✕',
      'checkmark': '✓',
      'add': '+',
      'remove': '-',
      'information-circle': 'ℹ️',
      'alert': '⚠️',
      'help': '?',
      'refresh': '↻',
      'share': '↗',
      'download': '↓',
      'upload': '↑',
      'star': '★',
      'star-outline': '☆',
      'heart': '❤️',
      'heart-outline': '♡',
      'mail': '✉️',
      'calendar': '📅',
      'time': '⏱️',
      'location': '📍',
      'lock': '🔒',
      'unlock': '🔓',
      'notifications': '🔔',
      'notifications-outline': '🔔',
      'camera': '📷',
      'image': '🖼️',
      'document': '📄',
      'folder': '📁',
      'cart': '🛒',
      'cloud': '☁️',
      'trash': '🗑️',
      'warning': '⚠️',
      'play': '▶️',
      'pause': '⏸️',
      'stop': '⏹️',
      'volume-high': '🔊',
      'volume-mute': '🔇',
    };
    
    return fallbacks[iconName] || '•';
  };
  
  try {
    return <Ionicons name={name} size={size} color={color} style={style} />;
  } catch (error) {
    console.warn('Failed to load icon:', error);
    return (
      <Text style={[{ fontSize: size, color: color }, style]}>
        {getFallbackChar(name)}
      </Text>
    );
  }
};

export default Icon;