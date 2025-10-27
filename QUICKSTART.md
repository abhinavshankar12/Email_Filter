# ⚡ Quick Start - 5 Minutes to Running

Follow these steps **in order**. I've automated as much as possible!

## Step 1: Azure App Registration (5 minutes)

You need to do this **once** - I can't access Azure for you:

### 1.1 Create the App

1. Open: https://portal.azure.com
2. Search for "Azure Active Directory" (or click it in left menu)
3. Click **"App registrations"** in the left menu
4. Click **"+ New registration"** at the top
5. Fill in:
   ```
   Name: Invora Email Filter
   Supported account types: (Select the first option - Single tenant)
   Redirect URI: http://localhost:3000/auth/callback
   ```
6. Click **"Register"**

### 1.2 Copy Your IDs

After registration, you'll see the Overview page. Copy these:

```
Application (client) ID: ________-____-____-____-____________
Directory (tenant) ID:   ________-____-____-____-____________
```

Keep these handy!

### 1.3 Create a Secret

1. In the left menu, click **"Certificates & secrets"**
2. Click **"+ New client secret"**
3. Description: `Dev Secret`
4. Expires: `24 months`
5. Click **"Add"**
6. **IMMEDIATELY copy the VALUE** (not the Secret ID):
   ```
   Secret VALUE: ________________________________
   ```
   ⚠️ You won't see this again!

### 1.4 Add Permissions

1. In the left menu, click **"API permissions"**
2. Click **"+ Add a permission"**
3. Click **"Microsoft Graph"**
4. Click **"Delegated permissions"**
5. Search for and check these boxes:
   - ☑️ `Mail.Read`
   - ☑️ `Mail.ReadWrite`
   - ☑️ `MailboxSettings.Read`
   - ☑️ `offline_access`
6. Click **"Add permissions"** at the bottom
7. Click **"Grant admin consent for [Your Org]"** button
8. Click **"Yes"** to confirm

✅ Azure setup done!

---

## Step 2: Install and Configure (2 minutes)

Open Terminal and run:

```bash
cd /Users/abhinavshankar/GitHub_Repos/Email_Filter_App

# Make scripts executable
chmod +x setup.sh start.sh

# Run setup
./setup.sh
```

This will:
- Check Node.js version
- Install all dependencies
- Create the `.env` file
- Initialize the database
- Open the `.env` file for editing

### 2.1 Configure .env

When the `.env` file opens, replace these three lines:

```env
GRAPH_TENANT_ID=paste-your-tenant-id-here
GRAPH_CLIENT_ID=paste-your-client-id-here
GRAPH_CLIENT_SECRET=paste-your-secret-value-here
```

Paste the values you copied in Step 1.2 and 1.3.

**Save and close** the file.

---

## Step 3: Start the Servers (1 minute)

```bash
./start.sh
```

You should see:
```
Starting backend server on http://localhost:3000...
Starting add-in server on https://localhost:3001...
```

Keep this terminal open! The servers need to stay running.

---

## Step 4: Sideload the Add-in (2 minutes)

### Option A: Outlook on the Web (Recommended)

1. Open **https://outlook.office.com** in Chrome/Edge
2. Click any email to open it
3. In the email toolbar, click the **three dots** `...` (More actions)
4. Click **"Get Add-ins"**
5. Click the **"My add-ins"** tab (on the left)
6. Under "Custom add-ins", click **"+ Add a custom add-in"** → **"Add from file"**
7. Click **"Choose File"** and navigate to:
   ```
   /Users/abhinavshankar/GitHub_Repos/Email_Filter_App/addin/manifest.xml
   ```
8. Click **"Install"**
9. You'll see warnings - click **"Continue"** and **"Install"**

### Option B: Outlook Desktop (Mac)

1. Open **Outlook** desktop app
2. Click **"Get Add-ins"** in the ribbon
3. Click **"My add-ins"**
4. Click **"+ Add a custom add-in"** → **"Add from file"**
5. Select:
   ```
   /Users/abhinavshankar/GitHub_Repos/Email_Filter_App/addin/manifest.xml
   ```
6. Click **"Install"**

---

## Step 5: Test It! (1 minute)

1. **Open any email** in Outlook
2. Look for the **"Invora"** or **"Check Email"** button in the toolbar
3. Click it
4. A task pane opens on the right with the risk analysis!

You should see:
- 📊 **Risk Score** (0-100)
- 🎯 **Decision** (Safe/Warning/Junk)
- 📋 **Risk Factors** detected
- 🔘 **Action Buttons** (Mark as Junk, Mark as Safe, etc.)

---

## 🎉 Done!

Your email filter is now running! Try opening different emails to see different risk scores.

---

## 🧪 Want to Test the Scoring Engine?

Run the synthetic email test suite:

```bash
cd backend
npm run build
node dist/scripts/test-runner.js
```

This tests 10 realistic phishing/spam scenarios and shows you the scores.

---

## ⚠️ Troubleshooting

### "Add-in doesn't appear in Outlook"
- Make sure both servers are running (check terminal)
- Restart Outlook
- Try Outlook on the Web instead of desktop

### "API Error" or "Failed to analyze message"
- Check backend terminal for errors
- Verify your `.env` has correct Azure credentials
- Make sure you granted admin consent in Step 1.4
- Test the backend: `curl http://localhost:3000/api/health`

### "Certificate error" in browser
- This is normal for `https://localhost:3001`
- Click "Advanced" → "Proceed to localhost (unsafe)"

### Add-in shows blank screen
- Check browser console (F12) for errors
- Make sure add-in server is running on https://localhost:3001
- Try clearing cache and reloading

---

## 🛑 To Stop the Servers

Press `Ctrl+C` in the terminal where you ran `./start.sh`

## 🔄 To Restart Later

Just run:
```bash
cd /Users/abhinavshankar/GitHub_Repos/Email_Filter_App
./start.sh
```

The add-in will remember it's installed!

---

## 📞 Still Stuck?

Check the full documentation:
- `README.md` - Complete guide
- `docs/SETUP.md` - Detailed setup
- Backend logs in the terminal for error messages

---

**That's it! You should now have a working email security filter in your Outlook.** 🎉

