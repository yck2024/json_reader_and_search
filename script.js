let jsonData = null;
let currentFilteredData = null;
let selectedMigrateValues = [];
let pinnedCards = new Set();
const MAX_HISTORY_ITEMS = 15;
let searchHistory = [];

window.addEventListener('load', function() {
    const savedData = localStorage.getItem('cardData');
    const savedPins = localStorage.getItem('pinnedCards');
    
    if (savedPins) {
        pinnedCards = new Set(JSON.parse(savedPins).map(String));
    }
    
    if (savedData) {
        jsonData = JSON.parse(savedData);
        displayCards(jsonData);
    }
    
    loadSearchHistory();
});

document.getElementById('fileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                jsonData = JSON.parse(e.target.result);
                localStorage.setItem('cardData', JSON.stringify(jsonData));
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

document.getElementById('migrateFilter').addEventListener('change', function(e) {
    selectedMigrateValues = Array.from(e.target.selectedOptions).map(option => option.value);
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
    
    if (selectedMigrateValues.length > 0) {
        filteredData = filteredData.filter(item => 
            selectedMigrateValues.includes(item.Migrate)
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
    totalCount.textContent = `Showing ${pinnedItems.length + (showAll ? unpinnedItems.length : Math.min(unpinnedItems.length, 50))} cards (${pinnedItems.length} pinned, ${unpinnedItems.length} unpinned)`;
    
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
    
    console.log('Creating card for item:', itemRef, 'isPinned:', isPinned);
    
    card.innerHTML = `
        <div class="card ${isPinned ? 'pinned' : ''}">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <h5 class="card-title mb-0">Item ${item['No.']}</h5>
                    <button class="btn btn-sm pin-btn" onclick="togglePin('${itemRef}')">
                        <i class="fas fa-thumbtack ${isPinned ? 'pinned' : ''}"></i>
                    </button>
                </div>
                ${Object.entries(item).map(([key, value]) => 
                    value !== null && value !== '' ? 
                    `<p class="card-text"><strong>${key}:</strong> ${value}</p>` : 
                    ''
                ).join('')}
            </div>
        </div>
    `;
    container.appendChild(card);
}

function togglePin(itemNo) {
    console.log('Toggling pin for item:', itemNo);
    if (pinnedCards.has(itemNo)) {
        console.log('Unpinning item');
        pinnedCards.delete(itemNo);
    } else {
        console.log('Pinning item');
        pinnedCards.add(itemNo);
    }
    
    localStorage.setItem('pinnedCards', JSON.stringify(Array.from(pinnedCards)));
    
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

function clearData() {
    localStorage.removeItem('cardData');
    localStorage.removeItem('pinnedCards');
    localStorage.removeItem('searchHistory');
    jsonData = null;
    currentFilteredData = null;
    selectedMigrateValues = [];
    pinnedCards.clear();
    searchHistory = [];
    updateSearchHistoryDisplay();
    document.getElementById('cardContainer').innerHTML = '';
    document.getElementById('fileInput').value = '';
    document.getElementById('searchInput').value = '';
    document.getElementById('migrateFilter').selectedIndex = -1;
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