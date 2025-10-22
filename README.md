# 📝 Form Capture Extension

A powerful Chrome extension that captures and stores form submissions from any website. Features modern Tailwind CSS design, responsive layout, and comprehensive form data collection with export capabilities.

## ✨ Features

### 🎯 **Core Functionality**
- **Universal Form Capture**: Automatically captures form submissions from any website
- **Real-time Monitoring**: Detects and stores form data as users submit forms
- **Dynamic Form Support**: Captures forms that are added to pages after initial load
- **Comprehensive Data Collection**: Stores form fields, metadata, timestamps, and page information

### 🎨 **Modern Design**
- **Tailwind CSS**: Modern, responsive design with utility-first CSS
- **Mobile-First**: Responsive layout that works on all screen sizes
- **Clean Interface**: Professional, user-friendly popup and sidepanel
- **Smooth Animations**: Toggle switches and hover effects for better UX

### 📊 **Data Management**
- **Smart Storage**: Efficiently stores form submissions with Chrome storage API
- **Export Functionality**: Export captured data as JSON files
- **Search & Filter**: Find specific form submissions quickly
- **Statistics Dashboard**: View total submissions, daily counts, and domain statistics

### 🔧 **Developer Features**
- **Toggle Control**: Enable/disable form capture functionality
- **Debug Logging**: Comprehensive console logging for troubleshooting
- **Context Menu**: Right-click access to sidepanel
- **Multiple Access Points**: Popup, sidepanel, and new tab options

## 🚀 Installation

### Development Setup

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd crxjs-project
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Build the Extension**
   ```bash
   npm run build
   ```

4. **Load in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `dist` folder

### Production Build

```bash
npm run build
```

The built extension will be available in the `dist` folder and as a zip file in the `release` folder.

## 🎯 Usage

### Basic Usage

1. **Enable the Extension**: The toggle is enabled by default
2. **Browse Websites**: Visit any website with forms
3. **Submit Forms**: Fill out and submit forms normally
4. **View Captured Data**: Click the extension icon to see captured forms

### Advanced Features

#### **Popup Interface**
- Quick overview of recent form submissions
- Toggle form capture on/off
- Access to sidepanel and export functions
- Real-time statistics display

#### **Sidepanel Interface**
- Full list of all captured form submissions
- Search and filter functionality
- Detailed form data inspection
- Export and clear data options

#### **Context Menu**
- Right-click the extension icon for quick access
- Direct sidepanel opening
- Alternative access method

## 🛠️ Technical Details

### **Architecture**
- **Manifest V3**: Latest Chrome extension standard
- **React 19**: Modern React with hooks and functional components
- **TypeScript**: Full type safety and better development experience
- **Vite**: Fast build tool with HMR support
- **Tailwind CSS**: Utility-first CSS framework

### **Key Components**

#### **Content Script** (`src/content/main.tsx`)
- Injects into web pages to monitor form submissions
- Handles dynamic form detection with MutationObserver
- Graceful error handling for HMR and React mounting issues
- Fallback to pure JavaScript if React fails

#### **Background Script** (`background.ts`)
- Service worker for message handling and storage management
- Context menu integration
- Sidepanel opening logic with multiple fallbacks
- Data persistence and statistics calculation

#### **Popup** (`src/popup/`)
- Quick access interface with recent submissions
- Toggle control for form capture
- Statistics overview
- Navigation to sidepanel

#### **Sidepanel** (`src/sidepanel/`)
- Full-featured interface for data management
- Search and filter capabilities
- Detailed form inspection
- Export and clear functionality

### **Storage Strategy**
- **Chrome Storage API**: Uses `chrome.storage.local` for form data
- **Efficient Management**: Keeps only last 200 submissions to manage storage
- **Data Structure**: Comprehensive form metadata and field data
- **Export Support**: JSON format for data portability

## 📱 Responsive Design

### **Breakpoints**
- **Mobile (320px+)**: Single column layout, compact spacing
- **Tablet (768px+)**: Two column layout, medium spacing
- **Desktop (1024px+)**: Three column layout, full spacing
- **Large (1280px+)**: Four column layout, maximum spacing

### **Design Features**
- **Mobile-First**: Optimized for mobile devices first
- **Flexible Grid**: CSS Grid with auto-fit columns
- **Consistent Spacing**: Tailwind's spacing scale
- **Touch-Friendly**: Appropriate button and input sizes

## 🔧 Configuration

### **Manifest Permissions**
```json
{
  "permissions": [
    "sidePanel",
    "storage", 
    "tabs",
    "activeTab",
    "contextMenus"
  ],
  "host_permissions": ["<all_urls>"]
}
```

### **Content Script Configuration**
- **Matches**: `<all_urls>` - Works on all websites
- **Run At**: `document_end` - Ensures DOM is ready
- **Injection**: Automatic injection on page load

## 🐛 Troubleshooting

### **Common Issues**

#### **Extension Not Capturing Forms**
1. Check if the toggle is enabled in the popup
2. Verify the extension has proper permissions
3. Check browser console for error messages
4. Try refreshing the page and submitting forms again

#### **Sidepanel Not Opening**
1. Use the "Open in New Tab" button as fallback
2. Right-click the extension icon for context menu
3. Check if sidepanel API is supported in your Chrome version

#### **CSS Not Loading**
1. Ensure the extension is built with `npm run build`
2. Check that `src/styles/output.css` is properly linked
3. Verify Tailwind CSS is being processed correctly

### **Debug Mode**
- Open browser DevTools (F12)
- Check Console tab for extension logs
- Look for "Form Capture Extension" messages
- Verify form detection and submission events

## 📦 Build Process

### **Development**
```bash
npm run dev          # Start development server with HMR
npm run dev:clean    # Clean build and start development
```

### **Production**
```bash
npm run build        # Build for production
npm run preview      # Preview production build
```

### **Output**
- **Extension**: `dist/` folder
- **Zip Package**: `release/` folder
- **Assets**: Optimized CSS and JavaScript bundles

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Authors

- **Form Capture Team** - Initial work and development

## 🙏 Acknowledgments

- **CRXJS** - Chrome extension development framework
- **Tailwind CSS** - Utility-first CSS framework
- **React** - JavaScript library for building user interfaces
- **Vite** - Fast build tool and development server

---

**Form Capture Extension** - Capture forms from any website with style and efficiency! 🚀