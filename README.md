# Info Tracker 📰

Info Tracker is a premium web-based information and news tracking dashboard. It allows you to monitor custom keywords/topics, fetch search results directly via Google News Search, and view summaries organized in a modern glassmorphism interface.

## Core Features

- **Google Search Integration**: Uses Google News RSS Search to fetch articles, bypassing browser bot blocks while providing clean search results from a wide variety of news sources.
- **Accurate Language Detection**: Automatically parses search keywords. If they contain Vietnamese characters (e.g. `tính toán lượng tử`), it applies correct locale parameters (`hl=vi&gl=VN&ceid=VN:vi`) to ensure regional and relevant local news is retrieved.
- **Date Selector Calendar**: Displays historical data by reading local news files. You can choose any date on a custom-designed month calendar grid. Days with data are active, while days without data are disabled (greyed out).
- **Dynamic Filter Sidebar**:
  - Toggle check/uncheck keyword topics to filter what is displayed on the dashboard in real-time.
  - Reorder items dynamically using native HTML5 drag-and-drop. Dragging an item in the sidebar immediately shifts the corresponding news sections in the dashboard.
- **Data Persistence**:
  - Keyword list order is saved to the backend API (`data/keywords.json`) when you finish dragging.
  - Selected checkbox filter states are stored in browser `localStorage` to survive page reloads.
- **Local File Storage**: Uses JSON files for keywords (`data/keywords.json`) and date-based files for news (`data/news/YYYY-MM-DD.json`).

## Architecture & Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, Lucide Icons.
- **Styling**: Vanilla CSS Modules (Glassmorphism layout, sleek dark mode variables, hover transitions, and keyframe animations).
- **Backend API**: Next.js Route Handlers (`app/api/...`) for keywords CRUD and news fetching.
- **Parsing**: `rss-parser` for parsing Google News XML feeds.

---

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm / pnpm / bun

### Installation & Run

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## API Endpoints

- `GET /api/keywords` - Retrieves the list of tracked keywords in order.
- `POST /api/keywords` - Adds a new keyword to the tracking list.
- `PUT /api/keywords` - Updates the order/list of keywords.
- `DELETE /api/keywords?keyword=name` - Removes a keyword.
- `GET /api/news` - Gets the list of available dates and the news for a specific date (defaults to the latest). Optional parameter: `?date=YYYY-MM-DD`.
- `POST /api/fetch-news` - Scrapes Google Search RSS for all tracked keywords and writes the results to `data/news/YYYY-MM-DD.json`.

---

## Scheduling Automated Tasks

To keep your news feed updated automatically, configure a task scheduler (such as **Antigravity Tasks** or a cron job) to trigger the fetch API on a weekly or daily schedule.

### Trigger Endpoint Command
```bash
curl -X POST http://localhost:3000/api/fetch-news
```

*Note: The Next.js web application must be running when the request is sent.*
