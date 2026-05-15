#!/bin/bash
# Quick deploy script for manual deployment

echo "🚀 Deploying frontend to Vercel..."
cd /workspaces/JANSETU/frontend
npm run build
npx vercel deploy --prod --confirm

echo ""
echo "🚀 Deploying backend to Render..."
echo "1. Go to: https://render.com/dashboard"
echo "2. Click 'New +' > Web Service"
echo "3. Connect your GitHub repo (SUDHANSHU924/JANSETU)"
echo "4. Set:"
echo "   - Name: jansetu-backend"
echo "   - Runtime: Python 3.12"
echo "   - Build Command: pip install -r requirements.txt"
echo "   - Start Command: uvicorn app.main:app --host 0.0.0.0 --port \$PORT"
echo "   - Root Directory: backend"
echo "5. Add Environment Variables:"
echo "   - SECRET_KEY=your-secret"
echo "   - JWT_SECRET=your-jwt-secret"
echo ""
echo "✅ Setup complete! Render will auto-deploy on push to main."
