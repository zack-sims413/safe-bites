# SafeBites 🌾🚫

SafeBites is a web application designed to help people with Celiac disease and gluten sensitivities find safe places to eat. Unlike standard map apps, SafeBites analyzes review sentiment to flag cross-contamination risks and dedicated gluten-free options.

## 🚀 Current Status (POC)
- **Backend:** Python (FastAPI) running on Vercel/Local.
- **Data:** Google Places API (Search & Details).
- **Features:** - Search restaurants by cuisine/location.
  - Automatic "Gluten Free" query optimization.
  - Review fetching.
  - Caching system to minimize API costs.

## 🛠️ Tech Stack
- **Frontend:** Next.js (React) - *In Progress*
- **Backend:** FastAPI (Python)
- **Database:** Supabase (PostgreSQL) - *Planned*
- **AI:** LLM for Sentiment Analysis - *Planned*

## 🏃‍♂️ How to Run Locally

1. **Clone the repo**
   ```bash
   git clone [https://github.com/YOUR_USERNAME/safe-bites.git](https://github.com/YOUR_USERNAME/safe-bites.git)
   cd safe-bites