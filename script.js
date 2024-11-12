let jsonData = null;

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
        const filteredData = searchInJson(jsonData, searchTerm);
        displayCards(filteredData);
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

    data.forEach(item => {
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

function clearData() {
    localStorage.removeItem('cardData');
    jsonData = null;
    document.getElementById('cardContainer').innerHTML = '';
    document.getElementById('fileInput').value = '';
    document.getElementById('searchInput').value = '';
} 