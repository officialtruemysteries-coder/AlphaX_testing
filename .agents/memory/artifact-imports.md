---
name: Artifact imports
description: A Replit artifact registration constraint for imported applications
---

When importing an existing Replit-ready app into a newly registered web artifact, preserve a backup of the imported source and restore it after artifact registration if the registration scaffold replaces frontend files.

**Why:** Artifact registration owns the preview metadata and can initialize a fresh frontend scaffold at the same path, overwriting files copied there beforehand.

**How to apply:** Inspect the registered artifact after creation, then restore the imported source and package dependencies before installing, restarting the workflow, and presenting the app.