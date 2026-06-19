# Gurez Valley Tourism Website

A responsive tourism website for Gurez Valley with a small Node.js backend for enquiry form submissions.

## Run Locally

```bash
npm start
```

Open:

```text
http://127.0.0.1:3000
```

## Backend

The enquiry form sends data to:

```text
POST /api/enquiries
```

Submissions are saved locally in:

```text
data/enquiries.json
```

This file is ignored by Git so private enquiry data is not uploaded.

## Deploy

GitHub Pages can host the static HTML only, but it cannot run this Node.js backend.

For the full website with backend, deploy this project to a Node hosting service such as Render, Railway, Fly.io, or a VPS. Use:

```bash
npm start
```

as the start command.
