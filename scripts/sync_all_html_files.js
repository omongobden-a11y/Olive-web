const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const sourceIndexPath = path.join(publicDir, 'index.html');

let html = fs.readFileSync(sourceIndexPath, 'utf8');

// Convert root-relative asset URLs to relative URLs so file:// and http:// both work seamlessly
html = html.replace(/href="\/css\//g, 'href="css/');
html = html.replace(/src="\/js\//g, 'src="js/');
html = html.replace(/src="\/images\//g, 'src="images/');
html = html.replace(/href="\/images\//g, 'href="images/');
html = html.replace(/url\('\/images\//g, "url('images/");
html = html.replace(/url\("\/images\//g, 'url("images/');
html = html.replace(/href="\/api\/content\/anthem\/pdf"/g, 'href="Olive_School_Anthem.pdf"');
html = html.replace(/src="\/audio\//g, 'src="audio/');

// Ensure alert banner is visible by default with tap-to-dismiss
html = html.replace(
  'id="alert-banner" class="emergency-banner banner-announcement" role="alert" title="Tap anywhere to dismiss this notice" style="cursor:pointer;" onclick="this.hidden=true;" hidden',
  'id="alert-banner" class="emergency-banner banner-announcement" role="alert" title="Tap anywhere to dismiss this notice" style="cursor:pointer; display:block;" onclick="this.style.display=\'none\';"'
);

// Ensure the alert text is accurate
html = html.replace(
  '<span id="alert-banner-text">New Admissions for Academic Year 2027 are officially open for Nursery (K-1 to K-3) and Primary (P.1 to P.7). Call 0774496507 or apply online today.</span>',
  '<span id="alert-banner-text">📢 Applications for First Term 2027 begin on 4th January 2027 and end on 14th February 2027. (Tap anywhere to dismiss ✕)</span>'
);

// Write to public/index.html
fs.writeFileSync(sourceIndexPath, html, 'utf8');
console.log('Updated public/index.html with relative paths and default alert text.');

// Write to root index.html
const rootIndexPath = path.join(rootDir, 'index.html');
fs.writeFileSync(rootIndexPath, html, 'utf8');
console.log('Created/Updated root index.html');

// Write to root "Olive Nursery and Primary School-Atapara.html"
// This is the file the user was directly double-clicking!
const legacyFilePath = path.join(rootDir, 'Olive Nursery and Primary School-Atapara.html');
fs.writeFileSync(legacyFilePath, html, 'utf8');
console.log('Updated legacy "Olive Nursery and Primary School-Atapara.html" with the complete modern website!');
