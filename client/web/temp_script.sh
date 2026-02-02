#!/bin/bash
# Create a temporary file
temp_file=$(mktemp)

# Process the file to remove the category from activeFilterChips
awk '
BEGIN { 
    skip_category = 0 
}
{
    if (/^[[:space:]]*if \(selectedCategory\) \{/) {
        skip_category = 1
        next
    }
    if (skip_category && /^[[:space:]]*activeFilterChips\.push\(.*key: \047category\047/) {
        next
    }
    if (skip_category && /^[[:space:]]*\}/ && !/[[:space:]]*if \(orderType/) {
        skip_category = 0
        next
    }
    print
}' "./src/pages/foodie/FoodieMenu.js" > "$temp_file"

# Move the temporary file to the original location
mv "$temp_file" "./src/pages/foodie/FoodieMenu.js"

echo "Category removal completed."
