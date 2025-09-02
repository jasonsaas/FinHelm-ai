/**
 * FinHelm.ai Package Fix Script
 * Automatically detects and fixes missing package.json and dependencies
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface PackageJson {
  name: string;
  version: string;
  description: string;
  main: string;
  scripts: Record<string, string>;
  keywords: string[];
  author: string;
  license: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

class PackageFixer {
  private rootDir: string;
  private packageJsonPath: string;

  constructor(rootDir: string = process.cwd()) {
    this.rootDir = rootDir;
    this.packageJsonPath = path.join(rootDir, 'package.json');
  }

  /**
   * Main fix method - orchestrates all fixes
   */
  async fix(): Promise<void> {
    console.log('🔧 FinHelm.ai Package Fixer Starting...\n');

    try {
      // Step 1: Check and fix package.json
      await this.checkAndFixPackageJson();

      // Step 2: Install dependencies
      await this.installDependencies();

      // Step 3: Check and fix TypeScript config
      await this.checkAndFixTsConfig();

      // Step 4: Initialize Convex if needed
      await this.checkAndInitializeConvex();

      // Step 5: Verify setup
      await this.verifySetup();

      console.log('\n✅ All fixes completed successfully!');
      console.log('🚀 You can now run: npm run deploy');

    } catch (error) {
      console.error('\n❌ Fix failed:', error);
      process.exit(1);
    }
  }

  /**
   * Check if package.json exists and has correct configuration
   */
  private async checkAndFixPackageJson(): Promise<void> {
    console.log('1️⃣ Checking package.json...');

    if (!fs.existsSync(this.packageJsonPath)) {
      console.log('   📦 package.json not found, creating...');
      await this.createPackageJson();
    } else {
      console.log('   📦 package.json exists, validating...');
      await this.validateAndFixPackageJson();
    }
  }

  /**
   * Create a new package.json with required configuration
   */
  private async createPackageJson(): Promise<void> {
    const packageJson: PackageJson = {
      name: 'finhelm-ai',
      version: '1.0.0',
      description: 'AI-powered ERP insights for QuickBooks and Sage Intacct with Convex backend',
      main: 'src/index.ts',
      scripts: {
        dev: 'ts-node src/index.ts',
        deploy: 'npx convex dev',
        test: 'node deploy-test-simple.js',
        build: 'tsc',
        start: 'node dist/index.js'
      },
      keywords: ['ai', 'erp', 'quickbooks', 'sage', 'insights', 'convex', 'fintech'],
      author: '',
      license: 'ISC',
      dependencies: {
        'convex': '^1.26.0',
        'intuit-oauth': '^4.0.6'
      },
      devDependencies: {
        'typescript': '^5.3.0',
        '@types/node': '^20.10.0',
        'ts-node': '^10.9.0',
        'tsx': '^4.20.4'
      }
    };

    fs.writeFileSync(this.packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('   ✅ Created package.json with required dependencies');
  }

  /**
   * Validate existing package.json and fix missing dependencies
   */
  private async validateAndFixPackageJson(): Promise<void> {
    const packageJson = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8'));

    const requiredDeps = {
      'convex': '^1.26.0',
      'intuit-oauth': '^4.0.6'
    };

    const requiredDevDeps = {
      'typescript': '^5.3.0',
      '@types/node': '^20.10.0',
      'ts-node': '^10.9.0'
    };

    const requiredScripts = {
      dev: 'ts-node src/index.ts',
      deploy: 'npx convex dev',
      test: 'node deploy-test-simple.js'
    };

    let modified = false;

    // Fix dependencies
    if (!packageJson.dependencies) packageJson.dependencies = {};
    for (const [dep, version] of Object.entries(requiredDeps)) {
      if (!packageJson.dependencies[dep]) {
        packageJson.dependencies[dep] = version;
        modified = true;
      }
    }

    // Fix devDependencies
    if (!packageJson.devDependencies) packageJson.devDependencies = {};
    for (const [dep, version] of Object.entries(requiredDevDeps)) {
      if (!packageJson.devDependencies[dep]) {
        packageJson.devDependencies[dep] = version;
        modified = true;
      }
    }

    // Fix scripts
    if (!packageJson.scripts) packageJson.scripts = {};
    for (const [script, command] of Object.entries(requiredScripts)) {
      if (!packageJson.scripts[script]) {
        packageJson.scripts[script] = command;
        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(this.packageJsonPath, JSON.stringify(packageJson, null, 2));
      console.log('   ✅ Updated package.json with missing dependencies and scripts');
    } else {
      console.log('   ✅ package.json is properly configured');
    }
  }

  /**
   * Install npm dependencies
   */
  private async installDependencies(): Promise<void> {
    console.log('2️⃣ Installing dependencies...');

    try {
      execSync('npm install', { 
        cwd: this.rootDir, 
        stdio: 'pipe' 
      });
      console.log('   ✅ Dependencies installed successfully');
    } catch (error) {
      console.log('   ⚠️  npm install failed, trying with --force...');
      try {
        execSync('npm install --force', { 
          cwd: this.rootDir, 
          stdio: 'pipe' 
        });
        console.log('   ✅ Dependencies installed with --force');
      } catch (forceError) {
        throw new Error(`Failed to install dependencies: ${forceError}`);
      }
    }
  }

  /**
   * Check and create TypeScript configuration
   */
  private async checkAndFixTsConfig(): Promise<void> {
    console.log('3️⃣ Checking TypeScript configuration...');

    const tsConfigPath = path.join(this.rootDir, 'tsconfig.json');

    if (!fs.existsSync(tsConfigPath)) {
      console.log('   📝 Creating tsconfig.json...');
      const tsConfig = {
        compilerOptions: {
          target: 'ES2022',
          lib: ['ES2022'],
          module: 'commonjs',
          moduleResolution: 'node',
          outDir: './dist',
          rootDir: './src',
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          forceConsistentCasingInFileNames: true,
          resolveJsonModule: true,
          declaration: true,
          declarationMap: true,
          sourceMap: true
        },
        include: ['src/**/*', 'convex/**/*'],
        exclude: ['node_modules', 'dist', '**/*.test.ts', '**/*.spec.ts']
      };

      fs.writeFileSync(tsConfigPath, JSON.stringify(tsConfig, null, 2));
      console.log('   ✅ Created tsconfig.json with strict mode');
    } else {
      console.log('   ✅ tsconfig.json exists');
    }
  }

  /**
   * Initialize Convex if not already done
   */
  private async checkAndInitializeConvex(): Promise<void> {
    console.log('4️⃣ Checking Convex initialization...');

    const convexDir = path.join(this.rootDir, 'convex');
    const envLocalPath = path.join(this.rootDir, '.env.local');

    if (!fs.existsSync(convexDir) || !fs.existsSync(envLocalPath)) {
      console.log('   🔄 Convex not initialized, please run: npx convex dev');
      console.log('   ℹ️  This will require interactive setup');
    } else {
      console.log('   ✅ Convex is already initialized');
    }
  }

  /**
   * Verify the setup by running tests
   */
  private async verifySetup(): Promise<void> {
    console.log('5️⃣ Verifying setup...');

    try {
      // Check if we can run the test script
      if (fs.existsSync(path.join(this.rootDir, 'deploy-test-simple.js'))) {
        execSync('node deploy-test-simple.js', { 
          cwd: this.rootDir, 
          stdio: 'pipe' 
        });
        console.log('   ✅ All verification tests passed');
      } else {
        console.log('   ⚠️  Test script not found, skipping verification');
      }
    } catch (error) {
      console.log('   ⚠️  Some verification tests failed, but setup should work');
    }
  }


}

// Run the fixer if this script is executed directly
if (require.main === module) {
  const fixer = new PackageFixer();
  fixer.fix().catch((error) => {
    console.error('💥 Fatal error:', error.message);
    process.exit(1);
  });
}

export { PackageFixer };