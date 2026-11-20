"""Đóng gói JavaScript classic hỗ trợ Netlify và mở file:// trực tiếp.
Chạy: python build_bundle.py
Không thay đổi API dữ liệu hoặc logic đọc sách.
"""
from pathlib import Path
import re
root=Path(__file__).resolve().parent
js=root/'assets/js'
data=(js/'data.js').read_text(encoding='utf-8')
flip=(js/'detail-flipbook.js').read_text(encoding='utf-8')
site=(js/'site.js').read_text(encoding='utf-8')
import_statement="import {esc,loadPoems,bookmarks,newest,popular,collectionGroups,topicGroups,poemURL,collectionURL,topicURL,photo,excerpt,formatNumber,formatDate,compositionDate,query,toggleBookmark,trackView,youtubeId,slug} from './data.js';"
if import_statement not in site: raise SystemExit('Không tìm thấy câu lệnh import từ data.js')
site=site.replace(import_statement,'')
dynamic="const {initializeFlipbookReader}=await import('./detail-flipbook.js');const flip=initializeFlipbookReader();flip.setPoem(p);"
if dynamic not in site: raise SystemExit('Không tìm thấy câu lệnh import flipbook')
site=site.replace(dynamic,'const flip=initializeFlipbookReader();flip.setPoem(p);')
parts=[re.sub(r'(?m)^export\s+','',code) for code in (data,flip)]
output="/* SAKALIS · Bundle cổ điển cho web hosting và file:// */\n'use strict';\n\n"+'\n\n'.join(parts+[site])+'\n'
(js/'site.bundle.js').write_text(output,encoding='utf-8')
print('Đã cập nhật',js/'site.bundle.js',len(output),'bytes')
