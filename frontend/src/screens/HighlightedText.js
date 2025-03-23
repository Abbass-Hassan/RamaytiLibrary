import React from 'react';
import { Text } from 'react-native';

const HighlightedText = ({ text, highlight }) => {
  if (!highlight) return <Text>{text}</Text>;
  
  // Create a regex to match the highlight term (case-insensitive)
  const regex = new RegExp(`(${highlight})`, 'gi');
  // Split the text into parts based on the regex matches
  const parts = text.split(regex);

  return (
    <Text>
      {parts.map((part, index) =>
        regex.test(part) ? (
          <Text key={index} style={{ backgroundColor: 'yellow' }}>
            {part}
          </Text>
        ) : (
          <Text key={index}>{part}</Text>
        )
      )}
    </Text>
  );
};

export default HighlightedText;