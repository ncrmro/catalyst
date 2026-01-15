# Setting Up Yazi as Your File Picker on Linux

This guide explains how to configure **Yazi** (a terminal-based file manager) as your default file picker for web browsers on Linux.

## Overview

While browsers typically use graphical file pickers, you can configure Linux to use Yazi instead. This setup leverages the **XDG Desktop Portal** system to intercept file picker requests and redirect them to a terminal window running Yazi.

> **Important:** This configuration is **Linux-only** and requires the XDG Desktop Portal architecture. It does not work on Windows or macOS.

## Prerequisites

- Linux system with systemd and D-Bus
- Yazi installed ([Installation guide](https://github.com/sxyazi/yazi))
- A terminal emulator (Kitty, Alacritty, WezTerm, etc.)
- Basic understanding of shell scripts and configuration files

## Installation Steps

### 1. Install the Portal Backend

You need `xdg-desktop-portal-termfilechooser`, which acts as a bridge between browsers and terminal applications.

**Arch Linux:**
```bash
yay -S xdg-desktop-portal-termfilechooser-git
```

**Other Distributions:**

Build from source:
```bash
git clone https://github.com/GermainZ/xdg-desktop-portal-termfilechooser
cd xdg-desktop-portal-termfilechooser
make
sudo make install
```

### 2. Configure the Portal

Tell your system to use the termfilechooser backend for file selection.

Create or edit `~/.config/xdg-desktop-portal/portals.conf`:

```ini
[preferred]
# Use termfilechooser for picking files
org.freedesktop.impl.portal.FileChooser=termfilechooser
```

### 3. Create the Yazi Wrapper Script

The portal needs a script to launch Yazi and capture the selected file path.

Create `~/.config/xdg-desktop-portal-termfilechooser/yazi-wrapper.sh`:

```bash
#!/bin/sh
# Wrapper to use Yazi as a file picker for XDG Desktop Portal

# Arguments provided by termfilechooser
out="$1"    # Where to write the selected path
saved="$2"  # If true, we are saving a file; if false, opening
# Additional args for multiple files, directory mode, etc. may be available

# Launch Yazi in a new terminal window
# Adjust the terminal emulator command to match your setup
# --chooser-file is the Yazi flag that writes the selection to the output file

# For Kitty:
kitty --class yazi-picker -e yazi --chooser-file="$out"

# For Alacritty:
# alacritty --class yazi-picker -e yazi --chooser-file="$out"

# For WezTerm:
# wezterm start --class yazi-picker -- yazi --chooser-file="$out"

# For foot:
# foot --app-id=yazi-picker yazi --chooser-file="$out"
```

Make the script executable:
```bash
chmod +x ~/.config/xdg-desktop-portal-termfilechooser/yazi-wrapper.sh
```

### 4. Configure Termfilechooser

Tell the termfilechooser backend to use your Yazi wrapper script.

Create or edit `~/.config/xdg-desktop-portal-termfilechooser/config`:

```ini
[filechooser]
cmd=/home/YOUR_USERNAME/.config/xdg-desktop-portal-termfilechooser/yazi-wrapper.sh
```

**Important:** Replace `YOUR_USERNAME` with your actual username, or use `$HOME` in the path if supported.

### 5. Restart XDG Desktop Portal

For changes to take effect, restart the desktop portal service:

```bash
systemctl --user restart xdg-desktop-portal.service
```

Or simply log out and log back in.

## Browser Configuration

### Firefox

Enable portal usage for file pickers:

1. Open `about:config` in Firefox
2. Search for `widget.use-xdg-desktop-portal.file-picker`
3. Set the value to `1` (Always use portal)

### Chromium / Chrome

Ensure the browser uses the portal system:

**For Wayland users:**
```bash
# Launch with Wayland backend
chromium --enable-features=UseOzonePlatform --ozone-platform=wayland
```

**For X11 users:**

Set environment variable before launching:
```bash
export GTK_USE_PORTAL=1
chromium
```

To make this permanent, add it to your shell profile (`~/.bashrc` or `~/.zshrc`):
```bash
echo 'export GTK_USE_PORTAL=1' >> ~/.bashrc
```

## Terminal Emulator Configuration

Choose the terminal emulator section that matches your setup:

### Kitty (Default in Script)

The default script uses Kitty. No additional configuration needed if you have Kitty installed.

```bash
kitty --class yazi-picker -e yazi --chooser-file="$out"
```

### Alacritty

Modify the wrapper script to use:
```bash
alacritty --class yazi-picker -e yazi --chooser-file="$out"
```

### WezTerm

Modify the wrapper script to use:
```bash
wezterm start --class yazi-picker -- yazi --chooser-file="$out"
```

### foot

Modify the wrapper script to use:
```bash
foot --app-id=yazi-picker yazi --chooser-file="$out"
```

### Other Terminals

For other terminal emulators, use the format:
```bash
your-terminal [class/app-id-flag] yazi-picker -e yazi --chooser-file="$out"
```

## Troubleshooting

### File Picker Doesn't Launch

**Check if the portal service is running:**
```bash
systemctl --user status xdg-desktop-portal.service
systemctl --user status xdg-desktop-portal-termfilechooser.service
```

**Restart services:**
```bash
systemctl --user restart xdg-desktop-portal.service
systemctl --user restart xdg-desktop-portal-termfilechooser.service
```

**Check portal configuration:**
```bash
cat ~/.config/xdg-desktop-portal/portals.conf
```

### Yazi Doesn't Open

**Verify the wrapper script:**
- Check if the script is executable: `ls -l ~/.config/xdg-desktop-portal-termfilechooser/yazi-wrapper.sh`
- Test it manually: `~/.config/xdg-desktop-portal-termfilechooser/yazi-wrapper.sh /tmp/test.txt false`
- Check for errors in journal: `journalctl --user -u xdg-desktop-portal-termfilechooser.service -f`

**Verify Yazi is installed:**
```bash
which yazi
yazi --version
```

### Browser Still Uses GTK File Picker

**For Firefox:**
- Verify `widget.use-xdg-desktop-portal.file-picker` is set to `1` in `about:config`
- Restart Firefox completely

**For Chrome/Chromium:**
- Ensure `GTK_USE_PORTAL=1` is set in your environment
- Check if you're using the Wayland backend correctly
- Try launching from terminal with explicit flags

### "Save As" Dialogs Don't Work Properly

**Issue:** Yazi is designed to select existing files, not create new ones.

**Workaround:**
1. Navigate to the desired directory in Yazi
2. Press `a` to create a new file
3. Enter the filename
4. Select the newly created file

**Alternative:** Use a different wrapper that handles save dialogs:
```bash
#!/bin/sh
out="$1"
saved="$2"

if [ "$saved" = "true" ]; then
    # For save dialogs, open in the directory and let user create file
    # You may want to pass a default filename if available
    kitty --class yazi-picker -e sh -c "yazi --chooser-file='$out' && touch $(cat '$out' 2>/dev/null)"
else
    # For open dialogs, normal behavior
    kitty --class yazi-picker -e yazi --chooser-file="$out"
fi
```

### Multiple File Selection

To enable selecting multiple files, modify your Yazi configuration (`~/.config/yazi/yazi.toml`):

```toml
[opener]
multi = { run = 'echo "$@" > "$1"', block = true }
```

Then in your wrapper script, you can handle multiple selections by checking additional arguments.

## Known Limitations

1. **Linux Only:** Requires XDG Desktop Portal architecture (Linux-specific)
2. **Save Dialogs:** Terminal file managers aren't optimized for "Save As" workflows
3. **Complexity:** System updates may occasionally break the integration
4. **Desktop Environment:** Some DEs have their own portal backends that may conflict
5. **File Type Filters:** Browser file type filters (e.g., "Images only") may not be fully supported

## Advanced Configuration

### Custom Yazi Configuration for File Picking

You can create a dedicated Yazi configuration for file picking by using Yazi's config directory override.

Create `~/.config/yazi-picker/yazi.toml`:
```toml
[manager]
show_hidden = true
sort_by = "modified"
sort_reverse = true
linemode = "size"
```

Modify wrapper to use custom config:
```bash
kitty --class yazi-picker -e yazi --chooser-file="$out" --config-dir="$HOME/.config/yazi-picker"
```

### Floating Window for File Picker

If your window manager supports it, you can configure the picker to appear as a floating window.

**For i3/sway:**
Add to your config:
```
for_window [app_id="yazi-picker"] floating enable, resize set 1200 800
for_window [class="yazi-picker"] floating enable, resize set 1200 800
```

**For Hyprland:**
```
windowrule = float, ^(yazi-picker)$
windowrule = size 1200 800, ^(yazi-picker)$
windowrule = center, ^(yazi-picker)$
```

## Verification

Test your setup:

1. Open Firefox or Chrome
2. Navigate to a website with a file upload button (e.g., GitHub issue attachments)
3. Click the file upload button
4. You should see Yazi open in a terminal window
5. Navigate to a file and press Enter to select it
6. The file should be uploaded to the website

## References

- [Yazi GitHub Repository](https://github.com/sxyazi/yazi)
- [xdg-desktop-portal-termfilechooser](https://github.com/GermainZ/xdg-desktop-portal-termfilechooser)
- [XDG Desktop Portal Documentation](https://flatpak.github.io/xdg-desktop-portal/)
- [Arch Wiki: XDG Desktop Portal](https://wiki.archlinux.org/title/XDG_Desktop_Portal)

## Alternative: Using Other TUI File Managers

This same approach works with other terminal file managers:

- **ranger:** Replace `yazi --chooser-file="$out"` with `ranger --choosefile="$out"`
- **lf:** Replace with `lf -selection-path="$out"`
- **nnn:** Replace with `nnn -p "$out"`

Each may require slightly different flags. Consult their documentation for the correct "chooser" or "selection" flag.

## Feedback and Issues

If you encounter issues with this setup:

1. Check the troubleshooting section above
2. Review portal service logs: `journalctl --user -u xdg-desktop-portal.service -f`
3. Test the wrapper script manually
4. Verify all paths and permissions are correct
5. Ensure your desktop environment doesn't override the portal configuration

## Contributing

Found a better way to configure this? Have improvements for specific desktop environments or terminal emulators? Contributions to this documentation are welcome!
