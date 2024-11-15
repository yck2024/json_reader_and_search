# JSON Card Viewer

A web-based application that allows users to view, search, and organize JSON data in a card-based layout. The application includes features for pinning important cards, filtering data, and maintaining search history.

## Features

- **JSON File Upload**: Load and parse JSON files directly in the browser
- **Local Storage**: Automatically saves data and user preferences in the browser
- **Search Functionality**:
  - Real-time search filtering
  - Regular expression support
  - Search history with auto-suggestions
  - Keyboard shortcut (`/`) to focus search
  - Special handling for Japanese text searches
- **Card Management**:
  - Pin/unpin important cards
  - Paginated display (50 items per page)
  - Load more functionality
- **Filtering Options**:
  - Multiple migration status filters
  - Combined search and filter functionality
- **Responsive Design**:
  - Bootstrap-based layout


## Usage

1. Open `index.html` in a web browser
2. Upload a JSON file using the file input
3. Use the search bar to filter cards (press `/` to quickly focus)
4. Toggle regex mode for advanced searching
5. Use the migration filter dropdown to filter by status
6. Pin important cards by clicking the thumbtack icon
7. Click "Load More" to view additional cards
8. Use "Clear Data" to reset all data and preferences

## Data Privacy

All data is processed and stored locally in your browser. No information is transmitted or stored externally.

## Technical Details

### Technologies Used
- HTML5
- CSS3
- JavaScript (ES6+)
- Bootstrap 5.1.3
- Font Awesome 5.15.4

### Local Storage
The application stores:
- Card data
- Pinned card references
- Search history
- Filter preferences 

### Browser Support
Compatible with modern web browsers that support:
- Local Storage
- ES6+ JavaScript
- CSS Grid/Flexbox


© 2024 YK

---

*Note: This application is designed to work with specific JSON data formats. Please ensure your JSON structure matches the expected format for optimal functionality.*
