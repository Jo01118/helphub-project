import os
import re

files = [
    r'frontend/app/user/dashboard/page.tsx',
    r'frontend/app/volunteer/dashboard/page.tsx',
    r'frontend/app/admin/page.tsx'
]

# Robust Regex replacement
old_pattern = r'const (\w+)Match = textRaw\.match\((\/.*?\/)\);'
# We want to replace the specific ones: Category, Issue, Voice, Manual

replacements = {
    r'const categoryMatch = textRaw.match(/\[Category\]:\s*(.*?)(?=\n|\[|$)/);': 
    r'const categoryMatch = textRaw.match(/\[Category\]:\s*(.*?)(?:\r?\n|\[|$)/i);',
    
    r'const issueMatch = textRaw.match(/\[Issue\]:\s*(.*?)(?=\n|\[|$)/);': 
    r'const issueMatch = textRaw.match(/\[Issue\]:\s*(.*?)(?:\r?\n|\[|$)/i);',
    
    r'const voiceMatch = textRaw.match(/\[Voice\]:\s*([\s\S]*?)(?=\n\n|\[Text\]:|$)/);': 
    r'const voiceMatch = textRaw.match(/\[Voice\]:\s*([\s\S]*?)(?:\r?\n\r?\n|\[Text\]:|$)/i);',
    
    r'const manualMatch = textRaw.match(/\[Text\]:\s*([\s\S]*?)(?=\n\[Location Info\]:|$)/);': 
    r'const manualMatch = textRaw.match(/\[Text\]:\s*([\s\S]*?)(?:\r?\n\[Location Info\]:|$)/i);'
}

for f_path in files:
    full_path = os.path.join(os.getcwd(), f_path)
    if not os.path.exists(full_path):
        print(f"Skipping {f_path}")
        continue
        
    with open(full_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for old, new in replacements.items():
        content = content.replace(old, new)
        
    # Also fix the loading state for Volunteer Dashboard while we are at it
    if 'volunteer/dashboard/page.tsx' in f_path:
        content = content.replace(
            '{loadingReports ? (',
            '{loadingReports && reports.length === 0 ? ('
        )
        
    # Also fix for User Dashboard
    if 'user/dashboard/page.tsx' in f_path:
        content = content.replace(
            '{loadingReports ? (',
            '{loadingReports && reports.length === 0 ? ('
        )

    with open(full_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Applied fixes to {f_path}")
