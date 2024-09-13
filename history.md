# Preroll Plus Version History

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
