# nemfile

**nemfile is a zero-config file transfer tool that moves files, screenshots and text between your phone, iPad and computer over your local Wi-Fi network — no cloud, no account, and no app to install on the phone.** You run one command on your computer, scan a QR code with your phone, and drop files straight into the browser.

```bash
npx nemfile
```

That's it. Open the printed URL or scan the QR code on your phone. Files land in an `uploads/` folder next to where you ran the command.

[![npm version](https://img.shields.io/npm/v/nemfile.svg)](https://www.npmjs.com/package/nemfile)
[![npm downloads](https://img.shields.io/npm/dm/nemfile.svg)](https://www.npmjs.com/package/nemfile)
[![license](https://img.shields.io/npm/l/nemfile.svg)](./LICENSE)
[![node](https://img.shields.io/node/v/nemfile.svg)](https://nodejs.org)

---

## Why nemfile

Getting a screenshot off an iPhone and onto a Windows or Linux machine usually means emailing yourself, uploading to a cloud drive, or plugging in a cable. AirDrop only works between Apple devices. nemfile replaces all of that with a local web page:

- **No account, no cloud** — files never leave your network unless you turn on the public tunnel.
- **Nothing to install on the phone** — the phone just opens a browser.
- **Works across every platform** — iPhone, iPad, Android, Windows, macOS, Linux.
- **Instant** — transfers run at Wi-Fi speed, not upload speed.

## Features

| Feature | Description |
| --- | --- |
| Drag-and-drop upload | Drop any file type into the page, up to 2 GB per file |
| Phone camera roll upload | Pick photos and videos straight from the iOS/Android picker |
| QR code pairing | Scan to open the page — no typing IP addresses |
| Live gallery | Image and video thumbnails appear on every connected device instantly |
| Realtime sync | Server-sent events push new uploads to all open tabs, no refresh |
| Text clips | Paste text on one device, read it on another — a cross-platform clipboard |
| One-click copy | Copy an image to the system clipboard, or copy its LAN URL |
| Download buttons | Grab any uploaded file back down to whatever device you're on |
| Public tunnel | Optional `localtunnel` URL so the page works outside your Wi-Fi |
| Standalone binaries | Prebuilt executables for Linux, macOS and Windows — no Node needed |

## Install

### Run it without installing (recommended)

```bash
npx nemfile
```

### Install globally

```bash
npm install -g nemfile
nemfile
```

### Standalone binary — no Node.js required

Download the executable for your OS from the [latest release](https://github.com/quytstudio/nemfile/releases/latest):

```bash
# Linux
chmod +x nemfile-linux && ./nemfile-linux

# macOS
chmod +x nemfile-macos && ./nemfile-macos
```

On Windows, run `nemfile-win.exe`.

## Usage

Start the server on the computer you want the files to end up on:

```bash
cd ~/Desktop        # files will be saved to ~/Desktop/uploads
npx nemfile
```

nemfile prints three addresses:

```
  Local:   http://localhost:3333
  LAN:     http://192.168.1.10:3333      ← open this on your phone
  Public:  https://xxxx.loca.lt          ← works outside your Wi-Fi
```

Open the **LAN** address on your phone — or scan the QR code shown on the page — and you get an upload box. Anything you drop there appears in the gallery on every connected device, and is written to `uploads/` on your computer.

To share text instead of a file, paste into the text box and hit send; it shows up as a clip on every other device.

## How it works

nemfile starts a small Express server on port `3333` bound to `0.0.0.0`, so any device on the same Wi-Fi can reach it. Uploads are handled by `multer` and written to `./uploads`. A server-sent-events stream keeps every open browser tab in sync, and `qrcode` renders the pairing QR codes. Optionally, `localtunnel` exposes the same page on a public HTTPS URL for when the two devices aren't on the same network.

There is no database, no telemetry, and no external service in the default path — the LAN transfer is a direct HTTP request from your phone to your computer.

## FAQ

### How do I transfer files from iPhone to Windows without iTunes or iCloud?

Run `npx nemfile` on the Windows machine, then open the printed LAN address on the iPhone and pick your photos. The files are written straight to the `uploads/` folder on Windows. No iTunes, no iCloud, no cable.

### Is nemfile an AirDrop alternative for Windows and Android?

Yes — it covers the same job (send a file to a nearby device) but works between any two platforms, because the receiving side is just a web page. It is not a native AirDrop implementation; it uses your Wi-Fi network and a browser.

### Do my files get uploaded to a cloud server?

No. By default the transfer stays entirely on your local network. Files are saved to a folder on your own computer. The only exception is the optional public tunnel, which relays traffic through `loca.lt` so devices outside your Wi-Fi can reach the page — skip it if you don't need it.

### What's the maximum file size?

2 GB per file. Since transfers happen over local Wi-Fi rather than your internet upload link, large videos move at LAN speed.

### What file types are supported?

All of them. Images (`png`, `jpg`, `heic`, `webp`, `avif`, `gif`) and videos (`mp4`, `mov`, `webm`, `mkv`) get inline thumbnails and previews; everything else uploads fine and shows a file-type icon.

### Do I need to install an app on my phone?

No. The phone only needs a browser. That's the main reason nemfile exists.

### Does it work without internet?

Yes, for LAN transfers — you only need the two devices on the same Wi-Fi, not a working internet connection. The optional public tunnel does require internet.

### Which port does nemfile use?

Port `3333`, bound to all interfaces so other devices on the network can connect. Make sure your firewall allows it.

### Where are uploaded files saved?

In an `uploads/` directory created inside the folder you ran the command from. `cd` somewhere else first if you want them elsewhere.

### Is it safe to leave running?

On a trusted home or office network, yes — but note that anyone who can reach the port can upload and browse files. Don't leave the public tunnel open on an untrusted network, and stop the server (`Ctrl+C`) when you're done.

## Requirements

- Node.js 18 or newer (only for the `npx`/npm install path — the standalone binaries need nothing)
- Both devices on the same Wi-Fi network, for LAN mode

## Contributing

Issues and pull requests are welcome at [github.com/quytstudio/nemfile](https://github.com/quytstudio/nemfile).

```bash
git clone https://github.com/quytstudio/nemfile.git
cd nemfile
npm install
npm start
```

## License

MIT © [phamquyetthang](https://github.com/phamquyetthang)
