from pathlib import Path
import re,html,json,hashlib,zipfile
root=Path(__file__).resolve().parents[1]
source=(root/'docs/COMPETITOR-RESEARCH.md').read_text()
def inline(text):
 text=html.escape(text)
 text=re.sub(r'\[([^]]+)\]\((https://[^)]+)\)',r'<a href="\2" target="_blank" rel="noopener noreferrer">\1 ↗</a>',text)
 return re.sub(r'`([^`]+)`',r'<code>\1</code>',text)
output=[];table=False;listing=False
for line in source.splitlines():
 if line.startswith('|'):
  if re.match(r'^\|[- :|]+\|$',line):continue
  if not table:output.append('<div class="table-wrap"><table>');table=True;first=True
  tag='th' if first else 'td';first=False
  output.append('<tr>'+''.join('<'+tag+'>'+inline(c.strip())+'</'+tag+'>' for c in line.strip('|').split('|'))+'</tr>');continue
 if table:output.append('</table></div>');table=False
 if line.startswith('- '):
  if not listing:output.append('<ul>');listing=True
  output.append('<li>'+inline(line[2:])+'</li>');continue
 if listing:output.append('</ul>');listing=False
 if line.startswith('# '):output.append('<h1>'+inline(line[2:])+'</h1>')
 elif line.startswith('## '):output.append('<h2>'+inline(line[3:])+'</h2>')
 elif line.strip():output.append('<p>'+inline(line)+'</p>')
if table:output.append('</table></div>')
(root/'dist/research.html').write_text('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PortalFlow · Competitor evidence</title><link rel="stylesheet" href="workspace.css"><style>body{padding:32px}main{max-width:1100px;margin:auto}h1{margin:26px 0}h2{margin:32px 0 12px}td{min-width:150px}p,li{max-width:90ch}@media(max-width:650px){body{padding:16px}}</style></head><body><main><a href="index.html">← Back to PortalFlow</a>'+''.join(output)+'</main></body></html>')
files=[p for p in root.rglob('*') if p.is_file() and not any(x in p.relative_to(root).parts for x in ['.git','.portalflow-data','node_modules','__pycache__']) and p.suffix not in ['.zip','.sqlite','.pyc'] and p.name!='release-manifest-v2.json']
manifest={'product':'PortalFlow','version':'2.0.0','date':'2026-10-17','modes':['offline-demo','shared-node-sqlite'],'publicDeployment':False,'supabaseConnected':False,'files':{str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in files}}
(root/'release-manifest-v2.json').write_text(json.dumps(manifest,indent=2)+'\n')
for name,items,prefix in [('portalflow-v2-static.zip',list((root/'dist').rglob('*')),root/'dist'),('portalflow-v2-complete.zip',files+[root/'release-manifest-v2.json'],root)]:
 with zipfile.ZipFile(root/name,'w',zipfile.ZIP_DEFLATED) as archive:
  for p in sorted(items):
   if p.is_file():archive.write(p,p.relative_to(prefix))
 with zipfile.ZipFile(root/name) as archive:
  assert archive.testzip() is None
  assert not any('.sqlite' in p or '.portalflow-data/' in p or p.startswith('.git/') for p in archive.namelist())
  assert archive.read('index.html' if prefix.name=='dist' else 'dist/index.html')==(root/'dist/index.html').read_bytes()
 print(name+': verified')
