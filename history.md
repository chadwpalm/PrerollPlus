# Preroll Plus Version History

## 1.6.0

### New Features

1. Added the `CONFIG_DIR` environment variable to change where settings, logs and the holiday cache are kept (default `/config`). Mainly useful for native installs. `npm run dev` uses `./dev-config`.
2. The Host section in Settings now shows the port and URL base Preroll Plus is running on, validates both fields, and locks them with a note when the `APP_PORT`/`PORT` or `APP_BASE_URL` environment variable is overriding them. A reminder to restart appears after changing them.
3. The `PORT` environment variable is now accepted as an alternative to `APP_PORT`.
4. The Docker image now has a health check, so `docker ps` reports the container as healthy once Preroll Plus answers on its port.
5. On phones, the Calendar shows a month agenda (date ranges with the sequence and its buckets) instead of the month grid.
6. Added a contributing guide (CONTRIBUTING.md) with development setup, project layout, logging conventions and pull request checklist.
7. Sign-in security. The Plex sign-in is now checked by the server, not just the web page:
   - Only the Plex account that set up Preroll Plus (the owner) can sign in. Other Plex accounts are refused. Existing installs recognize the owner from the saved sign-in automatically.
   - Each browser gets its own session (30 days, renewed while in use). Signing out only signs out that browser, and updates no longer sign everyone out.
   - Every page and API request needs a signed-in browser, except the Plex webhook and the iCal feed (which uses its API key).
   - New Authentication setting under Settings > Security: Required (default), Not required for local addresses, or Off (for reverse proxies that already require a login). Behind a reverse proxy, the client address is taken from X-Forwarded-For when the proxy is on the local network.
   - New `DISABLE_AUTH=true` environment variable turns sign-in off, and lets a different Plex account take over as owner on its next sign-in (for when the owner can't sign in any more). While it is set, the account menu has a Sign In item that opens the sign-in page for this.

### Changes/Improvements

1. Security updates. Updated Node to version 26 in the Docker image, and moved the image to Alpine Linux. npm is removed from the final image since it isn't needed to run the app, which also removes the vulnerabilities reported in its bundled packages. The image is about 50 MB smaller and reports no high or critical vulnerabilities.
2. Security updates. Updated all backend and frontend packages to their latest versions, including Express 5, Multer 2, React 19 and FullCalendar 7. Both the backend and frontend now report 0 vulnerabilities.
3. Migrated the frontend build from Create React App (no longer maintained, and the source of most remaining reported vulnerabilities) to Vite.
4. The calendar was updated to FullCalendar 7 and restyled to keep its previous look, with fixed-height rows on any screen width.
5. Logging rewritten to be informative.
6. The Sequence and Bucket create/edit pages were reorganized into cards, with the file and bucket lists sized to the screen and stacked on phones. The page scrolls to the editor when it opens.
7. The Sequence and Bucket cards line up in an even grid, two per row on phones, with smaller page margins on phones.
8. The About dialog shows the actual config and app folders.
9.  Added ESLint and Prettier configs for the backend and frontend (`npm run lint`).
10. Settings are now read and written through one place in the backend. Background updates (today's sequence, the end of a timed override, file renames and removals, the signed-out state) change only their own fields on freshly read settings, so they can no longer undo edits saved in the meantime.
11. Holiday lists are handled by one shared module for the schedule, Calendar page, iCal feed and sequence editor. Lists are kept in memory once read, so the Calendar page and iCal feed are much faster (a month now takes a few milliseconds), and Legacy (Nager.Date) lists are now cached for the sequence editor too.
12. The backend no longer sends HTTP requests to itself (folder listing, preroll updates); it calls those functions directly.
13. The frontend uses one small `fetch` helper for all requests to the backend in place of `XMLHttpRequest` (and axios), removing a lot of repeated code. Signing in no longer freezes the page while the account details and token are saved.
14. The bucket list tooltip on the Calendar and the override tooltip on Sequences now use the same tooltip component as the rest of the app.
15. When a sequence's schedule is set to Custom, the Day field now comes before the Month field for regions that write the day first (e.g. the UK and most of Europe), based on the browser's preferred language. [[#25](https://github.com/chadwpalm/PrerollPlus/discussions/25)]
16. The Docker image is now multi-architecture: `latest` and each version tag run on both amd64 and arm64 (64-bit ARM, e.g. a Raspberry Pi with a 64-bit OS). The separate `-arm` tags are no longer published, and 32-bit ARM (arm/v7) is no longer supported.

### Fixes

1. Fixed video previews failing with an error when the browser requested a byte range past the end of the file.
2. Fixed the Docker startup skipping some settings updates (API key creation, version update) when the settings file had no Plex server settings yet.
3. Fixed the log files from earlier settings saves being kept open (a new log file transport was added on every save).
4. Fixed Preroll Plus freezing when every file in a bucket had already been picked for an earlier bucket in the same sequence (e.g. the same one-file bucket added twice). Such a bucket is now skipped with a warning in the log, so no preroll plays twice.
5. Fixed the preroll list sent to Plex ending in a stray comma when the last bucket in a sequence had no files. Empty buckets are now skipped with a warning.
6. Fixed the thumbnail images Plex attaches to webhooks being saved in /tmp and never deleted, slowly filling the container's disk. They are now ignored.
7. Fixed the daily sequence change drifting an hour early or late after a daylight saving time change. The next run is now worked out after each run.
8. Security fix: the preview player and folder browser endpoints (`/backend/streamer` and `/backend/directory`) now only allow files and folders inside the Location of Preroll Media folder. Before, anyone who could reach the port could request them directly to read any file or list any folder on the system, including the settings file with the Plex token. This mainly matters for installs reachable from outside the local network.
9. Fixed the folder browser in the bucket editor listing folders and files in no particular order. They are now sorted by name, folders first.
10. Fixed a new bucket marked as the default bucket not being saved as the default.
11. Fixed sorting holidays by date in the sequence editor for date formats other than month/day/year.
12. Fixed the loading indicator in the sequence editor never stopping when Premier (Calendarific) was selected without an API key.
13. Fixed the dates on Sequence cards and the override end times not following the browser's preferred language (e.g. showing 02/14 instead of 14/02 for UK English in Firefox). They now use the same format as the holiday dates.
14. Fixed the menu button on narrow screens being hard to see in dark mode.
15. Security fix: the settings, including the Plex token, could be read and changed by anyone who could reach the port, without signing in. The Plex token and session details are no longer sent to the browser at all, and saving from a page can no longer change the Plex token or (in Docker) the preroll media folder.
16. Fixed any Plex account being able to sign in and replace the owner's Plex token.
17. Fixed the live-update connection not using the URL base, so it didn't work behind a reverse proxy that only forwards that path.

## 1.5.0

### New Features

1. Added the ability to override sequences, either indefinitely or for a set amount of time.
2. Added an iCal feed of your sequence schedule that can be subscribed to from calendar apps like Google Calendar. The feed URL can be found on the Calendar page and is secured with an API key, which can be viewed and regenerated in Settings.
3. Added caching of Nager.Date (Legacy) holiday calendars to reduce calls to the Nager servers.

### Changes

1. Security updates. Updated Node to version 22 LTS in the Docker image to address CVE-2026-111497 (Node2Shell), a remote code execution flaw in Node's Brotli decoder that is not being patched in Node 20. [[#38](https://github.com/chadwpalm/PrerollPlus/pull/38)]
2. Security updates. Updated all backend and frontend packages to resolve known vulnerabilities, including upgrading React Router to version 7. The remaining reported vulnerabilities are limited to build-time tooling and do not affect the running app.
3. Settings UI improvements.

## 1.4.2

### New Features

1. Added ability to set Base URL through ENV variable at app start. The new variable is APP_BASE_URL. [[#34](https://github.com/chadwpalm/PrerollPlus/discussions/34)]
2. Added an Advanced Setting to disable the deletion of files from buckets when they are deleted from the file system. The reason for this is since the file system is continually being monitored for changes, this solves the issue of files in buckets wrongfully getting deleted when the SMB share temporarily disconnects or fails. Be aware that this will leave ghost files in your buckets if you do legitimately delete a file. Plex will be unable to find the file and simply not play a preroll if this occurs. [[#35](https://github.com/chadwpalm/PrerollPlus/issues/35)]

### Fixes

1. Made Base URL more robust accepting any combination of zero or more leading or trailing slashes and it will still work properly.

## 1.4.1

### Hotfix

1. App was crashing when using Nager.Date (Legacy) calendar.

## 1.4.0

### Changes

1. Documentation is now through a website ([prerollplus.org](https://prerollplus.org)) instead of GitHub wiki.
2. Security updates. Updated all node packages to current versions which removed all package vulnerabilities.
3. Updated Node version to 20 LTS in Docker image.
4. Updated Plex login code to remove outdated and unmaintained 3rd party package which depended on old and vulnerable packages.
5. Updated Docker build process to generate smaller Docker images by stripping out the frontend build files and node modules.
6. Greatly improved logging including more detailed debug code and the ability to set log size limits and maximum archived log files. (Reminder: Debug logging can be turned on in settings, Show Advanced)
7. General code cleanup and housekeeping.

### New Features

1. Schedules can now be based on days of the week. [[#32](https://github.com/chadwpalm/PrerollPlus/discussions/32)]
2. Added ability to include subdirectories when using a directory as a file source for buckets. [[#33](https://github.com/chadwpalm/PrerollPlus/issues/33)]
3. Added ability to change the port the app is running on from settings. The app also accepts an ENV variable on startup APP_PORT which overrides the port in the settings.
4. Added ability to use a URL Base for use with reverse proxies. [[#34](https://github.com/chadwpalm/PrerollPlus/discussions/34)]

### Fixes

1. Fixed issue where holidays were using UTC time rather than local time zones.
2. Improved filtering of system files (like Synology) to cover more operating systems.
3. Updated "App Dir" in the "About" modal to show the proper directory the app is running in.

## 1.3.5

### New Feature

1. You can now designate any Bucket to be a default Bucket and it will auto-populate as the first Bucket when creating a new Sequence. [[#30](https://github.com/chadwpalm/PrerollPlus/discussions/30)]

### Fixes

1. Fixed issue where Preroll Plus could not connect to the Plex server after a version update. [[#31](https://github.com/chadwpalm/PrerollPlus/issues/31)]
2. Force a new Plex login in the UI to create a new Plex token if the token becomes invalid. Updated logs to present a warning and instructions for when this occurs.

## 1.3.4

### New Feature

1. Added the ability to override the daily update of the pre-roll in Plex (typically midnight) using an ENV variable.

### Changes

1. Moved the "Remove" button and the "Up" and "Down" arrow buttons from the bottom of the "Bucket Sequence" table to the top when creating/editing Sequences in order to match the location of the buttons to be similar to when creating/editing Buckets.
2. Added a log output for when the cache directory has successfully been created.

## 1.3.3

### Hotfix

1. An issue in the code was causing the app to crash when setting up for the first time. This only affects first time users.

## 1.3.2

### New Features

1. Added an option in the Settings page to choose the starting day of the week for the Calendar page. Can be set to Sunday, Monday, or Saturday. [[#25](https://github.com/chadwpalm/PrerollPlus/discussions/25)]
2. Dates shown in the Sequence cards on the Sequences page will be formatted per user locale. (eg. 12/30 for U.S. and 30/12 for U.K.) [[#25](https://github.com/chadwpalm/PrerollPlus/discussions/25)]
3. Sequences on the Sequences page can now be sorted by priority or name. [[#25](https://github.com/chadwpalm/PrerollPlus/discussions/25)]
4. Buckets on the Buckets page can now be sorted by name. [[#25](https://github.com/chadwpalm/PrerollPlus/discussions/25)]

### Fix

1. Added "Month" and "Day" labels when editing schedules to remove ambiguity and make it more international friendly.

## 1.3.1

### New Feature

1. Ability to extend a holiday schedule out any number of days before or after the actually holiday to create a "holiday window" rather than using a schedule.

## 1.3.0

### New Features

1. New calendar page. You can now view and cycle through calendar months to see which Sequence will play on a particular day. You can view all current and upcoming year's months.
2. Added a blue box around the currently used Sequence for that day in the Sequences page. [[#22](https://github.com/chadwpalm/PrerollPlus/discussions/22)]

### Fixes

1. Fixed a critical issue where holidays would not have worked correctly for years past 2025.
2. Fixed issue where deleting a newly made Sequence wasn't removing it from the list of cards.

## 1.2.1

### Hotfix

1. Fixed code to prevent app crash when can't connect to calendar API servers. [[#19](https://github.com/chadwpalm/PrerollPlus/issues/19)]
2. Increased timeout for calendar API retrieval. [[#19](https://github.com/chadwpalm/PrerollPlus/issues/19)]
3. Prevent the querying of the calendar APIs when creating a new Sequence and when toggling the schedule and it is not set to Holiday. [[#19](https://github.com/chadwpalm/PrerollPlus/issues/19)]

## 1.2.0

### New Features

1. Addition of a second calendar source (Calendarific) that includes hundreds more holidays to choose from. [[#15](https://github.com/chadwpalm/PrerollPlus/issues/15)]
   a. Calendar APIs have been broken out to two sources you can choose from: Legacy (Nager.Date) which is the original API used, and Premier (Calendarific).
   b. The use of the Premier (Calendarific) calendar API requires signing up to a free account with them which include up to 500 API calls per month.
   c. Calendarific calendars are cached locally to reduce the number of API calls to eliminate the need to pay for a higher account tier.
   d. Calendars are based on year/country/type with type being National, Local, Religious, and Observance.
   e. Caches can be cleared at any time if you wish to pull a fresh copy of the calendars (Settings/Advanced), otherwise new versions will be automatically pulled at the beginning of the calendar year when needed.
   f. The listings for the holidays in the UI now include dates (current year) and the dates should be formatted for your language/country.
   g. In areas where there are states, provinces, or other local regions, holidays may be broken up by those local regions.
   h. Holiday lists in the UI can now be sorted by holiday name or by date.
2. Scheduling conflicts have been removed from the UI and schedule priorities have been put in their place. [[#16](https://github.com/chadwpalm/PrerollPlus/issues/16)]
   a. There can still only be one Sequence that does not have a schedule.

### Changes

1. Changed menu behavior so if there are no buckets you cannot enter the Sequences page and user will be routed to Buckets to start creating one since Sequences are dependent on Buckets.
2. Configuration file schema has been updated to accommodate changes in Sequences such as priorities and information for Calendarific.
   a. Existing configs will be backed up and migrated over to the new schema. Behavior should work as previously intended, but all priorities will be set to N/A until changed.

### Fixes

1. Fixed issue where not having a Bucket name was allowed when source was set to Directory.
2. Fixed issue where information that is saved in a Sequence or Bucket were not updating immediately on cards when saved.
3. Fixed issue where pop-ups were not showing properly in dark mode. [[#14](https://github.com/chadwpalm/PrerollPlus/issues/14)]

## 1.1.2

### Fixes

1. Sequence cards were not showing the scheduled holiday if "Holiday" is chosen as the schedule.

## 1.1.1

### Fixes

1. Brought internal packages up to date.
2. Log file names were using the wrong application.
3. Minor code fixes.

## 1.1.0

### New Feature

1. Added ability to select a holiday for the schedule.

## 1.0.0

### Changes

1. Bring the app out of beta testing.
2. Logging to file. Logs will be found in /config for native installs and the mounted config folder for Docker installs.
3. Removed logging of frontend to backend web router calls.
4. Added "Show/Hide Advanced" options in Settings page and included a logging level toggle.

### Fixes

1. Server list wasn't showing secure connection options when "Secure connections" in the Plex Media Server settings was set to "Required".
2. Dark mode setting was not being preserved in the save file when logging out.
3. Minor fix to file monitoring.

## 0.1.5

### New Feature

1. Added a dark mode which can be toggled on and off [[#5](https://github.com/chadwpalm/PrerollPlus/discussions/5)]
2. You can now choose if you want Buckets to be tied directly to folders, or stay with the current approach of manually selecting files for the Bucket in the UI. [[#2](https://github.com/chadwpalm/PrerollPlus/discussions/2)]
3. Bucket and file listings when editing a Bucket are updated in realtime when files/folders in the filesystem are added/deleted/renamed. [[#2](https://github.com/chadwpalm/PrerollPlus/discussions/2)]

### Minor Fix

1. Moved all inline CSS to external files to make style changes easier
2. Basic code cleanup to remove compiler warnings

## 0.1.4

### Minor Fix

1. Fixed issue where Synology is adding additional info to the file paths causing the monitoring to not work correctly. [[#4](https://github.com/chadwpalm/PrerollPlus/issues/4)]
2. Fixed bug where files added to Buckets had an extra slash if file came from root directory. This also affected the file's ability to be monitored for changes. [[#4](https://github.com/chadwpalm/PrerollPlus/issues/4)]
3. If Bucket is empty due to a backend file removal (since the UI does not allow for saving empty buckets), the Plex string no longer displays "undefined" for that Bucket.
4. Added option for file monitoring through polling for when preroll directory is mounted over an SMB (or similar) share.

## 0.1.3

### Minor Features

1. Update Buckets in settings and Plex string when files in the file system are deleted, renamed, or moved. [[#1](https://github.com/chadwpalm/PrerollPlus/discussions/1)]
2. Deleting a Bucket will update any Sequences it is in and also update the Plex string.
3. Added directory location under the file names in the "Files in buckets" list.
4. "Plex location or preroll media" text box in the Settings tab is not grayed out for Native installs anymore. This is to accommodate users that run their Plex server on a different machine than Preroll Plus. [[#3](https://github.com/chadwpalm/PrerollPlus/issues/3)]

### Bug Fixes

1. Fixed issue where opening a Sequence that contains a recently deleted bucket was generating an error.

## 0.1.2

### Minor Features

1. Make header bar "sticky" to the top of the window. [[#1](https://github.com/chadwpalm/PrerollPlus/discussions/1)]
2. Make list of files in bucket alphabetical. [[#1](https://github.com/chadwpalm/PrerollPlus/discussions/1)]
3. Change "Add" button in buckets to a "left arrow" to match the asthetic of the Sequences page. [[#1](https://github.com/chadwpalm/PrerollPlus/discussions/1)]
4. Sequences and Buckets are now highlighted when editing them. [[#1](https://github.com/chadwpalm/PrerollPlus/discussions/1)]
5. Added a video preview player in the Bucket creation/edit page. [[#1](https://github.com/chadwpalm/PrerollPlus/discussions/1)]

### Bug Fixes

1. Brought back build number which wasn't brought back in previous version after local testing.
2. The file list in Buckets was not indicating if the directory location set in Settings does not exist.

## 0.1.1

### Bug Fixes

1. Fix "Update Available" URL.
2. Fixed output string in Sequences when trying to save without having a sequence name or buckets.
3. Plex server preroll sequence string is updated when a Sequence is deleted to prevent playing an unwanted sequence.
4. Fix error when clicking the button to add a bucket to a sequence when a bucket is not selected. [[#1](https://github.com/chadwpalm/PrerollPlus/discussions/1)]
5. If two identical buckets are used in a sequence, or the same pre-roll is used in two different buckets in the same sequence, Plex will not play the same pre-roll twice.
6. Fixed double slashes in pre-roll string on some file system. [[#1](https://github.com/chadwpalm/PrerollPlus/discussions/1)]
7. Updated server retrieval logic to parse multiple IPs returned from account server list and mark the unreachable IP's as unreachable. [[#1](https://github.com/chadwpalm/PrerollPlus/discussions/1)]

## 0.1.0

Initial beta release
