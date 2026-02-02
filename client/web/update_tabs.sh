#!/bin/bash
# Backup the original file
cp "./client/web/src/pages/foodie/FoodieMenu.js" "./client/web/src/pages/foodie/FoodieMenu.js.bak"

# Update the tab styling to create trapezoid-like tabs with proper overlap and z-index layering
sed -i '' '
/^[[:space:]]*borderRadius:.*20px 20px 0 0.*$/,/^[[:space:]]*mr: 0.5,$/ {
    /borderRadius:.*20px 20px 0 0.*/c\
                  borderTopLeftRadius: '"'"'20px'"'"',\
                  borderTopRightRadius: '"'"'20px'"'"',
    /mr: 0.5,/c\
                  position: '"'"'relative'"'"',\
                  zIndex: 1,\
                  '"'"'&:not(:last-child)'"'': {\
                    ml: -1,\
                    '"'"'&.Mui-selected'"'': {\
                      zIndex: 3,\
                    },\
                    '"'"'&:not(.Mui-selected)'"'': {\
                      zIndex: 2,\
                    }\
                  },
}

/^[[:space:]]*&.Mui-selected.:$/,+5 {
    /borderColor: COLORS.primaryOrange/c\
                    borderColor: COLORS.borderGray,\
                    zIndex: 4,
}
' "./client/web/src/pages/foodie/FoodieMenu.js"

echo "File updated successfully!"
