# Quick Reference - Smart Factory IoT Updates

## 🎨 Color Changes
**File**: `client/src/index.css`
- Warning color reduced from `oklch(0.7 0.18 55)` to `oklch(0.60 0.10 55)`
- Lower saturation for better eye comfort
- Maintains orange aesthetic

## 🔙 Back Button Logic
**File**: `client/src/components/DashboardLayout.tsx`
- Shows "Back to Project" when referrer includes `druhustle.github.io/portfolio`
- Hidden when accessed from GitHub repository
- Uses `window.history.back()` for navigation

## 🚀 CI/CD Workflows
**Files**: `.github/workflows/ci.yml` and `backend-ci.yml`
- Automatic deployment to GitHub Pages on push to main
- Backend testing on server code changes
- Caching enabled for faster builds

## 🏷️ Branding Updates
**Files**: 
- `client/src/components/AuthDialog.tsx` (renamed from ManusDialog)
- `client/src/_core/hooks/useAuth.ts`
- Removed all Manus references
- Generic naming for portability

## ✅ SOLID Principles
- No violations found
- Grade: A+ (Outstanding)
- All principles properly implemented

---
**Status**: Ready for Production ✓
