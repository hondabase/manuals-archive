let navData = null;
let currentModelKey = null;
const keyToFileIdMap = {};

async function init() {
    try {
        const response = await fetch('data/navigation.json');
        navData = await response.json();
        
        // Build Lookup Map for Legacy Prt() calls
        if (navData.lists) {
            Object.values(navData.lists).forEach(list => {
                if (Array.isArray(list)) {
                    list.forEach(item => {
                        if (item.sie_key_raw && item.file_id) {
                            keyToFileIdMap[item.sie_key_raw] = item.file_id;
                        }
                    });
                }
            });
        }
        
        populateModelSelect();
        setupSearch();
    } catch (e) {
        console.error("Failed to load navigation data", e);
    }
}

function setupSearch() {
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        performSearch(query);
    });
}

function performSearch(query) {
    const treeContainer = document.getElementById('tree-nav');
    
    if (!query) {
        if (currentModelKey) {
            loadTree(currentModelKey);
        } else {
            treeContainer.innerHTML = '<div class="placeholder">Select a model to begin.</div>';
        }
        return;
    }

    if (!currentModelKey) {
        treeContainer.innerHTML = '<div class="placeholder">Please select a model to search.</div>';
        return;
    }

    const listKey = currentModelKey.replace('SMT_', 'SML_').replace('BRT_', 'BRL_');
    const listItems = navData.lists[listKey];

    if (!listItems) {
        treeContainer.innerHTML = '<div class="placeholder">No data searchable for this model.</div>';
        return;
    }

    const lowerQuery = query.toLowerCase();
    const results = listItems.filter(item => item.title.toLowerCase().includes(lowerQuery));

    treeContainer.innerHTML = '';
    if (results.length === 0) {
        treeContainer.innerHTML = '<div class="placeholder">No results found.</div>';
        return;
    }

    const ul = document.createElement('ul');
    ul.className = 'tree-articles'; // Reuse article styling
    ul.style.display = 'block';
    ul.style.paddingLeft = '10px';

    results.forEach(article => {
        const li = document.createElement('li');
        li.className = 'article-item';
        li.innerHTML = `📄 ${article.title} <span style="color:#888;font-size:0.9em">${article.subtitle || ''}</span>`;
        li.title = article.title;
        li.style.cursor = 'pointer';
        li.style.padding = '4px 0';
        
        li.onclick = () => {
            document.querySelectorAll('.article-item').forEach(el => el.style.fontWeight = 'normal');
            li.style.fontWeight = 'bold';
            loadContent(article.file_id);
        };
        ul.appendChild(li);
    });

    treeContainer.appendChild(ul);
}

function populateModelSelect() {
    const select = document.getElementById('model-select');
    const models = Object.keys(navData.trees).sort();
    
    const serviceGroup = document.createElement('optgroup');
    serviceGroup.label = "Shop Manual";
    
    const bodyGroup = document.createElement('optgroup');
    bodyGroup.label = "Body Repair";
    
    models.forEach(key => {
        const parts = key.split('_');
        // Format: SMT_CL7_2003
        const type = parts[0] === 'SMT' ? 'Service Manual' : 'Body Repair';
        const code = parts[1];
        const year = parts[2];
        
        const option = document.createElement('option');
        option.value = key;
        option.textContent = `${year} - ${code}`;
        
        if (parts[0] === 'SMT') {
            serviceGroup.appendChild(option);
        } else {
            bodyGroup.appendChild(option);
        }
    });
    
    if (serviceGroup.children.length > 0) select.appendChild(serviceGroup);
    if (bodyGroup.children.length > 0) select.appendChild(bodyGroup);
    
    select.addEventListener('change', (e) => loadTree(e.target.value));
}

function loadTree(key) {
    currentModelKey = key;
    const treeContainer = document.getElementById('tree-nav');
    treeContainer.innerHTML = '';
    
    // Convert Tree Key (SMT/BRT) to List Key (SML/BRL)
    const listKey = key.replace('SMT_', 'SML_').replace('BRT_', 'BRL_');

    const treeNodes = navData.trees[key];
    const listItems = navData.lists[listKey];
    
    if (!treeNodes || !listItems) {
        console.warn(`Missing data for ${key}. Tree: ${!!treeNodes}, List: ${!!listItems} (Key: ${listKey})`);
        treeContainer.innerHTML = '<div class="placeholder">Data missing for this model.</div>';
        return;
    }

    // Pre-process to link children for exclusive matching
    const nodeStack = [];
    treeNodes.forEach(node => {
        node.directChildren = [];
        while (nodeStack.length > 0 && nodeStack[nodeStack.length - 1].level >= node.level) {
            nodeStack.pop();
        }
        if (nodeStack.length > 0) {
            nodeStack[nodeStack.length - 1].directChildren.push(node);
        }
        nodeStack.push(node);
    });

    const rootUl = document.createElement('ul');
    rootUl.className = 'tree-root';
    rootUl.style.listStyle = 'none';
    rootUl.style.padding = '0';
    
    let currentLevel = 0;
    let parentStack = [rootUl];
    
    treeNodes.forEach((node) => {
        // Adjust nesting level
        // node.level starts at 0
        
        if (node.level > currentLevel) {
            for (let i = 0; i < (node.level - currentLevel); i++) {
                const lastLi = parentStack[parentStack.length - 1].lastElementChild;
                if (!lastLi) {
                    // Should not happen in valid tree, but safety fallback
                    break;
                }
                const newUl = document.createElement('ul');
                newUl.className = 'tree-children';
                lastLi.appendChild(newUl);
                parentStack.push(newUl);
            }
        } else if (node.level < currentLevel) {
            for (let i = 0; i < (currentLevel - node.level); i++) {
                parentStack.pop();
            }
        }
        currentLevel = node.level;
        
        const currentParent = parentStack[parentStack.length - 1];
        
        const li = document.createElement('li');
        const div = document.createElement('div');
        div.className = 'tree-item';
        
        // Check if we should show an arrow (if it has potential children or articles)
        // For now, always show arrow if it's not deep, or just use logic
        div.innerHTML = `<span class="tree-toggle">▸</span><span class="tree-text">${node.name}</span>`;
        
        div.onclick = (e) => {
            e.stopPropagation();
            // Toggle selection style
            document.querySelectorAll('.tree-item').forEach(el => el.classList.remove('selected'));
            div.classList.add('selected');
            
            toggleNode(li, node, listItems);
        };
        
        li.appendChild(div);
        currentParent.appendChild(li);
    });
    
    treeContainer.appendChild(rootUl);
}

function toggleNode(li, nodeCriteria, listItems) {
    const childrenUl = li.querySelector('ul.tree-children');
    const toggle = li.querySelector('.tree-toggle');
    const itemDiv = li.querySelector('.tree-item');
    
    let isExpanded = false;
    
    // Toggle existing sub-tree (children categories)
    if (childrenUl) {
        // If it exists, it was created during tree build (it has sub-categories)
        const currentDisplay = getComputedStyle(childrenUl).display;
        if (currentDisplay === 'none') {
            childrenUl.style.display = 'block';
            isExpanded = true;
        } else {
            childrenUl.style.display = 'none';
            isExpanded = false;
        }
    }
    
    // Check/Load Articles
    // We render articles into a separate UL or append to the children UL
    let articlesUl = li.querySelector('ul.tree-articles');
    
    if (!li.dataset.articlesLoaded) {
        const matches = listItems.filter(item => {
            if (!matchItem(item, nodeCriteria)) return false;
            // Exclusive check: if item matches any direct child, hide it here
            if (nodeCriteria.directChildren && nodeCriteria.directChildren.some(child => matchItem(item, child))) {
                return false;
            }
            return true;
        });
        
        if (matches.length > 0) {
            if (!articlesUl) {
                articlesUl = document.createElement('ul');
                articlesUl.className = 'tree-articles'; // distinct class
                articlesUl.style.listStyle = 'none';
                articlesUl.style.paddingLeft = '20px';
                li.appendChild(articlesUl); // Append to LI, after the div
            }
            
            matches.forEach(article => {
                const articleLi = document.createElement('li');
                articleLi.className = 'article-item';
                articleLi.innerHTML = `📄 ${article.title} <span style="color:#888;font-size:0.9em">${article.subtitle || ''}</span>`;
                articleLi.title = article.title;
                articleLi.style.cursor = 'pointer';
                articleLi.style.padding = '4px 0';
                
                articleLi.onclick = (e) => {
                    e.stopPropagation();
                    document.querySelectorAll('.article-item').forEach(el => el.style.fontWeight = 'normal');
                    articleLi.style.fontWeight = 'bold';
                    loadContent(article.file_id);
                };
                articlesUl.appendChild(articleLi);
            });
            
            li.dataset.articlesLoaded = "true";
            isExpanded = true; // Auto-expand if we found articles
        }
    } else if (articlesUl) {
        // Toggle visibility of articles if already loaded
        if (articlesUl.style.display === 'none') {
            articlesUl.style.display = 'block';
            isExpanded = true;
        } else {
            // Only collapse if we are also collapsing children? 
            // Simple toggle logic: if expanding, show everything.
            if (!childrenUl || childrenUl.style.display === 'none') {
                 articlesUl.style.display = 'none';
                 isExpanded = false;
            }
        }
    }
    
    toggle.textContent = isExpanded ? '▾' : '▸';
}

// Global functions for Legacy Compatibility (Cts, Prt) and internal use
window.loadContent = async function(fileId) {
    if (!fileId) {
        console.error("loadContent called with empty fileId");
        return;
    }
    if (!/^[a-zA-Z0-9]+$/.test(fileId)) {
        console.error(`Security Block: Invalid fileId format '${fileId}'`);
        return;
    }

    const viewer = document.getElementById('content-viewer');
    if (!viewer) return;

    viewer.innerHTML = '<div style="padding:20px;">Loading...</div>';
    
    const targetUrl = `en/html/${fileId}.html`;
    console.log(`Loading content (no-frame): ${targetUrl}`);

    try {
        const response = await fetch(targetUrl);
        if (!response.ok) {
             viewer.innerHTML = `<div style="padding:20px;color:#cc0000"><h3>Error Loading Content</h3><p>Status: ${response.status}</p></div>`;
             return;
        }
        
        // Update Breadcrumbs
        updateBreadcrumbs(fileId);

        const htmlText = await response.text();
        await processAndInjectHTML(htmlText, viewer, 'en/html/'); // Pass base path

    } catch (e) {
        console.error("Error fetching content:", e);
        viewer.innerHTML = `<div style="padding:20px;color:#cc0000"><h3>Network Error</h3><p>${e.message}</p></div>`;
    }
};

// Lightbox Logic
window.openLightbox = function(src) {
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    if (lightbox && lightboxImg) {
        lightboxImg.src = src;
        lightbox.classList.add('active');
    }
};

window.closeLightbox = function() {
    const lightbox = document.getElementById('lightbox');
    if (lightbox) {
        lightbox.classList.remove('active');
    }
};

// Close lightbox on escape key
document.addEventListener('keydown', function(event) {
    if (event.key === "Escape") {
        window.closeLightbox();
    }
});

async function processAndInjectHTML(html, container, basePath) {
    // 1. Extract Body Content
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Move children of body to container
    container.innerHTML = '';
    
    // 2. Handle CSS (Scoped)
    const linkPromises = Array.from(doc.querySelectorAll('link[rel="stylesheet"]')).map(async link => {
        const href = link.getAttribute('href');
        if (href && !href.startsWith('http') && !href.startsWith('/')) {
            const fullUrl = resolvePath(basePath, href);
            try {
                const cssResp = await fetch(fullUrl);
                if (cssResp.ok) {
                    let cssText = await cssResp.text();
                    // Scope CSS: Replace 'body' selector with '.content-viewer'
                    // Regex handles: start of line, whitespace, comma before 'body', and whitespace, comma, brace after.
                    cssText = cssText.replace(/(^|[\s,])body(?=[\s,{]|$)/gi, '$1.content-viewer');
                    
                    const styleTag = document.createElement('style');
                    styleTag.textContent = cssText;
                    container.appendChild(styleTag);
                }
            } catch (e) {
                console.warn(`Failed to load/scope CSS: ${fullUrl}`, e);
            }
        }
    });
    
    // Wait for CSS to process (optional, but prevents FOUC)
    await Promise.all(linkPromises);

    // Fix Images and Add Lightbox
    doc.querySelectorAll('img').forEach(img => {
        const src = img.getAttribute('src');
        if (src && !src.startsWith('http') && !src.startsWith('/')) {
            img.src = resolvePath(basePath, src);
        }
        
        // Add Click-to-Zoom if it looks like a content image (e.g., in 'img' folder or PNG)
        // We verify against the resolved path or the attribute
        if (img.src.includes('/img/') || (src && src.toLowerCase().includes('.png'))) {
            // console.log("Making zoomable:", img.src); // Debug log
            img.classList.add('zoomable');
            img.onclick = (e) => {
                e.stopPropagation(); 
                window.openLightbox(img.src);
            };
        }
    });

    // Fix Anchors (Legacy Links)
    doc.querySelectorAll('a').forEach(a => {
        const href = a.getAttribute('href');
        // Javascript links like 'javascript:parent.Cts(...)' need no change if window.Cts is defined.
        // Standard links need path fix
        if (href && !href.startsWith('javascript:') && !href.startsWith('#')) {
             // If it points to another html file, hijack navigation
             if (href.endsWith('.html') || href.endsWith('.HTML')) {
                 const targetFile = href.split('/').pop().split('.')[0];
                 a.href = "javascript:void(0)";
                 a.onclick = () => window.loadContent(targetFile);
             }
        }
    });

    // Move Body Elements
    const bodyChildren = Array.from(doc.body.childNodes);
    for (const node of bodyChildren) {
        if (node.tagName === 'SCRIPT') {
            // Script needs execution
            await handleScript(node, container, basePath);
        } else {
            if (node.nodeType === 1) { // Element
                 // Remove any nested scripts we might have missed (unlikely to run but safe cleanup)
                 // Actually, scripts inside elements won't run via appendChild, so we ignore them or would need to handle them.
                 // For this legacy app, scripts are usually top level or inline handlers.
            }
            container.appendChild(node);
        }
    }
}

function resolvePath(base, relative) {
    // Simple path resolver
    // Base: en/html/
    // Relative: ../css/style.css -> en/css/style.css
    // Relative: ../../css/style.css -> css/style.css
    
    const stack = base.split('/');
    if (stack[stack.length-1] === '') stack.pop();
    
    const parts = relative.split('/');
    for (let i = 0; i < parts.length; i++) {
        if (parts[i] === '.') continue;
        if (parts[i] === '..') {
            if (stack.length > 0) stack.pop();
        } else {
            stack.push(parts[i]);
        }
    }
    return stack.join('/');
}

async function handleScript(scriptNode, container, basePath) {
    const newScript = document.createElement('script');
    
    if (scriptNode.src) {
        // External Script
        const src = scriptNode.getAttribute('src');
        const fullSrc = resolvePath(basePath, src);
        
        // We need to fetch the script content to execute it with our shim?
        // OR set src and let browser load it?
        // If we set src, we can't easily shim document.write for THAT script specifically unless we overwrite global document.write before inserting.
        // And we must wait for it to load before restoring.
        
        console.log(`Loading external script: ${fullSrc}`);
        
        // Approach: Fetch text, wrap in shim, execute.
        try {
            const resp = await fetch(fullSrc);
            const text = await resp.text();
            executeShimmedScript(text, container);
        } catch (e) {
            console.error(`Failed to load script ${fullSrc}`, e);
        }
        
    } else {
        // Inline Script
        executeShimmedScript(scriptNode.textContent, container);
    }
}

function executeShimmedScript(code, container) {
    // Shim document.write
    const originalWrite = document.write;
    const originalWriteln = document.writeln;
    
    let writeBuffer = "";
    
    document.write = function(...args) {
        writeBuffer += args.join('');
    };
    document.writeln = function(...args) {
        writeBuffer += args.join('') + "\n";
    };
    
    try {
        // Execute script
        // We use Function constructor or eval. 
        // 'with(document)' is common in these scripts, so we might need to wrap it?
        // The scripts usually contain 'with(document)'.
        
        // Global context exec
        window.eval(code);
        
        // Inject output
        if (writeBuffer) {
             // Create a temp container to parse the written HTML
             const temp = document.createElement('div');
             temp.innerHTML = writeBuffer;
             
             // Fix paths in generated content too!
             // (Simplified path fix for now - assumes generated content uses similar relative paths if any)
             // But usually generated content is mostly divs/tables.
             // If images are generated, we might need to fix them.
             
             Array.from(temp.childNodes).forEach(child => container.appendChild(child));
        }
        
    } catch (e) {
        console.error("Error executing legacy script:", e);
    } finally {
        // Restore
        document.write = originalWrite;
        document.writeln = originalWriteln;
    }
}

// Legacy 'Click Tree Something' shim
window.Cts = function(fileId, extra) {
    console.log(`Legacy Cts call: FileId=${fileId}`);
    window.loadContent(fileId);
};

// Legacy 'Print' shim (used for cross-linking)
window.Prt = function(key, mode) {
    console.log(`Legacy Prt call: Key=${key}, Mode=${mode}`);
    const fileId = keyToFileIdMap[key];
    if (fileId) {
        window.loadContent(fileId);
    } else {
        console.warn(`Prt: Key ${key} not found in index.`);
    }
};


// Keep local function for internal calls if necessary, but map to global
function loadContent(fileId) {
    window.loadContent(fileId);
}

function matchItem(item, criteria) {
    // Match all criteria that are present in the tree node
    if (!checkCriterion(criteria.sct, item.parsed_key.sct)) return false;
    if (!checkCriterion(criteria.sc, item.parsed_key.sc)) return false;
    if (!checkCriterion(criteria.sys, item.parsed_key.sys)) return false;
    if (!checkCriterion(criteria.comp, item.parsed_key.comp)) return false;
    if (!checkCriterion(criteria.sitq, item.parsed_key.sitq)) return false;
    if (!checkCriterion(criteria.supp, item.parsed_key.supp)) return false;
    return true;
}

function checkCriterion(criterion, value) {
    if (!criterion || criterion === "") return true;
    
    const options = criterion.split(/[,|]/).filter(s => s.trim() !== "");
    if (options.length === 0) return true;

    let hasPositive = false;
    let positiveMatch = false;
    
    for (const opt of options) {
        if (opt.startsWith('!')) {
            const cleanOpt = opt.substring(1);
            if (compareValue(cleanOpt, value)) return false; // Negative match -> Fail
        } else {
            hasPositive = true;
            if (compareValue(opt, value)) positiveMatch = true;
        }
    }
    
    // If there were positive requirements, at least one must match
    if (hasPositive && !positiveMatch) return false;
    
    return true;
}

function compareValue(pattern, value) {
    if (pattern.includes('?')) {
        const regex = new RegExp('^' + pattern.replace(/\?/g, '.') + '$');
        return regex.test(value);
    }
    return pattern === value;
}

function updateBreadcrumbs(fileId) {
    const breadcrumbsContainer = document.getElementById('breadcrumbs');
    if (!breadcrumbsContainer) {
        return;
    }
    
    breadcrumbsContainer.innerHTML = '';
    
    if (!currentModelKey || !navData) {
         breadcrumbsContainer.innerHTML = '<span class="current">Home</span>';
         return;
    }

    const listKey = currentModelKey.replace('SMT_', 'SML_').replace('BRT_', 'BRL_');
    const listItems = navData.lists[listKey];
    
    if (!listItems) {
        breadcrumbsContainer.innerHTML = '<span class="current">Home</span>';
        return;
    }

    // Find article
    const article = listItems.find(item => item.file_id === fileId);
    
    const homeLink = document.createElement('a');
    homeLink.textContent = 'Home';
    homeLink.onclick = () => {
        document.getElementById('content-viewer').innerHTML = '';
        updateBreadcrumbs(null);
    };
    breadcrumbsContainer.appendChild(homeLink);
    
    if (!article) {
        const sep = document.createElement('span');
        sep.className = 'sep';
        sep.textContent = '>';
        breadcrumbsContainer.appendChild(sep);
        
        const current = document.createElement('span');
        current.className = 'current';
        current.textContent = fileId;
        breadcrumbsContainer.appendChild(current);
        return;
    }

    // Find Path in Tree
    const treeNodes = navData.trees[currentModelKey];
    let bestPath = [];
    
    let currentStack = [];
    
    treeNodes.forEach(node => {
        // Maintain stack based on levels
        while (currentStack.length > 0 && currentStack[currentStack.length - 1].level >= node.level) {
            currentStack.pop();
        }
        currentStack.push(node);
        
        if (matchItem(article, node)) {
            // If this node matches, the current stack is a valid path.
            // We keep the longest valid path found during traversal (deepest match).
            if (currentStack.length >= bestPath.length) {
                 bestPath = [...currentStack];
            }
        }
    });
    
    // Render Path
    if (bestPath.length > 0) {
        bestPath.forEach(node => {
            const sep = document.createElement('span');
            sep.className = 'sep';
            sep.textContent = '>';
            breadcrumbsContainer.appendChild(sep);
            
            const link = document.createElement('span'); 
            link.className = 'crumb';
            link.textContent = node.name;
            breadcrumbsContainer.appendChild(link);
        });
    }
    
    // Add Article Title
    const sep = document.createElement('span');
    sep.className = 'sep';
    sep.textContent = '>';
    breadcrumbsContainer.appendChild(sep);

    const current = document.createElement('span');
    current.className = 'current';
    current.textContent = article.title;
    breadcrumbsContainer.appendChild(current);
}

init();