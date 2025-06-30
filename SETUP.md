# Setup Guide for Bounties and Berries Server

## Prerequisites

Before running this server, you need to install Node.js and npm.

### Installing Node.js

1. **Download Node.js**
   - Go to [https://nodejs.org/](https://nodejs.org/)
   - Download the LTS (Long Term Support) version for Windows
   - Choose the Windows Installer (.msi) for your system architecture (x64 recommended)

2. **Install Node.js**
   - Run the downloaded .msi file
   - Follow the installation wizard
   - Make sure to check "Add to PATH" during installation
   - Complete the installation

3. **Verify Installation**
   Open a new PowerShell or Command Prompt window and run:
   ```bash
   node --version
   npm --version
   ```
   Both commands should return version numbers.

## Server Setup

Once Node.js is installed, follow these steps:

1. **Navigate to the project directory**
   ```bash
   cd "C:\Users\manoj kumar\OneDrive\Desktop\Bounties and Berries Server"
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create environment file (optional)**
   Create a file named `.env` in the project root with:
   ```env
   PORT=443
   NODE_ENV=development
   CORS_ORIGIN=*
   LOG_LEVEL=info
   ```

4. **Start the server**
   ```bash
   # Development mode (with auto-restart)
   npm run dev
   
   # OR Production mode
   npm start
   ```

## Testing the Server

Once the server is running, you can test it using:

1. **Web Browser**
   - Open: `http://localhost:443/`
   - Open: `http://localhost:443/health`
   - Open: `http://localhost:443/api/status`

2. **Command Line (using curl or PowerShell)**
   ```powershell
   # Test root endpoint
   Invoke-RestMethod -Uri "http://localhost:443/" -Method Get
   
   # Test health endpoint
   Invoke-RestMethod -Uri "http://localhost:443/health" -Method Get
   
   # Test status endpoint
   Invoke-RestMethod -Uri "http://localhost:443/api/status" -Method Get
   ```

3. **Postman or similar API testing tool**
   - GET `http://localhost:443/`
   - GET `http://localhost:443/health`
   - GET `http://localhost:443/api/status`

## Expected Output

When the server starts successfully, you should see:
```
🚀 Server is running on port 443
📊 Health check: http://localhost:443/health
📈 Status API: http://localhost:443/api/status
🌐 Root endpoint: http://localhost:443/
```

## Troubleshooting

### Port 443 Issues
If you get a permission error for port 443, try:
1. Run PowerShell as Administrator
2. Or change the port in the `.env` file to something like `3000`

### Node.js Not Found
If you get "node is not recognized":
1. Restart your terminal/PowerShell after installing Node.js
2. Check if Node.js is in your PATH
3. Try reinstalling Node.js

### Permission Denied
If you get permission errors:
1. Run PowerShell as Administrator
2. Check Windows Defender or antivirus settings
3. Ensure you have write permissions to the project directory

## Next Steps

After successful setup:
1. The server will be running on `http://localhost:443`
2. You can access the API endpoints as documented in README.md
3. For development, use `npm run dev` for auto-restart on file changes
4. For production, use `npm start`

## Support

If you encounter any issues:
1. Check the console output for error messages
2. Verify Node.js installation with `node --version`
3. Ensure all dependencies are installed with `npm install`
4. Check the README.md for more detailed documentation 