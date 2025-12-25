# Terminal Improvement - Quick Start

## 🚀 Run These Commands

```bash
# 1. Go to web directory
cd web

# 2. Install dependencies (this also runs next-ws patch)
npm install

# 3. Create WebSocket API route
node scripts/setup-terminal-websocket.js

# 4. Start dev server
npm run dev
```

## ✅ Test It

1. Open browser: http://localhost:3000
2. Navigate to any preview environment page
3. Click "Shell" button on a running container
4. You should see:
   - Improved terminal modal (larger, better colors)
   - Green "Connected" indicator in top-right
   - Real-time interactive shell (type any command)
   - Terminal that resizes with window

## 📋 Verify Everything Works

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Tests
npm run test:unit
```

## 🔍 What Changed

**Before:** Request/response terminal with command-by-command execution
**After:** Real-time WebSocket terminal with full interactive shell

## 📚 Full Documentation

- **Setup Instructions**: `web/TERMINAL_SETUP.md`
- **Technical Details**: `web/TERMINAL_IMPROVEMENTS.md`
- **Status Report**: `TERMINAL_STATUS.md`

## ⚠️ If Something Goes Wrong

### WebSocket Not Connecting

```bash
# Re-run the patch
cd web
npx next-ws patch

# Restart dev server
npm run dev
```

### TypeScript Errors

```bash
# Check for errors
npm run typecheck

# If @types/ws is missing
npm install --save-dev @types/ws
```

### Terminal Not Loading

1. Check browser console for errors
2. Verify `src/app/api/terminal/route.ts` exists
3. Clear browser cache
4. Restart dev server

## 💡 Quick Test Commands

Once the terminal is open, try these:

```bash
# See current directory
pwd

# List files
ls -la

# Check environment variables
env

# Run a simple command
echo "Hello from the terminal!"

# Check container info
hostname
whoami
```

## 🎯 Success Indicators

- ✅ Green "Connected" badge visible
- ✅ Commands execute instantly (no delay)
- ✅ Can type characters and see them immediately
- ✅ Backspace, Ctrl+C, and Ctrl+D work
- ✅ Terminal resizes when you resize window/modal

## 📸 Screenshots Needed

Please capture:
1. Terminal modal open with "Connected" indicator
2. Interactive command execution
3. Terminal showing full screen

Upload to PR description or comments.

## 🤔 Questions?

Check the full documentation files or ask in PR comments!
