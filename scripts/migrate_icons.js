import fs from 'fs';
import path from 'path';

const iconMap = {
  AlertCircle: 'error_outline',
  Calendar: 'calendar_today',
  CalendarIcon: 'calendar_today',
  Check: 'check',
  ChevronLeft: 'chevron_left',
  ChevronRight: 'chevron_right',
  Clock: 'schedule',
  Eye: 'visibility',
  EyeOff: 'visibility_off',
  Home: 'home',
  Loader2: 'progress_activity',
  Lock: 'lock',
  LockKeyhole: 'lock',
  LogIn: 'login',
  LogOut: 'logout',
  Moon: 'dark_mode',
  Paintbrush: 'brush',
  Pencil: 'edit',
  Plus: 'add',
  RefreshCw: 'sync',
  Settings: 'settings',
  Sparkles: 'auto_awesome',
  Star: 'star',
  SunMedium: 'light_mode',
  Trash2: 'delete',
  UserPlus: 'person_add',
  X: 'close',
  Zap: 'bolt'
};

const directoryPath = path.join(process.cwd(), 'src');

function walkDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walkDir(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

const files = walkDir(directoryPath);

files.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Check if it has lucide-react import
  if (content.includes("from 'lucide-react'")) {
    changed = true;
    
    // Add Icon import if not exists
    let iconImportPath = '@/components/ui/Icon';
    
    // Calculate relative path to src/components/ui/Icon
    const depth = filePath.split(path.sep).length - directoryPath.split(path.sep).length;
    let relPath = '';
    if (depth === 1) relPath = './components/ui/Icon';
    else {
      relPath = '../'.repeat(depth - 1) + 'components/ui/Icon';
    }

    content = content.replace(/import\s+{([^}]+)}\s+from\s+'lucide-react';/g, `import { Icon } from '${relPath}';`);
    
    // Some icons are aliased, e.g., Calendar as CalendarIcon
    // Replace JSX tags
    for (const [lucide, material] of Object.entries(iconMap)) {
      const tagRegexSelfClosing = new RegExp(`<${lucide}([^>]*)/>`, 'g');
      content = content.replace(tagRegexSelfClosing, (match, p1) => {
        // Handle custom class replacement for Loader2 spin
        let newProps = p1;
        if (lucide === 'Loader2') {
          // add material symbols animation if needed or keep animate-spin
          // let's keep animate-spin
        }
        return `<Icon name="${material}"${newProps}/>`;
      });
      
      const tagRegexOpenClose = new RegExp(`<${lucide}([^>]*)>(.*?)</${lucide}>`, 'g');
      content = content.replace(tagRegexOpenClose, `<Icon name="${material}"$1>$2</Icon>`);
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
});
