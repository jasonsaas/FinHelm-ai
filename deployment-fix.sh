#!/bin/bash

echo "🚀 Starting FinHelm AI Deployment Fix Script"

# Step 1: Install dependencies
echo "📦 Installing dependencies..."
npm install
cd frontend && npm install && cd ..

# Step 2: Generate Convex types
echo "🔧 Generating Convex types..."
npx convex codegen

# Step 3: Fix import paths
echo "🔄 Fixing import paths..."
find frontend -name "*.ts" -o -name "*.tsx" | while read file; do
  # Fix imports from "../../../convex/_generated/api" to "@/convex/_generated/api"
  sed -i '' 's|"\.\./\.\./\.\./convex/_generated/api"|"@/convex/_generated/api"|g' "$file"
  sed -i '' 's|"\.\./\.\./convex/_generated/api"|"@/convex/_generated/api"|g' "$file"
  sed -i '' 's|"\.\./convex/_generated/api"|"@/convex/_generated/api"|g' "$file"
done

# Step 4: Create symlink for Convex in frontend
echo "🔗 Creating Convex symlink..."
if [ ! -L "frontend/convex" ]; then
  ln -s ../convex frontend/convex
fi

# Step 5: Update frontend tsconfig.json with proper paths
echo "⚙️ Updating TypeScript configuration..."
cat > frontend/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"],
      "@/convex/*": ["../convex/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts", "../convex/**/*"],
  "exclude": ["node_modules"]
}
EOF

# Step 6: Build the frontend
echo "🏗️ Building frontend..."
cd frontend
npm run build

echo "✅ Deployment fix complete! Your app is ready for deployment."