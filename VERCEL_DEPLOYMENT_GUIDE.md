# Barrel Delivery - Vercel Deployment Guide

This guide explains how to deploy the Barrel Delivery application to Vercel.

## Prerequisites

1. **Vercel Account**: Create a free account at [vercel.com](https://vercel.com)
2. **GitHub Repository**: Push your project to GitHub
3. **Database**: Set up a MySQL/TiDB database (e.g., PlanetScale, AWS RDS, or local)
4. **Environment Variables**: Gather all required secrets

## Step 1: Prepare Your Repository

```bash
# Ensure all changes are committed
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

## Step 2: Create Vercel Project

1. Go to [vercel.com/new](https://vercel.com/new)
2. Select "Import Git Repository"
3. Choose your GitHub repository
4. Click "Import"

## Step 3: Configure Environment Variables

In the Vercel dashboard, go to **Settings → Environment Variables** and add:

### Required Variables

```
DATABASE_URL = mysql://user:password@host:port/database
JWT_SECRET = [generate a strong random string]
VITE_APP_ID = [your Manus OAuth app ID]
OAUTH_SERVER_URL = https://api.manus.im
VITE_OAUTH_PORTAL_URL = https://manus.im/oauth
OWNER_NAME = [restaurant owner name]
OWNER_OPEN_ID = [owner's OpenID]
```

### Optional Variables (if using Manus services)

```
BUILT_IN_FORGE_API_URL = https://api.manus.im/forge
BUILT_IN_FORGE_API_KEY = [your API key]
VITE_FRONTEND_FORGE_API_URL = https://api.manus.im/forge
VITE_FRONTEND_FORGE_API_KEY = [your frontend key]
VITE_ANALYTICS_ENDPOINT = https://analytics.manus.im
VITE_ANALYTICS_WEBSITE_ID = [your website ID]
VITE_APP_TITLE = Barrel Delivery
VITE_APP_LOGO = /barrel-logo.png
```

## Step 4: Database Setup

### Option A: PlanetScale (Recommended for MySQL)

1. Create a PlanetScale account at [planetscale.com](https://planetscale.com)
2. Create a new database
3. Get the connection string
4. Add to Vercel environment variables as `DATABASE_URL`

### Option B: AWS RDS

1. Create an RDS MySQL instance
2. Get the connection string
3. Add to Vercel environment variables as `DATABASE_URL`

### Option C: Local/Self-Hosted

Ensure your database is accessible from Vercel's servers (public IP or VPN).

## Step 5: Deploy

1. Click **Deploy** in Vercel dashboard
2. Wait for the build to complete
3. Your app will be live at `https://your-project.vercel.app`

## Step 6: Run Database Migrations

After deployment, you need to run migrations:

```bash
# Connect to your Vercel deployment
# Run migrations using Drizzle Kit
pnpm drizzle-kit migrate
```

Or execute SQL migrations manually in your database.

## Step 7: Configure OAuth Redirect URIs

Update your Manus OAuth application settings:

1. Go to Manus OAuth settings
2. Add redirect URI: `https://your-project.vercel.app/api/oauth/callback`
3. Save changes

## Troubleshooting

### Logo Not Displaying

- Logo is stored at `/public/barrel-logo.png`
- Should display automatically on Vercel
- If not, check Vercel build logs

### Database Connection Failed

- Verify `DATABASE_URL` is correct
- Check database credentials
- Ensure database allows connections from Vercel's IP range
- Test connection locally first

### OAuth Not Working

- Verify `VITE_APP_ID` and `OAUTH_SERVER_URL` are correct
- Check redirect URI is added to Manus OAuth settings
- Clear browser cookies and try again

### Build Fails

- Check Vercel build logs for errors
- Ensure all environment variables are set
- Run `pnpm build` locally to test

## Custom Domain

To add a custom domain:

1. In Vercel dashboard, go to **Settings → Domains**
2. Add your custom domain
3. Follow DNS configuration instructions
4. Update OAuth redirect URI to your custom domain

## Monitoring & Logs

- **Vercel Dashboard**: View real-time logs and analytics
- **Database Logs**: Check your database provider's logs
- **Client-Side Errors**: Check browser console (F12)

## Support

For issues, check:
- Vercel documentation: [vercel.com/docs](https://vercel.com/docs)
- Drizzle ORM docs: [orm.drizzle.team](https://orm.drizzle.team)
- tRPC docs: [trpc.io](https://trpc.io)

## Next Steps

After deployment:

1. Test all dashboards (Admin, Kitchen, Driver)
2. Verify logo displays correctly
3. Test login functionality
4. Create test orders and verify delivery tracking
5. Monitor application performance

---

**Note**: The application is now Vercel-ready. All logo references have been updated to use `/barrel-logo.png` from the public folder, which will be automatically served by Vercel.
