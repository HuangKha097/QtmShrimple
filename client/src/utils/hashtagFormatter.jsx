import React from "react";

/**
 * Format text content containing #hashtags into clickable elements
 * @param {string} text - Raw post or comment text
 * @param {function} onHashtagClick - Handler when hashtag is clicked, receives (tagWithoutHash)
 * @returns {React.ReactNode}
 */
export const formatHashtags = (text, onHashtagClick) => {
    if (!text || typeof text !== "string") return text || "";

    // Regex matching #tag with Vietnamese characters support
    const regex = /#([A-Za-z0-9_À-ỹ]+)/gi;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
        // Text before hashtag
        if (match.index > lastIndex) {
            parts.push(text.substring(lastIndex, match.index));
        }

        const fullTag = match[0]; // e.g. #React19
        const tagWord = match[1]; // e.g. React19

        parts.push(
            <span
                key={`hashtag-${match.index}`}
                style={{
                    color: "var(--primary-color, #1d9bf0)",
                    cursor: "pointer",
                    fontWeight: 600,
                    textDecoration: "none",
                }}
                className="hashtag-link"
                onClick={(e) => {
                    e.stopPropagation();
                    if (onHashtagClick) {
                        onHashtagClick(tagWord);
                    }
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.textDecoration = "underline";
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.textDecoration = "none";
                }}
            >
                {fullTag}
            </span>
        );

        lastIndex = regex.lastIndex;
    }

    // Remaining text
    if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex));
    }

    return parts;
};

export default formatHashtags;
