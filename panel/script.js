document.querySelector('.upload-file-btn').addEventListener('click', () => {
    document.getElementById('fileInput').click();
});

document.getElementById('fileInput').addEventListener('change', handleFileUpload);

const editor = new EditorJS({
    holder: 'editorjs',
    tools: {
        header: {
            class: Header,
            inlineToolbar: true,
            config: {
                placeholder: 'Header'
            }
        },
        list: {
            class: List,
            inlineToolbar: true
        },
        checklist: {
            class: Checklist,
            inlineToolbar: true
        },
        table: {
            class: Table,
            inlineToolbar: true
        },
        quote: {
            class: Quote,
            inlineToolbar: true
        },
        inlineCode: {
            class: InlineCode,
            inlineToolbar: true
        },
        embed: {
            class: Embed,
            inlineToolbar: true
        },
        image: {
            class: SimpleImage,
            inlineToolbar: true
        },
        linkTool: {
            class: LinkTool,
            config: {
                endpoint: '/link' // Your backend endpoint to fetch URL metadata
            },
        },
        code: CodeTool,
        delimiter: Delimiter,
        raw: RawTool
    },
    placeholder: 'Start writing your story...',
    data: {
        blocks: []
    }
});

function handleFileUpload(event) {
    const files = event.target.files;
    const fileTableBody = document.getElementById('fileTableBody');

    Array.from(files).forEach(file => {
        const row = document.createElement('tr');

        const nameCell = document.createElement('td');
        const nameLink = document.createElement('a');
        nameLink.href = '#';
        nameLink.textContent = file.name;
        nameLink.addEventListener('click', (e) => {
            e.preventDefault();
            openFile(file);
        });
        nameCell.appendChild(nameLink);
        row.appendChild(nameCell);

        const dateCell = document.createElement('td');
        dateCell.textContent = new Date().toLocaleDateString();
        row.appendChild(dateCell);

        const uploadedByCell = document.createElement('td');
        uploadedByCell.textContent = 'Jawwad Malik';
        row.appendChild(uploadedByCell);

        fileTableBody.appendChild(row);
    });
}

function openFile(file) {
    const reader = new FileReader();

    if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        reader.onload = function(event) {
            mammoth.convertToHtml({ arrayBuffer: event.target.result })
                .then(function(result) {
                    const content = result.value;
                    const blocks = parseWordContent(content);
                    editor.render({
                        blocks: blocks
                    });
                })
                .catch(function(err) {
                    console.error(err);
                });
        };
        reader.readAsArrayBuffer(file);
    } else if (file.type === "application/pdf") {
        reader.onload = function(event) {
            const pdfData = new Uint8Array(event.target.result);
            pdfjsLib.getDocument({ data: pdfData }).promise.then(function(pdf) {
                let textContent = '';
                const numPages = pdf.numPages;
                const promises = [];

                for (let i = 1; i <= numPages; i++) {
                    promises.push(
                        pdf.getPage(i).then(function(page) {
                            return page.getTextContent().then(function(text) {
                                textContent += text.items.map(item => item.str).join(' ');
                            });
                        })
                    );
                }

                Promise.all(promises).then(function() {
                    const blocks = parsePdfContent(textContent);
                    editor.render({
                        blocks: blocks
                    });
                });
            });
        };
        reader.readAsArrayBuffer(file);
    } else {
        reader.onload = function(event) {
            const content = event.target.result;
            const blocks = parseFileContent(content);
            editor.render({
                blocks: blocks
            });
        };
        reader.readAsText(file);
    }
}

function parseWordContent(content) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    const blocks = [];

    doc.body.childNodes.forEach(node => {
        if (node.nodeName === "P") {
            blocks.push({
                type: 'paragraph',
                data: {
                    text: parseInlineStyles(node)
                }
            });
        } else if (node.nodeName.startsWith("H")) {
            blocks.push({
                type: 'header',
                data: {
                    text: parseInlineStyles(node),
                    level: parseInt(node.nodeName.charAt(1))
                }
            });
        } else if (node.nodeName === "UL") {
            const items = [];
            node.childNodes.forEach(li => {
                items.push(parseInlineStyles(li));
            });
            blocks.push({
                type: 'list',
                data: {
                    style: 'unordered',
                    items: items
                }
            });
        } else if (node.nodeName === "OL") {
            const items = [];
            node.childNodes.forEach(li => {
                items.push(parseInlineStyles(li));
            });
            blocks.push({
                type: 'list',
                data: {
                    style: 'ordered',
                    items: items
                }
            });
        } else if (node.nodeName === "TABLE") {
            const rows = [];
            node.childNodes.forEach(tr => {
                if (tr.nodeName === "TR") {
                    const cells = [];
                    tr.childNodes.forEach(td => {
                        if (td.nodeName === "TD") {
                            cells.push(parseInlineStyles(td));
                        }
                    });
                    rows.push(cells);
                }
            });
            blocks.push({
                type: 'table',
                data: {
                    content: rows
                }
            });
        } else if (node.nodeName === "IMG") {
            blocks.push({
                type: 'image',
                data: {
                    url: node.src,
                    caption: node.alt,
                    withBorder: false,
                    withBackground: false,
                    stretched: false
                }
            });
        }
    });

    return blocks;
}

function parseInlineStyles(node) {
    let html = node.innerHTML;

    // Handle bold
    html = html.replace(/<b>(.*?)<\/b>/g, '<strong>$1</strong>');
    html = html.replace(/<strong>(.*?)<\/strong>/g, '<b>$1</b>');

    // Handle italic
    html = html.replace(/<i>(.*?)<\/i>/g, '<em>$1</em>');
    html = html.replace(/<em>(.*?)<\/em>/g, '<i>$1</i>');

    // Handle underline
    html = html.replace(/<u>(.*?)<\/u>/g, '<u>$1</u>');

    // Handle links
    html = html.replace(/<a href="(.*?)">(.*?)<\/a>/g, '<a href="$1">$2</a>');

    return html;
}

function parsePdfContent(content) {
    return [{
        type: 'paragraph',
        data: {
            text: content
        }
    }];
}

function parseFileContent(content) {
    return [{
        type: 'paragraph',
        data: {
            text: content
        }
    }];
}

function handleDrop(event) {
    event.preventDefault();
    const files = event.dataTransfer.files;
    handleFileUpload({ target: { files: files } });
}

function handleDragOver(event) {
    event.preventDefault();
}
