
# DocuFlow - Document Management System

This is a Next.js starter project for DocuFlow, a document management system, built within Firebase Studio.

## Prerequisites

Before you begin, ensure you have the following installed:

*   **Node.js**: Version 18.x or later (LTS recommended). You can download it from [nodejs.org](https://nodejs.org/).
*   **npm** (comes with Node.js) or **Yarn**: For managing project dependencies.
*   **Docker** (Optional): If you plan to run the application using Docker. Download from [docker.com](https://www.docker.com/).

## Getting Started

Follow these steps to get your development environment running:

### 1. Clone the Repository (if applicable)

If you've downloaded this project or cloned it from a repository:

```bash
git clone <repository-url>
cd <project-directory>
```

### 2. Install Dependencies

Install the project dependencies using npm or yarn:

```bash
npm install
```

or

```bash
yarn install
```

### 3. Environment Variables

This project is a frontend application. To connect it to your own custom backend, you will need to configure environment variables for your API endpoints.

Create a `.env.local` file in the root of your project. This file should **not** be committed to version control. Add your backend API base URL here:

```env
# Example for your custom backend API endpoint
NEXT_PUBLIC_API_BASE_URL="http://localhost:8080/api"
# Add any other public environment variables your frontend might need
# NEXT_PUBLIC_SOME_OTHER_KEY="YOUR_OTHER_CUSTOM_KEY"

# For Genkit with Google AI (Gemini) - THIS IS STILL NEEDED FOR AI FEATURES
GOOGLE_API_KEY="YOUR_GOOGLE_API_KEY_FOR_GEMINI"
```

**Note**:
*   Any variables that need to be accessible in the browser **must** be prefixed with `NEXT_PUBLIC_`.
*   The `GOOGLE_API_KEY` is for Genkit and should be a Google Generative Language API key if you intend to use the AI features.
*   The `NEXT_PUBLIC_API_BASE_URL` should point to the root of your backend API.

**Using the API Base URL in your Frontend Code:**

You can then access this base URL in your frontend JavaScript/TypeScript files like this:

```javascript
// Example: src/lib/apiClient.js (or any frontend file)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

async function fetchSomeData() {
  const response = await fetch(`${API_BASE_URL}/your-endpoint`);
  // ... handle response
}
```

### 4. Running the Development Server

To start the Next.js development server:

```bash
npm run dev
```

or

```bash
yarn dev
```

This will typically start the application on `http://localhost:9002`.

### 5. Running Genkit Development Server (for AI features)

If you are working on or testing AI features powered by Genkit, you can run the Genkit development server. It's often run in a separate terminal.

To start Genkit and watch for changes:
```bash
npm run genkit:watch
```
Or for a single start:
```bash
npm run genkit:dev
```
The Genkit UI will typically be available at `http://localhost:4000`.

## Building for Production

To create an optimized production build:

```bash
npm run build
```

or

```bash
yarn build
```

This command compiles your Next.js application and outputs it to the `.next` directory. For the standalone output (configured in `next.config.ts`), it also creates a minimal server in the `.next/standalone` directory.

## Running in Production Mode

After building, you can start the application in production mode:

```bash
npm run start
```

or

```bash
yarn start
```

This uses the Next.js production server and typically runs on `http://localhost:3000` (or the port specified by the `PORT` environment variable).

## Running with Docker (Optional)

This project includes a `Dockerfile` for containerizing the application.

### 1. Build the Docker Image

From the root of your project, run:

```bash
docker build -t docuflow-frontend .
```

### 2. Run the Docker Container

Once the image is built, you can run it:

```bash
docker run -p 3000:3000 docuflow-frontend
```

The application will be accessible at `http://localhost:3000`. The Docker container uses the port `3000` internally.

## Linting and Type Checking

To check for code quality and type errors:

*   **Linting**:
    ```bash
    npm run lint
    ```
    or
    ```bash
    yarn lint
    ```
*   **Type Checking**:
    ```bash
    npm run typecheck
    ```
    or
    ```bash
    yarn typecheck
    ```

## Project Structure

*   `src/app/`: Contains the main application pages (App Router).
*   `src/components/`: Reusable UI components.
    *   `src/components/ui/`: ShadCN UI components.
    *   `src/components/layout/`: Layout components like Header, Sidebar.
    *   `src/components/documents/`: Components specific to document features.
*   `src/contexts/`: React Context providers (e.g., `AuthContext`).
*   `src/hooks/`: Custom React hooks.
*   `src/lib/`: Utility functions, type definitions, mock data.
*   `src/ai/`: Genkit AI related code.
    *   `src/ai/flows/`: Genkit flows.
*   `public/`: Static assets.
*   `Dockerfile`: For building the Docker image.
*   `.dockerignore`: Specifies files to ignore when building the Docker image.
*   `next.config.ts`: Next.js configuration.
*   `tailwind.config.ts`: Tailwind CSS configuration.
*   `tsconfig.json`: TypeScript configuration.

## Key Technologies Used

*   Next.js (with App Router)
*   React
*   TypeScript
*   Tailwind CSS
*   ShadCN UI
*   Lucide React (Icons)
*   Genkit (for AI features)
*   Date-fns (for date formatting)
*   React Hook Form (for forms)
*   Zod (for schema validation)

This `README.md` should give a good overview and clear instructions for running the project with your own backend.
