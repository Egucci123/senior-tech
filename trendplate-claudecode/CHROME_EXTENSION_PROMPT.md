# Chrome Extension API Key Collection — Trendplate Setup

Use this prompt in Claude's Chrome extension (Claude in Chrome) to collect all API keys needed for Trendplate. Run each section one at a time.

---

## PROMPT A — Supabase keys
(Use this while on the Supabase dashboard)

```
I'm setting up a project called Trendplate and need to collect my Supabase API keys. 

Please navigate to:
1. supabase.com — sign in if needed
2. Click into my project called "trendplate" (or help me create one if it doesn't exist — name: trendplate, region: US East, generate a database password and save it)
3. Go to Settings → API
4. Find and copy these 3 values for me:
   - Project URL (looks like https://xxxxxxxxxxxx.supabase.co)
   - anon / public key (long string starting with "eyJ...")
   - service_role / secret key (different long string starting with "eyJ...")

Display all 3 values clearly so I can copy them into my .env.local file.

Also, while you're there:
5. Go to the SQL Editor → New query
6. Open the file supabase/001_phase1_schema.sql from my trendplate project folder
7. Paste the contents and click Run
8. Confirm the two tables (raw_trends and recipes) were created successfully
```

---

## PROMPT B — ScrapeCreators key
(Use this while on the ScrapeCreators site)

```
I need to get my ScrapeCreators API key for the Trendplate project.

Please:
1. Navigate to app.scrapecreators.com
2. Sign me in or help me create an account (use Google sign-in if available)
3. Once on the dashboard, find and copy my API key
4. Check how many free credits I have remaining
5. Display the API key clearly so I can paste it into my .env.local file

The key will go in the variable: SCRAPECREATORS_API_KEY
```

---

## PROMPT C — Anthropic key
(Use this while on the Anthropic console)

```
I need to create an Anthropic API key for the Trendplate project.

Please:
1. Navigate to console.anthropic.com
2. Sign in or help me create an account
3. Go to the API Keys section
4. Create a new key — name it "trendplate-prod"
5. Copy and display the key immediately (it only shows once!)
6. Then go to the Billing section and confirm I have a payment method or credit balance
   - If no balance: help me navigate to add $10 in credits (Settings → Billing → Add credits)

The key will go in the variable: ANTHROPIC_API_KEY

Important: copy the key before navigating away — it cannot be retrieved after leaving the page.
```

---

## PROMPT D — Vercel deploy + env vars
(Use this after the app is tested locally and working)

```
I need to deploy the Trendplate app to Vercel and configure the environment variables.

Please:
1. Navigate to vercel.com — sign in or create account
2. Click "Add New Project"
3. Import from GitHub — if the project isn't on GitHub yet, help me:
   a. Go to github.com → create a new repository called "trendplate"
   b. Push my local trendplate folder to it (I'll need Git commands to run locally)
4. Once the project is imported in Vercel, go to:
   Settings → Environment Variables
5. Add each of these variables (I'll tell you the values):
   - SCRAPECREATORS_API_KEY
   - ANTHROPIC_API_KEY
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY
   - CRON_SECRET
6. After all vars are added, trigger a new deployment
7. Once deployed, confirm the site is live at the Vercel URL

The vercel.json file already contains the cron schedule — confirm it shows up under
Project Settings → Crons after deployment.
```

---

## Notes for using these prompts

- Run Prompt A first — Supabase is the foundation
- Run Prompts B and C in any order — just getting keys
- Run Prompt D last — only after `node scripts/trigger-cron.js` works locally
- If Claude in Chrome gets stuck on a CAPTCHA or login, just handle that step manually then tell it to continue
- Store all keys in a password manager or secure note immediately after collecting them
