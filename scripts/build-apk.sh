#!/bin/bash

# Exit on any error
set -e

echo "🚀 Starting Android APK Build Process..."

echo "📦 Installing current dependencies..."
npm install

echo "🏗️  Building web assets..."
npm run build

echo "🔄 Syncing Capacitor with Android..."
npx cap sync android

echo "🔑 Making gradle wrapper executable..."
chmod +x android/gradlew

echo "⚙️  Building the APK (Debug)..."
cd android
./gradlew assembleDebug
cd ..

echo "✅ App built successfully!"

# Prepare output directory
mkdir -p dist_apk

echo "🚚 Copying APK to output folder..."
cp android/app/build/outputs/apk/debug/app-debug.apk dist_apk/Mimbar_AI_Beta.apk

echo "🎉 Done! You can find your APK at: dist_apk/Mimbar_AI_Beta.apk"
