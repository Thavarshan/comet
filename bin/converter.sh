#!/bin/bash

# This script converts all .m4v files in a directory to .mp4 files using ffmpeg.

# Directory containing the .m4v files
DIRECTORY="./input"

# Exit immediately if a command exits with a non-zero status
set -e

# Function to install ffmpeg
install_ffmpeg() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if ! command -v brew &>/dev/null; then
            echo "Homebrew is not installed. Please install Homebrew first."
            exit 1
        fi
        echo "Installing ffmpeg using Homebrew..."
        brew install ffmpeg
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        if command -v apt-get &>/dev/null; then
            echo "Installing ffmpeg using apt-get..."
            sudo apt-get update
            sudo apt-get install -y ffmpeg
        else
            echo "Unsupported Linux distribution. Please install ffmpeg manually."
            exit 1
        fi
    else
        echo "Unsupported OS. Please install ffmpeg manually."
        exit 1
    fi
}

# Check if ffmpeg is installed
if ! command -v ffmpeg &>/dev/null; then
    echo "ffmpeg could not be found. Attempting to install ffmpeg..."
    install_ffmpeg
    if ! command -v ffmpeg &>/dev/null; then
        echo "ffmpeg installation failed. Please install ffmpeg manually."
        exit 1
    fi
fi

# Check if the directory exists
if [ ! -d "$DIRECTORY" ]; then
    echo "Directory $DIRECTORY does not exist."
    exit 1
fi

# Check if there are any .m4v files in the directory
shopt -s nullglob
m4v_files=("$DIRECTORY"/*.m4v)
if [ ${#m4v_files[@]} -eq 0 ]; then
    echo "No .m4v files found in $DIRECTORY."
    exit 1
fi

# Iterate over all .m4v files in the directory
for FILE in "${m4v_files[@]}"; do
    # Extract the filename without extension
    BASENAME=$(basename "$FILE" .m4v)

    # Convert the .m4v file to .mp4 using ffmpeg
    echo "Converting $FILE to $DIRECTORY/${BASENAME}.mp4..."
    ffmpeg -i "$FILE" -c copy "$DIRECTORY/${BASENAME}.mp4"

    # Optional: remove the original .m4v file if conversion is successful
    if [ $? -eq 0 ]; then
        echo "Conversion successful, removing $FILE..."
        rm -v "$FILE"
    else
        echo "Conversion failed for $FILE."
    fi
done

echo "Conversion complete!"
