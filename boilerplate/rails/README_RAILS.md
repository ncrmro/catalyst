# Catalyst Rails App - GitHub Integration

This is a Rails rewrite of the Catalyst application that provides a complete GitHub App integration flow.

## Features

- **Home Page**: Landing page directing users to install a GitHub App
- **GitHub App Installation**: Complete workflow for installing GitHub Apps
- **Repository Selection**: Interface for users to select repositories to enable after installation
- **Callback Handling**: Processes GitHub App installation callbacks
- **Flash Messages**: User feedback for installation status

## Setup

1. Install dependencies:
   ```bash
   bundle install
   ```

2. Create and migrate the database:
   ```bash
   rails db:create db:migrate
   ```

3. Start the server:
   ```bash
   rails server
   ```

## GitHub App Configuration

Set the following environment variables for your GitHub App:

```env
GITHUB_APP_ID=your_github_app_id
```

## Routes

- `/` - Home page with GitHub App installation instructions
- `/github/register` - Initiates GitHub App installation process
- `/github/callback` - Handles GitHub App installation callbacks
- `/repositories` - Lists repositories available for enabling
- `/repositories/:id/enable` - Enables a repository for monitoring

## Architecture

- **HomeController**: Manages the landing page
- **GithubController**: Handles GitHub App installation flow
- **RepositoriesController**: Manages repository selection and enabling

## Installation Flow

1. User visits the home page
2. User clicks "Install GitHub App" 
3. User is redirected to GitHub's app installation page
4. After installation, GitHub redirects back to `/github/callback`
5. App processes the callback and redirects to repository selection
6. User can enable specific repositories for monitoring

This implementation follows the same patterns as the Next.js web application for consistency.