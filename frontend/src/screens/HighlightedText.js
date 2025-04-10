import React from "react";
import { Text, View } from "react-native";

const HighlightedText = ({
  text,
  highlight,
  textStyle = {},
  highlightStyle = { backgroundColor: "yellow" },
}) => {
  if (!highlight || !text) return <Text style={textStyle}>{text}</Text>;

  // Escape special regex characters in the search term
  const escapedHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Create a regex to match the highlight term (case-insensitive)
  const regex = new RegExp(`(${escapedHighlight})`, "gi");

  // Split the text into parts based on the regex matches
  const parts = text.split(regex);

  return (
    <Text style={textStyle}>
      {parts.map((part, index) =>
        regex.test(part) ? (
          <Text key={index} style={[textStyle, highlightStyle]}>
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
