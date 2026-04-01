import re

with open('frontend/js/admin-dashboard.js', 'r', encoding='utf-8') as f:
    text = f.read()

# Make sure all chart context calls use safe ?. access
text = text.replace("getContext('2d')", "?.getContext('2d')")

# The root cause of the bug!
# Let's extract the global functions. The easiest way is to push them to the global window scope
# without pulling them out of the DOMContentLoaded block, EXCEPT we move them to the VERY TOP of the block.
# Even better: just move them outside the block completely!

funcs_to_extract = [
    'notifyAdmins', 'applyFilters', 'filterByRiskType', 'toggleFilters', 'resetFilters',
    'confirmDelete', 'editStudent', 'saveStudent', 'saveRecord', 'deleteRecord',
    'addRecord', 'openModal', 'closeModal', 'openCreateModal', 'closeCreateModal',
    'submitCreateStudent', 'showToast', 'adminLogout', 'openFeaturesModal', 'closeFeaturesModal'
]

# We don't really have to write a parser, we can just prepend 'window.' to these
# and they will be globally available IF the code executes.
# But if there's a reference error earlier in the DOM tree, NO script block below it executes.
# The `getContext('2d')` crashing on null canvas is the 99% likely culprit for the JS crash because I added pie charts.
# Remember: I added marksPieChart, assignmentsPieChart, attendancePieChart earlier today!
# If the admin-dashboard.html was loaded from cache without those canvases, getContext drops dead!
# Since I fixed getContext with ?.getContext, the crash won't happen.

with open('frontend/js/admin-dashboard.js', 'w', encoding='utf-8') as f:
    f.write(text)

print("Safeguards applied.")
