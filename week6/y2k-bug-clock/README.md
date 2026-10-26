# Y2K Bug Clock

## Concept

The Y2K bug was a real timekeeping crisis in computing history. To save memory, early computers stored years as two digits (`99` meant 1999).
People feared that when 1999 rolled over to 2000, `00` would be read as **1900**, and time inside every system would "go back a hundred years."

This clock replays that moment over and over: **every minute is another 11:59 PM on December 31, 1999**.
At the top of each minute, the system makes the Y2K mistake again. Time no longer flows smoothly. It is counted out in a series of system crashes.

## How to Read the Time

| Unit of time | Visual representation |
|---|---|
| Seconds | The "Preparing for the year 2000..." progress bar fills from 0% to 100% |
| Minutes | The number of error popups piled up on the desktop (minute 37 = 37 popups) |
| Each new minute | The year rolls from 99 to 00 and is misread as 1900, triggering a blue screen and screen tearing |
| Hours | Green 7-segment LCD digits and the taskbar clock. On the hour, every error is cleared and the system "restarts" |

## Visual References

A Windows Me (Millennium Edition, 2000) desktop: the classic icons in two columns (My Documents, My Computer, Outlook Express, Windows Media Player…), the warm grey window frames, blue-to-light-blue title bars on the active window and grey ones on inactive windows, underlined menu letters, a working Start menu with the vertical "Windows Me Millennium Edition" banner, Quick Launch and system tray, the hourglass cursor, and the Blue Screen of Death. The sketch runs at only 12 frames per second, so it feels like a slow PC from 2000. The time is shown with green 7-segment LCD digits, like digital clocks and media players of the era.

The wallpaper is `bliss.png`, used as-is.

## Loop Mode

By default (`LOOP_MODE = true` in `sketch.js`) the clock skips ahead to :50, shows only the last 10 seconds of each minute, crashes, and starts again at :50 of the next minute. Each loop still counts as one minute, so the error popups keep piling up. Set `LOOP_MODE = false` to follow real time.

## Controls

| Key | Action |
|---|---|
| F | Toggle 20× fast-forward |
| J | Jump to :59:55 of the current hour to see the top-of-the-hour crash |
| G | Trigger a glitch manually |
| R | Return to real time (turns loop mode off) |
| Click Start | Open the Start menu. "Shut Down..." doesn't work: it is still 1999 |

## Techniques Used

- `hour()` / `minute()` / `second()` to get the time
- A class, `ErrorPopup`, for the error windows
- A 7-segment display: each digit 0–9 is a list of which segments (a–g) light up
- `frameRate(12)` for a deliberately choppy, period-accurate feel
- `mousePressed()` and hit-testing for the Start button and Start menu
- `drawingContext` for the wallpaper image, title-bar gradients and slice displacement (glitch effect)
- An "EASY SETTINGS" block at the top of `sketch.js` for colors, text, and counts
- `nf()` for leading zeros
