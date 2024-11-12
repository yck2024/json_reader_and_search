let jsonData = null;
let currentFilteredData = null;

window.addEventListener('load', function() {
    const savedData = localStorage.getItem('cardData');
    if (savedData) {
        jsonData = JSON.parse(savedData);
        displayCards(jsonData);
    }
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
    if (jsonData) {
        const searchTerm = e.target.value.toLowerCase();
        currentFilteredData = searchInJson(jsonData, searchTerm);
        document.getElementById('cardContainer').dataset.showAll = 'false';
        displayCards(currentFilteredData);
    }
});

function searchInJson(obj, term) {
    return obj.filter(item => 
        Object.values(item).some(value => 
            String(value).toLowerCase().includes(term)
        )
    );
}

function displayCards(data) {
    const cardContainer = document.getElementById('cardContainer');
    cardContainer.innerHTML = '';

    const showAll = cardContainer.dataset.showAll === 'true';
    const itemsToShow = showAll ? data : data.slice(0, 100);

    if (data.length > 100 && !showAll) {
        const remainingCount = data.length - 100;
        const loadMoreContainer = document.createElement('div');
        loadMoreContainer.className = 'col-12 text-center mb-4';
        loadMoreContainer.innerHTML = `
            <button class="btn btn-primary" onclick="loadAllItems()">
                Load ${remainingCount} More Items
            </button>
        `;
        cardContainer.appendChild(loadMoreContainer);
    }

    itemsToShow.forEach(item => {
        const card = document.createElement('div');
        card.className = 'col-md-4 mb-4';
        card.innerHTML = `
            <div class="card">
                <div class="card-body">
                    <h5 class="card-title">Item ${item['No.']}</h5>
                    ${Object.entries(item).map(([key, value]) => 
                        value !== null && value !== '' ? 
                        `<p class="card-text"><strong>${key}:</strong> ${value}</p>` : 
                        ''
                    ).join('')}
                </div>
            </div>
        `;
        cardContainer.appendChild(card);
    });
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
    jsonData = null;
    document.getElementById('cardContainer').innerHTML = '';
    document.getElementById('fileInput').value = '';
    document.getElementById('searchInput').value = '';
} 
