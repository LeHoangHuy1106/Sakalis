"""Build a classic browser script (no modules, works on file:// and Netlify)."""
from pathlib import Path
import re
base=Path(__file__).parent/'assets/js'
data=(base/'data.js').read_text(encoding='utf8')
flip=(base/'paper-stack.js').read_text(encoding='utf8')
site=(base/'site.js').read_text(encoding='utf8')
site,n=re.subn(r"(?m)^import\s+\{[^\n]+\}\s+from\s+['\"]\./data\.js['\"];\s*",'',site,count=1)
assert n==1,'Cannot find data.js import'
data=re.sub(r'(?m)^export\s+','',data)
flip=re.sub(r'(?m)^export\s+','',flip)
assert 'initializePaperStack()' in site
out='/* SAKALIS v7.3 · Vanilla JavaScript / Classic bundle. */\n\'use strict\';\n\n'+data+'\n\n'+flip+'\n\n'+site
(base/'site.bundle.js').write_text(out,encoding='utf8')
print('Wrote',base/'site.bundle.js',len(out))
