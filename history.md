# Preroll Plus Version History

## 1.3.2

### New Features

1. Added an option in the Settings page to choose the starting day of the week for the Calendar page. Can be set to Sunday, Monday, or Saturday. [[#25](https://github.com/chadwpalm/PrerollPlus/discussions/25)]
2. Dates shown in the Sequence cards on the Sequences page will be formatted per user locale. (eg. 12/30 for U.S. and 30/12 for U.K.) [[#25](https://github.com/chadwpalm/PrerollPlus/discussions/25)]
3. Sequences on the Sequences page can now be sorted by priority or name. [[#25](https://github.com/chadwpalm/PrerollPlus/discussions/25)]

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
2. Configuration file scheme has been updated to accommodate changes in Sequences such as priorities and information for Calendarific.
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
