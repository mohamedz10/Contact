"""Génère une version autonome (logos intégrés) de index.html pour la publication en Artifact.
Usage: python3 build-artifact.py <sortie.html>"""
import re, base64, sys, os
here = os.path.dirname(os.path.abspath(__file__))
s = open(os.path.join(here, "index.html"), encoding="utf-8").read()
s = re.sub(r'src="(logos/[^"]+\.png)"',
           lambda m: 'src="data:image/png;base64,' + base64.b64encode(open(os.path.join(here, m.group(1)), "rb").read()).decode() + '"', s)
for pat in [r'<!doctype html>\n', r'<html[^>]*>\n', r'<head>\n', r'</head>\n', r'<body>\n', r'</body>\n', r'</html>\n?',
            r'<meta charset="utf-8">\n', r'<meta name="viewport"[^>]*>\n']:
    s = re.sub(pat, '', s, count=1)
s = re.sub(r'<title>.*?</title>', '<meta name="claude:viewport-fit-sides" content="cover">\n<title>Idiz Tech</title>', s, count=1)
# the page sets data-theme itself; start dark like the site
s = s.replace("(function(){try{", "(function(){document.documentElement.setAttribute('data-theme','dark');try{", 1)
open(sys.argv[1], "w", encoding="utf-8").write(s)
print("ok", len(s))
