# Professional CMS controls and public visibility

## Goal
Give every portfolio project a clear Enabled/Disabled public status. Disabled projects remain fully editable and deletable in the CMS, but disappear from the public portfolio, featured resource, search/filter results, quick-view modal, and direct project URL.

## Implementation
- Add a `public_enabled` field to portfolio projects, defaulting existing and new projects to enabled.
- Keep administrator reads unrestricted so disabled records remain visible and manageable in the CMS.
- Restrict anonymous/public reads at the database level to enabled records, preventing direct URL or browser-query access to disabled work.
- Add an immediate Enable/Disable control in the project list and a prominent public-visibility switch in the editor.
- Show clear status indicators and confirmations so administrators always know whether a project is public.
- Modernize CMS buttons, selectors, checkboxes/switches, inputs, upload controls, tags, list actions, focus states, loading states, and mobile behavior while preserving the existing Alpha Insights brand.
- Validate image type and size before upload and improve action accessibility.

## Verification
- Sign in as the administrator and disable a project.
- Confirm it remains editable in the CMS but disappears from `/`, `/clean`, search/filter counts, featured content, and `/projects/:slug`.
- Re-enable it and confirm public access returns.
- Check desktop and mobile layouts, keyboard focus, save/delete/reorder controls, and current preview errors.
