import React from "react";
import { Text, StyleSheet } from "react-native";
import colors from "../config/colors";

const HighlightedText = ({
  text,
  highlight,
  textStyle,
  highlightStyle,
  activeHighlightIndex = -1,
  activeHighlightStyle = {},
}) => {
  if (!text || !highlight || !highlight.trim()) {
    return (
      <Text style={[{ color: colors.text || "#000000" }, textStyle]}>
        {text}
      </Text>
    );
  }

  const highlightLC = highlight.toLowerCase();
  const textLC = text.toLowerCase();

  const parts = [];
  let lastIndex = 0;
  let currentHighlightIndex = 0;

  // Find all occurrences of highlight in text
  let index = textLC.indexOf(highlightLC);
  while (index >= 0) {
    // Add text before the highlight
    if (index > lastIndex) {
      parts.push({
        text: text.substring(lastIndex, index),
        highlight: false,
        key: `part-${lastIndex}`,
      });
    }

    // Add highlighted text
    const isActive = currentHighlightIndex === activeHighlightIndex;
    parts.push({
      text: text.substring(index, index + highlight.length),
      highlight: true,
      isActive,
      key: `highlight-${index}`,
    });

    // Move to next occurrence
    lastIndex = index + highlight.length;
    currentHighlightIndex++;
    index = textLC.indexOf(highlightLC, lastIndex);
  }

  // Add the remaining text
  if (lastIndex < text.length) {
    parts.push({
      text: text.substring(lastIndex),
      highlight: false,
      key: `part-${lastIndex}`,
    });
  }

  return (
    <Text style={[{ color: colors.text || "#000000" }, textStyle]}>
      {parts.map((part) => (
        <Text
          key={part.key}
          style={
            part.highlight
              ? part.isActive
                ? [
                    styles.highlight,
                    highlightStyle,
                    styles.activeHighlight,
                    activeHighlightStyle,
                  ]
                : [styles.highlight, highlightStyle]
              : { color: colors.text || "#000000" } // Explicitly set color for non-highlighted text
          }
        >
          {part.text}
        </Text>
      ))}
    </Text>
  );
};

const styles = StyleSheet.create({
  highlight: {
    backgroundColor: "yellow",
  },
  activeHighlight: {
    backgroundColor: "#4CAF50",
    color: "#FFFFFF",
    borderRadius: 3,
  },
});

export default HighlightedText;
