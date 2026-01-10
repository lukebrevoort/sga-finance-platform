#!/bin/bash
# Better prompts for the dark mode UI task

# OPTION 1: Specific, bounded task
ralph "
Improve dark mode styling for the main page (src/app/page.tsx).

Requirements:
1. Add dark mode utility classes (dark:bg-*, dark:text-*) to all visible elements
2. Ensure all text has readable contrast in dark mode
3. Add appropriate dark backgrounds for any cards, panels, or sections
4. Test by toggling system dark mode

After completing changes:
- Run 'npm run lint' to ensure no errors
- List all files you modified

Output <promise>COMPLETE</promise> when done.
" -m 15 -c "COMPLETE" --verbose

# OPTION 2: Even more specific - single component focus
ralph "
Add dark mode support to the header/navigation component.

Task:
1. Find the main header/nav component in src/
2. Add Tailwind dark: utility classes for:
   - Background (dark:bg-gray-900 or similar)
   - Text color (dark:text-gray-100)
   - Borders (dark:border-gray-700)
   - Hover states (dark:hover:bg-gray-800)
3. Ensure the component looks good with system dark mode enabled

Output <promise>COMPLETE</promise> when all changes are applied.
" -m 10 -c "COMPLETE" --verbose

# OPTION 3: Start with analysis, then implement
ralph "
Step 1: Analyze the current dark mode implementation.
- Check src/app/globals.css for dark mode CSS variables
- Identify components that need dark mode styling
- List specific contrast/readability issues

Step 2: Fix the top 3 most visible dark mode issues.

Output <promise>COMPLETE</promise> when analysis and fixes are done.
" -m 15 -c "COMPLETE" --verbose
