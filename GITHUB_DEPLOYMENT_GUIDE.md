# How to Push Your Code to GitHub

This guide outlines the steps required to push your local changes to your GitHub repository at `https://github.com/N0madx86/ai-agent-travel-planner`.

## Prerequisites
- **Git** is installed on your machine.
- You have a **GitHub account** and have generated a Personal Access Token (or are logged in via the GitHub CLI / Browser).

## Step 1: Open Your Terminal
Open PowerShell, Command Prompt, or the terminal inside VS Code and navigate to the root directory of your project:
```powershell
cd d:\Projects\AATP
```

## Step 2: Ensure Git is Initialized
If this folder is not yet a Git repository, initialize it:
```powershell
git init
```

## Step 3: Check Your Status (Optional)
To see which files have been modified or added:
```powershell
git status
```

## Step 4: Stage Your Changes
Add all changes to the staging area:
```powershell
git add .
```
*(Note: Ensure your `.gitignore` files in both the frontend and backend folders are correct so you don't commit `node_modules/`, `venv/`, or `.env` files).*

## Step 5: Commit Your Changes
Create a commit with a descriptive message:
```powershell
git commit -m "Added admin dashboard and NodeJS server entrypoint"
```

## Step 6: Link Your GitHub Repository (First Time Only)
If you haven't connected your local repository to GitHub yet, run:
```powershell
git remote add origin https://github.com/N0madx86/ai-agent-travel-planner.git
```
*(If it says the remote already exists, skip to Step 7).*

### Ensure You Are on the Main Branch
```powershell
git branch -M main
```

## Step 7: Push to GitHub
Upload your local commits to the remote repository:
```powershell
git push -u origin main
```

---

## Troubleshooting

- **Large file warnings**: If you receive a warning about file size, ensure your local SQLite database (`travel_planner.db`) or large cached data directories are excluded in the `.gitignore`.
- **Authentication**: If prompted for credentials, log in with your GitHub username and use a **Personal Access Token (classic)** instead of your password if you're using HTTPS.
- **Conflicts**: If GitHub contains files that you don't have locally (like a starter `README.md`), you might need to `git pull origin main --rebase` before pushing.
