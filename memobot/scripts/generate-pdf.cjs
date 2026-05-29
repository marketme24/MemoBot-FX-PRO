const PDFDocument = require('pdfkit');
const fs = require('fs');

// Create a document
const doc = new PDFDocument();

// Pipe its output somewhere, like to a file or HTTP response
// See below for browser usage
doc.pipe(fs.createWriteStream('MEMOBOT-Setup-Manual.pdf'));

// Add text
doc.fontSize(25).text('MEMOBOT Platform Setup Manual', { align: 'center' });
doc.moveDown();

doc.fontSize(16).text('1. Prerequisites', { underline: true });
doc.fontSize(12).text('Before running the Memobot platform, ensure you have Node.js installed on your computer.');
doc.text('Download Node.js from: https://nodejs.org/ (LTS version is highly recommended)');
doc.moveDown();

doc.fontSize(16).text('2. One-Click Launch (Windows)', { underline: true });
doc.fontSize(12).text('- Locate the "Launch-Windows.vbs" file in the root folder.');
doc.text('- Double-click the file.');
doc.text('- A background process will automatically install all required packages and dependencies.');
doc.text('- The bot will silently launch, and within a few seconds, your default web browser will open to display the Memobot Dashboard.');
doc.moveDown();

doc.fontSize(16).text('3. One-Click Launch (Mac/Linux)', { underline: true });
doc.fontSize(12).text('- Locate the "Launch-Mac.command" file in the root folder.');
doc.text('- Double-click the file to execute.');
doc.text('- If macOS asks for permissions, or if double-clicking does not work: open Spotlight (Cmd + Space), type "Terminal", drag the Launch-Mac.command file into the Terminal window, and press Enter.');
doc.moveDown();

doc.fontSize(16).text('4. Health Telemetry & Global Standing', { underline: true });
doc.fontSize(12).text('The Memobot platform includes a custom System Health Bot patch (available in the Dashboard view).');
doc.text('This subsystem deep-monitors click telemetry, network status, and CPU/Memory overhead.');
doc.text('In the navigation menu, you will also find a Global Comparison chart pitting Memobot PRO against the top 10 market leaders.');
doc.moveDown();

doc.fontSize(16).text('5. Shutting Down the Bot', { underline: true });
doc.fontSize(12).text('Because the bot operates in the background for a cleaner experience:');
doc.text('- Windows: Open Task Manager (Ctrl+Shift+Esc), find the "node.exe" tasks, right-click, and select "End Task".');
doc.text('- Mac: Open Activity Monitor, search for "node", and force quit the processes.');
doc.moveDown();

doc.fontSize(12).text('Thank you for choosing MEMOBOT Pro.', { align: 'center', oblique: true });

// Finalize PDF file
doc.end();

console.log('PDF Generation Complete.');
