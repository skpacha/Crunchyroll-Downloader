## Crunchyroll Downloader

<img src="assets/example.png">

This is a GUI application that lets you download anime episodes from Crunchyroll.

### Features:
- Download anime episodes in mp4 format, and specify a quality (1080p, 720p, 480p, etc.)
- Download episodes with soft subtitles in mkv format
- Download the audio of an episode in mp3 format
- Download the m3u8 playlist (very fast, and still playable with the VLC player)
- Download all of the episode thumbnails in png format
- Download the subtitles of an episode (ass format)
- Download all of the episodes in a season (detected by the link or if the search query has no numbers)
- If you have a premium account you can login to download premium episodes
- Use the web browser to download directly from the website
- Control the conversion process (pause, resume, stop, delete, etc.)

### Output Template

You can specify a custom output path. The default is `{seasonTitle} {episodeNumber}`. Adding slashes will create sub-folders, ex. `{seriesTitle}/{seasonTitle}/{episodeTitle}`. These are the available replacements:

{seasonTitle} - The title of the season \
{episodeTitle} - The title of the episode \
{seriesTitle} - The title of the series (ex. The series of SAO II is "Sword Art Online") \
{episodeNumber} - The number of the episode \
{resolution} - The resolution, excluding the "p". Only available for video formats.

### Installation

Download the latest exe installer from the [releases](https://github.com/Tenpi/Crunchyroll-Downloader/releases) tab. You may get a warning message along the lines of "running this app can harm your PC", but don't worry because it's safe. Updates are able to be installed automatically.

### Bugs and Requests

You can open an issue on my GitHub repository. I appreciate any requests, but I can't guarantee that I will fulfill all of them.

### Disclaimer

This tool is for personal usage/offline viewing convenience only. If you like anime, then support the industry by buying merch, DVD's, CR premium, etc.
