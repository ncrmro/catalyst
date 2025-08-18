class RepositoriesController < ApplicationController
  def index
    # Show available repositories for the user to enable
    # In a real implementation, this would fetch repos from GitHub API
    @repositories = [
      { name: 'example-repo-1', full_name: 'user/example-repo-1', description: 'Example repository 1' },
      { name: 'example-repo-2', full_name: 'user/example-repo-2', description: 'Example repository 2' },
      { name: 'example-repo-3', full_name: 'user/example-repo-3', description: 'Example repository 3' }
    ]
  end

  def enable
    repo_id = params[:id]
    repo_name = params[:name]
    
    # In a real implementation, this would enable monitoring/integration for the repository
    Rails.logger.info "Enabling repository: #{repo_name} (#{repo_id})"
    
    flash[:notice] = "Repository '#{repo_name}' has been enabled for monitoring."
    redirect_to repositories_path
  end
end