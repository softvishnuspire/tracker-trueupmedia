const fs = require('fs');
const path = require('path');

function restoreFiles() {
  ['components', 'modules'].forEach(type => {
    const dir = path.join('node_modules/react-native/src/private/specs_DEPRECATED', type);
    if (!fs.existsSync(dir)) return;
    
    fs.readdirSync(dir).forEach(file => {
      if (!file.endsWith('.js')) return;
      
      const filePath = path.join(dir, file);
      let content = fs.readFileSync(filePath, 'utf8');
      let originalContent = content;
      
      // Fix types like: type Props = <{
      content = content.replace(/type (\w+) = <\{/g, 'type $1 = $ReadOnly<{');
      
      // Fix types like: event?: ?DirectEventHandler<<{
      content = content.replace(/EventHandler<<\{/g, 'EventHandler<$ReadOnly<{');
      
      // Fix types like: colors?: ?<ColorValue>
      content = content.replace(/ \?<([A-Za-z0-9_]+)>/g, ' ?$ReadOnlyArray<$1>');
      
      // Fix types like: updates: <TraceUpdate>
      content = content.replace(/: <([A-Za-z0-9_]+)>,/g, ': $ReadOnlyArray<$1>,');
      
      // Fix orientations: < | 'portrait'
      content = content.replace(/WithDefault<\r?\n?\s*<\r?\n?\s*\|/g, 'WithDefault<\n    $ReadOnlyArray<\n      |');
      
      if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Restored', file);
      }
    });
  });
}

restoreFiles();
