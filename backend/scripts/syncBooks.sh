#!/bin/bash

# Sync Books Script
# This script exports books from Firebase and updates the app assets

echo "======================================"
echo "📚 Ramayt Library Book Sync"
echo "======================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Run this script from the backend directory${NC}"
    exit 1
fi

# Step 1: Export books from Firebase
echo -e "\n${YELLOW}Step 1: Exporting books from Firebase...${NC}"
node scripts/exportBooks.js

if [ $? -ne 0 ]; then
    echo -e "${RED}Export failed!${NC}"
    exit 1
fi

# Step 2: Check if export was successful
if [ ! -d "export" ]; then
    echo -e "${RED}Export directory not found!${NC}"
    exit 1
fi

# Count exported items
BOOK_COUNT=$(grep -o '"id"' export/books.json | wc -l)
PDF_COUNT=$(ls -1 export/pdfs/*.pdf 2>/dev/null | wc -l)
IMAGE_COUNT=$(ls -1 export/images/* 2>/dev/null | wc -l)

echo -e "${GREEN}✓ Exported $BOOK_COUNT books, $PDF_COUNT PDFs, $IMAGE_COUNT images${NC}"

# Step 3: Backup existing assets (optional)
echo -e "\n${YELLOW}Step 2: Backing up existing assets...${NC}"
BACKUP_DIR="export_backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup Android assets if they exist
if [ -d "../frontend/android/app/src/main/assets" ]; then
    cp -r ../frontend/android/app/src/main/assets "$BACKUP_DIR/android_assets_backup"
    echo -e "${GREEN}✓ Backed up Android assets${NC}"
fi

# Step 4: Update Android assets
echo -e "\n${YELLOW}Step 3: Updating Android assets...${NC}"

# Create directories if they don't exist
mkdir -p ../frontend/android/app/src/main/assets/pdfs
mkdir -p ../frontend/android/app/src/main/assets/images

# Copy files
cp export/books.json ../frontend/android/app/src/main/assets/
cp export/pdfs/* ../frontend/android/app/src/main/assets/pdfs/ 2>/dev/null
cp export/images/* ../frontend/android/app/src/main/assets/images/ 2>/dev/null

echo -e "${GREEN}✓ Android assets updated${NC}"

# Step 5: Show what changed
echo -e "\n${YELLOW}Step 4: Summary of changes${NC}"
echo "======================================"
echo "Books: $BOOK_COUNT"
echo "PDFs: $PDF_COUNT" 
echo "Images: $IMAGE_COUNT"
echo "Backup: $BACKUP_DIR"
echo "======================================"

# Step 6: Next steps
echo -e "\n${YELLOW}Next steps:${NC}"
echo "1. Test the app locally:"
echo "   cd ../frontend"
echo "   npx react-native run-android"
echo ""
echo "2. If everything works, commit the changes:"
echo "   git add ../frontend/android/app/src/main/assets/"
echo "   git commit -m 'Update bundled books'"
echo ""
echo "3. Build a new release:"
echo "   cd ../frontend/android"
echo "   ./gradlew bundleRelease"
echo ""
echo -e "${GREEN}✓ Sync complete!${NC}"

# Optional: Clean up export directory
read -p "Delete export directory? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -rf export
    echo -e "${GREEN}✓ Cleaned up export directory${NC}"
fi