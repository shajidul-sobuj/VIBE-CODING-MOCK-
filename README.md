# Smart Escape - Interactive Evacuation Route Simulator

This is a submission for the AI DevFest - Mock Test Challenge: **Smart Escape**.

## Identity
- **Full Name**: Md. Sobuj Hossain (Substitute your real name)
- **Registration Number**: DEVFEST-12345 (Substitute your registration number)

## Live Link
- https://smart-escape-demo.vercel.app/ (To be updated after deployment)

## Running Instructions
This is a standard Vite React application.
1. Make sure Node.js (v18+) is installed.
2. Run `npm install` to install dependencies.
3. Run `npm run dev` to start the local development server.
4. Open the displayed local URL in your browser.

## Implemented Features
- **Import and Map**: Parses `building.json` and renders an interactive SVG map showing rooms, junctions, exits, and corridors with their travel costs.
- **Select and Calculate**: Click on an unblocked room/junction to set the start. Calculates shortest route to an open exit using Dijkstra's algorithm.
- **Change Conditions**: Toggle the Hazard Mode to block/unblock nodes, edges, or exits interactively. Live recalculation occurs automatically.
- **Strict Tie-Breaking Rules**: Implements minimum cost, lexicographically smallest exit ID, and lexicographical node sequence.
- **Two Languages**: Full toggle support between English and Bangla for instructions, statuses, labels, and buttons.
- **Handle Failure Cases**: Fully handles "No route available" and "Starting location blocked" scenarios.

## AI Tools & Prompts
- **AI Tools Used**: Google Gemini
- **Most Useful Prompt**: 
> "professionally building shuru kore dao" (with provided problem statement and sample building.json to initialize Vite, React, Tailwind, and implement the Dijkstra pathfinding algorithm).

## License
MIT License
