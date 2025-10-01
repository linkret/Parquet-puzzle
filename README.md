A simple NodeJS / Vue web application for playing logical puzzles.

[Click here to play!](https://daily-puzzle.net/parquet-puzzle)

## Parquet Puzzle

### Rules
Fill the grid with numbers from 1 to 9 so that each colored segment bordered by a thick line contains 3 different numbers. The number in the middle must be the largest. Same digits must not touch anywhere, not even diagonally. Your goal is to maximize the sum of all numbers in the grid!

### Screenshot

![Parquet Puzzle Screenshot](public/parquet.jpg)

## Contributing

To get started with development:

1. Clone the repository with `git clone https://github.com/linkret/Parquet-puzzle.git`
2. Make sure you have [Node.js and npm installed](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm).
3. Run `npm install` to install dependencies.
4. Start the development server with `npm run dev:emul` (local DB) or `npm run dev`.
5. Open [http://localhost:8080](http://localhost:8080) in your browser.

You must have Java SDK v11+ installed to use the Firestore DB local emulator.
Or you need an access key to connect to the Cloud DB without Firestore local emulators (contact us).

Alternatively you can use the Docker Hub image from `docker pull linkret/parquet-puzzle:latest` and forward the ports manually.

Feel free to open issues or submit pull requests!
