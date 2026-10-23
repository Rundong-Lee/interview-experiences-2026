"""Local-only study dashboard. Standard library; authoritative state is study.json."""
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path
import json, os, shutil, argparse, webbrowser
from datetime import datetime

ROOT=Path(__file__).resolve().parent
STATE=ROOT/'study.json'
STATUS={'未开始','练习中','待复写','已独立完成'}

def validate(d):
    if not isinstance(d,dict) or d.get('version')!=1 or not isinstance(d.get('revision'),int):raise ValueError('无效数据版本')
    if not isinstance(d.get('problems'),list) or not isinstance(d.get('patterns'),dict):raise ValueError('缺少题目或总结')
    ids=set()
    for p in d['problems']:
        if not isinstance(p,dict) or not isinstance(p.get('id'),str) or p['id'] in ids:raise ValueError('重复或无效题目 ID')
        ids.add(p['id'])
        if not isinstance(p.get('name'),str) or not p['name'].strip() or not isinstance(p.get('category'),str):raise ValueError('无效题目名称/分类')
        if p.get('status') not in STATUS:raise ValueError('无效状态')
        if not isinstance(p.get('notes'),dict) or not all(isinstance(p['notes'].get(k),str) for k in ['signal','idea','pitfall','transfer']):raise ValueError('无效总结')
        if not isinstance(p.get('sources'),list) or not all(isinstance(s,dict) for s in p['sources']):raise ValueError('无效来源')
        if not isinstance(p.get('attempts'),list):raise ValueError('无效练习记录')
        for a in p['attempts']:
            if not isinstance(a,dict) or not all(isinstance(a.get(k),str) for k in ['id','date','result','notes','code']):raise ValueError('无效练习内容')
            datetime.strptime(a['date'],'%Y-%m-%d')
            if a.get('minutes') is not None and (type(a['minutes']) is not int or not 1<=a['minutes']<=1440):raise ValueError('无效练习耗时')
    for k,v in d['patterns'].items():
        if not isinstance(v,dict) or not all(isinstance(v.get(n),str) for n in ['signal','invariant','diff','error']):raise ValueError('无效题型总结')

class Handler(BaseHTTPRequestHandler):
    def reply(self,status,body,kind='application/json; charset=utf-8'):
        if not isinstance(body,bytes):body=body.encode('utf-8')
        self.send_response(status);self.send_header('Content-Type',kind);self.send_header('Content-Length',str(len(body)));self.send_header('Cache-Control','no-store');self.send_header('X-Content-Type-Options','nosniff');self.send_header('Content-Security-Policy',"default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; frame-ancestors 'none'");self.end_headers();self.wfile.write(body)
    def valid_host(self):return self.headers.get('Host') in {f'127.0.0.1:{self.server.server_port}',f'localhost:{self.server.server_port}'}
    def do_GET(self):
        if not self.valid_host():return self.reply(403,'Invalid host')
        route=self.path.split('?')[0]
        paths={'/':('board.html','text/html; charset=utf-8'),'/board.js':('board.js','text/javascript; charset=utf-8'),'/api/study':('study.json','application/json; charset=utf-8')}
        if route not in paths:return self.reply(404,'Not found')
        file,kind=paths[route];self.reply(200,(ROOT/file).read_bytes(),kind)
    def do_PUT(self):
        if self.path!='/api/study':return self.reply(404,'Not found')
        if not self.valid_host():return self.reply(403,'Invalid host')
        origin=self.headers.get('Origin');expected={f'http://127.0.0.1:{self.server.server_port}',f'http://localhost:{self.server.server_port}'}
        if origin and origin not in expected:return self.reply(403,'Cross-origin write blocked')
        if self.headers.get('Content-Type')!='application/json':return self.reply(415,'Expected JSON')
        try:
            size=int(self.headers.get('Content-Length','0'))
            if not 0<size<=10_000_000:return self.reply(413,'数据过大或为空')
            d=json.loads(self.rfile.read(size));validate(d)
            old=json.loads(STATE.read_text(encoding='utf-8'))
            if d['revision']!=old['revision']:return self.reply(409,'文件已被其他页面更新。请先复制未保存内容，再刷新页面，避免覆盖。')
            backup=ROOT/'backups';backup.mkdir(exist_ok=True)
            shutil.copy2(STATE,backup/f"study-{datetime.now().strftime('%Y%m%d-%H%M%S-%f')}.json")
            d['revision']+=1
            payload=json.dumps(d,ensure_ascii=False,indent=2)
            temp=ROOT/'study.json.tmp';temp.write_text(payload,encoding='utf-8');os.replace(temp,STATE)
            self.reply(200,payload)
        except (ValueError,TypeError,KeyError) as e:self.reply(400,str(e))
        except OSError:self.reply(500,'文件保存失败，请保留页面内容并检查磁盘权限。')

if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('--port',type=int,default=8766);ap.add_argument('--open',action='store_true');args=ap.parse_args()
    server=HTTPServer(('127.0.0.1',args.port),Handler)
    url=f'http://127.0.0.1:{args.port}/';print(f'Local study board: {url}',flush=True)
    if args.open:webbrowser.open(url)
    server.serve_forever()
