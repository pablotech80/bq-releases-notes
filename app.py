import os
import time
import requests
import xml.etree.ElementTree as ET
from flask import Flask, render_template, jsonify, request
from bs4 import BeautifulSoup

app = Flask(__name__)

# Cache configuration
CACHE_DURATION = 600  # 10 minutes cache
cache = {
    "data": None,
    "last_fetched": 0
}

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def clean_html_text(html_content):
    """Parses html and extracts a neat plain-text description for Twitter."""
    if not html_content:
        return ""
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # Replace links with text + href in parentheses if it's external, or just text
    for a in soup.find_all('a'):
        href = a.get('href', '')
        if href.startswith('http'):
            # Just keep standard text but we can append link if short
            pass
            
    text = soup.get_text(separator=' ')
    # Clean whitespace
    text = ' '.join(text.split())
    return text

def fetch_feed_data():
    try:
        response = requests.get(FEED_URL, timeout=15)
        response.raise_for_status()
        
        root = ET.fromstring(response.content)
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        
        entries = []
        for entry in root.findall('atom:entry', ns):
            title = entry.find('atom:title', ns)
            date_str = title.text.strip() if title is not None else "Unknown Date"
            
            entry_id = entry.find('atom:id', ns)
            id_str = entry_id.text.strip() if entry_id is not None else ""
            
            updated = entry.find('atom:updated', ns)
            updated_str = updated.text.strip() if updated is not None else ""
            
            link_elem = entry.find("atom:link[@rel='alternate']", ns)
            link_str = link_elem.attrib.get('href', '').strip() if link_elem is not None else ""
            
            content_elem = entry.find('atom:content', ns)
            content_html = content_elem.text if content_elem is not None else ""
            
            # Parse HTML content into separate logical updates
            soup = BeautifulSoup(content_html, 'html.parser')
            updates = []
            current_type = None
            current_elements = []
            
            # Walk through the children of the content description
            for child in soup.contents:
                if child.name == 'h3':
                    if current_type is not None:
                        html_block = ''.join(str(e) for e in current_elements).strip()
                        updates.append({
                            'type': current_type,
                            'html': html_block,
                            'text': clean_html_text(html_block)
                        })
                        current_elements = []
                    current_type = child.get_text().strip()
                else:
                    if current_type is not None:
                        current_elements.append(child)
            
            # Append final block
            if current_type is not None:
                html_block = ''.join(str(e) for e in current_elements).strip()
                updates.append({
                    'type': current_type,
                    'html': html_block,
                    'text': clean_html_text(html_block)
                })
            
            # Fallback if no h3 elements were found
            if not updates and content_html.strip():
                updates.append({
                    'type': 'Update',
                    'html': content_html,
                    'text': clean_html_text(content_html)
                })
                
            entries.append({
                'date': date_str,
                'updated': updated_str,
                'link': link_str,
                'updates': updates
            })
            
        return {
            "success": True,
            "entries": entries,
            "timestamp": time.time()
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "timestamp": time.time()
        }

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    now = time.time()
    
    # Use cache if not expired and not forced
    if not force_refresh and cache["data"] and (now - cache["last_fetched"] < CACHE_DURATION):
        # Serve cached version with caching info
        result = cache["data"].copy()
        result["cached"] = True
        result["cache_age"] = int(now - cache["last_fetched"])
        return jsonify(result)
        
    # Fetch fresh data
    result = fetch_feed_data()
    if result["success"]:
        cache["data"] = result
        cache["last_fetched"] = now
        result["cached"] = False
    else:
        # If fetch fails but we have cached data, fall back to it
        if cache["data"]:
            fallback = cache["data"].copy()
            fallback["cached"] = True
            fallback["warning"] = f"Failed to refresh: {result['error']}. Serving cached version."
            fallback["cache_age"] = int(now - cache["last_fetched"])
            return jsonify(fallback)
            
    return jsonify(result)

if __name__ == '__main__':
    # Running Flask app on port 5001 to avoid conflicts
    app.run(host='0.0.0.0', port=5001, debug=True)
