# Preroll Plus Version History

## 0.1.4

### Minor Fix

1. Fixed issue where Synology is adding additional info to the file paths causing the monitoring to not work correctly. [[#4](https://github.com/chadwpalm/PrerollPlus/issues/4)]
2. Fixed bug where files added to Buckets had an extra slash if file came from root directory. This also affected the file's ability to be monitored for changes. [[#4](https://github.com/chadwpalm/PrerollPlus/issues/4)]
3. If Bucket is empty due to a backend file removal (since the UI does not allow for saving empty buckets), the Plex string no longer displays "undefined" for that Bucket.

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
