# Preroll Plus

Preroll Plus is a dynamic preroll updater and scheduler. This app bypasses the limitations Plex has for combining random and sequential prerolls (using the "," and ";" delimiters). It works by using Plex webhooks to update the preroll string in Plex whenever a movie is started so that file sets that require randomization and still be randomized while maintaining a broader sequence.

For example:

Plex allows files delimited by commas to play in sequence:

    "preroll1,preroll2,preroll3,preroll4"

This will play preroll1, followed by preroll2, followed by preroll3, etc. Four prerolls are played.

Plex also allows files delimited by semi-colons to play randomly:

    "preroll1;preroll2;preroll3;preroll4"

In this instance Plex will randomly choose **one** of the four prerolls and play it only.

What you **cannot** do with Plex is create a list of prerolls that combine commas and semi-colons.

For example:

    "preroll1;preroll2,preroll3;preroll4"

The intention would be to randomly play either preroll1 or preroll2, and then randomly play preroll3 or preroll4 thus playing two prerolls total.

#### Solution

Preroll Plus replaces semi-colon lists with "buckets" and comma lists with "sequences".

You then create sequences (with or without a schedule) that contain a sequence of buckets. A file in each bucket will play randomly and then move on to the next bucket in a sequence.

Since you can create as many buckets as you'd like, this can generate an infinite amount of combinations as you desire.

Scheduled sequences will automatically assert on the first day the sequence starts. Fall back to a default unscheduled sequence when no scheduled sequenced are in their timeframe.

## Getting Started

### Information

- [Documentation](https://github.com/chadwpalm/PrerollPlus/wiki)
- [Donate](https://www.buymeacoffee.com/lumunarr)

### Features

- Easy to use web-based graphical interface that is also mobile friendly.
- Combine "buckets" and "sequences" to generate your desired preroll functionality.
- Sequences can be scheduled to change throughout the year.
- Can be run natively or in a Docker container.

### Support

- [Discussions](https://github.com/chadwpalm/PrerollPlus/discussions)
- [Issues](https://github.com/chadwpalm/PrerollPlus/issues)

### Licenses

- [GNU GPL v3](http://www.gnu.org/licenses/gpl.html)
- Copyright 2024

_Preroll Plus is not affiliated or endorsed by Plex Inc._
