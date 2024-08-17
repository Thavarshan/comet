#!/bin/bash

# Directory containing the .m4v files
DIRECTORY="./input"

# Iterate over all .m4v files in the directory
for FILE in "$DIRECTORY"/*.m4v; do
    # Extract the filename without extension
    BASENAME=$(basename "$FILE" .m4v)

    # Convert the .m4v file to .mp4 using ffmpeg
    ffmpeg -i "$FILE" -c copy "$DIRECTORY/${BASENAME}.mp4"

    # Optional: remove the original .m4v file if conversion is successful
    if [ $? -eq 0 ]; then
        rm "$FILE"
    fi
done

echo "Conversion complete!"
