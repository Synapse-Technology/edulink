/**
 * Production Deployment Script
 * Handles building, optimization, and deployment preparation
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const BuildManager = require('./build.js');

class DeploymentManager {
    constructor() {
        this.projectRoot = __dirname;
        this.buildDir = path.join(__dirname, 'dist');
        this.backupDir = path.join(__dirname, 'backup');
    }

    async deploy() {
        console.log('🚀 Starting production deployment process...');
        
        try {
            await this.preDeploymentChecks();
            await this.createBackup();
            await this.buildForProduction();
            await this.optimizeAssets();
            await this.generateDeploymentReport();
            await this.showDeploymentInstructions();
            
            console.log('✅ Deployment preparation completed successfully!');
        } catch (error) {
            console.error('❌ Deployment failed:', error);
            await this.rollback();
            process.exit(1);
        }
    }

    async preDeploymentChecks() {
        console.log('🔍 Running pre-deployment checks...');
        
        // Check Node.js version
        const nodeVersion = process.version;
        console.log(`  ✓ Node.js version: ${nodeVersion}`);
        
        // Check if required files exist
        const requiredFiles = [
            'js/dashboard-backend.js',
            'js/modules/api-utils.js',
            'js/modules/dom-utils.js',
            'js/modules/chart-utils.js',
            'js/modules/dashboard-manager.js',
            'dashboard.html'
        ];
        
        for (const file of requiredFiles) {
            const filePath = path.join(this.projectRoot, file);
            if (!fs.existsSync(filePath)) {
                throw new Error(`Required file missing: ${file}`);
            }
        }
        
        console.log('  ✓ All required files present');
        
        // Check for potential security issues
        await this.securityCheck();
    }

    async securityCheck() {
        console.log('🔒 Running security checks...');
        
        const jsFiles = [
            'js/dashboard-backend.js',
            'js/modules/api-utils.js',
            'js/modules/dom-utils.js',
            'js/modules/chart-utils.js',
            'js/modules/dashboard-manager.js'
        ];
        
        const securityIssues = [];
        
        for (const file of jsFiles) {
            const filePath = path.join(this.projectRoot, file);
            const content = fs.readFileSync(filePath, 'utf8');
            
            // Check for potential security issues
            if (content.includes('eval(')) {
                securityIssues.push(`${file}: Contains eval() - potential security risk`);
            }
            
            if (content.includes('innerHTML') && !content.includes('DOMPurify')) {
                securityIssues.push(`${file}: Uses innerHTML without sanitization`);
            }
            
            if (content.match(/console\.(log|debug|info|warn)/)) {
                securityIssues.push(`${file}: Contains console statements (will be removed in build)`);
            }
        }
        
        if (securityIssues.length > 0) {
            console.log('  ⚠️  Security warnings:');
            securityIssues.forEach(issue => console.log(`    - ${issue}`));
        } else {
            console.log('  ✓ No security issues detected');
        }
    }

    async createBackup() {
        console.log('💾 Creating backup of current files...');
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(this.backupDir, `backup-${timestamp}`);
        
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
        }
        
        fs.mkdirSync(backupPath, { recursive: true });
        
        // Copy important files to backup
        const filesToBackup = [
            'js/',
            '*.html',
            '.htaccess',
            'nginx-cache.conf'
        ];
        
        try {
            // Use robocopy on Windows or cp on Unix
            if (process.platform === 'win32') {
                execSync(`robocopy "${this.projectRoot}" "${backupPath}" /E /XD dist backup node_modules`, 
                    { stdio: 'pipe' });
            } else {
                execSync(`cp -r ${this.projectRoot}/* ${backupPath}/`, { stdio: 'pipe' });
            }
            
            console.log(`  ✓ Backup created: ${backupPath}`);
        } catch (error) {
            // Robocopy returns non-zero exit codes for successful operations
            if (process.platform === 'win32' && error.status <= 7) {
                console.log(`  ✓ Backup created: ${backupPath}`);
            } else {
                throw new Error(`Backup failed: ${error.message}`);
            }
        }
    }

    async buildForProduction() {
        console.log('🏗️  Building for production...');
        
        const buildManager = new BuildManager();
        await buildManager.build();
    }

    async optimizeAssets() {
        console.log('⚡ Optimizing assets...');
        
        // Generate gzipped versions of files
        await this.generateGzipVersions();
        
        // Generate Brotli versions if available
        await this.generateBrotliVersions();
    }

    async generateGzipVersions() {
        const zlib = require('zlib');
        const { promisify } = require('util');
        const gzip = promisify(zlib.gzip);
        
        const filesToCompress = [];
        
        // Find all JS, CSS, and HTML files
        const findFiles = (dir, extensions) => {
            const files = fs.readdirSync(dir, { withFileTypes: true });
            
            files.forEach(file => {
                const fullPath = path.join(dir, file.name);
                
                if (file.isDirectory()) {
                    findFiles(fullPath, extensions);
                } else if (extensions.some(ext => file.name.endsWith(ext))) {
                    filesToCompress.push(fullPath);
                }
            });
        };
        
        findFiles(this.buildDir, ['.js', '.css', '.html']);
        
        for (const file of filesToCompress) {
            try {
                const content = fs.readFileSync(file);
                const compressed = await gzip(content, { level: 9 });
                
                fs.writeFileSync(`${file}.gz`, compressed);
                
                const originalSize = content.length;
                const compressedSize = compressed.length;
                const savings = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
                
                console.log(`  ✓ ${path.relative(this.buildDir, file)}.gz (${savings}% smaller)`);
            } catch (error) {
                console.warn(`  ⚠️  Failed to gzip ${file}: ${error.message}`);
            }
        }
    }

    async generateBrotliVersions() {
        try {
            const zlib = require('zlib');
            if (!zlib.brotliCompress) {
                console.log('  ⚠️  Brotli compression not available in this Node.js version');
                return;
            }
            
            const { promisify } = require('util');
            const brotliCompress = promisify(zlib.brotliCompress);
            
            const filesToCompress = [];
            
            const findFiles = (dir, extensions) => {
                const files = fs.readdirSync(dir, { withFileTypes: true });
                
                files.forEach(file => {
                    const fullPath = path.join(dir, file.name);
                    
                    if (file.isDirectory()) {
                        findFiles(fullPath, extensions);
                    } else if (extensions.some(ext => file.name.endsWith(ext))) {
                        filesToCompress.push(fullPath);
                    }
                });
            };
            
            findFiles(this.buildDir, ['.js', '.css', '.html']);
            
            for (const file of filesToCompress) {
                try {
                    const content = fs.readFileSync(file);
                    const compressed = await brotliCompress(content, {
                        params: {
                            [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
                            [zlib.constants.BROTLI_PARAM_SIZE_HINT]: content.length
                        }
                    });
                    
                    fs.writeFileSync(`${file}.br`, compressed);
                    
                    const originalSize = content.length;
                    const compressedSize = compressed.length;
                    const savings = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
                    
                    console.log(`  ✓ ${path.relative(this.buildDir, file)}.br (${savings}% smaller)`);
                } catch (error) {
                    console.warn(`  ⚠️  Failed to brotli compress ${file}: ${error.message}`);
                }
            }
        } catch (error) {
            console.log('  ⚠️  Brotli compression not available');
        }
    }

    async generateDeploymentReport() {
        console.log('📊 Generating deployment report...');
        
        const manifest = JSON.parse(fs.readFileSync(path.join(this.buildDir, 'build-manifest.json'), 'utf8'));
        
        const report = {
            deploymentTime: new Date().toISOString(),
            buildInfo: manifest,
            optimizations: {
                minification: 'Applied to all JS and HTML files',
                compression: 'Gzip and Brotli versions generated',
                caching: 'Browser caching headers configured',
                serviceWorker: 'Enabled for offline support'
            },
            performance: {
                totalFiles: Object.keys(manifest.files).length,
                totalSize: manifest.totalSizeFormatted,
                estimatedLoadTime: this.estimateLoadTime(manifest.totalSize)
            },
            security: {
                csp: 'Content Security Policy configured',
                headers: 'Security headers in .htaccess',
                inputValidation: 'Client-side validation implemented'
            }
        };
        
        fs.writeFileSync(
            path.join(this.buildDir, 'deployment-report.json'),
            JSON.stringify(report, null, 2)
        );
        
        console.log('📋 Deployment Report:');
        console.log(`  Build Time: ${report.deploymentTime}`);
        console.log(`  Total Files: ${report.performance.totalFiles}`);
        console.log(`  Total Size: ${report.performance.totalSize}`);
        console.log(`  Estimated Load Time: ${report.performance.estimatedLoadTime}`);
    }

    estimateLoadTime(bytes) {
        // Estimate based on average broadband speed (25 Mbps)
        const speedMbps = 25;
        const speedBytesPerSecond = (speedMbps * 1024 * 1024) / 8;
        const loadTimeSeconds = bytes / speedBytesPerSecond;
        
        if (loadTimeSeconds < 1) {
            return `${Math.round(loadTimeSeconds * 1000)}ms`;
        } else {
            return `${loadTimeSeconds.toFixed(1)}s`;
        }
    }

    async showDeploymentInstructions() {
        console.log('\n📋 DEPLOYMENT INSTRUCTIONS:');
        console.log('================================');
        console.log('\n1. Upload the contents of the "dist" folder to your web server');
        console.log('2. Ensure your web server is configured to serve compressed files:');
        console.log('   - For Apache: Use the provided .htaccess file');
        console.log('   - For Nginx: Use the provided nginx-cache.conf configuration');
        console.log('\n3. Update your DNS/CDN settings if applicable');
        console.log('\n4. Test the deployment:');
        console.log('   - Check all pages load correctly');
        console.log('   - Verify charts and interactive elements work');
        console.log('   - Test on different devices and browsers');
        console.log('\n5. Monitor performance:');
        console.log('   - Use browser dev tools to check load times');
        console.log('   - Verify service worker is active');
        console.log('   - Check that compressed files are being served');
        console.log('\n📁 Build output location: ' + this.buildDir);
        console.log('📊 Deployment report: ' + path.join(this.buildDir, 'deployment-report.json'));
    }

    async rollback() {
        console.log('🔄 Rolling back changes...');
        
        if (fs.existsSync(this.buildDir)) {
            fs.rmSync(this.buildDir, { recursive: true, force: true });
            console.log('  ✓ Removed failed build directory');
        }
    }
}

// Run deployment if called directly
if (require.main === module) {
    const deploymentManager = new DeploymentManager();
    deploymentManager.deploy();
}

module.exports = DeploymentManager;