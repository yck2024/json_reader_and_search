let jsonData = null;
let currentFilteredData = null;
let selectedMigrateValues = [];
let pinnedCards = new Set();
const MAX_HISTORY_ITEMS = 15;
let searchHistory = [];
let selectedColumn = 'Migrate';
let filterValues = {};
let uploadedFiles = {};  // Object to store multiple JSON files
let currentFileName = null;  // Currently selected file name
let db;
const DB_NAME = 'JsonViewerDB';
const DB_VERSION = 1;
const STORE_FILES = 'files';
const STORE_SETTINGS = 'settings';

const moduleColors = {
    // Blues
    'Organization': '#e3f2fd',      // Light blue
    'Contact': '#bbdefb',           // Lighter blue
    
    // Greens
    'Invention': '#e8f5e9',         // Light green
    'InventionInventor': '#c8e6c9', // Lighter green
    
    // Purples
    'Patent': '#f3e5f5',           // Light purple
    'PatentInventor': '#e1bee7',    // Lighter purple
    'PatentFamily': '#d1c4e9',      // Different purple
    'Patent_FieldDate_and_NAFD': '#ede7f6', // Another purple shade
    'PatentPharmaRecords': '#e8eaf6', // Blue-purple
    
    // Oranges
    'Brand': '#fff3e0',            // Light orange
    'Mark': '#ffe0b2',             // Lighter orange
    
    // Reds
    'TMApplication': '#ffebee',     // Light red
    'TMFamily': '#ffcdd2',          // Lighter red
    
    // Teals
    'Document': '#e0f2f1',         // Light teal
    'Task': '#b2dfdb',             // Lighter teal
    
    // Yellows
    'Event': '#fffde7',            // Light yellow
    'Format': '#fff9c4',           // Lighter yellow
    
    // Browns
    'Annuities': '#efebe9',        // Light brown
    
    'default': '#ffffff'           // White for unknown modules
};

function getContrastColor(hexcolor) {
    // Convert hex to RGB
    const r = parseInt(hexcolor.slice(1,3), 16);
    const g = parseInt(hexcolor.slice(3,5), 16);
    const b = parseInt(hexcolor.slice(5,7), 16);
    
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Return black or white based on background luminance
    return luminance > 0.5 ? '#000000' : '#ffffff';
}

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // Create stores if they don't exist
            if (!db.objectStoreNames.contains(STORE_FILES)) {
                db.createObjectStore(STORE_FILES);
            }
            if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
                db.createObjectStore(STORE_SETTINGS);
            }
        };
    });
}

window.addEventListener('load', async function() {
    try {
        await initDB();
        
        // Load settings
        const settings = await getFromDB(STORE_SETTINGS, 'pinnedCards');
        if (settings) {
            pinnedCards = new Set(settings.map(String));
        }
        
        // Load current file
        const savedCurrentFile = await getFromDB(STORE_SETTINGS, 'currentFileName');
        if (savedCurrentFile) {
            currentFileName = savedCurrentFile;
            const fileData = await getFromDB(STORE_FILES, currentFileName);
            if (fileData) {
                uploadedFiles[currentFileName] = fileData;
                jsonData = fileData;
                updateColumnSelector();
                updateFilterOptions();
                displayCards(jsonData);
            }
        }
        
        // Load files list
        const files = await getAllKeysFromDB(STORE_FILES);
        for (const fileName of files) {
            if (!uploadedFiles[fileName]) {
                uploadedFiles[fileName] = await getFromDB(STORE_FILES, fileName);
            }
        }
        
        updateFileSelector();
        loadSearchHistory();
        
    } catch (error) {
        console.error('Error initializing database:', error);
    }
});

function saveToDB(storeName, key, value) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(value, key);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

function getFromDB(storeName, key) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(key);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function getAllKeysFromDB(storeName) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAllKeys();
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function deleteFromDB(storeName, key) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(key);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

document.getElementById('fileInput').addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (file) {
        let fileName = prompt('Enter a name for this file:', file.name.replace('.json', ''));
        if (!fileName) return;
        
        while (uploadedFiles.hasOwnProperty(fileName)) {
            fileName = prompt('Name already exists. Please enter a different name:', fileName);
            if (!fileName) return;
        }
        
        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                const data = JSON.parse(e.target.result);
                uploadedFiles[fileName] = data;
                currentFileName = fileName;
                
                // Save to IndexedDB
                await saveToDB(STORE_FILES, fileName, data);
                await saveToDB(STORE_SETTINGS, 'currentFileName', fileName);
                
                // Update UI
                updateFileSelector();
                jsonData = data;
                updateColumnSelector();
                updateFilterOptions();
                displayCards(jsonData);
            } catch (error) {
                alert('Error parsing JSON: ' + error);
            }
        };
        reader.readAsText(file);
    }
});

document.getElementById('searchInput').addEventListener('input', function(e) {
    filterAndDisplayData();
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
        saveSearchHistory(this.value);
    }, 1500);
});

document.getElementById('columnSelector').addEventListener('change', function(e) {
    selectedColumn = e.target.value;
    updateFilterOptions();
    document.getElementById('migrateFilter').value = filterValues[selectedColumn]?.join(', ') || '';
});

document.getElementById('migrateFilter').addEventListener('input', function(e) {
    if (!selectedColumn) return;
    
    // Get cursor position and current value
    const cursorPosition = this.selectionStart;
    const currentValue = this.value;
    
    // Split the value by commas
    const parts = currentValue.split(',');
    
    // Find which part the cursor is in
    let currentPartIndex = 0;
    let position = 0;
    for (let i = 0; i < parts.length; i++) {
        position += parts[i].length + 1; // +1 for the comma
        if (cursorPosition <= position) {
            currentPartIndex = i;
            break;
        }
    }
    
    // Get the current part being typed
    const currentPart = parts[currentPartIndex].trim();
    
    // Update the input's list attribute to show suggestions only for the current part
    if (currentPart) {
        // Get all unique values for the selected column
        const uniqueValues = [...new Set(jsonData.map(item => item[selectedColumn]))];
        const filterDatalist = document.getElementById('filterOptions');
        filterDatalist.innerHTML = '';
        
        // Add filtered options based on current part
        uniqueValues.forEach(value => {
            if (value !== null && value !== undefined) {
                const stringValue = String(value);
                if (stringValue.toLowerCase().includes(currentPart.toLowerCase())) {
                    const option = document.createElement('option');
                    option.value = parts.map((p, i) => 
                        i === currentPartIndex ? stringValue : p.trim()
                    ).join(', ');
                    filterDatalist.appendChild(option);
                }
            }
        });
    }
    
    // Update the filter values
    const values = currentValue.split(',').map(v => v.trim()).filter(v => v);
    if (values.length > 0) {
        filterValues[selectedColumn] = values;
    } else {
        delete filterValues[selectedColumn];
    }
    
    updateActiveFilters();
    filterAndDisplayData();
});

document.addEventListener('keydown', function(e) {
    if (e.key === '/' || e.key === '？') {
        if (document.activeElement !== document.getElementById('searchInput')) {
            e.preventDefault();
            document.getElementById('searchInput').focus();
        }
    }
});

function searchInJson(obj, term, isRegex) {
    if (isRegex) {
        try {
            const regex = new RegExp(term, 'i');
            return obj.filter(item =>
                Object.values(item).some(value =>
                    regex.test(String(value))
                )
            );
        } catch (e) {
            console.error('Invalid regular expression');
            return obj;
        }
    }
    
    return obj.filter(item =>
        Object.values(item).some(value =>
            String(value).toLowerCase().includes(term.toLowerCase())
        )
    );
}

function filterAndDisplayData() {
    if (!jsonData) return;
    
    const searchTerm = document.getElementById('searchInput').value;
    const isRegex = document.getElementById('regexToggle').checked;
    let filteredData = jsonData;
    
    if (searchTerm) {
        filteredData = searchInJson(filteredData, searchTerm, isRegex);
    }
    
    if (Object.keys(filterValues).length > 0) {
        filteredData = filteredData.filter(item => 
            Object.entries(filterValues).every(([column, values]) => 
                values.includes(String(item[column]))
            )
        );
    }
    
    currentFilteredData = filteredData;
    document.getElementById('cardContainer').dataset.showAll = 'false';
    displayCards(currentFilteredData);
}

function displayCards(data) {
    const cardContainer = document.getElementById('cardContainer');
    cardContainer.innerHTML = '';

    const showAll = cardContainer.dataset.showAll === 'true';
    
    const pinnedItems = data.filter(item => pinnedCards.has(String(item['Ref'])));
    const unpinnedItems = data.filter(item => !pinnedCards.has(String(item['Ref'])));
    
    const totalCount = document.getElementById('totalCount');
    const visibleCount = pinnedItems.length + (showAll ? unpinnedItems.length : Math.min(unpinnedItems.length, 50));
    
    // Create clickable count display
    totalCount.innerHTML = `
        <a href="#" class="text-decoration-none" onclick="toggleRefNumbers(event)">
            Showing ${visibleCount} cards (${pinnedItems.length} pinned, ${unpinnedItems.length} unpinned)
        </a>
        <div id="refNumbers" class="mt-2" style="display: none;"></div>
    `;

    // Store the reference numbers for currently visible items
    const visibleItems = [
        ...pinnedItems,
        ...(showAll ? unpinnedItems : unpinnedItems.slice(0, 50))
    ];
    totalCount.dataset.refs = visibleItems.map(item => item['Ref']).join(', ');

    const itemsToShow = showAll ? unpinnedItems : unpinnedItems.slice(0, 50);

    pinnedItems.forEach(item => createCard(item, cardContainer, true));

    if (pinnedItems.length > 0 && unpinnedItems.length > 0) {
        const divider = document.createElement('div');
        divider.className = 'col-12';
        divider.innerHTML = '<hr class="pinned-divider"><p class="text-center text-muted">Unpinned Items</p>';
        cardContainer.appendChild(divider);
    }

    if (unpinnedItems.length > 50 && !showAll) {
        const remainingCount = unpinnedItems.length - 50;
        const loadMoreContainer = document.createElement('div');
        loadMoreContainer.className = 'col-12 text-center mb-4';
        loadMoreContainer.innerHTML = `
            <button class="btn btn-primary" onclick="loadAllItems()">
                Load ${remainingCount} More Items
            </button>
        `;
        cardContainer.appendChild(loadMoreContainer);
    }

    itemsToShow.forEach(item => createCard(item, cardContainer, false));
}

function createCard(item, container, isPinned) {
    const card = document.createElement('div');
    card.className = 'col-md-4 mb-4';
    
    const itemRef = String(item['Ref']);
    const moduleColor = moduleColors[item['module']] || moduleColors['default'];
    const textColor = getContrastColor(moduleColor);
    
    card.innerHTML = `
        <div class="card ${isPinned ? 'pinned' : ''}" style="background-color: ${moduleColor}">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <h5 class="card-title mb-0" style="color: ${textColor}">Item ${item['No.']}</h5>
                    <div class="d-flex align-items-center">
                        <span class="module-badge" style="background-color: ${moduleColor}; border: 1px solid ${textColor}; color: ${textColor}; margin-right: 10px;">
                            ${item['module']}
                        </span>
                        <button class="btn btn-sm pin-btn" onclick="togglePin('${itemRef}')">
                            <i class="fas fa-thumbtack ${isPinned ? 'pinned' : ''}" style="color: ${textColor}"></i>
                        </button>
                    </div>
                </div>
                ${Object.entries(item).map(([key, value]) => 
                    value !== null && value !== '' ? 
                    `<p class="card-text" style="color: ${textColor}"><strong>${key}:</strong> ${value}</p>` : 
                    ''
                ).join('')}
            </div>
        </div>
    `;
    container.appendChild(card);
}

async function togglePin(itemNo) {
    if (pinnedCards.has(itemNo)) {
        pinnedCards.delete(itemNo);
    } else {
        pinnedCards.add(itemNo);
    }
    
    await saveToDB(STORE_SETTINGS, 'pinnedCards', Array.from(pinnedCards));
    
    if (currentFilteredData) {
        displayCards(currentFilteredData);
    } else {
        displayCards(jsonData);
    }
}

function loadAllItems() {
    const cardContainer = document.getElementById('cardContainer');
    cardContainer.dataset.showAll = 'true';
    if (currentFilteredData) {
        displayCards(currentFilteredData);
    } else if (jsonData) {
        displayCards(jsonData);
    }
}

async function clearData() {
    if (!confirm('Are you sure you want to clear all data?')) return;
    
    // Clear IndexedDB stores
    const transaction = db.transaction([STORE_FILES, STORE_SETTINGS], 'readwrite');
    transaction.objectStore(STORE_FILES).clear();
    transaction.objectStore(STORE_SETTINGS).clear();
    
    // Reset application state
    uploadedFiles = {};
    currentFileName = null;
    jsonData = null;
    currentFilteredData = null;
    selectedMigrateValues = [];
    pinnedCards.clear();
    searchHistory = [];
    
    // Update UI
    updateSearchHistoryDisplay();
    updateFileSelector();
    document.getElementById('cardContainer').innerHTML = '';
    document.getElementById('fileInput').value = '';
    document.getElementById('searchInput').value = '';
    document.getElementById('migrateFilter').value = '';
    filterValues = {};
    updateActiveFilters();
}

function loadSearchHistory() {
    const savedHistory = localStorage.getItem('searchHistory');
    if (savedHistory) {
        searchHistory = JSON.parse(savedHistory);
        updateSearchHistoryDisplay();
    }
}

// Add this helper function to detect Japanese characters
function containsJapanese(text) {
    // This regex matches hiragana, katakana, and kanji
    return /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf]/.test(text);
}

function saveSearchHistory(searchTerm) {
    if (!searchTerm.trim()) return;
    
    // Check length requirements based on whether it contains Japanese
    const isJapanese = containsJapanese(searchTerm);
    const minLength = isJapanese ? 2 : 3;
    
    if (searchTerm.length < minLength) return;
    
    // Remove the term if it already exists (to avoid duplicates)
    searchHistory = searchHistory.filter(term => term !== searchTerm);
    
    // Add the new term at the beginning
    searchHistory.unshift(searchTerm);
    
    // Keep only the latest MAX_HISTORY_ITEMS items
    searchHistory = searchHistory.slice(0, MAX_HISTORY_ITEMS);
    
    // Save to localStorage
    localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
    
    // Update the datalist
    updateSearchHistoryDisplay();
}

function updateSearchHistoryDisplay() {
    const datalist = document.getElementById('searchHistory');
    datalist.innerHTML = searchHistory
        .map(term => `<option value="${term}">`)
        .join('');
}

function updateColumnSelector() {
    if (!jsonData || jsonData.length === 0) return;
    
    const columnSelector = document.getElementById('columnSelector');
    columnSelector.innerHTML = '';
    
    // Get all unique keys from the first item
    const keys = Object.keys(jsonData[0]);
    
    keys.forEach(key => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = key;
        if (key === selectedColumn) option.selected = true;
        columnSelector.appendChild(option);
    });
}

function updateFilterOptions() {
    if (!jsonData || jsonData.length === 0) return;
    
    const filterDatalist = document.getElementById('filterOptions');
    filterDatalist.innerHTML = '';
    
    // Get unique values for the selected column
    const uniqueValues = [...new Set(jsonData.map(item => item[selectedColumn]))];
    
    uniqueValues.forEach(value => {
        if (value !== null && value !== undefined) {
            const option = document.createElement('option');
            option.value = String(value);
            filterDatalist.appendChild(option);
        }
    });
    
    // Update input with current filters for this column
    const filterInput = document.getElementById('migrateFilter');
    filterInput.value = filterValues[selectedColumn]?.join(', ') || '';
    filterInput.placeholder = `Type multiple values separated by commas...`;
    
    updateActiveFilters();
}

// Add this function to update the active filters display
function updateActiveFilters() {
    const activeFiltersContainer = document.getElementById('activeFilters');
    activeFiltersContainer.innerHTML = '';

    Object.entries(filterValues).forEach(([column, values]) => {
        values.forEach(value => {
            const filterTag = document.createElement('span');
            filterTag.className = 'filter-tag';
            filterTag.innerHTML = `
                <span class="column-name">${column}:</span>
                <span class="filter-value">${value}</span>
                <span class="remove-filter" onclick="removeFilter('${column}', '${value}')">×</span>
            `;
            activeFiltersContainer.appendChild(filterTag);
        });
    });
}

// Add this function to remove individual filters
function removeFilter(column, valueToRemove) {
    if (filterValues[column]) {
        filterValues[column] = filterValues[column].filter(value => value !== valueToRemove);
        if (filterValues[column].length === 0) {
            delete filterValues[column];
        }
        
        // Update the input if it's the current selected column
        if (column === selectedColumn) {
            document.getElementById('migrateFilter').value = filterValues[column]?.join(', ') || '';
        }
        
        updateActiveFilters();
        filterAndDisplayData();
    }
}

// Add new function to update file selector
function updateFileSelector() {
    const fileSelector = document.getElementById('fileSelector');
    fileSelector.innerHTML = '';
    
    Object.keys(uploadedFiles).forEach(fileName => {
        const option = document.createElement('option');
        option.value = fileName;
        option.textContent = fileName;
        if (fileName === currentFileName) option.selected = true;
        fileSelector.appendChild(option);
    });
}

// Add event listener for file selection
document.getElementById('fileSelector').addEventListener('change', function(e) {
    currentFileName = e.target.value;
    jsonData = uploadedFiles[currentFileName];
    localStorage.setItem('currentFileName', currentFileName);
    
    updateColumnSelector();
    updateFilterOptions();
    displayCards(jsonData);
});

// Add this new function
function toggleRefNumbers(event) {
    event.preventDefault();
    const refNumbersDiv = document.getElementById('refNumbers');
    const totalCount = document.getElementById('totalCount');
    
    if (refNumbersDiv.style.display === 'none') {
        refNumbersDiv.style.display = 'block';
        refNumbersDiv.textContent = `Ref Numbers: ${totalCount.dataset.refs}`;
    } else {
        refNumbersDiv.style.display = 'none';
    }
} 