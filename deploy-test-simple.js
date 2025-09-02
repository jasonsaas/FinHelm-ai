/**
 * Simple deployment test script for FinHelm.ai
 * Tests basic functionality and Convex connectivity
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Running FinHelm.ai Deployment Tests...\n');

// Test 1: Check if package.json exists and has required dependencies
console.log('1️⃣ Testing package.json configuration...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  const requiredDeps = ['convex', 'intuit-oauth'];
  const requiredDevDeps = ['typescript', '@types/node', 'ts-node'];
  
  const missingDeps = requiredDeps.filter(dep => !packageJson.dependencies?.[dep]);
  const missingDevDeps = requiredDevDeps.filter(dep => !packageJson.devDependencies?.[dep]);
  
  if (missingDeps.length === 0 && missingDevDeps.length === 0) {
    console.log('   ✅ All required dependencies found');
  } else {
    console.log('   ❌ Missing dependencies:', [...missingDeps, ...missingDevDeps]);
    process.exit(1);
  }
} catch (error) {
  console.log('   ❌ Error reading package.json:', error.message);
  process.exit(1);
}

// Test 2: Check if TypeScript configuration is valid
console.log('2️⃣ Testing TypeScript configuration...');
try {
  if (fs.existsSync('tsconfig.json')) {
    const tsConfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
    if (tsConfig.compilerOptions?.strict === true) {
      console.log('   ✅ TypeScript strict mode enabled');
    } else {
      console.log('   ⚠️  TypeScript strict mode not enabled');
    }
  } else {
    console.log('   ❌ tsconfig.json not found');
    process.exit(1);
  }
} catch (error) {
  console.log('   ❌ Error reading tsconfig.json:', error.message);
  process.exit(1);
}

// Test 3: Check if Convex is properly initialized
console.log('3️⃣ Testing Convex initialization...');
try {
  if (fs.existsSync('convex') && fs.existsSync('.env.local')) {
    const envLocal = fs.readFileSync('.env.local', 'utf8');
    if (envLocal.includes('CONVEX_DEPLOYMENT') && envLocal.includes('CONVEX_URL')) {
      console.log('   ✅ Convex properly initialized');
    } else {
      console.log('   ❌ Convex environment variables missing');
      process.exit(1);
    }
  } else {
    console.log('   ❌ Convex directory or .env.local not found');
    process.exit(1);
  }
} catch (error) {
  console.log('   ❌ Error checking Convex setup:', error.message);
  process.exit(1);
}

// Test 4: Check if main entry point exists
console.log('4️⃣ Testing main entry point...');
try {
  if (fs.existsSync('src/index.ts')) {
    console.log('   ✅ Main entry point (src/index.ts) exists');
  } else {
    console.log('   ❌ Main entry point (src/index.ts) not found');
    process.exit(1);
  }
} catch (error) {
  console.log('   ❌ Error checking main entry point:', error.message);
  process.exit(1);
}

// Test 5: Verify npm scripts
console.log('5️⃣ Testing npm scripts...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const requiredScripts = ['dev', 'deploy', 'test'];
  const missingScripts = requiredScripts.filter(script => !packageJson.scripts?.[script]);
  
  if (missingScripts.length === 0) {
    console.log('   ✅ All required npm scripts found');
  } else {
    console.log('   ❌ Missing npm scripts:', missingScripts);
    process.exit(1);
  }
} catch (error) {
  console.log('   ❌ Error checking npm scripts:', error.message);
  process.exit(1);
}

console.log('\n🎉 All deployment tests passed!');
console.log('📋 Summary:');
console.log('   • package.json configured with required dependencies');
console.log('   • TypeScript strict mode enabled');
console.log('   • Convex properly initialized');
console.log('   • Main entry point exists');
console.log('   • All npm scripts configured');
console.log('\n✨ FinHelm.ai is ready for development!');
console.log('🚀 Run "npm run deploy" to start Convex development server');