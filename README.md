# Aryan Patel Portfolio: Setup

## 1. Firebase
1. console.firebase.google.com: create a project (Analytics is not needed).
2. Build > Authentication > Get started > turn on Email/Password. Under Users, add your own email and password. This is your admin login.
3. Build > Firestore Database > Create database (production mode).
4. Firestore > Rules: paste this, replace YOUR_ADMIN_EMAIL with your admin email, then Publish:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.email == 'YOUR_ADMIN_EMAIL';
    }
  }
}
```
5. Project settings (gear) > Your apps > Web (</>) > register app. Copy the config values into `firebase-config.js`.
6. Firestore needs a sorted index only for single fields, so no extra index setup is required.

## 2. GitHub
Upload all files in this folder (not the folder itself) to your repo: Add file > Upload files > Commit changes.

## 3. Cloudflare Pages
Cloudflare dashboard > Workers & Pages > Create > Pages > Connect to Git > choose `portfolio`. Leave the build command empty and the output folder as `/`. Deploy.

## 4. After deploy
Firebase Console > Authentication > Settings > Authorized domains > Add domain: your `xxxx.pages.dev` address. Without this, admin login will not work.

Admin page: `https://your-site/admin.html` (not linked from the public site).
