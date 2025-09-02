/**
 * Build Script for Minification and Compression
 * Handles JavaScript and CSS minification for production deployment
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class BuildManager {
    constructor() {
        this.sourceDir = __dirname;
        this.buildDir = path.join(__dirname, 'dist');
        this.jsFiles = [
            'js/modules/api-utils.js',
            'js/modules/dom-utils.js',
            'js/modules/chart-utils.js',
            'js/modules/dashboard-manager.js',
            'js/modules/lazy-loader.js',
            'js/dashboard-backend.js',
            'js/employer-auth-security.js',
            'js/service-worker.js',
            'js/sw-register.js'
        ];
        this.htmlFiles = [
            'dashboard.html',
            'analytics.html',
            'applications.html',
            'notifications.html',
            'post-opportunities.html',
            'employer-login.html',
            'interns.html',
            'interviews.html',
            'supervisors.html',
            'system.html'
        ];
    }

    async build() {
        console.log('🚀 Starting build process...');
        
        try {
            await this.setupBuildDirectory();
            await this.installDependencies();
            await this.minifyJavaScript();
            await this.processHTML();
            await this.copyStaticFiles();
            await this.generateManifest();
            
            console.log('✅ Build completed successfully!');
            console.log(`📦 Build output: ${this.buildDir}`);
        } catch (error) {
            console.error('❌ Build failed:', error);
            process.exit(1);
        }
    }

    async setupBuildDirectory() {
        console.log('📁 Setting up build directory...');
        
        if (fs.existsSync(this.buildDir)) {
            fs.rmSync(this.buildDir, { recursive: true, force: true });
        }
        
        fs.mkdirSync(this.buildDir, { recursive: true });
        fs.mkdirSync(path.join(this.buildDir, 'js'), { recursive: true });
        fs.mkdirSync(path.join(this.buildDir, 'js', 'modules'), { recursive: true });
    }

    async installDependencies() {
        console.log('📦 Installing build dependencies...');
        
        const packageJson = {
            name: 'edulink-employer-dashboard-build',
            version: '1.0.0',
            private: true,
            devDependencies: {
                'terser': '^5.19.0',
                'html-minifier-terser': '^7.2.0',
                'gzip-size': '^7.0.0'
            }
        };
        
        fs.writeFileSync(
            path.join(this.buildDir, 'package.json'),
            JSON.stringify(packageJson, null, 2)
        );
        
        try {
            execSync('npm install', { 
                cwd: this.buildDir, 
                stdio: 'inherit' 
            });
        } catch (error) {
            console.warn('⚠️  npm install failed, using fallback minification');
        }
    }

    async minifyJavaScript() {
        console.log('🗜️  Minifying JavaScript files...');
        
        for (const jsFile of this.jsFiles) {
            const sourcePath = path.join(this.sourceDir, jsFile);
            const destPath = path.join(this.buildDir, jsFile);
            
            if (!fs.existsSync(sourcePath)) {
                console.warn(`⚠️  File not found: ${jsFile}`);
                continue;
            }
            
            try {
                const sourceCode = fs.readFileSync(sourcePath, 'utf8');
                const minifiedCode = await this.minifyJS(sourceCode, jsFile);
                
                // Ensure directory exists
                fs.mkdirSync(path.dirname(destPath), { recursive: true });
                fs.writeFileSync(destPath, minifiedCode);
                
                const originalSize = Buffer.byteLength(sourceCode, 'utf8');
                const minifiedSize = Buffer.byteLength(minifiedCode, 'utf8');
                const savings = ((originalSize - minifiedSize) / originalSize * 100).toFixed(1);
                
                console.log(`  ✓ ${jsFile}: ${this.formatBytes(originalSize)} → ${this.formatBytes(minifiedSize)} (${savings}% smaller)`);
            } catch (error) {
                console.error(`❌ Failed to minify ${jsFile}:`, error.message);
                // Copy original file as fallback
                fs.copyFileSync(sourcePath, destPath);
            }
        }
    }

    async minifyJS(code, filename) {
        try {
            // Try using Terser if available
            const terser = require(path.join(this.buildDir, 'node_modules', 'terser'));
            const result = await terser.minify(code, {
                compress: {
                    drop_console: true,
                    drop_debugger: true,
                    pure_funcs: ['console.log', 'console.debug', 'console.info'],
                    passes: 2
                },
                mangle: {
                    toplevel: true,
                    reserved: ['Chart', 'flatpickr']
                },
                format: {
                    comments: false
                }
            });
            
            if (result.error) {
                throw result.error;
            }
            
            return result.code;
        } catch (error) {
            // Fallback to basic minification
            console.warn(`⚠️  Using fallback minification for ${filename}`);
            return this.basicMinify(code);
        }
    }

    basicMinify(code) {
        return code
            // Remove comments
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/\/\/.*$/gm, '')
            // Remove console statements
            .replace(/console\.(log|debug|info|warn)\([^)]*\);?/g, '')
            // Remove extra whitespace
            .replace(/\s+/g, ' ')
            .replace(/;\s*}/g, '}')
            .replace(/\s*{\s*/g, '{')
            .replace(/;\s*;/g, ';')
            .trim();
    }

    async processHTML() {
        console.log('📄 Processing HTML files...');
        
        for (const htmlFile of this.htmlFiles) {
            const sourcePath = path.join(this.sourceDir, htmlFile);
            const destPath = path.join(this.buildDir, htmlFile);
            
            if (!fs.existsSync(sourcePath)) {
                console.warn(`⚠️  File not found: ${htmlFile}`);
                continue;
            }
            
            try {
                let htmlContent = fs.readFileSync(sourcePath, 'utf8');
                
                // Update script references to use minified versions
                htmlContent = this.updateScriptReferences(htmlContent);
                
                // Minify HTML
                const minifiedHTML = await this.minifyHTML(htmlContent);
                
                fs.writeFileSync(destPath, minifiedHTML);
                
                const originalSize = Buffer.byteLength(htmlContent, 'utf8');
                const minifiedSize = Buffer.byteLength(minifiedHTML, 'utf8');
                const savings = ((originalSize - minifiedSize) / originalSize * 100).toFixed(1);
                
                console.log(`  ✓ ${htmlFile}: ${this.formatBytes(originalSize)} → ${this.formatBytes(minifiedSize)} (${savings}% smaller)`);
            } catch (error) {
                console.error(`❌ Failed to process ${htmlFile}:`, error.message);
                // Copy original file as fallback
                fs.copyFileSync(sourcePath, destPath);
            }
        }
    }

    updateScriptReferences(html) {
        // Update script src attributes to point to minified versions
        return html.replace(/src="js\//g, 'src="js/');
    }

    async minifyHTML(html) {
        try {
            const { minify } = require(path.join(this.buildDir, 'node_modules', 'html-minifier-terser'));
            return await minify(html, {
                collapseWhitespace: true,
                removeComments: true,
                removeRedundantAttributes: true,
                removeScriptTypeAttributes: true,
                removeStyleLinkTypeAttributes: true,
                useShortDoctype: true,
                minifyCSS: true,
                minifyJS: true
            });
        } catch (error) {
            // Fallback to basic HTML minification
            return html
                .replace(/<!--[\s\S]*?-->/g, '')
                .replace(/\s+/g, ' ')
                .replace(/> </g, '><')
                .trim();
        }
    }

    async copyStaticFiles() {
        console.log('📋 Copying static files...');
        
        const staticFiles = [
            '.htaccess',
            'nginx-cache.conf',
            'SECURITY.md'
        ];
        
        for (const file of staticFiles) {
            const sourcePath = path.join(this.sourceDir, file);
            const destPath = path.join(this.buildDir, file);
            
            if (fs.existsSync(sourcePath)) {
                fs.copyFileSync(sourcePath, destPath);
                console.log(`  ✓ Copied ${file}`);
            }
        }
    }

    async generateManifest() {
        console.log('📋 Generating build manifest...');
        
        const manifest = {
            buildTime: new Date().toISOString(),
            version: '1.0.0',
            files: {},
            totalSize: 0
        };
        
        const getAllFiles = (dir, fileList = []) => {
            const files = fs.readdirSync(dir);
            
            files.forEach(file => {
                const filePath = path.join(dir, file);
                const stat = fs.statSync(filePath);
                
                if (stat.isDirectory()) {
                    getAllFiles(filePath, fileList);
                } else {
                    const relativePath = path.relative(this.buildDir, filePath);
                    const size = stat.size;
                    
                    manifest.files[relativePath] = {
                        size: size,
                        sizeFormatted: this.formatBytes(size)
                    };
                    
                    manifest.totalSize += size;
                }
            });
            
            return fileList;
        };
        
        getAllFiles(this.buildDir);
        manifest.totalSizeFormatted = this.formatBytes(manifest.totalSize);
        
        fs.writeFileSync(
            path.join(this.buildDir, 'build-manifest.json'),
            JSON.stringify(manifest, null, 2)
        );
        
        console.log(`📊 Total build size: ${manifest.totalSizeFormatted}`);
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Run build if called directly
if (require.main === module) {
    const buildManager = new BuildManager();
    buildManager.build();
}

module.exports = BuildManager;