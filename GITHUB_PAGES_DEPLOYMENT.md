# 🚀 Deploy Frontend to GitHub Pages

This guide shows you how to deploy your ASU Facilities Hours frontend to **GitHub Pages** for free hosting.

## 🎯 Deployment Options

### Option 1: Automatic Deployment (Recommended)
GitHub Actions automatically deploys when you push to main branch.

### Option 2: Manual Deployment  
Deploy manually using npm commands.

---

## 🔧 Setup Instructions

### Step 1: Update Repository Settings

1. **Go to your GitHub repository**
2. **Click Settings** → **Pages**
3. **Set Source** to "GitHub Actions"
4. **Save the settings**

### Step 2: Configure Environment Variables

1. **Go to Settings** → **Secrets and Variables** → **Actions**
2. **Add Repository Secret**:
   - **Name**: `REACT_APP_API_URL`
   - **Value**: `https://your-backend-url.onrender.com`

### Step 3: Update Package.json Homepage

Edit `frontend/package.json` and update the homepage URL:

```json
{
  "homepage": "https://YOUR_USERNAME.github.io/ASU-Facilities-Hours-of-Operation-Widget"
}
```

Replace `YOUR_USERNAME` with your actual GitHub username.

### Step 4: Install Dependencies

```bash
cd frontend
npm install gh-pages --save-dev
```

---

## 🚀 Deployment Methods

### Method 1: Automatic (GitHub Actions)

**✅ Already configured!** Just push your code:

```bash
git add .
git commit -m "Deploy to GitHub Pages"
git push origin main
```

The workflow will:
1. Build your React app
2. Deploy to GitHub Pages
3. Make it available at: `https://yourusername.github.io/ASU-Facilities-Hours-of-Operation-Widget`

### Method 2: Manual Deployment

```bash
cd frontend
npm run deploy
```

This will:
1. Build the app (`npm run build`)
2. Deploy to `gh-pages` branch
3. Make it live on GitHub Pages

---

## 🔍 Verification

After deployment, your site will be available at:
```
https://YOUR_USERNAME.github.io/ASU-Facilities-Hours-of-Operation-Widget
```

### Check Deployment Status:
1. **Go to Actions tab** in your repository
2. **See the deployment workflow** running
3. **Click on the workflow** to see progress
4. **Green checkmark** = successful deployment

---

## 🛠️ Troubleshooting

### Issue 1: 404 on Page Refresh
**Problem**: React Router doesn't work with GitHub Pages by default.

**Solution**: Add a `404.html` file that redirects to `index.html`:

```bash
# Create 404.html in frontend/public/
cp frontend/public/index.html frontend/public/404.html
```

### Issue 2: API Calls Failing
**Problem**: CORS issues or wrong API URL.

**Solutions**:
1. **Check API URL**: Ensure `REACT_APP_API_URL` secret is correct
2. **Backend CORS**: Update backend to allow GitHub Pages domain
3. **HTTPS**: Ensure backend uses HTTPS (required for GitHub Pages)

### Issue 3: Build Fails
**Problem**: Build errors in GitHub Actions.

**Solutions**:
1. **Test locally**: Run `npm run build` in frontend directory
2. **Check logs**: View Actions tab for detailed error messages
3. **Dependencies**: Ensure all packages are properly installed

### Issue 4: Images/Assets Not Loading
**Problem**: Relative paths don't work with GitHub Pages subdirectory.

**Solution**: Use environment variables in your React app:
```javascript
const publicUrl = process.env.PUBLIC_URL || '';
<img src={`${publicUrl}/logo.png`} alt="Logo" />
```

---

## 🔄 Updating Your Site

### Automatic Updates
Every time you push to the main branch, GitHub Pages will automatically update.

### Manual Updates
```bash
cd frontend
npm run deploy
```

---

## 🌐 Custom Domain (Optional)

Want to use your own domain? 

1. **Add CNAME file** in `frontend/public/CNAME`:
   ```
   your-domain.com
   ```

2. **Configure DNS** with your domain provider:
   - **CNAME record**: `yourusername.github.io`

3. **Enable HTTPS** in repository Settings → Pages

---

## 📊 Comparison: GitHub Pages vs Vercel

| Feature | GitHub Pages | Vercel |
|---------|-------------|---------|
| **Cost** | Free | Free (with limits) |
| **Setup** | Medium | Easy |
| **Custom Domain** | Yes | Yes |
| **HTTPS** | Yes | Yes |
| **Build Speed** | Medium | Fast |
| **Edge Network** | GitHub CDN | Global CDN |
| **Environment Variables** | Limited | Full support |

---

## 🎯 Complete Deployment Checklist

- [ ] Repository Settings → Pages → Source = "GitHub Actions"
- [ ] Add `REACT_APP_API_URL` secret
- [ ] Update `homepage` in package.json
- [ ] Install `gh-pages` dependency
- [ ] Push code to main branch
- [ ] Check Actions tab for deployment status
- [ ] Visit your live site!

---

## 📞 Need Help?

If you encounter issues:

1. **Check GitHub Actions logs** for detailed error messages
2. **Test locally** with `npm run build` 
3. **Verify backend API** is running and accessible
4. **Check browser console** for client-side errors

Your site will be live at: `https://YOUR_USERNAME.github.io/ASU-Facilities-Hours-of-Operation-Widget`

**Happy deploying! 🚀** 